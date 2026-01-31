import { PDFDocument } from 'pdf-lib';

/**
 * Parses a range string into an array of 0-based page indices.
 * Supported formats: "1", "1-5", "1,3,5", "10-end"
 * @param {string} rangeStr - The range string entered by user (1-indexed)
 * @param {number} totalPages - Total pages in the PDF
 * @returns {number[]} - Sorted unique array of 0-based page indices
 */
export const parseRange = (rangeStr, totalPages) => {
  if (!rangeStr.trim()) return [];

  const pages = new Set();
  const parts = rangeStr.split(',').map(p => p.trim());

  parts.forEach(part => {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim().toLowerCase());
      let start = parseInt(startStr);
      let end = endStr === 'end' ? totalPages : parseInt(endStr);

      if (isNaN(start) || isNaN(end)) return;

      // Ensure valid bounds
      start = Math.max(1, start);
      end = Math.min(totalPages, end);

      // Swap if start > end
      if (start > end) [start, end] = [end, start];

      for (let i = start; i <= end; i++) {
        pages.add(i - 1); // Convert to 0-based
      }
    } else {
      let page = parseInt(part);
      if (!isNaN(page)) {
          if (page >= 1 && page <= totalPages) {
              pages.add(page - 1);
          }
      }
    }
  });

  return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Splits a PDF into two documents based on provided ranges.
 * @param {ArrayBuffer} fileArrayBuffer - The loaded PDF file
 * @param {string} range1Str - Range string for first PDF
 * @param {string} range2Str - Range string for second PDF
 * @returns {Promise<{pdf1: Uint8Array, pdf2: Uint8Array}>}
 */
export const splitPdf = async (fileArrayBuffer, range1Str, range2Str) => {
  const originalPdf = await PDFDocument.load(fileArrayBuffer);
  const totalPages = originalPdf.getPageCount();

  const pages1 = parseRange(range1Str, totalPages);
  const pages2 = parseRange(range2Str, totalPages);

  if (pages1.length === 0 && pages2.length === 0) {
      throw new Error("Both ranges are empty or invalid.");
  }

  // Create PDF 1
  const pdf1 = await PDFDocument.create();
  if (pages1.length > 0) {
    const copiedPages1 = await pdf1.copyPages(originalPdf, pages1);
    copiedPages1.forEach(page => pdf1.addPage(page));
  }

  // Create PDF 2
  const pdf2 = await PDFDocument.create();
  if (pages2.length > 0) {
    const copiedPages2 = await pdf2.copyPages(originalPdf, pages2);
    copiedPages2.forEach(page => pdf2.addPage(page));
  }

  const pdf1Bytes = await pdf1.save();
  const pdf2Bytes = await pdf2.save();

  return { pdf1: pdf1Bytes, pdf2: pdf2Bytes };
};
