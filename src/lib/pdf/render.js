/**
 * Page rendering, backed by PDF.js.
 *
 * pdf-lib cannot draw a page -- it manipulates PDF structure and has no
 * rasteriser. Anything that shows the user their document (reorder thumbnails,
 * the editor canvas, a redaction preview) needs PDF.js, which is a separate and
 * much heavier engine.
 *
 * It is therefore loaded lazily and only from routes that actually display
 * pages. Importing it eagerly would put a second PDF engine into the landing
 * bundle, which is the exact mistake the route splitting was done to fix.
 */

let pdfjsPromise = null;

/** Load PDF.js once, wiring its worker through Vite's asset pipeline. */
const loadPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, workerUrl] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default),
      ]);
      // Without a worker, PDF.js decodes on the main thread and a large
      // document freezes the tab outright.
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
};

/**
 * Open a document for rendering.
 *
 * The buffer is copied before being handed over. PDF.js takes ownership of the
 * ArrayBuffer it is given and detaches it, which would silently invalidate the
 * same buffer still held by usePdfFile -- every later pdf-lib call on that file
 * would then fail with a detached-ArrayBuffer error that points nowhere near
 * the real cause.
 */
export async function openForRender(arrayBuffer) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise;

  return {
    pageCount: doc.numPages,

    /**
     * Render one page and hand back the canvas itself.
     *
     * The editor needs the pixels, not just an image: covering old text means
     * matching the background behind it, which is sampled from this canvas.
     */
    async renderPageCanvas(pageNumber, { width = 800, rotation = 0 } = {}) {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1, rotation });
      const scale = width / base.width;
      const viewport = page.getViewport({ scale, rotation });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const canvasContext = canvas.getContext('2d', { willReadFrequently: true });

      await page.render({ canvasContext, viewport, canvas }).promise;
      page.cleanup();
      return { canvas, scale, pageWidth: base.width, pageHeight: base.height };
    },

    /**
     * Render one page to a PNG data URL.
     * @param {number} pageNumber 1-indexed, as PDF.js counts them.
     * @param {{width?: number, rotation?: number}} options
     */
    async renderPage(pageNumber, { width = 160, rotation = 0 } = {}) {
      const page = await doc.getPage(pageNumber);

      // Scale from the page's own width so thumbnails are uniform regardless of
      // whether the document is A4, Letter or something unusual.
      const base = page.getViewport({ scale: 1, rotation });
      const viewport = page.getViewport({ scale: width / base.width, rotation });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const canvasContext = canvas.getContext('2d');

      await page.render({ canvasContext, viewport, canvas }).promise;
      page.cleanup();
      return canvas.toDataURL('image/png');
    },

    /**
     * Text runs on a page, in PDF coordinate space.
     *
     * Coordinates stay PDF-native (origin bottom-left, y = text baseline)
     * because that is what pdf-lib needs when writing the edit back. The UI
     * converts to top-left screen space for display, which is a one-line
     * transform; doing it the other way round means converting back later and
     * getting it subtly wrong.
     *
     * Returns [] for a scanned page -- an image of text has no text layer, and
     * there is nothing here to edit.
     */
    async textItems(pageNumber) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const items = content.items
        .filter((item) => item.str && item.str.trim())
        .map((item, i) => {
          // transform is [a, b, c, d, e, f]: e/f are the position, d the
          // vertical scale, which is the rendered font size.
          const [, , , d, e, f] = item.transform;
          const fontSize = Math.abs(d) || item.height || 12;
          return {
            id: `p${pageNumber}-i${i}`,
            text: item.str,
            x: e,
            baselineY: f,
            width: item.width,
            fontSize,
            fontName: item.fontName || '',
          };
        });
      return { items, pageWidth: viewport.width, pageHeight: viewport.height };
    },

    /**
     * Where the images on a page actually sit, in PDF coordinates.
     *
     * PDF has no "list of images" to query -- pictures are drawn by operators,
     * so the placement only exists as whatever the current transform happened
     * to be when the paint operator ran. That means walking the operator list
     * and tracking the graphics state by hand: `save`/`restore` push and pop it,
     * `transform` concatenates onto it, and an image XObject is always drawn
     * into the unit square, so the live matrix *is* the rectangle.
     */
    async imageItems(pageNumber) {
      const page = await doc.getPage(pageNumber);
      const [pdfjs, ops] = await Promise.all([loadPdfjs(), page.getOperatorList()]);
      const { OPS } = pdfjs;

      // m applied to the current matrix, in PDF's order (m x ctm).
      const concat = (m, c) => [
        m[0] * c[0] + m[1] * c[2],
        m[0] * c[1] + m[1] * c[3],
        m[2] * c[0] + m[3] * c[2],
        m[2] * c[1] + m[3] * c[3],
        m[4] * c[0] + m[5] * c[2] + c[4],
        m[4] * c[1] + m[5] * c[3] + c[5],
      ];

      const paintOps = new Set(
        [OPS.paintImageXObject, OPS.paintJpegXObject, OPS.paintImageXObjectRepeat].filter(
          (op) => op !== undefined,
        ),
      );

      let ctm = [1, 0, 0, 1, 0, 0];
      const stack = [];
      const found = [];

      ops.fnArray.forEach((fn, i) => {
        if (fn === OPS.save) stack.push([...ctm]);
        else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
        else if (fn === OPS.transform) ctm = concat(ops.argsArray[i], ctm);
        else if (paintOps.has(fn)) {
          const [a, b, c, d, e, f] = ctm;
          const width = Math.hypot(a, b);
          const height = Math.hypot(c, d);
          // Skip hairline artefacts: rules and separators are often drawn as
          // 1px image masks and are not things anyone wants to replace.
          if (width < 8 || height < 8) return;
          found.push({
            id: `img-p${pageNumber}-${i}`,
            // f is the lower edge when d is positive, the upper when flipped.
            x: e,
            y: d < 0 ? f - height : f,
            width,
            height,
          });
        }
      });

      page.cleanup();
      return found;
    },

    destroy() {
      doc.destroy();
    },
  };
}

/**
 * Render many pages without melting the device.
 *
 * Rendering is CPU-bound, so firing every page at once makes an 80-page
 * document lock the tab for seconds. This keeps a small number in flight and
 * reports each result as it lands, so thumbnails appear progressively instead
 * of all-or-nothing.
 */
export async function renderPages(renderDoc, pageNumbers, options, onEach, concurrency = 3) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, pageNumbers.length) }, async () => {
    while (cursor < pageNumbers.length) {
      const index = cursor++;
      const pageNumber = pageNumbers[index];
      try {
        const url = await renderDoc.renderPage(pageNumber, options);
        onEach(pageNumber, url, null);
      } catch (error) {
        onEach(pageNumber, null, error);
      }
    }
  });
  await Promise.all(workers);
}
