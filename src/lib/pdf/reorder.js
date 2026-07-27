import { PDFDocument, degrees } from 'pdf-lib';
import { loadPdf } from './document.js';

/**
 * Rebuild a PDF from a page plan.
 *
 * The plan is an ordered list describing the output document:
 *
 *   [{ index: 0, rotation: 90 }, { index: 4, rotation: 0 }, ...]
 *
 * Deletion is expressed by omission -- a page missing from the plan is simply
 * not copied. Order is the plan's order, so reorder/rotate/delete are all the
 * same operation and there is only one code path to test.
 */
export const applyPagePlan = async (fileArrayBuffer, plan) => {
  const source = await loadPdf(fileArrayBuffer);
  const total = source.getPageCount();

  const valid = plan.filter((p) => p.index >= 0 && p.index < total);
  if (valid.length === 0) {
    throw new Error('No pages left — keep at least one page in the document.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, valid.map((p) => p.index));

  copied.forEach((page, i) => {
    const rotation = valid[i].rotation || 0;
    if (rotation) {
      const current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + rotation) % 360));
    }
    out.addPage(page);
  });

  return out.save();
};

/** Starting plan for a freshly loaded document: every page, unrotated, in order. */
export const initialPlan = (pageCount) =>
  Array.from({ length: pageCount }, (_, index) => ({
    index,
    rotation: 0,
    id: `page-${index}`,
  }));
