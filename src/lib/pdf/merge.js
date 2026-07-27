import { PDFDocument } from 'pdf-lib';
import { loadPdf } from './document.js';

/**
 * Merge PDFs into one document, preserving the order given.
 *
 * @param {ArrayBuffer[]} fileBuffers
 * @returns {Promise<Uint8Array>}
 */
export const mergePdfs = async (fileBuffers) => {
  if (!fileBuffers || fileBuffers.length < 2) {
    throw new Error('Pick at least 2 PDFs to merge.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const buffer of fileBuffers) {
    const pdf = await loadPdf(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
};
