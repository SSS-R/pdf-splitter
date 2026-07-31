import { describe, it, expect } from 'vitest';
import { parseRange } from './ranges.js';

const pagesOf = (str, total) => parseRange(str, total).pages;

describe('parseRange', () => {
  it('parses a single page (1-indexed in, 0-indexed out)', () => {
    expect(pagesOf('1', 10)).toEqual([0]);
    expect(pagesOf('7', 10)).toEqual([6]);
  });

  it('parses a simple range inclusively', () => {
    expect(pagesOf('1-5', 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it('parses a comma list', () => {
    expect(pagesOf('1,3,5', 10)).toEqual([0, 2, 4]);
  });

  it('mixes ranges and singles, sorted and deduped', () => {
    expect(pagesOf('5,1-3,2', 10)).toEqual([0, 1, 2, 4]);
  });

  it('understands "end"', () => {
    expect(pagesOf('8-end', 10)).toEqual([7, 8, 9]);
    expect(pagesOf('8-END', 10)).toEqual([7, 8, 9]);
  });

  it('tolerates whitespace', () => {
    expect(pagesOf('  1 - 3 ,  6  ', 10)).toEqual([0, 1, 2, 5]);
  });

  it('swaps reversed bounds instead of returning nothing', () => {
    expect(pagesOf('5-2', 10)).toEqual([1, 2, 3, 4]);
  });

  it('clamps a range that overruns the document', () => {
    const { pages, warnings } = parseRange('8-99', 10);
    expect(pages).toEqual([7, 8, 9]);
    expect(warnings).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(pagesOf('', 10)).toEqual([]);
    expect(pagesOf('   ', 10)).toEqual([]);
  });

  // --- the reporting behaviour the old silent version lacked ---

  it('warns instead of silently dropping an unreadable token', () => {
    const { pages, warnings } = parseRange('abc', 10);
    expect(pages).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('abc');
  });

  it('warns when a single page is out of bounds', () => {
    const { pages, warnings } = parseRange('99', 10);
    expect(pages).toEqual([]);
    expect(warnings[0]).toContain('99');
  });

  it('warns when a whole range sits past the end', () => {
    const { pages, warnings } = parseRange('50-60', 10);
    expect(pages).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('warns on page 0 (humans count from 1)', () => {
    const { pages, warnings } = parseRange('0', 10);
    expect(pages).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('keeps good parts of a partly-bad list and warns about the rest', () => {
    const { pages, warnings } = parseRange('1-2,oops,5', 10);
    expect(pages).toEqual([0, 1, 4]);
    expect(warnings).toHaveLength(1);
  });

  it('warns on a half-written range like "3-"', () => {
    const { pages, warnings } = parseRange('3-', 10);
    expect(pages).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  /**
   * Regression: "10-end" on a 6-page document used to emit pages 6..10.
   * `end` resolved to totalPages (6), which made the range look reversed
   * (10-6); the swap then produced 6-10 and handed pdf-lib four indices that
   * don't exist, crashing copyPages with "Cannot read properties of undefined
   * (reading 'node')". Found by the Playwright suite, not by these tests --
   * every case here happened to use a start within the document.
   */
  it('warns when an open-ended range starts past the last page', () => {
    const { pages, warnings } = parseRange('10-end', 6);
    expect(pages).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/past the end/i);
  });

  it('never emits an index beyond the document for any open-ended range', () => {
    for (const total of [1, 3, 6, 20]) {
      for (const start of [1, 2, total, total + 1, total + 9]) {
        const { pages } = parseRange(`${start}-end`, total);
        for (const p of pages) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(total);
        }
      }
    }
  });

  it('still treats a genuinely reversed range as the range meant', () => {
    expect(parseRange('5-2', 10).pages).toEqual([1, 2, 3, 4]);
  });

  it('clamps a reversed range that overshoots the document', () => {
    // "10-3" on 6 pages means pages 3..6, not an error.
    expect(parseRange('10-3', 6).pages).toEqual([2, 3, 4, 5]);
  });

  it('still resolves a valid open-ended range', () => {
    expect(parseRange('10-end', 12).pages).toEqual([9, 10, 11]);
    expect(parseRange('1-end', 3).pages).toEqual([0, 1, 2]);
  });
});
