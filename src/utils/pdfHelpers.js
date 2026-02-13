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
 * Splits a PDF into multiple documents based on provided ranges.
 * @param {ArrayBuffer} fileArrayBuffer - The loaded PDF file
 * @param {string[]} ranges - Array of range strings
 * @returns {Promise<Uint8Array[]>} - Array of PDF bytes
 */
export const splitPdf = async (fileArrayBuffer, ranges) => {
  const originalPdf = await PDFDocument.load(fileArrayBuffer, { ignoreEncryption: true });
  const totalPages = originalPdf.getPageCount();

  const results = [];

  for (const rangeStr of ranges) {
    const pages = parseRange(rangeStr, totalPages);

    // Create new PDF for this range
    const newPdf = await PDFDocument.create();
    if (pages.length > 0) {
      const copiedPages = await newPdf.copyPages(originalPdf, pages);
      copiedPages.forEach(page => newPdf.addPage(page));
    }

    // Only save if it has pages or if we want to allow empty PDFs (usually no)
    if (newPdf.getPageCount() > 0) {
      const pdfBytes = await newPdf.save();
      results.push(pdfBytes);
    } else {
      results.push(null); // Or handle empty ranges gracefully
    }
  }

  return results;
};

/**
 * Merges multiple PDF files into a single PDF document.
 * @param {ArrayBuffer[]} fileBuffers - Array of PDF file ArrayBuffers
 * @returns {Promise<Uint8Array>} - The merged PDF bytes
 */
export const mergePdfs = async (fileBuffers) => {
  if (!fileBuffers || fileBuffers.length < 2) {
    throw new Error('Please provide at least 2 PDF files to merge.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const buffer of fileBuffers) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
};
