# Phase 3 — Print & PDF Engineering

## The rendering-path decision (logged as D6)

Today's primary PDF path is `html2pdf` (html2canvas → jsPDF): it **rasterizes** the web
report to an image and wraps it in a PDF. That produces no selectable text, no embedded
vector fonts, blurry type at print DPI, and page breaks wherever the image happens to
cut. This cannot reach the target tier.

**Decision:** the real print path is **Chromium "print to PDF"** driven by a dedicated
print stylesheet, producing a vector, text-selectable, font-embedded PDF with true page
structure. In production this is a headless-Chromium render of the report route with
`?print=1` (or a `/report/[token]/print` route); the existing `window.print()` fallback
already uses `PRINT_CSS` and becomes the primary path. `html2pdf` is retained only as a
last-ditch client fallback and is clearly inferior — flagged for removal once the
server-side Chromium print route ships. Web report and print report are the **same DOM**,
so information parity is structural, not a re-authoring effort.

## Fonts (must fix before any PDF is trustworthy)

- Self-host **Fraunces** + **Inter** as `woff2` in `public/fonts/`; declare `@font-face`
  with `font-display:block`; `<link rel="preload">` the exact weights used
  (Fraunces 400/500/600, Inter 400/500/600/700); remove the `fonts.googleapis.com`
  `<link>` from `app/layout.js`. Verify embedding by inspecting the output PDF's font
  table (`pdffonts`), not by eye. Until done, print typography is not guaranteed (D top-risk).

## Page structure

- **US Letter**, margins `18mm / 20mm / 16mm` (`PRINT` token), `3mm` bleed, `5mm` safe.
- **Running header:** recipient name · assessment name (small, tracked, on a hairline),
  suppressed on the cover. **Running footer:** page number (tabular) · "Mission USA" ·
  short assessment slug.
- **Cover + back cover** per each report's brief; `page-break-after:always` after cover.
- **Table of contents** for long/composite reports (Gifts, Big Five, KDP, Planter, Pastor)
  with real page numbers; generated from section anchors, not hand-kept.

## Break control (the rules the CSS must enforce)

- `h1,h2,h3 { break-after: avoid; }` — no orphaned heading at a page foot.
- `.chart, .card, figure { break-inside: avoid; }` — no chart or card split across a page.
- `table { break-inside: auto } thead { display: table-header-group }` — table headers
  repeat on each page; rows never separate from their header.
- `p { orphans: 3; widows: 3; }` — no one/two-line widows.
- Section openers use `break-before: page` on composite reports so each bound section
  starts fresh.
- Full-bleed cover/section images extend into the `3mm` bleed; text stays inside safe area.

## Web-only states resolved for print

- Expandable per-item detail (e.g., Gifts 25-list, Big Five per-trait, KDP full profile):
  **fully expanded in print.** No "click to expand," nothing dropped to an appendix.
- Hover tooltips / interpretations render as static captions beside their chart.
- Animated chart reveals render in **final static state** (`@media print` disables the
  reveal animation; the SVG's final geometry is what prints).
- Sticky nav / buttons carry `.no-print`.

## Color & grayscale

- `print-color-adjust: exact` on chart surfaces so fills don't get stripped.
- Every scoring mark pairs color with a `SCORE_STATE.shape` + label, so the grayscale PDF
  is fully legible. A grayscale proof is rendered and reviewed per report in Phase 6.

## Determinism

- No `Date.now()`/random in layout; sample seeds are fixed. Same `scored_json` → identical
  layout every render (verified by rendering twice and diffing in Phase 6).

## Clinical (see Phase 4)

- Wellbeing/clinical pages: no bleed imagery, no decorative texture, attribution block
  never breaks across a page, support guidance placed before the score when elevated.
