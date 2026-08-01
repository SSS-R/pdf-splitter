import { test, expect } from '@playwright/test';
import { pdfUpload } from './fixtures.js';
import { BASE } from '../playwright.config.js';

/**
 * The account page is where the "no server" claim is easiest to break by
 * accident: a usage counter is normally implemented by reporting each action
 * home. These tests check both that it works and that it stays local.
 */

const account = (page) => page.goto(`${BASE}/account/`);

test.describe('account', () => {
  test('shows Free until a key is entered, then the tier', async ({ page }) => {
    await account(page);
    await expect(page.locator('h1')).toHaveText(/^Free$/i);
    await expect(page.getByText(/nothing yet/i)).toBeVisible();

    await page.getByLabel('License key').fill('demo-1234');
    await page.getByRole('button', { name: 'Activate' }).click();

    await expect(page.locator('h1')).toHaveText(/^Pro$/i);
    await expect(page.locator('.tag-pro')).toHaveText(/^Pro$/i);
    // No key field once activated -- there is nothing left to enter.
    await expect(page.getByLabel('License key')).toHaveCount(0);
  });

  test('a student key reads as Student, not Pro', async ({ page }) => {
    await account(page);
    await page.getByLabel('License key').fill('edu-1234');
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.locator('h1')).toHaveText(/^Student$/i);
    await expect(page.locator('.tag-pro')).toHaveText(/^Student$/i);
  });

  test('the licence survives a reload — there is no session to expire', async ({ page }) => {
    await account(page);
    await page.getByLabel('License key').fill('demo-1234');
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.locator('h1')).toHaveText(/^Pro$/i);

    await page.reload();
    await expect(page.locator('h1')).toHaveText(/^Pro$/i);

    // And across a fresh navigation, not just a reload.
    await page.goto(`${BASE}/`);
    await account(page);
    await expect(page.locator('h1')).toHaveText(/^Pro$/i);
  });

  test('counts tool use locally and sends nothing', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      if (!req.url().startsWith('http://localhost:4173')) external.push(req.url());
    });

    await page.goto(`${BASE}/split/`);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('n.pdf', 8));
    await page.locator('input[aria-label^="Page range"]').first().fill('1-3');
    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByText(/file.? ready/i)).toBeVisible();

    await account(page);
    await expect(page.getByText(/1 file processed/)).toBeVisible();

    // The whole point: the count exists and nothing was reported.
    expect(external, `unexpected outbound requests: ${external.join(', ')}`).toHaveLength(0);
  });

  test('usage can be reset', async ({ page }) => {
    await page.goto(`${BASE}/split/`);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('n.pdf', 4));
    await page.locator('input[aria-label^="Page range"]').first().fill('1-2');
    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByText(/file.? ready/i)).toBeVisible();

    await account(page);
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText(/nothing yet/i)).toBeVisible();
  });

  test('the theme toggle animates through frames rather than snapping', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const pixel = 'button[aria-label^="Switch to"] span span';

    await page.getByRole('button', { name: /switch to/i }).click();
    const seen = new Set();
    for (let i = 0; i < 6; i += 1) {
      seen.add(await page.evaluate((sel) => document.querySelector(sel).style.boxShadow, pixel));
      await page.waitForTimeout(40);
    }
    // More than two distinct glyphs means it passed through the morph frames
    // instead of swapping sun for moon in one step.
    expect(seen.size).toBeGreaterThan(2);
  });
});
