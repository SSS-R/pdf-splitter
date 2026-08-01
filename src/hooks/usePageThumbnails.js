import { useEffect, useState } from 'react';
import { openForRender, renderPages } from '../lib/pdf/render.js';

/**
 * Render every page of a loaded PDF to a thumbnail.
 *
 * Thumbnails arrive progressively rather than in one batch: rendering is
 * CPU-bound, and a long document would otherwise show nothing at all for
 * several seconds and then everything at once. Pages fill in as they finish.
 *
 * Rotation is deliberately NOT baked into the image. The reorder UI rotates
 * thumbnails with a CSS transform, which is instant and free; re-rendering the
 * page on every rotate would make the control feel broken on a big file.
 */
export function usePageThumbnails(buffer, pageCount, { width = 150 } = {}) {
  const [thumbs, setThumbs] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!buffer || !pageCount) {
      setThumbs(new Map());
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    let doc = null;
    setThumbs(new Map());
    setLoading(true);
    setError('');

    (async () => {
      try {
        doc = await openForRender(buffer);
        if (cancelled) return;

        const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
        await renderPages(doc, pageNumbers, { width }, (pageNumber, url) => {
          if (cancelled || !url) return;
          // Keyed 0-indexed to match the page plan, which speaks pdf-lib's
          // language rather than PDF.js's 1-indexed page numbers.
          setThumbs((prev) => new Map(prev).set(pageNumber - 1, url));
        });
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not render page previews.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // Release the worker and its decoded page cache; without this, loading
      // several documents in a row leaks a PDF.js instance each time.
      doc?.destroy();
    };
  }, [buffer, pageCount, width]);

  return { thumbs, loading, error };
}
