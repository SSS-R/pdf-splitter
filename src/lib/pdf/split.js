import { PDFDocument } from 'pdf-lib';
import { parseRange } from './ranges.js';
import { loadPdf } from './document.js';

/**
 * Split a PDF into one document per range string.
 *
 * Returns one result per input range, always in the same order:
 *
 *   { rangeStr, bytes: Uint8Array | null, pageCount, warnings }
 *
 * A range that matched no pages comes back with `bytes: null` and its warnings
 * intact, so the UI can name the range that produced nothing. The old version
 * returned bare nulls that got filtered away, and the user just silently
 * received fewer files than they asked for.
 */
export const splitPdf = async (fileArrayBuffer, ranges) => {
  const originalPdf = await loadPdf(fileArrayBuffer);
  const totalPages = originalPdf.getPageCount();

  const results = [];

  for (const rangeStr of ranges) {
    const { pages, warnings } = parseRange(rangeStr, totalPages);

    if (pages.length === 0) {
      results.push({ rangeStr, bytes: null, pageCount: 0, warnings });
      continue;
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(originalPdf, pages);
    copiedPages.forEach((page) => newPdf.addPage(page));

    results.push({
      rangeStr,
      bytes: await newPdf.save(),
      pageCount: newPdf.getPageCount(),
      warnings,
    });
  }

  return results;
};

export const getPageCount = async (fileArrayBuffer) => {
  const pdf = await loadPdf(fileArrayBuffer);
  return pdf.getPageCount();
};
