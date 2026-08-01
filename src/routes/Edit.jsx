import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { Link } from 'react-router-dom';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { usePro } from '../hooks/usePro.js';
import { openForRender } from '../lib/pdf/render.js';
import { normalizeImage } from '../lib/pdf/imagesToPdf.js';
import {
  applyEdits,
  unsupportedChars,
  cssFontFor,
  defaultCoverRect,
} from '../lib/pdf/edit.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/edit');
const VIEW_WIDTH = 780;

/**
 * Sample the background behind a text run so the cover rectangle matches.
 *
 * Reads a band just above and just below the glyphs -- never through them --
 * and takes the most common colour. On a plain page that is exactly the paper
 * colour; on a busy background it is the closest single colour available, which
 * is the honest limit of cover-and-replace.
 */
const sampleBackground = (canvas, box) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const counts = new Map();
  const sampleRow = (y) => {
    if (y < 0 || y >= canvas.height) return;
    const width = Math.max(1, Math.min(Math.round(box.width), canvas.width - Math.round(box.left)));
    const left = Math.max(0, Math.round(box.left));
    if (width < 1) return;
    const { data } = ctx.getImageData(left, Math.round(y), width, 1);
    for (let i = 0; i < data.length; i += 4) {
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  };
  sampleRow(box.top - 3);
  sampleRow(box.top - 2);
  sampleRow(box.top + box.height + 2);
  sampleRow(box.top + box.height + 3);

  let best = '255,255,255';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  const [r, g, b] = best.split(',').map(Number);
  return { r, g, b };
};

