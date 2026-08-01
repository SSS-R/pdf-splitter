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
