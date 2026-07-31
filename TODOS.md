# TODOS

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