export default function Edit() {
  const pdf = usePdfFile();
  const [docHandle, setDocHandle] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState(null);
  const [layout, setLayout] = useState(null); // { scale, pageWidth, pageHeight, items }
  const [rendering, setRendering] = useState(false);
  const [edits, setEdits] = useState([]); // committed, keyed by item id
  const [editing, setEditing] = useState(null); // { id, value, box, item }
  const [addMode, setAddMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { isPro } = usePro();
  // 'replace' waits for a click on an existing picture; 'add' waits for a click
  // anywhere on the page. Both are Pro.
  const [imageMode, setImageMode] = useState(null);
  const [showProPrompt, setShowProPrompt] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const resizingRef = useRef(false);
  const imageInputRef = useRef(null);
  // Where the next picked image goes: an existing picture's box, or a point.
  const pendingPlacementRef = useRef(null);

  /**
   * Focus the inline editor a frame after it mounts.
   *
   * `autoFocus` looked equivalent and was not: the text run being edited is
   * unmounted in the same render that mounts this input, so focus briefly
   * returned to the body and the input's own onBlur fired instantly, committing
   * an empty edit and closing the editor before a key could be pressed.
   * Taking focus deliberately, after the DOM settles, removes the race.
   */
  const editingId = editing?.id ?? null;
  useEffect(() => {
    if (!editingId) return undefined;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  // Open the render document once per file.
  useEffect(() => {
    if (!pdf.buffer) {
      setDocHandle(null);
      return undefined;
    }
    let cancelled = false;
    let handle = null;
    (async () => {
      try {
        handle = await openForRender(pdf.buffer);
        if (cancelled) {
          handle.destroy();
          return;
        }
        setDocHandle(handle);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not open that PDF for editing.');
      }
    })();
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [pdf.buffer]);

  // Render the current page and pull its text runs.
  useEffect(() => {
    if (!docHandle) return undefined;
    let cancelled = false;
    setRendering(true);
    (async () => {
      try {
        const { canvas, scale, pageWidth, pageHeight } = await docHandle.renderPageCanvas(
          pageIndex + 1,
          { width: VIEW_WIDTH },
        );
        const { items } = await docHandle.textItems(pageIndex + 1);
        const pictures = await docHandle.imageItems(pageIndex + 1);
        if (cancelled) return;
        // Kept pristine: every preview is composed from this, never on top of a
        // previous preview, so edits can be changed or undone without the page
        // slowly accumulating artefacts.
        canvasRef.current = canvas;
        setLayout({ scale, pageWidth, pageHeight, items, pictures });
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not render that page.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docHandle, pageIndex]);

  /** PDF space (bottom-left origin, baseline y) -> screen box (top-left). */
  const boxFor = useCallback(
    (item) => {
      const { scale, pageHeight } = layout;
      return {
        left: item.x * scale,
        top: (pageHeight - item.baselineY - item.fontSize) * scale,
        width: Math.max(item.width * scale, 6),
        height: item.fontSize * 1.25 * scale,
      };
    },
    [layout],
  );

  /** A PDF-space cover rect -> screen rect. */
  const rectToScreen = useCallback(
    (rect) => {
      const { scale, pageHeight } = layout;
      return {
        left: rect.coverX * scale,
        top: (pageHeight - rect.coverY - rect.coverH) * scale,
        width: rect.coverW * scale,
        height: rect.coverH * scale,
      };
    },
    [layout],
  );

  /**
   * Draw the page with every pending edit applied.
   *
   * Showing a coloured highlight where an edit will go was not enough -- you
   * could not tell what the result would look like until after downloading it,
   * which made the tool feel like a guess. This paints the same cover rectangle
   * and the same text, at the same coordinates and in the same font family
   * that pdf-lib will use, so the page on screen is a genuine preview of the
   * file. The shared helpers in lib/pdf/edit.js exist to keep the two in step.
   */
  useEffect(() => {
    const base = canvasRef.current;
    if (!base || !layout) return;
    const { scale, pageHeight } = layout;

    const out = document.createElement('canvas');
    out.width = base.width;
    out.height = base.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(base, 0, 0);

    for (const edit of edits.filter((e) => e.pageIndex === pageIndex)) {
      if (edit.type === 'imageCover') {
        ctx.fillStyle = `rgb(${edit.cover.r},${edit.cover.g},${edit.cover.b})`;
        ctx.fillRect(
          edit.x * scale,
          (pageHeight - edit.y - edit.height) * scale,
          edit.width * scale,
          edit.height * scale,
        );
        continue;
      }
      if (edit.type === 'image') {
        ctx.drawImage(
          edit.img,
          edit.x * scale,
          (pageHeight - edit.y - edit.height) * scale,
          edit.width * scale,
          edit.height * scale,
        );
        continue;
      }
      if (edit.type === 'replace' && edit.cover) {
        const fallback = defaultCoverRect(edit);
        const rect = {
          coverX: edit.coverX ?? fallback.coverX,
          coverY: edit.coverY ?? fallback.coverY,
          coverW: edit.coverW ?? fallback.coverW,
          coverH: edit.coverH ?? fallback.coverH,
        };
        const screen = rectToScreen(rect);
        ctx.fillStyle = `rgb(${edit.cover.r},${edit.cover.g},${edit.cover.b})`;
        ctx.fillRect(screen.left, screen.top, screen.width, screen.height);
      }
      if (edit.text.trim()) {
        ctx.fillStyle = 'rgb(17,17,17)';
        ctx.font = cssFontFor(edit.fontName, edit.fontSize * scale);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(edit.text, edit.x * scale, (pageHeight - edit.baselineY) * scale);
      }
    }

    setPageImage(out.toDataURL('image/png'));
  }, [edits, layout, pageIndex, rectToScreen]);

  /** Current text for a run: the pending edit if there is one, else the original. */
  const textFor = (item) => edits.find((e) => e.id === item.id)?.text ?? item.text;

  const beginEdit = (item) => {
    if (addMode) return;
    const existing = edits.find((e) => e.id === item.id);
    const fallback = defaultCoverRect(item);
    setEditing({
      id: item.id,
      item,
      value: textFor(item),
      box: boxFor(item),
      // Reopening an edit restores the box the user last sized, not the default.
      rect: {
        coverX: existing?.coverX ?? fallback.coverX,
        coverY: existing?.coverY ?? fallback.coverY,
        coverW: existing?.coverW ?? fallback.coverW,
        coverH: existing?.coverH ?? fallback.coverH,
      },
    });
  };

  const commitEdit = () => {
    if (!editing) return;
    const { item, value, rect } = editing;
    setEditing(null);
    if (value === item.text) {
      setEdits((prev) => prev.filter((e) => e.id !== item.id));
      return;
    }
    // Sample the background from the cover area the user actually chose.
    const cover = canvasRef.current
      ? sampleBackground(canvasRef.current, rectToScreen(rect))
      : { r: 255, g: 255, b: 255 };
    setEdits((prev) => [
      ...prev.filter((e) => e.id !== item.id),
      {
        id: item.id,
        pageIndex,
        type: 'replace',
        text: value,
        x: item.x,
        baselineY: item.baselineY,
        width: item.width,
        fontSize: item.fontSize,
        fontName: item.fontName,
        cover,
        ...rect,
      },
    ]);
  };

  /**
   * Drag the handle to resize the cover rectangle.
   *
   * Necessary because the box comes from PDF.js's reported extent of the text
   * run, which is often not what needs covering: too small and fragments of the
   * old text survive around the edges, too large and it eats a neighbouring
   * word or a table rule.
   *
   * Growing downwards means lowering coverY by the same amount the height
   * grows, since PDF coordinates start at the bottom -- otherwise the box would
   * appear to grow upward from its baseline.
   */
  const startResize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    // The input commits on blur, and grabbing the handle blurs it. Without this
    // flag the edit would be committed the instant a drag began and the handle
    // would vanish under the cursor.
    resizingRef.current = true;
    const { scale } = layout;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = editing.rect;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      setEditing((state) =>
        state
          ? {
              ...state,
              rect: {
                ...state.rect,
                coverW: Math.max(2, origin.coverW + dx),
                coverH: Math.max(2, origin.coverH + dy),
                coverY: origin.coverY - Math.max(2 - origin.coverH, dy),
              },
            }
          : state,
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      resizingRef.current = false;
      inputRef.current?.focus();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const addTextAt = (event) => {
    if (!layout) return;
    // A click on bare page area drops the current image selection.
    if (!addMode && !imageMode) setSelectedImage(null);

    // "Add image" shares the same click target as "add text".
    if (imageMode === 'add') {
      const box = event.currentTarget.getBoundingClientRect();
      const { scale, pageHeight } = layout;
      const w = Math.min(layout.pageWidth * 0.35, 220);
      pendingPlacementRef.current = {
        x: (event.clientX - box.left) / scale,
        y: pageHeight - (event.clientY - box.top) / scale - w,
        width: w,
        height: w,
        fit: 'contain',
      };
      imageInputRef.current?.click();
      return;
    }

    if (!addMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const { scale, pageHeight } = layout;
    const fontSize = 12;
    const id = `add-${Date.now()}`;
    const item = {
      id,
      text: '',
      x: px / scale,
      baselineY: pageHeight - py / scale - fontSize,
      width: 160,
      fontSize,
      fontName: 'Helvetica',
    };
    setAddMode(false);
    setEditing({
      id,
      item,
      value: '',
      box: {
        left: px,
        top: py,
        width: 160 * scale,
        height: fontSize * 1.25 * scale,
      },
      isNew: true,
    });
  };

  const commitNew = () => {
    if (!editing?.isNew) return;
    const { item, value } = editing;
    setEditing(null);
    if (!value.trim()) return;
    setEdits((prev) => [
      ...prev,
      {
        id: item.id,
        pageIndex,
        type: 'add',
        text: value,
        x: item.x,
        baselineY: item.baselineY,
        width: item.width,
        fontSize: item.fontSize,
        fontName: item.fontName,
        cover: null,
      },
    ]);
  };

  /* ------------------------------------------------------------ images -- */

  const requirePro = () => {
    if (isPro) return true;
    // Say so before any work is done, never after. Letting someone place an
    // image and then demanding payment to download it is the pattern this
    // whole product exists to be the opposite of.
    setShowProPrompt(true);
    return false;
  };

  /**
   * Turn a picked or pasted image into an edit.
   *
   * The bitmap is decoded and downscaled through the same path the images->PDF
   * tool uses, so a 12MP phone photo does not add 8MB to the document. The
   * decoded element is kept alongside the bytes because the canvas preview has
   * to draw it synchronously.
   */
  const placeImage = useCallback(
    async (file, placement) => {
      setError('');
      try {
        const { bytes, width, height } = await normalizeImage(file);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('That image could not be decoded.'));
          el.src = url;
        });

        // Fit into the target box, preserving the image's own aspect ratio so a
        // replacement never arrives stretched.
        const ratio = width / height;
        let w = placement.width;
        let h = placement.height;
        if (placement.fit === 'contain') {
          if (w / h > ratio) w = h * ratio;
          else h = w / ratio;
        }

        setEdits((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}`,
            pageIndex,
            type: 'image',
            text: '',
            bytes,
            format: 'jpeg',
            img,
            url,
            x: placement.x + (placement.width - w) / 2,
            y: placement.y + (placement.height - h) / 2,
            width: w,
            height: h,
          },
        ]);
      } catch (err) {
        setError(err.message || 'Could not add that image.');
      }
    },
    [pageIndex],
  );

  /** An image edit's rect (PDF space, y = bottom) -> screen box. */
  const imageToScreen = useCallback(
    (edit) => {
      const { scale, pageHeight } = layout;
      return {
        left: edit.x * scale,
        top: (pageHeight - edit.y - edit.height) * scale,
        width: edit.width * scale,
        height: edit.height * scale,
      };
    },
    [layout],
  );

  const updateEdit = (id, patch) =>
    setEdits((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeEdit = (id) => {
    setEdits((prev) => {
      const going = prev.find((e) => e.id === id);
      if (going?.url) URL.revokeObjectURL(going.url);
      return prev.filter((e) => e.id !== id);
    });
    setSelectedImage(null);
  };

  /**
   * Drag a placed image around, or resize it from the corner.
   *
   * Screen y runs downward and PDF y runs upward, so moving down *lowers* the
   * stored y. Resizing has the same wrinkle: the stored y is the bottom edge,
   * so growing the box downward must lower y by the same amount or the image
   * would appear to grow upward out of its own top edge.
   */
  const startImageDrag = (event, edit, mode) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedImage(edit.id);
    const { scale } = layout;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: edit.x, y: edit.y, width: edit.width, height: edit.height };

    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      if (mode === 'move') {
        updateEdit(edit.id, { x: origin.x + dx, y: origin.y - dy });
      } else {
        const width = Math.max(8, origin.width + dx);
        const height = Math.max(8, origin.height + dy);
        updateEdit(edit.id, { width, height, y: origin.y - (height - origin.height) });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /** Cover an existing picture with the page colour behind it. */
  const removePicture = (picture) => {
    if (!requirePro()) return;
    setImageMode(null);
    const screen = imageToScreen({ ...picture, x: picture.x, y: picture.y });
    const cover = canvasRef.current
      ? sampleBackground(canvasRef.current, screen)
      : { r: 255, g: 255, b: 255 };
    setEdits((prev) => [
      ...prev,
      {
        id: `imgcover-${Date.now()}`,
        pageIndex,
        type: 'imageCover',
        text: '',
        x: picture.x,
        y: picture.y,
        width: picture.width,
        height: picture.height,
        cover,
      },
    ]);
  };

  const onImagePicked = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const placement = pendingPlacementRef.current;
    pendingPlacementRef.current = null;
    setImageMode(null);
    if (file && placement) placeImage(file, placement);
  };

  const replacePicture = (picture) => {
    if (!requirePro()) return;
    pendingPlacementRef.current = { ...picture, fit: 'contain' };
    imageInputRef.current?.click();
  };

  /**
   * Paste an image straight from the clipboard.
   *
   * This is how people actually move a screenshot or a signature into a
   * document -- copy, click, paste -- so it is worth supporting directly rather
   * than forcing a save-to-disk round trip first.
   */
  useEffect(() => {
    if (!pdf.file || !layout) return undefined;
    const onPaste = (event) => {
      const item = [...(event.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      if (!requirePro()) return;
      event.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      // Dropped into the middle of the page at a readable size; it can be moved
      // and resized afterwards like any other image edit.
      const w = Math.min(layout.pageWidth * 0.4, 260);
      placeImage(file, {
        x: (layout.pageWidth - w) / 2,
        y: layout.pageHeight / 2 - w / 2,
        width: w,
        height: w,
        fit: 'contain',
      });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.file, layout, isPro, placeImage]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await applyEdits(pdf.buffer, edits);
      saveAs(
        new Blob([bytes], { type: 'application/pdf' }),
        `${(pdf.file?.name || 'document.pdf').replace(/\.pdf$/i, '')}-edited.pdf`,
      );
    } catch (err) {
      setError(err.message || 'Could not save those edits.');
    } finally {
      setBusy(false);
    }
  };

  /** Image edits hold a blob URL for the preview; drop them or they leak. */
  const releaseImages = (list) => list.forEach((e) => e.url && URL.revokeObjectURL(e.url));

  const reset = () => {
    pdf.reset();
    releaseImages(edits);
    setEdits([]);
    setEditing(null);
    setLayout(null);
    setPageImage(null);
    setError('');
    setPageIndex(0);
  };

  const badChars = editing ? unsupportedChars(editing.value) : [];
  const noTextLayer = layout && layout.items.length === 0 && !rendering;

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Edit PDF" blurb={tool.blurb} path={tool.path}>
      {!pdf.file ? (
        <FileDropzone
          onFiles={([f]) => pdf.load(f)}
          title="Drop a PDF here"
          hint="or click to browse — the file stays on your device"
        />
      ) : (
        <LoadedFile
          icon="doc"
          name={pdf.file.name}
          meta={`${pdf.pageCount} pages · ${edits.length} edit${edits.length === 1 ? '' : 's'} pending`}
          onRemove={reset}
        />
      )}

      {pdf.error && (
        <Notice
          heading={pdf.error.includes('password') ? 'This PDF is password-protected' : 'Can’t open that file'}
          body={pdf.error}
          action={
            <button type="button" className="btn btn--sm" style={{ marginTop: 16 }} onClick={reset}>
              Try another file
            </button>
          }
        />
      )}
      {error && <Notice heading="Couldn’t apply that" body={error} />}

      {showProPrompt && !isPro && (
        <Notice
          heading="Image editing needs Pro — free if you’re a student"
          body={
            'Replacing, adding and removing pictures inside a PDF are Pro features. Students get the whole of Pro ' +
            'free with a verified university email. Everything else on this page — editing text, adding text, and ' +
            'every page tool — stays free for everyone. You’re told before you do the work, not after.'
          }
          action={
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <Link to="/pricing" className="btn btn--sm btn--primary">
                See what Pro includes
              </Link>
              <button type="button" className="btn btn--sm" onClick={() => setShowProPrompt(false)}>
                Not now
              </button>
            </div>
          }
        />
      )}

      {noTextLayer && (
        <Notice
          heading="This page has no text to edit"
          body={
            'It looks like a scan — a picture of text rather than text itself, so there is nothing to select or ' +
            'change. You can still add new text on top of it with “Add text”. Editing the scanned words themselves ' +
            'would need OCR, which this tool does not do.'
          }
        />
      )}

      {pdf.file && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            style={{
              padding: '12px 20px',
              borderBottom: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span className="label">Page {pageIndex + 1} / {pdf.pageCount}</span>
            <button
              type="button"
              className="btn btn--sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={pageIndex >= pdf.pageCount - 1}
              onClick={() => setPageIndex((i) => Math.min(pdf.pageCount - 1, i + 1))}
            >
              Next
            </button>
            <button
              type="button"
              className={`btn btn--sm${addMode ? ' btn--primary' : ''}`}
              onClick={() => {
                setImageMode(null);
                setAddMode((v) => !v);
              }}
              style={{ marginLeft: 'auto' }}
            >
              <PixelIcon name="plus" size={2} /> {addMode ? 'Click the page…' : 'Add text'}
            </button>

            <button
              type="button"
              className={`btn btn--sm${imageMode === 'replace' ? ' btn--primary' : ''}`}
              onClick={() => {
                if (!requirePro()) return;
                setAddMode(false);
                setImageMode((m) => (m === 'replace' ? null : 'replace'));
              }}
            >
              {imageMode === 'replace' ? 'Pick a picture…' : 'Replace image'}
              {!isPro && <span className="tag-pro" style={{ marginLeft: 8 }}>PRO</span>}
            </button>

            <button
              type="button"
              className={`btn btn--sm${imageMode === 'add' ? ' btn--primary' : ''}`}
              onClick={() => {
                if (!requirePro()) return;
                setAddMode(false);
                setImageMode((m) => (m === 'add' ? null : 'add'));
              }}
            >
              {imageMode === 'add' ? 'Click the page…' : 'Add image'}
              {!isPro && <span className="tag-pro" style={{ marginLeft: 8 }}>PRO</span>}
            </button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onImagePicked}
            />
          </div>

          <div style={{ padding: 20, overflowX: 'auto' }}>
            <div
              onClick={addTextAt}
              style={{
                position: 'relative',
                width: VIEW_WIDTH,
                margin: '0 auto',
                border: '1px solid var(--hairline)',
                cursor: addMode ? 'crosshair' : 'default',
                background: '#fff',
              }}
            >
              {pageImage && (
                <img src={pageImage} alt={`Page ${pageIndex + 1}`} style={{ width: '100%', display: 'block' }} />
              )}

              {/* Existing pictures: each offers replace or remove. */}
              {layout &&
                imageMode === 'replace' &&
                (layout.pictures || []).map((picture) => {
                  const { scale, pageHeight } = layout;
                  return (
                    <div
                      key={picture.id}
                      data-picture={picture.id}
                      style={{
                        position: 'absolute',
                        left: picture.x * scale,
                        top: (pageHeight - picture.y - picture.height) * scale,
                        width: picture.width * scale,
                        height: picture.height * scale,
                        border: '2px solid var(--accent)',
                        background: 'rgba(230,46,46,0.14)',
                        zIndex: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        aria-label="Replace this image"
                        onClick={(e) => {
                          e.stopPropagation();
                          replacePicture(picture);
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        aria-label="Remove this image"
                        style={{ background: 'var(--bg)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removePicture(picture);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}

              {/* Placed images: draggable, resizable, removable. */}
              {layout &&
                !addMode &&
                !imageMode &&
                edits
                  .filter((e) => e.type === 'image' && e.pageIndex === pageIndex)
                  .map((edit) => {
                    const box = imageToScreen(edit);
                    const selected = selectedImage === edit.id;
                    return (
                      <div
                        key={edit.id}
                        data-image-edit={edit.id}
                        onPointerDown={(e) => startImageDrag(e, edit, 'move')}
                        // pointerdown selects, but the click that follows still
                        // bubbles to the page container, whose handler clears
                        // the selection -- so the box deselected itself the
                        // instant it was picked.
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: box.left,
                          top: box.top,
                          width: box.width,
                          height: box.height,
                          border: selected
                            ? '2px solid var(--accent)'
                            : '1px dashed rgba(230,46,46,0.55)',
                          cursor: 'move',
                          zIndex: 3,
                          touchAction: 'none',
                        }}
                      >
                        {selected && (
                          <>
                            <span
                              role="slider"
                              tabIndex={0}
                              aria-label="Resize image"
                              aria-valuenow={Math.round(edit.width)}
                              onPointerDown={(e) => startImageDrag(e, edit, 'resize')}
                              style={{
                                position: 'absolute',
                                right: -7,
                                bottom: -7,
                                width: 14,
                                height: 14,
                                background: 'var(--accent)',
                                cursor: 'nwse-resize',
                                touchAction: 'none',
                              }}
                            />
                            <button
                              type="button"
                              aria-label="Delete image"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEdit(edit.id);
                              }}
                              style={{
                                position: 'absolute',
                                right: -10,
                                top: -10,
                                width: 20,
                                height: 20,
                                padding: 0,
                                border: 0,
                                background: 'var(--ink)',
                                color: 'var(--bg)',
                                fontWeight: 900,
                                cursor: 'pointer',
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}

              {/* Editable text runs, positioned over the rendered page. */}
              {layout &&
                !addMode &&
                !imageMode &&
                layout.items.map((item) => {
                  const box = boxFor(item);
                  const changed = edits.some((e) => e.id === item.id);
                  if (editing?.id === item.id) return null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      // mousedown, not click, with the default prevented: that
                      // stops the browser moving focus to this button at all,
                      // so the inline input can take it cleanly.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        beginEdit(item);
                      }}
                      data-text-run={item.id}
                      title={item.text}
                      style={{
                        position: 'absolute',
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        padding: 0,
                        border: 0,
                        // The page itself now shows the edit, so an edited run
                        // only needs a thin marker underneath. Filling it with
                        // colour used to hide the very result being previewed.
                        borderBottom: changed ? '2px solid var(--accent)' : '2px solid transparent',
                        background: 'transparent',
                        cursor: 'text',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(230,46,46,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    />
                  );
                })}

              {/* The area that will be painted over, drawn so it can be seen
                  and dragged before committing. */}
              {editing && !editing.isNew && layout && (
                <div
                  style={{
                    position: 'absolute',
                    ...(() => {
                      const s = rectToScreen(editing.rect);
                      return { left: s.left, top: s.top, width: s.width, height: s.height };
                    })(),
                    border: '1px dashed var(--accent)',
                    background: 'rgba(230,46,46,0.06)',
                    pointerEvents: 'none',
                    zIndex: 4,
                  }}
                >
                  <span
                    onPointerDown={startResize}
                    role="slider"
                    tabIndex={0}
                    aria-label="Resize cover area"
                    aria-valuenow={Math.round(editing.rect.coverW)}
                    style={{
                      position: 'absolute',
                      right: -6,
                      bottom: -6,
                      width: 12,
                      height: 12,
                      background: 'var(--accent)',
                      cursor: 'nwse-resize',
                      pointerEvents: 'auto',
                    }}
                  />
                </div>
              )}

              {/* Inline editor sitting exactly where the text is. */}
              {editing && (
                <input
                  ref={inputRef}
                  value={editing.value}
                  aria-label="Edit text"
                  onChange={(e) => setEditing((s) => ({ ...s, value: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => {
                    if (resizingRef.current) return;
                    if (editing.isNew) commitNew();
                    else commitEdit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  style={{
                    position: 'absolute',
                    left: editing.box.left,
                    top: editing.box.top,
                    width: Math.max(editing.box.width, 120),
                    height: editing.box.height,
                    fontSize: Math.max(11, editing.item.fontSize * (layout?.scale || 1)),
                    fontFamily: 'inherit',
                    border: '2px solid var(--accent)',
                    background: '#fff',
                    color: '#111',
                    padding: '0 2px',
                    zIndex: 5,
                  }}
                />
              )}
            </div>

            {badChars.length > 0 && (
              <p style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>
                “{badChars.join(' ')}” can’t be written — built-in fonts cover Latin characters only.
              </p>
            )}
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderTop: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy || edits.length === 0}>
              Save &amp; download
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                releaseImages(edits);
                setEdits([]);
              }}
              disabled={edits.length === 0}
            >
              Discard edits
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              {rendering ? 'Rendering page…' : `${edits.length} edit${edits.length === 1 ? '' : 's'} ready`}
            </span>
          </div>

          {/* The one thing a user must not misunderstand. Replaced text is
              painted over, not deleted -- it is still in the file and still
              extractable by anything that reads PDFs. Someone covering their
              address would otherwise believe it was gone. */}
          {edits.some((e) => e.type === 'replace' || e.type === 'image' || e.type === 'imageCover') && (
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--danger)',
                  marginTop: 5,
                  flex: 'none',
                }}
              />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                <strong>Covered, not removed.</strong>{' '}
                <span className="muted">
                  Replaced text, and pictures you replace or delete, are all painted over — the
                  originals stay inside the file and can still be recovered, text by copy-paste and
                  images by any PDF extraction tool. Deleting a picture here hides it; it does not
                  erase it. This is how every cover-and-replace editor works. Don’t use it to hide
                  sensitive information — that needs true redaction, which we haven’t shipped yet.
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {busy && <Working label="Writing changes locally…" percent={100} />}
    </ToolShell>
  );
}
