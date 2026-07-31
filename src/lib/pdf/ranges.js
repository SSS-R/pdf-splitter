/**
 * Page-range parsing.
 *
 *   "1"        -> [0]
 *   "1-5"      -> [0,1,2,3,4]
 *   "1,3,5"    -> [0,2,4]
 *   "10-end"   -> [9 .. totalPages-1]
 *
 * Input is 1-indexed (what a human types); output is 0-indexed (what pdf-lib
 * wants). Anything unparseable is reported in `warnings` rather than silently
 * dropped -- a typo used to just vanish, leaving the user with fewer files and
 * no explanation.
 */
export const parseRange = (rangeStr, totalPages) => {
  const warnings = [];
  if (!rangeStr || !rangeStr.trim()) return { pages: [], warnings };

  const pages = new Set();

  rangeStr.split(',').forEach((rawPart) => {
    const part = rawPart.trim();
    if (!part) return;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim().toLowerCase());
      const openEnded = endStr === 'end';
      let start = parseInt(startStr, 10);
      let end = openEnded ? totalPages : parseInt(endStr, 10);

      if (Number.isNaN(start) || Number.isNaN(end)) {
        warnings.push(`Couldn't read "${part}" — expected something like 1-5 or 10-end.`);
        return;
      }

      // "10-end" on a 6-page document is not a reversed range -- it is an open
      // range that begins past the document. Resolving `end` to totalPages made
      // it *look* reversed (10-6), and the swap below then emitted pages 6..10,
      // handing pdf-lib indices that don't exist. Bail before the swap can see it.
      if (openEnded && start > totalPages) {
        warnings.push(`"${part}" starts past the end of this ${totalPages}-page document.`);
        return;
      }

      if (start > totalPages && end > totalPages) {
        warnings.push(`"${part}" is past the end of this ${totalPages}-page document.`);
        return;
      }

      // Only now can a swap mean what it looks like: genuinely reversed input
      // such as "5-2". Swap before clamping so the clamp can't invent a range.
      if (start > end) [start, end] = [end, start];

      start = Math.max(1, start);
      end = Math.min(totalPages, end);

      if (start > end) {
        warnings.push(`"${part}" doesn't cover any pages in this ${totalPages}-page document.`);
        return;
      }

      for (let i = start; i <= end; i++) pages.add(i - 1);
    } else {
      const page = parseInt(part, 10);
      if (Number.isNaN(page)) {
        warnings.push(`Couldn't read "${part}" — expected a page number.`);
        return;
      }
      if (page < 1 || page > totalPages) {
        warnings.push(`Page ${page} doesn't exist in this ${totalPages}-page document.`);
        return;
      }
      pages.add(page - 1);
    }
  });

  return { pages: Array.from(pages).sort((a, b) => a - b), warnings };
};
