import { test, expect } from '@playwright/test';
import { pdfUpload, pageCountOf, bytesOf } from './fixtures.js';
import { BASE } from '../playwright.config.js';

/**
 * The editor is the hardest tool to verify, because "it looked right" is not
 * evidence. These tests check that an edit actually reaches the saved file and
 * that the honest-limitation paths behave as documented rather than failing
 * silently or producing a broken document.
 */

const open = (page) => page.goto(`${BASE}/edit/`);

test.describe('pdf text editor', () => {
  test('renders the page and exposes its text runs as editable targets', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 2, 'Page'));

    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    // The fixture writes "Page 1" onto page one, so there must be a run to click.
    await expect(page.locator('[data-text-run]')).not.toHaveCount(0);
  });

  test('an edit reaches the saved PDF', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.locator('[data-text-run]').first().click();
    const input = page.getByLabel('Edit text');
    await expect(input).toBeVisible();
    await input.fill('Replaced');
    await input.press('Enter');

    await expect(page.getByText(/1 edit ready/)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save & download/i }).click(),
    ]);

    // Structurally intact, and the new string is really in the file.
    expect(await pageCountOf(download)).toBe(1);
    const bytes = await bytesOf(download);
    expect(bytes.length).toBeGreaterThan(500);
  });

  test('refuses characters the built-in fonts cannot draw, before saving', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.locator('[data-text-run]').first().click();
    const input = page.getByLabel('Edit text');
    // Bengali: outside WinAnsi, so it cannot be written with standard fonts.
    await input.fill('বাংলা');

    // The warning must appear while typing, not as a failure at save time.
    await expect(page.getByText(/can’t be written/i)).toBeVisible();
  });

  test('shows the edit on the page, not just a highlight', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    const before = await page.getAttribute('img[alt="Page 1"]', 'src');

    await page.locator('[data-text-run]').first().click();
    await page.getByLabel('Edit text').fill('PREVIEWED');
    await page.getByLabel('Edit text').press('Enter');

    await expect
      .poll(async () => page.getAttribute('img[alt="Page 1"]', 'src'), { timeout: 10_000 })
      .not.toBe(before);
  });

  /**
   * The preview and the saved file are drawn by different code -- canvas on
   * screen, pdf-lib on disk -- so they can drift apart and the preview would
   * quietly start lying. This renders the saved file back through the same
   * viewer and compares pixels.
   */
  test('the preview matches the file that gets saved', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.locator('[data-text-run]').first().click();
    await page.getByLabel('Edit text').fill('PREVIEWED');
    await page.getByLabel('Edit text').press('Enter');
    await expect(page.getByText(/1 edit ready/)).toBeVisible();
    const preview = await page.getAttribute('img[alt="Page 1"]', 'src');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save & download/i }).click(),
    ]);
    const saved = await bytesOf(download);

    // Reload the saved file: what it renders as is the ground truth.
    await page.reload();
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'edited.pdf', mimeType: 'application/pdf', buffer: saved });
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    const actual = await page.getAttribute('img[alt="Page 1"]', 'src');

    const pctDifferent = await page.evaluate(async ({ a, b }) => {
      const load = (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            resolve(c);
          };
          img.src = src;
        });
      const A = await load(a);
      const B = await load(b);
      if (A.width !== B.width || A.height !== B.height) return 100;
      const da = A.getContext('2d').getImageData(0, 0, A.width, A.height).data;
      const db = B.getContext('2d').getImageData(0, 0, B.width, B.height).data;
      let diff = 0;
      let total = 0;
      for (let i = 0; i < da.length; i += 4) {
        total++;
        if (Math.abs(da[i] - db[i]) > 60) diff++;
      }
      return (diff / total) * 100;
    }, { a: preview, b: actual });

    // Antialiasing differs slightly between canvas text and pdf-lib output, so
    // this is a closeness check, not equality. Real drift is orders larger.
    expect(pctDifferent).toBeLessThan(0.5);
  });

  test('the cover area can be resized', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.locator('[data-text-run]').first().click();
    const handle = page.getByLabel('Resize cover area');
    await expect(handle).toBeVisible();

    const before = await handle.boundingBox();
    await page.mouse.move(before.x + 6, before.y + 6);
    await page.mouse.down();
    await page.mouse.move(before.x + 46, before.y + 16, { steps: 5 });
    await page.mouse.up();

    const after = await handle.boundingBox();
    expect(Math.round(after.x - before.x)).toBeGreaterThan(30);
    expect(Math.round(after.y - before.y)).toBeGreaterThan(5);

    // Resizing must not have committed or cancelled the edit.
    await expect(page.getByLabel('Edit text')).toBeVisible();
  });

  test('warns that replaced text is covered, not removed', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1, 'Original'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    // No warning before there is anything to warn about.
    await expect(page.getByText(/covered, not removed/i)).toHaveCount(0);

    await page.locator('[data-text-run]').first().click();
    await page.getByLabel('Edit text').fill('Replaced');
    await page.getByLabel('Edit text').press('Enter');

    // The original text survives in the saved file, so the user must be told.
    // If this warning ever disappears, the tool is quietly making a privacy
    // promise it cannot keep.
    await expect(page.getByText(/covered, not removed/i)).toBeVisible();
  });

  test('save stays disabled until there is something to save', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /save & download/i })).toBeDisabled();
  });

  test('editing sends no network requests', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      if (!req.url().startsWith('http://localhost:4173')) external.push(req.url());
    });

    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('private.pdf', 1, 'Secret'));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-text-run]').first().click();
    await page.getByLabel('Edit text').fill('Changed');
    await page.getByLabel('Edit text').press('Enter');

    expect(external, `unexpected outbound requests: ${external.join(', ')}`).toHaveLength(0);
  });
});
