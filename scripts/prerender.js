/**
 * Static prerender: turns the SPA shell into one real HTML file per route.
 *
 * Why this exists: giving each tool its own URL only pays off if a crawler can
 * read it. A client-rendered route serves `<div id="root"></div>` and nothing
 * else, so search engines that don't execute JavaScript -- and most link-preview
 * and AI crawlers don't -- see an empty page. This bakes the rendered markup and
 * the per-route metadata into the file itself.
 *
 * Run via `npm run build`, which does: vite build (client) -> vite build --ssr
 * -> this script. Requires both builds to have completed.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ROUTES, ROUTE_META, SITE_URL } from '../src/lib/seo.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');
const ssrEntry = join(projectRoot, 'dist-ssr', 'entry-server.js');

/** Vite's `base`, e.g. "/pdf-splitter/". Canonical URLs must include it. */
const BASE = process.env.VITE_BASE || '/pdf-splitter/';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Join origin + base + route into one canonical absolute URL.
 *
 * Always ends in a trailing slash, because each route is written to disk as
 * `<route>/index.html`. A host asked for "/split" has to *guess* (most 301 to
 * "/split/", but that is host behaviour, not a guarantee); asked for "/split/"
 * it serves the directory index directly. Advertising the unambiguous form in
 * canonical tags and the sitemap keeps crawlers off the redirect path.
 */
const canonicalFor = (route) => {
  const origin = SITE_URL.replace(/\/+$/, '');
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return origin + (route === '/' ? base : `${base}${route.replace(/^\//, '')}/`);
};

const headFor = (route) => {
  const meta = ROUTE_META[route];
  const canonical = canonicalFor(route);
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="PDF Tools" />`,
    `<meta property="og:type" content="website" />`,
    // Deliberately "summary", not "summary_large_image": there is no OG image
    // yet, and a large-image card with no image renders as a broken preview.
    // Switch to summary_large_image when og-default.png ships (TODOS.md).
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n  ');
};

const buildSitemap = () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ROUTES.map((route) => {
    const { changefreq, priority } = ROUTE_META[route];
    return [
      '  <url>',
      `    <loc>${canonicalFor(route)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

const buildRobots = () =>
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${canonicalFor('/')}sitemap.xml`, ''].join('\n');

async function main() {
  if (!existsSync(ssrEntry)) {
    throw new Error(`SSR bundle missing at ${ssrEntry} — run \`vite build --ssr\` first.`);
  }

  const template = readFileSync(join(distDir, 'index.html'), 'utf8');
  if (!template.includes('<!--seo-start-->')) {
    throw new Error('index.html is missing the <!--seo-start--> marker; prerender cannot inject metadata.');
  }

  const { render } = await import(pathToFileURL(ssrEntry).href);

  for (const route of ROUTES) {
    const appHtml = await render(route);

    const html = template
      .replace(
        /<!--seo-start-->[\s\S]*?<!--seo-end-->/,
        `<!--seo-start-->\n  ${headFor(route)}\n  <!--seo-end-->`,
      )
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    // "/" is dist/index.html; "/split" is dist/split/index.html so the static
    // host serves it at the extensionless URL without a rewrite rule.
    const outPath =
      route === '/' ? join(distDir, 'index.html') : join(distDir, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf8');
    console.log(`  prerendered ${route.padEnd(16)} -> ${outPath.replace(projectRoot, '.')}`);
  }

  writeFileSync(join(distDir, 'sitemap.xml'), buildSitemap(), 'utf8');
  writeFileSync(join(distDir, 'robots.txt'), buildRobots(), 'utf8');
  console.log('  wrote sitemap.xml + robots.txt');

  // 404.html gets the *empty* shell, not a copy of the prerendered home: an
  // unknown path must let the client router decide what to show, and shipping
  // home's markup there would flash the wrong page first.
  const notFound = template.replace(
    /<!--seo-start-->[\s\S]*?<!--seo-end-->/,
    `<!--seo-start-->\n  ${headFor('/')}\n  <!--seo-end-->`,
  );
  writeFileSync(join(distDir, '404.html'), notFound, 'utf8');

  rmSync(join(projectRoot, 'dist-ssr'), { recursive: true, force: true });
}

main().catch((error) => {
  console.error('\nPrerender failed:', error);
  process.exit(1);
});
