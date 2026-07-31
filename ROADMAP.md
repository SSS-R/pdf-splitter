# PDF Tools — Monetization Roadmap

> Full plan: `~/.gstack/projects/pdfsplitter/Rafi-main-design-20260718-205139.md` (approved 2026-07-18, eng-reviewed same day).
> Test plan: `~/.gstack/projects/pdfsplitter/Rafi-main-eng-review-test-plan-20260718-212900.md`
> Deferred items: [TODOS.md](TODOS.md)

**Goal:** grow the free client-side PDF tool into a small income source (~$20–50/month, soft target) while giving users a genuinely fair deal. Privacy is the product: files never leave the device, and that claim stays verifiable in devtools.

**Non-negotiable principles**
1. No file data ever touches a server. Only license checks, page-view analytics, and (later) email verification do — and never on pages where files are open.
2. Basic tools stay free with no login, forever.
3. The paywall is honor-system (public MIT repo, client-side features). Never spend effort "protecting" it — every such mechanism punishes paying customers only.
4. Fair pricing beats revenue targets. Price is TBD pending research; $12 lifetime is the working placeholder.

---

## Week 0 — Validate before building (this week, ~2 evenings)

Nothing here requires writing code.

- [ ] **Post the existing tool** (current GitHub Pages URL) to three communities where privacy-sensitive professionals gather:
  - r/privacy (or r/degoogle / r/selfhosted)
  - A legal-tech or accounting forum
  - Hacker News "Show HN"
  - Pitch: *"PDF tools where your files never leave your device — verify it in devtools."*
  - Watch the [How To Talk To Users](https://www.youtube.com/watch?v=z1iF1c8w5Lg) talk before posting. Reply to every comment. Note every feature request verbatim — especially any mention of redaction, Bates numbering, or scanned documents.
- [ ] **Apply for a Lemon Squeezy account** (lemonsqueezy.com). Onboarding has been restricted intermittently since the Stripe acquisition. If rejected → **Polar** (polar.sh) becomes primary; note that the Phase 2 edu-discount flow must then be re-verified against Polar's API.
- [ ] **Buy the custom domain** (~$10/yr — the project's only fixed cost). Short, spellable, works as a brand.
- [ ] **After 2 weeks:** scope checkpoint. Zero interest in the privacy angle → the Pro pitch is wrong; revisit the design doc before Phase 1. Any redaction/legal-user signal → confirms the Phase 2 anchor.

---

## Phase 0 — Distribution (~2–4 weeks part-time, all free tier)

### 0.1 Infrastructure (parallel with everything else)
- [ ] Create Cloudflare Pages project, connect the GitHub repo, build = `npm run build`, output = `dist`.
- [ ] Attach the custom domain; enable Cloudflare Web Analytics.
- [ ] Replace `.github/workflows/deploy.yml` with the CF Pages Git integration (delete the workflow).
- [ ] Old GitHub Pages build becomes a redirect stub: meta-refresh + `<link rel="canonical">` to the new domain (don't orphan the only existing URL).

### 0.2 Test infrastructure FIRST (before any refactor — CRITICAL) ✅ DONE 2026-07-19
- [x] Vitest installed; `npm test` / `npm run test:watch` wired up.
- [x] **Regression guards written before the refactor** — 38 tests, all green:
  - `parseRange`: formats, "10-end", swapped bounds, clamping, dedupe, whitespace, plus the new warning paths (invalid token, out-of-bounds, page 0, half-written range)
  - `splitPdf`: per-range results, page counts, re-openable output, empty-range **reported not dropped**
  - `mergePdfs`: <2 throws, page counts sum, 3+ documents
  - `applyPagePlan`: reorder, delete-by-omission, rotation, empty-plan guard
  - `document` guards + `computeFitSize`
- [x] **Playwright E2E ✅ DONE 2026-07-27** — 20 tests in `e2e/`, run with `npm run test:e2e`. Runs against `vite preview` (the built output), never the dev server, because prerendering only exists in a production build. Covers: every route serving real content over raw HTTP with **no JavaScript** (the check that would have caught the blank-tool-page bug), word-count floors, FAQ JSON-LD validity, sitemap/robots, a live `og:image`, upload→split→download with page counts verified by re-opening the PDF, the merge limit, Pro activation across routes, and an assertion that processing a file issues **zero outbound requests**. Fixtures are generated (PDFs via pdf-lib, PNGs via a hand-rolled encoder) rather than committed as binaries.

### 0.3 The refactor ✅ MOSTLY DONE 2026-07-19
- [x] react-router v7 wired; every tool owns a real URL: `/`, `/split`, `/merge`, `/compress`, `/reorder`, `/images-to-pdf`, `/pricing`, `/privacy`.
- [x] App.jsx monolith broken up: `FileDropzone`, `PixelIcon`, `Layout`, `ToolShell`, `usePdfFile`, `useTheme`, `usePro`; PDF logic in `src/lib/pdf/` as pure, DOM-free functions.
- [x] Route-level code splitting: **landing bundle 78.5 kB gz** (was 267 kB); pdf-lib (180 kB gz) loads only when a tool opens.
- [x] **Shader stack deleted**: `three`, `three-stdlib`, `@react-three/fiber`, `camera-controls`, `@shadergradient/react`, plus `lucide-react` (icons are now CSS box-shadow bitmaps). Six dependencies removed.
- [x] Code-quality fixes: `splitPdf` returns `{rangeStr, bytes|null, warnings}` and the UI names ranges that produced nothing; `parseRange` returns warnings; encrypted PDFs rejected with a clear message (`ignoreEncryption` removed); `%PDF-` magic-byte fallback; `FREE_MERGE_LIMIT` named constant.
- [x] **Design system implemented** from the approved "PDF Tools prototype" (Claude Design): Swiss 12-col grid, pixel-notched corners, `steps()` motion, bitmap icons, `#FAFAF7`/`#111111`/`#E62E2E` — **plus a full dark theme** (`#12120F`/`#F2F2EA`/`#FF4B4B`) with OS-follow, explicit toggle, persistence, and a no-flash inline script.
- [x] `dist/404.html` SPA fallback so deep links boot instead of dead-ending on a static host.
- [x] **Prerendering ✅ DONE 2026-07-27** — `scripts/prerender.js` renders every route to its own HTML file via React 19's `prerenderToNodeStream` (chosen over `renderToString` because the tool routes sit behind `React.lazy`, which `renderToString` would emit as the "Loading tool…" fallback). Build is now `vite build` → `vite build --ssr` → prerender. Client still mounts with `createRoot`, not `hydrateRoot` — hydration needs an SSR module manifest to preload route chunks, else it suspends and mismatches; the crawler benefit doesn't depend on it. Reasoning is documented in `src/main.jsx`.

Target structure:
```
src/
├── routes/          Home, Split, Merge, Compress, Reorder, ImagesToPdf, Pricing, Privacy
├── components/      FileDropzone, ...
├── hooks/           usePdfFile
└── lib/
    ├── pdf/         split.js  merge.js  reorder.js  imagesToPdf.js  compress.worker.js
    └── license.js   (Phase 1 — pure state machine, no DOM)
functions/
└── api/license.js   (Phase 1 — Cloudflare Function)
```

### 0.4 Three new tools ✅ DONE 2026-07-19 (shipped in the 0.3 refactor)
- [x] **Reorder / rotate / delete pages** — page grid, move/rotate/delete, `applyPagePlan` in `src/lib/pdf/reorder.js`.
- [x] **Images → PDF** — JPEG/PNG mix, EXIF-upright via `createImageBitmap`, downscaled before embedding so a 12MP photo doesn't produce a 40MB page (`computeFitSize`).
- [x] **Compress** — image-only recompression via canvas; **never rasterises pages**, so text stays selectable. Says "little to compress here" on CCITT/JBIG2/JPX scans instead of faking a result.
- [x] Unit tests per lib file (38 total).
- [ ] Compress still runs on the **main thread** — Web Worker + OffscreenCanvas deferred (see TODOS.md).
- [ ] One Playwright happy path per tool — deferred (see TODOS.md).

### 0.5 SEO + content (the actual ranking lever)
- [x] **Meta/OG per route, sitemap.xml, robots.txt ✅ DONE 2026-07-27** — all generated from `src/lib/seo.js` at build time, so metadata and the sitemap cannot drift from the route table. Canonicals and sitemap entries use the trailing-slash form (`/split/`) that matches the on-disk directory index, rather than relying on host-specific redirects from `/split`.
- [x] `/privacy` page documenting every network request the site makes.
- [x] **300–500 words of real copy per tool page ✅ DONE 2026-07-27** — copy lives in `src/lib/toolCopy.js`, rendered by `ToolCopy.jsx` and baked into the static HTML. Verified word counts: split 514, compress 488, merge 461, images→PDF 455, reorder 360. Every page carries a "how it works", a "why client-side", and an **honest limitations** section, plus 3–4 FAQ entries that also emit `FAQPage` JSON-LD from the same source (so answers can't drift from the markup). Copy is rendered expanded, not behind a toggle — collapsed content is weighted less and hiding the limitations would defeat the point.
- [ ] **OG preview image** (`og-default.png`) — cards are `twitter:card=summary` until one exists, because a `summary_large_image` card with no image renders broken. Worth having *before* the Show HN post.
- [ ] Directory listings: AlternativeTo, PrivacyGuides-adjacent lists, free-software directories. The Show HN post is backlink #1.
- [ ] **No analytics beacon on tool routes where files are open** — beacon on landing/pricing only.

**Phase 0 done when:** all routes prerender with real content, Lighthouse mobile ≥90, all tests green, analytics live, old URL redirects.

---

## Gate: when does Phase 1 start?

Paywall goes live at **~500 bot-filtered unique visitors/month** (Cloudflare's bot-filtered count — never raw requests, which are 50–90% crawlers on a new domain) **or** a strong validation signal from Week 0. Not on a calendar date into empty traffic.

Meanwhile (no gate needed): **pricing research task** — what do Smallpdf/iLovePDF/PDF24 charge, what does a fair lifetime price look like, one-time vs. credits. Decide the real price before launch; $12 is the placeholder. Fair deal > revenue math.

---

## Phase 1 — Money (~1 week part-time once gated)

### 1.1 Lemon Squeezy product
- [ ] Product "Pro — lifetime" with **license keys enabled**, price per pricing research.
- [ ] Enable test mode for E2E.

### 1.2 Launch Pro feature: batch split/merge
- [ ] Loop over existing `src/lib/pdf/` functions in the Worker. Sequential processing, buffer released between files, soft cap ~20 files with a clear message, per-file error rows (one corrupt file never kills the batch).
- [ ] Pricing page lists Phase 2 items as "coming to Pro" so buyers know now vs. later.

### 1.3 License validation — validate-only, no accounts, no activations
```
Buy → LS checkout → key emailed → user pastes key once
                                      │
                                      ▼
                    POST /api/license (Cloudflare Function)
                                      │  calls LS *validate* endpoint only
                                      ▼
                    { valid, cacheUntil }  →  localStorage, 30-day TTL
                                      │
             stale? → background revalidate ──fails──► 7-day grace from
             valid? → Pro features on                  first failed attempt,
                                                       then downgrade
                                                       (worst case: 37 days offline)
```
- [ ] **No activation endpoint, no instance IDs, no device limits.** They can't stop pirates (honor-system paywall) but they lock out paying customers who clear storage. Key is re-enterable anywhere, forever, zero support.
- [ ] First-time validation failure (LS down): clear error + retry, no grace.
- [ ] Refunds: LS invalidates the key; the 30-day TTL bounds residual access. No webhooks.
- [ ] Cloudflare **rate-limit rule** on `/api/license` (free tier includes one).
- [ ] `license.js` is a pure state machine — Vitest with fake timers covers TTL/grace/refund branches.

### 1.4 Checkout UX
- [ ] Overlay checkout (lemon.js) — **with fallback**: if the script fails to load (your buyers run uBlock), the Buy button becomes a plain link to the LS-hosted checkout page.
- [ ] Playwright E2E in LS test mode: buy → key → paste → batch unlocks → refund → key invalid within TTL. Plus a blocked-script run asserting the fallback link.

### 1.5 Hardening + legal
- [ ] Strict CSP, enumerated allowlist: self + LS script origin + analytics origin. Nothing else. (XSS can read loaded PDFs; every allowed origin is a deliberate, listed risk.)
- [ ] Pin dependencies; audit on update.
- [ ] Privacy policy (stored: nothing beyond LS's checkout records; keys validated pass-through, not logged), terms, refund policy → points at LS.

**Phase 1 done when:** a stranger can buy, get a key, unlock batch, and a refund revokes within 30 days — all covered by E2E.

---

## Phase 2 — After first sales

Priority order (revised by eng review):
1. **Redaction** — THE feature for the legal/HR/healthcare buyer and the reason "client-side" is a moat (nobody uploads a document to remove its secrets). Correctness-first: text removed from content streams, never a black box over live text; tests extract text from redacted output to prove it's gone. This becomes the headline Pro pitch.
2. Compression quality controls.
3. Annotate / sign / form filling (pdf-lib).
4. docx→PDF best-effort (mammoth → HTML → print pipeline; marketed as "quick convert," fidelity caveats explicit — Word-perfect is impossible client-side, don't promise it).
5. **Edu free tier** (marketing, not revenue): academic-domain list (Hipo dataset) + email verification link (Resend free tier) → single-use 100%-off LS discount code; SHA-256-hashed email dedup in Cloudflare KV; rate-limited. Fake edu users cost ~$0 (client-side compute) — don't over-engineer.

Also queued: PWA/service worker (TODOS.md) — until it ships, say "works offline once loaded."

---

## Metrics & kill criteria

| Signal | Threshold | Action |
|---|---|---|
| Success | ≥500 bot-filtered visits/mo within 6 months | Open the paywall (Phase 1) |
| Interim | Zero engagement anywhere at 3 months | Re-run outreach with a new pitch before building more |
| First sale | Within 30 days of paywall | Confirms the offer; else revisit pricing/pitch, not code |
| **Kill** (OR, not AND) | <100 bot-filtered visits/mo at 6 months **or** zero community engagement ever | Stop feature work — the problem is distribution |

Revenue goal ($20–50/mo) is **soft**. A fair product with fewer sales beats a squeezed one.

## Standing security checklist
- CSP allowlist reviewed on every new third-party addition
- No secrets in the repo (LS API key lives in CF Function env only)
- Dependencies pinned; `npm audit` before releases
- WASM (if the pdfcpu spike ever ships) only from upstream releases or reproducibly self-built from pinned source
- mutool/MuPDF stays banned (AGPL vs. MIT repo backing a paid tier)
- Paddle stays banned (no native license API → would force a user database)
