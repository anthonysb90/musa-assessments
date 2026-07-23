# Phase 0 — Current System Audit

An honest extraction of what exists today. No flattery.

## Framework & rendering path

- **Framework:** Next.js 14 (App Router), React 18, client components for reports.
- **Styling:** inline `style={{}}` objects + a handful of global CSS classes in
  `app/globals.css` + per-page `<style>` string blocks. No Tailwind, no CSS modules, no
  design-token layer. Colors are CSS custom properties in `:root`; everything else
  (spacing, type sizes, radii, shadows) is hardcoded per component as magic numbers.
- **Report renderers:** all live in one file, `app/results/[token]/page.js` (~1,400
  lines): `GiftRank`, `RankedSum`, `DomainBandsReport`, `SpiritualGrowthReport`,
  `EnneagramReport`, `ForgivenessReport`, `PlanterReport`, `GrowthReport`, `DiscReport`,
  `PastorReport`, `DomainReport`, `BigFiveReport`, `KingdomReport`. Demo/preview versions
  in `app/components/SampleReport.js`.
- **PDF path:** `html2pdf.bundle.min.js` loaded from **cdnjs at click time**, which
  screenshots the `#report-capture` DOM node via html2canvas → jsPDF. Fallback is the
  browser print dialog using `PRINT_CSS` (a `@media print` string). So "the PDF" is a
  raster screenshot of the web report, not a vector print layout.

## Typography (LOCKED — faces do not change)

- **Display / serif:** `Fraunces` (opsz axis, weights 400/500/600). Used via
  `.serif` class and `fontFamily:"'Fraunces',Georgia,serif"`.
- **Body / sans:** `Inter` (400/500/600/700). Default body face.
- **Loading method:** `<link>` to `fonts.googleapis.com` in `app/layout.js`.
  **WEAK / RISK:** runtime CDN fonts. Headless Chromium can capture before the CDN
  resolves, so PDF typography can silently fall back to Georgia/system. The brief
  requires self-hosted, embedded fonts — this is the single most important foundation
  fix. Faces stay Fraunces + Inter; only the loading method changes.
- No tabular-figure treatment anywhere. Numeric scores use proportional figures, so
  columns of numbers don't align. Weak for a data report.
- No defined type scale. Sizes are ad hoc: headings range 18–40px chosen per component.

## Color

`:root` in `app/globals.css`:

| Token | Value | Role today |
|---|---|---|
| `--ink` | `#1C2B3A` | primary text |
| `--ink-soft` | `#4A5B6D` | secondary text |
| `--line` | `#E7E9EC` | hairlines/borders |
| `--paper` | `#FFFFFF` | surfaces |
| `--mist` | `#F6F8FA` | page background |
| `--mist2` | `#EEF3F6` | tint surface |
| `--navy` | `#1B3A57` | primary brand |
| `--navy-deep` | `#122A44` | brand dark / headers |
| `--teal` | `#2E7D8A` | secondary |
| `--teal-deep` | `#1F5E68` | secondary dark |
| `--gold` | `#C4923E` | accent |
| `--gold-soft` | `#F0E4CB` | accent tint |
| `--blush` | `#F5EFE6` | warm surface (Scripture/devotion cards) |

**Strong:** the palette is coherent, warm, and ministry-appropriate; navy/teal/gold is a
genuine identity. **Weak:** no neutral *ramp* (only `--line`, `--mist`, `--mist2` — three
greys, not nine steps), no semantic scoring states defined centrally (each report
re-invents band colors: DomainBand uses `#2E7D8A/#C4923E/#8CA0B3`; Big Five uses the same
three but re-declared; KDP declares its own clarity colors). No documented contrast
ratios. No sequential/diverging data scales. Band colors are distinguished **by hue
alone** in several places — fails grayscale/color-blind unless paired with a label
(most, but not all, also print the band name).

## Spacing, grid, radius, shadow

- **No spacing scale.** Padding/margins are arbitrary (6, 8, 12, 14, 18, 20, 22, 26, 30…).
- **Radii:** ad hoc 8–20px; report cards mostly 14–20.
- **Shadows:** a few one-off `box-shadow` values; no elevation scale.
- **Grid:** report body is a single `max-width` column (`~820–940px`) centered. No column
  grid, no baseline grid. Fine for narrative, limiting for comparative layouts.

## Iconography

- Inline SVG "logo plates" per assessment (in `app/page.js` CARD map and reused) — good:
  inline, no icon font. **But** stroke weights vary (1.3–2.4), corner treatments vary,
  and there's no shared grid or optical-size rule. Not a system, a collection.

## Charts / data visualization (the weakest area)

- **Radar:** SpiritualGrowth "Discipleship Wheel" and Big Five profile — real SVG radar,
  good. Reused geometry, inconsistent label placement.
- **Bars:** most reports use a `track` + `fill` div/`span` bar. **No axis, no scale ticks,
  no reference anchor** on many. A raw bar to `max_per` communicates rank but not
  calibration. Big Five and KDP added banded zones + markers (the strongest charts in the
  system). Domain reports show `avg/5` bars with a band label — decent but no scale line.
- **No dumbbell/slope** for gap data (needed for 360 self-vs-observer). **No distribution
  plot, no heat matrix, no small multiples.** Church Health (team) and Leadership Health
  peer/360 have gap data with no visualization built for it.
- Charts mostly carry a one-line helper ("`helper`" style) — good habit already present.
- **Verdict:** the chart layer is the biggest gap between "competent web app" and
  "$500 report." Big Five/KDP show the target quality; the older reports are far behind.

## Print

- `PRINT_CSS` exists: `@page{margin:12mm}`, hides `.no-print/.no-pdf`, forces color
  adjust, `break-inside:avoid` on `.sheet section`. **Weak:** no running header/footer,
  no page numbers, no cover/back-cover, no TOC, no orphan/widow control, no per-chart
  break protection beyond section-level, no bleed handling. The primary PDF path
  (html2canvas raster) ignores most of this anyway and produces a flat screenshot with
  no selectable text and no embedded vector type.

## Logo

- `public/musa-logo-white-h.png` (horizontal white lockup), used in report header on the
  navy band. No dark-on-light variant referenced in reports; no defined clear space.

## Summary judgment

**Strong:** coherent brand palette; locked, characterful type pairing (Fraunces/Inter);
the two newest reports (Big Five, Kingdom Design) already demonstrate the target tier —
radar + banded bars + interpretation + devotion cards. The house habit of a one-line
interpretation beside each chart is exactly right and should become a rule.

**Weak, in priority order:** (1) runtime CDN fonts → PDF typography is not guaranteed;
(2) the PDF path is a raster screenshot, not a laid-out print document (no page
structure, no selectable text, no embedded fonts); (3) no token layer — spacing, type
scale, scoring colors, radii all re-invented per report; (4) the chart primitives are
inconsistent and, for older reports, uncalibrated (no axis/scale/anchor); (5) no
neutral ramp, no data scales, no documented contrast; (6) 360/gap and team/comparative
content has no visualization designed for it. These are the foundation targets.
