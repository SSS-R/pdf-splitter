---
target: PDF Splitter frontend (AI slop audit)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
timestamp: 2026-08-01T17-48-22Z
slug: src-routes-home-jsx
---
Method: dual-agent (A: a3e98b95da7175b8c · B: a301028c3c4393a94)

## Design Specificity Verdict

Tool pages and long-form copy are genuinely authored. The landing page is a template wearing an authored skin.

TEMPLATED: Home.jsx:140-160 three-stat trust strip (two of three "stats" are zero; the third restates $12 rendered 150px below). Home.jsx:85-129 six identical span-4 cards with zero hierarchy (Split is the product name, domain, SEO wedge and hero CTA, yet visually equal to Reorder). Home.jsx:116-127 "Open tool ->" x6 is furniture; the card is already a Link. Home.jsx overall sequence is the LLM landing default. tools.js "Tool 01..06" applies Swiss numbering to an unordered set. Home.jsx:42 dither block measures 353x669px containing a 240x162px card (~76% decoration). Four separate elements say "zero uploads": chip, H1, devtools card, two stat tiles.

AUTHORED, KEEP: toolCopy.js limitations sections argue against the product (line 257 tells users not to hide an ID number). Split.jsx:190 "0 requests sent" in the results header. Privacy.jsx as a table of requests. Edit.jsx:1109 warning conditioned on edits existing. PixelIcon box-shadow glyphs + THEME_FRAMES.

DETECTOR: 0 findings, exit 0, verified working against a synthetic control. Coverage limit: regex over JSX missed all six hardcoded-colour theme breaks. ui.css:270 layout-transition is a false positive (determinate progress bar, width is the data).

## Design Health Score: 31/40 (Good)

1 Visibility 3 - Working always percent={100}
2 Match real world 4 - best-in-class
3 Control/freedom 3 - no per-edit undo in /edit
4 Consistency 2 - three sidebar widths; licence form duplicated; license/licence
5 Error prevention 3 - ranges validated only after submit
6 Recognition 3 - DEMO-1234 revealed only in failure message
7 Flexibility 2 - 8 ranges = 8 download clicks, no download-all
8 Aesthetic 3 - docked for strip and sixfold Open tool
9 Error recovery 4 - named empty ranges, unsupported chars, OCR explanation
10 Help/docs 4 - real in-page docs incl. limitations, FAQ schema same source

Cognitive load: 5 of 8 fail. /edit toolbar has 7 simultaneous controls, three mutating a mode.

## Priority Issues

P0 Buy Pro button is dead. Pricing.jsx:143 has no onClick/handler/href. Verified. Primary CTA of the monetisation page. Fix: honest interim state.

P0 Landing scrolls sideways on mobile. 375 viewport vs 442 content = 67px overflow. Home.jsx:136-138 uses inline repeat(3,1fr) not .grid12, so ui.css:358 mobile collapse never applies. Columns resolve 106/145/171px. Fix: delete the strip - also the top slop item.

P0 /privacy documents three requests the site never makes. Privacy.jsx lists GET /analytics.js, POST /api/license, GET /checkout.js in present tense. Zero fetch/analytics/checkout in src/. Page is titled "Every request, documented". Fix: split into "today (none)" and "planned".

P1 /edit keyboard-inaccessible at its core. Focused text run: Enter nothing, Space nothing, mouse click opens editor. Edit.jsx:966 onMouseDown + preventDefault, no onKeyDown. Consumes two tab stops per page while being inert.

P1 Accent fails WCAG AA. #e62e2e on #fafaf7 = 4.19:1 (needs 4.5) across every eyebrow, active nav link, All-tools link, footer link on all 6 routes, Open tool x6. Dark band worse: #ff4b4b on #f2f2ea = 2.93:1. Fix: --accent-text token #C81E1E / #FF6B6B for small text.

P2 Hardcoded light accent in /edit breaks dark theme. Edit.jsx:833,895,989,1009 use rgba(230,46,46,..) where --accent is #ff4b4b. Only visible with a PDF loaded. ui.css/tokens.css have zero hardcoded colours.

## Withdrawn finding

A reported P0 theme toggle stranding cards in the previous theme. Withdrawn as false positive. B swept every visible element on all six routes, both directions, 1200ms settle: 0 non-neutral values failed to change; all matched tokens. Cause of the clean result is the earlier shorthand-to-background-color fix applied to all three rules, not just body. A's instinct pointed at a real cousin, found in Edit.jsx (P2).

## Persona Red Flags

Jordan: H1 is a privacy claim not a product. "How it works" goes to /privacy network audit. Split.jsx:16-19 defaults trigger the app's own warning on a 3-page doc.
Casey: 67px sideways scroll. /account unreachable on mobile (hide-sm on Tools, Privacy AND Account; no hamburger). /edit is a 780px canvas on 375px bound to onMouseDown/onMouseEnter.
Sam: Pricing.jsx:60-67 conveys included vs excluded by colour + opacity + aria-hidden icon; screen reader reads both columns identically. Two role="slider" with no key handling. No skip link behind 66px sticky header. Wordmark 190x28px, nav links 15px tall.

## Minor Observations

Two logo lockups. /account only h1 is the word "Free". /privacy request table has no table element or ARIA roles. ToolShell.jsx:91 renders "Splitting locally... 100%" always. Split.jsx:144 Date.now() ids collide within a millisecond.

## Questions

1. Four elements say zero uploads. Delete the strip and chip - would anyone believe you less, or would the devtools card finally be loudest?
2. Which damages "designed to be checked" more: an undisclosed request, or a disclosure with no request behind it?
3. What would the page look like if Split were the page and the other five were a list?
