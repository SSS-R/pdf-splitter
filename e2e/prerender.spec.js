import { test, expect } from '@playwright/test';
import { ROUTES, ROUTE_META } from '../src/lib/seo.js';
import { BASE } from '../playwright.config.js';

/**
 * Guards the prerender pipeline.
 *
 * These assertions run against the *raw* HTTP response, with no JavaScript
 * involved, because that is what a crawler without a JS engine sees. A test
 * driven through the browser would pass even if prerendering silently broke,
 * since the client would fill the page in either way -- which is exactly how
 * the file-saver CJS bug shipped blank tool pages without anything failing.
 */

/** Text inside #root, tags stripped -- what a crawler actually reads. */
const rootText = (html) => {
  const start = html.indexOf('<div id="root">');
  if (start === -1) return '';
  const body = html.slice(start + 15, html.lastIndexOf('</div>'));
  return body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const url = (route) => `${BASE}${route === '/' ? '/' : `${route}/`}`;

test.describe('prerendered HTML', () => {
  for (const route of ROUTES) {
    test(`${route} serves real content without JavaScript`, async ({ request }) => {
      const res = await request.get(url(route));
      expect(res.status()).toBe(200);
      const html = await res.text();

      // The failure this exists to catch: a shell with an empty root.
      const text = rootText(html);
      expect(text.length, `${route} prerendered almost nothing`).toBeGreaterThan(100);
      expect(text, `${route} shipped the lazy fallback`).not.toContain('Loading tool');

      // Metadata must be the route's own, not the template default.
      const meta = ROUTE_META[route];
      expect(html).toContain(`<title>${meta.title.replace(/&/g, '&amp;')}</title>`);
      expect(html).toContain(`<link rel="canonical" href="https://sss-r.github.io${url(route)}"`);
    });
  }

  test('every tool page carries enough copy to rank', async ({ request }) => {
    const toolRoutes = ['/split', '/merge', '/compress', '/reorder', '/images-to-pdf'];
    for (const route of toolRoutes) {
      const html = await (await request.get(url(route))).text();
      const words = rootText(html).split(' ').filter(Boolean).length;
      // ROADMAP 0.5 target is 300-500 words; 250 is the floor before it is
      // "thin content" again.
      expect(words, `${route} has only ${words} words`).toBeGreaterThan(250);
    }
  });

  test('tool pages emit valid FAQPage structured data', async ({ request }) => {
    for (const route of ['/split', '/merge', '/compress', '/reorder', '/images-to-pdf']) {
      const html = await (await request.get(url(route))).text();
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      expect(match, `${route} has no JSON-LD`).not.toBeNull();
      const parsed = JSON.parse(match[1]);
      expect(parsed['@type']).toBe('FAQPage');
      expect(parsed.mainEntity.length).toBeGreaterThan(2);
    }
  });

  test('sitemap and robots list every route', async ({ request }) => {
    const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
    for (const route of ROUTES) {
      expect(sitemap).toContain(`<loc>https://sss-r.github.io${url(route)}</loc>`);
    }
    const robots = await (await request.get(`${BASE}/robots.txt`)).text();
    expect(robots).toContain('Sitemap: https://sss-r.github.io/pdf-splitter/sitemap.xml');
  });

  test('social card points at an image that exists', async ({ request }) => {
    const html = await (await request.get(url('/'))).text();
    const src = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    expect(src, 'no og:image emitted').toBeTruthy();
    // A summary_large_image card whose image 404s renders as a broken preview.
    const img = await request.get(src.replace('https://sss-r.github.io', ''));
    expect(img.status(), 'og:image is a dead link').toBe(200);
    expect(html).toContain('content="summary_large_image"');
  });

  test('ships its own favicon, generated from the logo bitmap', async ({ request }) => {
    // The project served Vite's default logo as its favicon for a long time.
    // Content types are asserted deliberately: a missing file falls through to
    // the SPA shell and answers 200 with HTML, which looks passing until you
    // check what actually came back.
    const svg = await request.get(`${BASE}/favicon.svg`);
    expect(svg.status()).toBe(200);
    expect(svg.headers()['content-type']).toContain('image/svg+xml');
    expect(await svg.text()).toContain('<svg');

    for (const file of ['favicon-32.png', 'favicon-16.png', 'apple-touch-icon.png']) {
      const res = await request.get(`${BASE}/${file}`);
      expect(res.status(), `${file} missing`).toBe(200);
      expect(res.headers()['content-type'], `${file} is not a PNG`).toContain('image/png');
    }

    // And the page points at them rather than at the framework default.
    const html = await (await request.get(`${BASE}/`)).text();
    expect(html).toContain('href="/pdf-splitter/favicon.svg"');
    expect(html).not.toContain('vite.svg');
  });

  test('unknown paths serve a shell the client router can take over', async ({ request }) => {
    const res = await request.get(`${BASE}/404.html`);
    expect(res.status()).toBe(200);
    // Must NOT be a copy of the prerendered home, or the wrong page flashes.
    expect(await res.text()).toContain('<div id="root"></div>');
  });
});
