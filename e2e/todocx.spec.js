import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { bytesOf } from './fixtures.js';
import { BASE } from '../playwright.config.js';

/**
 * PDF -> DOCX.
 *
 * A .docx is a ZIP of XML parts, written here by hand. The failure mode that
 * matters is a package Word refuses to open, and that is invisible from the UI
 * -- the download succeeds and the file is broken. So these tests unpack the
 * result and parse the XML rather than checking that bytes arrived.
 */

/** A document shaped like a real lab sheet: title, headings, wrapped prose. */
async function labSheet() {
  const d = await PDFDocument.create();
  const reg = await d.embedFont(StandardFonts.Helvetica);
  const bold = await d.embedFont(StandardFonts.HelveticaBold);
  const p1 = d.addPage([595, 842]);
  p1.drawText('Lab 1.5.2: Basic Router Configuration', { x: 60, y: 780, size: 16, font: bold });
  p1.drawText('Learning Objectives', { x: 60, y: 730, size: 13, font: bold });
  p1.drawText('Upon completion of this lab, you will be able to cable a', { x: 60, y: 700, size: 11, font: reg });
  p1.drawText('network according to the Topology Diagram and perform', { x: 60, y: 686, size: 11, font: reg });
  p1.drawText('basic configuration tasks on a router.', { x: 60, y: 672, size: 11, font: reg });
  const p2 = d.addPage([595, 842]);
  p2.drawText('Task 1: Observe HTTP traffic', { x: 60, y: 780, size: 13, font: bold });
  return { name: 'lab.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) };
}

/** A scan: a page with an image and no text layer at all. */
async function scanned() {
  const d = await PDFDocument.create();
  d.addPage([595, 842]);
  return { name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) };
}

const open = (page) => page.goto(`${BASE}/pdf-to-docx/`);

test.describe('pdf to word', () => {
  test('produces a package Word can open, with structure intact', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await labSheet());
    await page.getByRole('button', { name: /convert to word/i }).click();

    const button = page.getByRole('button', { name: /download \.docx/i });
    await expect(button).toBeVisible({ timeout: 30_000 });

    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
    const bytes = await bytesOf(download);

    // Real ZIP: local file header signature, and the parts a .docx requires.
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const raw = bytes.toString('latin1');
    expect(raw).toContain('[Content_Types].xml');
    expect(raw).toContain('_rels/.rels');
    expect(raw).toContain('word/document.xml');

    // Well-formed XML is what Word actually rejects on, so parse it.
    // Anchor on <w:document itself: "word/document.xml" also appears inside
    // [Content_Types].xml as an Override, so searching for the filename lands
    // in the wrong part and slices across two of them.
    const docStart = raw.indexOf('<w:document');
    const xmlStart = raw.lastIndexOf('<?xml', docStart);
    const end = raw.indexOf('</w:document>', docStart) + '</w:document>'.length;
    const xml = raw.slice(xmlStart, end);
    const parsed = await page.evaluate((x) => {
      const doc = new DOMParser().parseFromString(x, 'application/xml');
      const err = doc.querySelector('parsererror');
      return {
        error: err ? err.textContent.slice(0, 120) : null,
        paragraphs: doc.getElementsByTagName('w:p').length,
        bold: doc.getElementsByTagName('w:b').length,
        text: doc.documentElement.textContent,
      };
    }, xml);

    expect(parsed.error, 'document.xml is not well-formed XML').toBeNull();
    expect(parsed.paragraphs).toBeGreaterThan(4);
    // Headings are bold; the fixture has three.
    expect(parsed.bold).toBeGreaterThanOrEqual(3);
    expect(parsed.text).toContain('Basic Router Configuration');
    // Wrapped lines are rejoined -- a PDF line break is layout, not a sentence.
    expect(parsed.text).toContain('able to cable a network according to');
  });

  test('says so plainly when a PDF has no text layer', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await scanned());
    await page.getByRole('button', { name: /convert to word/i }).click();

    // Scoped to the result card: the phrase also appears in the page's
    // long-form copy, which explains the same limitation.
    await expect(page.getByText(/^No text found$/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/This PDF has no text layer/i)).toBeVisible();
    // No download offered for an empty result.
    await expect(page.getByRole('button', { name: /download \.docx/i })).toHaveCount(0);
  });

  test('converting sends nothing', async ({ page }) => {
    const external = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://localhost:4173')) external.push(r.url());
    });

    await open(page);
    await page.locator('input[type=file]').setInputFiles(await labSheet());
    await page.getByRole('button', { name: /convert to word/i }).click();
    await expect(page.getByRole('button', { name: /download \.docx/i })).toBeVisible({ timeout: 30_000 });

    expect(external, `unexpected outbound requests: ${external.join(', ')}`).toHaveLength(0);
  });
});
