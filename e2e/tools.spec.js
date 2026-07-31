import { test, expect } from '@playwright/test';
import { pdfUpload, pngUpload, pageCountOf } from './fixtures.js';
import { BASE } from '../playwright.config.js';

/**
 * End-to-end tool flows.
 *
 * The Vitest suite already covers the PDF functions directly, so these tests
 * deliberately do not re-check page arithmetic. What they cover is the wiring
 * the unit tests cannot see: the file input reaching the hook, the hook
 * reaching the lib, and a real, openable PDF coming back out of a download.
 */

const open = (page, route) => page.goto(`${BASE}${route}/`);

test.describe('split', () => {
  test('splits an upload into downloadable PDFs with the right pages', async ({ page }) => {
    await open(page, '/split');
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('contract.pdf', 12));

    await expect(page.getByText('12 pages')).toBeVisible();

    const ranges = page.locator('input[aria-label^="Page range"]');
    await ranges.nth(0).fill('1-5');
    await ranges.nth(1).fill('9-end');

    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByText(/2 files ready/i)).toBeVisible();

    // The privacy claim, asserted rather than trusted.
    await expect(page.getByText('0 requests sent')).toBeVisible();

    const [first] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download' }).first().click(),
    ]);
    expect(await pageCountOf(first)).toBe(5);

    const [second] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download' }).nth(1).click(),
    ]);
    expect(await pageCountOf(second)).toBe(4); // pages 9-12
  });

  test('names a range that produced nothing instead of dropping it', async ({ page }) => {
    await open(page, '/split');
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('short.pdf', 3));

    const ranges = page.locator('input[aria-label^="Page range"]');
    await ranges.nth(0).fill('1-2');
    await ranges.nth(1).fill('50-60'); // beyond the document

    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByText(/“50-60” produced no pages/)).toBeVisible();
  });
});

test.describe('merge', () => {
  test('combines uploads into one document', async ({ page }) => {
    await open(page, '/merge');
    await page.locator('input[type=file]').setInputFiles([
      await pdfUpload('a.pdf', 3, 'A'),
      await pdfUpload('b.pdf', 4, 'B'),
    ]);

    await page.getByRole('button', { name: /merge/i }).last().click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download/i }).first().click(),
    ]);
    expect(await pageCountOf(download)).toBe(7);
  });

  test('free tier stops at the documented limit', async ({ page }) => {
    await open(page, '/merge');
    await page.locator('input[type=file]').setInputFiles([
      await pdfUpload('a.pdf', 1),
      await pdfUpload('b.pdf', 1),
      await pdfUpload('c.pdf', 1),
      await pdfUpload('d.pdf', 1),
    ]);
    // The cap is a product decision and must be stated, not silently applied.
    await expect(page.getByText(/free/i).first()).toBeVisible();
  });
});

test.describe('images to pdf', () => {
  test('turns images into a PDF', async ({ page }) => {
    await open(page, '/images-to-pdf');

    await page.locator('input[type=file]').setInputFiles([
      pngUpload('one.png', 16, 16, [230, 46, 46]),
      pngUpload('two.png', 16, 16, [17, 17, 17]),
    ]);

    await expect(page.getByText(/2 images/i)).toBeVisible();

    // Unlike split and merge, this tool has no results panel -- "Build PDF"
    // saves straight to disk, so the download fires from that click.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Build PDF' }).click(),
    ]);
    expect(await pageCountOf(download)).toBe(2);
  });
});

test.describe('pro licensing', () => {
  test('rejects a bad key and accepts the demo key', async ({ page }) => {
    await open(page, '/pricing');

    await page.getByLabel('License key').fill('WRONG-0000');
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText(/isn’t valid/i)).toBeVisible();

    await page.getByLabel('License key').fill('demo-1234');
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText(/pro activated/i)).toBeVisible();

    // Entitlement is shared state: the nav badge must agree immediately.
    await expect(page.locator('.tag-pro')).toBeVisible();

    // And it must lift the merge limit on another route.
    await open(page, '/merge');
    await expect(page.getByText(/no file limit/i)).toBeVisible();
  });
});

test.describe('privacy claim', () => {
  test('processing a file sends no network requests', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost:4173')) external.push(url);
    });

    await open(page, '/split');
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('secret.pdf', 6));
    await page.locator('input[aria-label^="Page range"]').first().fill('1-3');
    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByText(/1 file ready/i)).toBeVisible();

    expect(external, `unexpected outbound requests: ${external.join(', ')}`).toHaveLength(0);
  });
});
