# TODOS

## Prerender routes to static HTML (Phase 0.3, remaining half)
- **What:** Generate a real HTML file per route at build time (`vite-react-ssg`, or React Router's framework-mode prerender) instead of one empty shell plus a 404 fallback.
- **Why:** Every tool now has its own URL, but a crawler that doesn't run JavaScript still sees an empty `<div id="root">`. Bing, DuckDuckGo, AI crawlers and link-preview bots frequently don't execute JS, so the per-tool SEO copy is currently invisible to them. This is the load-bearing half of the SEO plan.
- **Pros:** Real content in the HTML for every tool page; instant first paint; link previews work; the `dist/404.html` SPA fallback becomes unnecessary.
- **Cons:** Build-config migration; components must not touch `window`/`localStorage` during render (the theme script in `index.html` and `usePro`'s `getServerSnapshot` already account for this).
- **Context:** Routes live in `src/App.jsx` (lazy-loaded). `vite.config.js` currently copies `index.html` to `404.html` as a stopgap for deep links. Per-tool copy for each landing page still needs writing (~300-500 words each, ROADMAP Phase 0.5).
- **Depends on / blocked by:** Nothing. This is the next build step.

## Move compression into a Web Worker
- **What:** Run `src/lib/pdf/compress.js` in a Web Worker with OffscreenCanvas, with a main-thread fallback for Safari < 16.4.
- **Why:** Compression currently runs on the main thread, yielding between images so progress can paint. That keeps the UI alive on normal files, but a large scanned document will still make the tab stutter.
- **Pros:** Big documents stay smooth; progress reporting gets accurate; no jank on low-end laptops.
- **Cons:** Worker plumbing plus a Safari fallback path; transferring ArrayBuffers needs care to avoid copying large buffers twice.
- **Context:** `compressPdf()` already takes an `onProgress` callback and is pure aside from its canvas use, so the port is mostly moving the canvas work behind `postMessage`. See the PERF NOTE comment at the top of that file.
- **Depends on / blocked by:** Nothing.

## PWA / service worker for true offline support
- **What:** Add a service worker + web manifest so the site loads with no internet connection and can be installed as an app.
- **Why:** The SEO strategy targets "split pdf offline" keywords and the Phase 1 license design includes a 7-day offline grace period — but without a service worker the site itself won't open offline once the tab closes. The claim and the reality currently diverge.
- **Pros:** Makes the headline "offline" claim literally true; install-as-app is a retention hook for repeat professional users; pairs with the privacy pitch (an installed toolkit that provably phones home for nothing but license checks).
- **Cons:** Service worker cache invalidation is a classic footgun — a bad strategy can pin users to stale builds; needs cache-busting discipline with Vite's hashed assets and testing across deploys.
- **Context:** React 19 + Vite 7, moving to Cloudflare Pages. Use `vite-plugin-pwa` with network-first for HTML and cache-first for hashed assets. Until this ships, SEO copy must say "works offline once loaded", not "works offline".
- **Depends on / blocked by:** Prerendering (stable asset pipeline) should land first.

## Playwright E2E suite
- **What:** Browser tests for the flows unit tests can't reach: upload → split → download a valid PDF, the merge free-limit gate, license activation, and a prerender view-source assertion per route.
- **Why:** ROADMAP Phase 0.2 calls for Playwright from Phase 0. Vitest covers the PDF logic (38 tests) but nothing currently proves the real pages work in a browser across a refactor.
- **Pros:** Catches wiring regressions the unit tests structurally cannot; required before the payment flow ships in Phase 1.
- **Cons:** Slower CI; file-upload tests need fixture PDFs committed to the repo.
- **Context:** `playwright` is already installed as a dev dependency. Test plan with the exact flows to cover lives at `~/.gstack/projects/pdfsplitter/Rafi-main-eng-review-test-plan-20260718-212900.md`.
- **Depends on / blocked by:** Nothing.
