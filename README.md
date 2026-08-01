# PDF Tools — your files never leave your device

A free PDF toolkit that runs entirely in your browser. No uploads, no accounts, no server. Open devtools, watch the Network tab, and process a file — you'll see zero requests. That's the whole point.

### 🔗 [Use it live → sss-r.github.io/pdf-splitter](https://sss-r.github.io/pdf-splitter/)

---

## Tools

| Tool | What it does |
|---|---|
| **Split** | Pull page ranges (`1-5, 8, 12-end`) into separate PDFs |
| **Merge** | Combine documents in the order you choose |
| **Compress** | Re-encode embedded images to shrink oversized files |
| **Reorder** | Move, rotate and delete pages |
| **Images → PDF** | Turn JPG/PNG scans and photos into one PDF |

## Why client-side

Most online PDF tools upload your file to a server, process it there, and ask you to trust a privacy policy. That's a poor trade for a contract, a medical record, or a bank statement.

Everything here runs in the browser with [pdf-lib](https://pdf-lib.js.org/). Your file is read into memory, processed, and handed back as a download. It is never transmitted, because there is nothing to transmit it to — the site is static files on a CDN.

Two honest caveats:

- **Compression is image-only.** It re-encodes embedded JPEGs and never rasterises pages, so text stays selectable. A PDF that's mostly CCITT/JBIG2 scans won't shrink much, and the tool says so rather than pretending.
- **"Offline" means once loaded.** The page itself still has to be fetched. A service worker for true offline use is [on the list](TODOS.md).

## Development

```bash
npm install
npm run dev
```

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Run the Vitest suite (38 tests over the PDF logic) |
| `npm run build` | Client build → SSR build → prerender to static HTML |
| `npm run preview` | Serve the built site locally |
| `npm run lint` | ESLint |

### Build pipeline

`npm run build` is three steps. Each route is prerendered to its own HTML file so crawlers and link-preview bots get real content instead of an empty `<div id="root">`:

1. `vite build` — client bundle
2. `vite build --ssr` — Node bundle of the same route tree
3. `scripts/prerender.js` — renders each route, injects per-route metadata from `src/lib/seo.js`, and writes `sitemap.xml` + `robots.txt`

pdf-lib is lazy-loaded per route, so the landing page ships ~78 kB gzipped rather than the whole PDF engine.

## Structure

```
src/
├── routes/       one component per URL
├── components/   FileDropzone, Layout, ToolShell, PixelIcon
├── hooks/        usePdfFile, useTheme, usePro
└── lib/
    ├── pdf/      pure, DOM-free PDF functions + tests
    └── seo.js    per-route metadata (feeds prerender + sitemap)
```

PDF logic is kept free of DOM access so it can be unit-tested directly and later moved into a Web Worker.

## Licence

Proprietary — © 2026 Sultan Sajed Shahriar / Indevoria. All rights reserved.
See [LICENSE](LICENSE).

This was previously described as MIT in this README. No `LICENSE` file was ever
committed, and the repository has no forks, so nothing was distributed under
those terms.

The privacy claim never depended on the source being public and still doesn't:
open devtools, watch the Network tab, and process a file. Zero requests is
something you observe, not something you take on trust.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). PDF.js is Apache-2.0 and
requires attribution, which that file provides.
