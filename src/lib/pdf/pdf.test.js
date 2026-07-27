import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPdf, getPageCount } from './split.js';
import { mergePdfs } from './merge.js';
import { applyPagePlan, initialPlan } from './reorder.js';
import { computeFitSize } from './imagesToPdf.js';
import { hasPdfMagicBytes, EncryptedPdfError, InvalidPdfError, loadPdf } from './document.js';

/** Build an n-page PDF in memory to operate on. */
const makePdf = async (pageCount) => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([600, 800]);
  const bytes = await doc.save();
  // Return a real ArrayBuffer, which is what a FileReader hands the app.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

describe('splitPdf', () => {
  it('produces one result per range, in order', async () => {
    const src = await makePdf(24);
    const results = await splitPdf(src, ['1-5', '10-end']);
    expect(results).toHaveLength(2);
    expect(results[0].rangeStr).toBe('1-5');
    expect(results[1].rangeStr).toBe('10-end');
  });

  it('puts the right number of pages in each output', async () => {
    const src = await makePdf(24);
    const [first, second] = await splitPdf(src, ['1-5', '10-end']);
    expect(first.pageCount).toBe(5);
    expect(second.pageCount).toBe(15);
  });

  it('emits real, re-openable PDFs', async () => {
    const src = await makePdf(10);
    const [result] = await splitPdf(src, ['2-4']);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getPageCount()).toBe(3);
  });

  // The regression this shape exists to prevent: a range that matches nothing
  // used to disappear, leaving the user with fewer files and no explanation.
  it('reports an empty range instead of dropping it', async () => {
    const src = await makePdf(8);
    const results = await splitPdf(src, ['1-3', '90-99']);
    expect(results).toHaveLength(2);
    expect(results[1].bytes).toBeNull();
    expect(results[1].rangeStr).toBe('90-99');
    expect(results[1].warnings.length).toBeGreaterThan(0);
  });

  it('handles a single-page range', async () => {
    const src = await makePdf(5);
    const [result] = await splitPdf(src, ['3']);
    expect(result.pageCount).toBe(1);
  });

  it('reads the page count', async () => {
    expect(await getPageCount(await makePdf(12))).toBe(12);
  });
});

describe('mergePdfs', () => {
  it('refuses fewer than two files', async () => {
    await expect(mergePdfs([])).rejects.toThrow(/at least 2/i);
    await expect(mergePdfs([await makePdf(1)])).rejects.toThrow(/at least 2/i);
  });

  it('sums the page counts', async () => {
    const merged = await mergePdfs([await makePdf(3), await makePdf(4)]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(7);
  });

  it('merges more than two documents', async () => {
    const merged = await mergePdfs([await makePdf(1), await makePdf(2), await makePdf(3)]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(6);
  });
});

describe('applyPagePlan', () => {
  it('reorders pages to the plan order', async () => {
    const src = await makePdf(4);
    const out = await applyPagePlan(src, [
      { index: 3, rotation: 0 },
      { index: 0, rotation: 0 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it('deletes by omission', async () => {
    const src = await makePdf(5);
    const out = await applyPagePlan(src, initialPlan(5).filter((p) => p.index !== 2));
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(4);
  });

  it('applies rotation', async () => {
    const src = await makePdf(1);
    const out = await applyPagePlan(src, [{ index: 0, rotation: 90 }]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('refuses to produce an empty document', async () => {
    const src = await makePdf(3);
    await expect(applyPagePlan(src, [])).rejects.toThrow(/at least one page/i);
  });

  it('ignores out-of-range entries in a plan', async () => {
    const src = await makePdf(2);
    const out = await applyPagePlan(src, [{ index: 0 }, { index: 99 }]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(1);
  });

  it('builds a full plan for a fresh document', () => {
    expect(initialPlan(3)).toEqual([
      { index: 0, rotation: 0, id: 'page-0' },
      { index: 1, rotation: 0, id: 'page-1' },
      { index: 2, rotation: 0, id: 'page-2' },
    ]);
  });
});

describe('document guards', () => {
  it('accepts bytes that start with %PDF-', async () => {
    expect(hasPdfMagicBytes(await makePdf(1))).toBe(true);
  });

  it('rejects bytes that do not', () => {
    expect(hasPdfMagicBytes(new TextEncoder().encode('hello there').buffer)).toBe(false);
  });

  it('throws InvalidPdfError on garbage', async () => {
    const junk = new TextEncoder().encode('definitely not a pdf').buffer;
    await expect(loadPdf(junk)).rejects.toBeInstanceOf(InvalidPdfError);
  });

  it('exposes a friendly encrypted-PDF message', () => {
    expect(new EncryptedPdfError().message).toMatch(/password-protected/i);
  });
});

describe('computeFitSize', () => {
  it('leaves small images alone', () => {
    expect(computeFitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales a landscape image by its longest edge', () => {
    expect(computeFitSize(4800, 2400)).toEqual({ width: 2400, height: 1200 });
  });

  it('scales a portrait image by its longest edge', () => {
    expect(computeFitSize(2400, 4800)).toEqual({ width: 1200, height: 2400 });
  });

  it('respects a custom max edge', () => {
    expect(computeFitSize(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });
});
