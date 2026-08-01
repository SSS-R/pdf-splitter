/**
 * Per-route metadata — the single source of truth for <title>, meta description,
 * Open Graph tags, and sitemap generation.
 *
 * This lives in plain JS (not JSX) so the prerender script can import it in Node
 * without pulling React in, and so the sitemap can never drift from the routes.
 *
 * Titles target the long-tail phrasing people actually search: "split pdf
 * offline", "merge pdf without uploading", "compress pdf without upload". The
 * differentiator goes in the title because it is the differentiator -- every
 * competitor ranks for "split pdf", none of them can say "without uploading".
 */

/**
 * Canonical ORIGIN only -- no path. The subpath comes from Vite's `base`, so
 * these must never both carry "/pdf-splitter" or canonical URLs double it.
 * Update this the moment the custom domain is attached (ROADMAP 0.1); it feeds
 * canonical links, OG urls, and sitemap.xml.
 */
export const SITE_URL = 'https://sss-r.github.io';

export const SITE_NAME = 'PDF Splitter';

export const ROUTE_META = {
  '/': {
    title: 'PDF Splitter — Split, Merge & Compress PDFs Without Uploading',
    description:
      'Free PDF tools that run entirely in your browser. Split, merge, compress, reorder and convert images to PDF — your files never leave your device. No uploads, no accounts, verifiable in devtools.',
    changefreq: 'weekly',
    priority: '1.0',
  },
  '/split': {
    title: 'Split PDF Offline — No Upload, No Account | PDF Splitter',
    description:
      'Split a PDF into separate files by page range, entirely in your browser. Nothing is uploaded to a server. Free, no sign-up, works offline once loaded.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/merge': {
    title: 'Merge PDF Without Uploading — Free & Private | PDF Splitter',
    description:
      'Combine multiple PDFs into one in the order you choose. Runs on your device, so confidential documents never touch a server. Free and requires no account.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/compress': {
    title: 'Compress PDF Without Upload — Honest Results | PDF Splitter',
    description:
      'Shrink oversized PDFs in your browser by re-encoding embedded images. Text stays selectable — pages are never flattened to pictures. Tells you honestly when a file cannot be compressed further.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/reorder': {
    title: 'Reorder, Rotate & Delete PDF Pages Online — Private | PDF Splitter',
    description:
      'Rearrange, rotate or remove pages from a PDF without uploading it. Everything happens locally in your browser. Free, no account, no watermarks.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/images-to-pdf': {
    title: 'Convert Images to PDF Offline — JPG & PNG | PDF Splitter',
    description:
      'Turn photos and scans into a single PDF in your browser. Images are rotated upright and downscaled so the file stays a sensible size. Nothing is uploaded.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/edit': {
    title: 'Edit PDF Text Without Uploading — Free & Private | PDF Splitter',
    description:
      'Change the text already inside a PDF, entirely in your browser. No upload, no account, no hourly limit — unlike editors that send your document to a server and promise to delete it later.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/pricing': {
    title: 'Pricing — One Fair Price, Lifetime | PDF Splitter',
    description:
      'The everyday tools are free forever with no account. Pro unlocks batch processing for a single lifetime payment — no subscription, no upsell treadmill.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  '/privacy': {
    title: 'Privacy — Every Network Request, Documented | PDF Splitter',
    description:
      'A complete list of every network request this site makes, and why. Your PDFs are never among them: file processing happens entirely on your device.',
    changefreq: 'monthly',
    priority: '0.7',
  },
};

/** Routes to prerender and list in the sitemap, in sitemap order. */
export const ROUTES = Object.keys(ROUTE_META);

/** Fall back to the home metadata for anything unlisted. */
export const metaFor = (path) => ROUTE_META[path] || ROUTE_META['/'];
