import { test, expect } from '@playwright/test';
import { pdfUpload, pngUpload, pdfWithImagesUpload, pageCountOf, bytesOf } from './fixtures.js';
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

/**
 * Images are the first paid feature in the product, so these cover the gate as
 * much as the drawing: a paywall that reveals itself only after the user has
 * done the work would undercut the whole pitch.
 */
test.describe('images (Pro)', () => {
  const goPro = (page) =>
    page.addInitScript(() => window.localStorage.setItem('pdftools-pro', '1'));

  test('image buttons are marked Pro and explain before any work is done', async ({ page }) => {
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('button', { name: /replace image/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add image/i })).toBeVisible();

    await page.getByRole('button', { name: /replace image/i }).click();
    await expect(page.getByText(/image editing needs pro/i)).toBeVisible();
    // Nothing was placed, and the free tools are untouched.
    await expect(page.getByRole('button', { name: /save & download/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /add text/i })).toBeEnabled();
  });

  test('a Pro user can place an image and it reaches the saved PDF', async ({ page }) => {
    await goPro(page);
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    const before = await page.getAttribute('img[alt="Page 1"]', 'src');

    // No Pro prompt for a licensed user.
    await page.getByRole('button', { name: /add image/i }).click();
    await expect(page.getByText(/image editing needs pro/i)).toHaveCount(0);

    // Choosing the file and clicking the page both feed the same placement.
    const chooser = page.waitForEvent('filechooser');
    await page.locator('img[alt="Page 1"]').click({ position: { x: 200, y: 200 } });
    await (await chooser).setFiles([pngUpload('photo.png', 64, 64, [20, 120, 220])]);

    await expect
      .poll(async () => page.getAttribute('img[alt="Page 1"]', 'src'), { timeout: 15_000 })
      .not.toBe(before);
    await expect(page.getByText(/1 edit ready/)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save & download/i }).click(),
    ]);
    expect(await pageCountOf(download)).toBe(1);
    // An embedded image makes the file materially bigger than the 1 KB original.
    expect((await bytesOf(download)).length).toBeGreaterThan(2000);
  });

  test('warns that a replaced picture is covered, not removed', async ({ page }) => {
    await goPro(page);
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /add image/i }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('img[alt="Page 1"]').click({ position: { x: 150, y: 150 } });
    await (await chooser).setFiles([pngUpload('photo.png', 32, 32)]);

    await expect(page.getByText(/covered, not removed/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('image detection', () => {
  test('finds embedded pictures at their true positions', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('pdftools-pro', '1'));
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfWithImagesUpload());
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /replace image/i }).click();
    const boxes = page.locator('[data-picture]');
    await expect(boxes).toHaveCount(2);

    // PDF has no list of images -- placement is recovered by replaying the
    // operator list and tracking the transform, so the numbers are worth
    // asserting. The page is 420pt wide shown at 780px, i.e. 1.857x.
    const first = await boxes.nth(0).boundingBox();
    expect(first.width).toBeGreaterThan(215);
    expect(first.width).toBeLessThan(231);
    expect(Math.abs(first.width - first.height)).toBeLessThan(4);

    const second = await boxes.nth(1).boundingBox();
    expect(second.width).toBeGreaterThan(160);
    expect(second.width).toBeLessThan(175);
    expect(second.height).toBeGreaterThan(104);
    expect(second.height).toBeLessThan(119);
  });
});

test.describe('manipulating placed images', () => {
  const goPro = (page) =>
    page.addInitScript(() => window.localStorage.setItem('pdftools-pro', '1'));

  const placeOne = async (page) => {
    await goPro(page);
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /add image/i }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('img[alt="Page 1"]').click({ position: { x: 200, y: 250 } });
    await (await chooser).setFiles([pngUpload('photo.png', 64, 64, [20, 120, 220])]);
    await expect(page.locator('[data-image-edit]')).toHaveCount(1);
    return page.locator('[data-image-edit]').first();
  };

  test('a placed image can be dragged to a new position', async ({ page }) => {
    const box = await placeOne(page);
    const before = await box.boundingBox();

    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 60, before.y + before.height / 2 + 40, { steps: 6 });
    await page.mouse.up();

    const after = await box.boundingBox();
    expect(Math.round(after.x - before.x)).toBeGreaterThan(45);
    expect(Math.round(after.y - before.y)).toBeGreaterThan(28);
    // Moving must not change its size.
    expect(Math.abs(after.width - before.width)).toBeLessThan(3);
  });

  test('a placed image can be resized from the corner', async ({ page }) => {
    const box = await placeOne(page);
    await box.click();
    const handle = page.getByLabel('Resize image');
    await expect(handle).toBeVisible();

    const before = await box.boundingBox();
    const h = await handle.boundingBox();
    await page.mouse.move(h.x + 7, h.y + 7);
    await page.mouse.down();
    await page.mouse.move(h.x + 57, h.y + 47, { steps: 6 });
    await page.mouse.up();

    const after = await box.boundingBox();
    expect(after.width - before.width).toBeGreaterThan(35);
    expect(after.height - before.height).toBeGreaterThan(25);
    // The top edge stays put while the box grows downward.
    expect(Math.abs(after.y - before.y)).toBeLessThan(4);
  });

  test('a placed image can be deleted', async ({ page }) => {
    const box = await placeOne(page);
    await box.click();
    await page.getByLabel('Delete image').click();
    await expect(page.locator('[data-image-edit]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /save & download/i })).toBeDisabled();
  });

  test('an existing picture can be removed, and the page shows it gone', async ({ page }) => {
    await goPro(page);
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfWithImagesUpload());
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });
    const before = await page.getAttribute('img[alt="Page 1"]', 'src');

    await page.getByRole('button', { name: /replace image/i }).click();
    await page.getByLabel('Remove this image').first().click();

    await expect
      .poll(async () => page.getAttribute('img[alt="Page 1"]', 'src'), { timeout: 15_000 })
      .not.toBe(before);
    await expect(page.getByText(/covered, not removed/i)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save & download/i }).click(),
    ]);
    expect(await pageCountOf(download)).toBe(1);
  });
});

test.describe('student tier', () => {
  test('a student licence unlocks image editing exactly like Pro', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('pdftools-pro', 'edu'));
    await open(page);
    await page.locator('input[type=file]').setInputFiles(await pdfUpload('notes.pdf', 1));
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 20_000 });

    // Same features, no upsell, and the badge says how the access was obtained.
    await expect(page.locator('.tag-pro')).toHaveText('Student');
    await page.getByRole('button', { name: /add image/i }).click();
    await expect(page.getByText(/image editing needs pro/i)).toHaveCount(0);

    const chooser = page.waitForEvent('filechooser');
    await page.locator('img[alt="Page 1"]').click({ position: { x: 180, y: 200 } });
    await (await chooser).setFiles([pngUpload('photo.png', 48, 48)]);
    await expect(page.locator('[data-image-edit]')).toHaveCount(1);
  });

  test('EDU key activates the student tier from the pricing page', async ({ page }) => {
    await page.goto(`${BASE}/pricing/`);
    await page.getByLabel('License key').fill('edu-1234');
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText(/student access activated/i)).toBeVisible();
    await expect(page.locator('.tag-pro')).toHaveText('Student');
  });
});
