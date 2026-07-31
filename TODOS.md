# TODOS

## Write 300–500 words of real copy per tool page
- **What:** Genuine explanatory copy on each tool route — how it works, why client-side matters, honest limitations. Currently each tool page prerenders ~350 *characters*.
- **Why:** Prerendering now puts whatever is on the page into the HTML, so this is the step that actually converts into rankings. Thin pages don't rank no matter how clean the markup is. Long-tail targets: "split pdf offline", "pdf splitter no upload", "merge pdf without uploading".
- **Pros:** The one remaining lever on organic traffic, which gates the whole Phase 1 paywall decision (~500 visitors/month).
- **Cons:** Writing time, not engineering time. Must stay honest — no keyword-stuffed filler, which would undercut the trust the whole pitch rests on.
- **Context:** Copy belongs in the route components (`src/routes/*.jsx`); it gets prerendered automatically. Per-route titles/descriptions already live in `src/lib/seo.js`.
- **Depends on / blocked by:** Nothing.

## Save the OG preview image (one click — generator is built)
- **What:** Open `scripts/og-image.html` in a browser, click "Download og-default.png", and save it to `public/og-default.png`. Nothing else — the build detects the file and upgrades the card automatically.
- **Why:** Link previews on Hacker News, Reddit, Slack and X currently render as a small text-only card. The Show HN post is the highest-traffic moment planned, and a large-image card is meaningfully more clickable.
- **Pros:** One click. The generator is committed, so the image can be regenerated whenever branding changes rather than being a mystery binary in the repo.
- **Cons:** Requires the manual click — Node has no canvas, and adding a headless browser or `sharp` purely to render one image isn't worth a dependency on a project that just removed six.
- **Context:** `headFor()` in `scripts/prerender.js` checks whether `public/og-default.png` exists: present → `og:image` + `summary_large_image`; absent → plain `summary`. A large-image card pointing at a missing file renders broken, which is worse than no image, so the card type follows reality. The generator quantises to the three brand colours, which removes font antialiasing and halves the PNG (~68 kB → ~34 kB).
- **Depends on / blocked by:** Nothing. Do this **before** posting anywhere.

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
- **Context:** Playwright is **not** installed (an earlier note here claimed it was — it isn't; `npm i -D @playwright/test` plus `npx playwright install` is step one). Test plan with the exact flows to cover lives at `~/.gstack/projects/pdfsplitter/Rafi-main-eng-review-test-plan-20260718-212900.md`. A headless browser would also let `scripts/og-image.html` be rendered in CI instead of by hand.
- **Depends on / blocked by:** Nothing.
