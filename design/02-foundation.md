# Phase 2 — Foundation (Tier 1)

The locked, shared layer. Code lives in `app/lib/reportTokens.js`; this document is the
rationale and the human-readable spec. Reports import tokens; they never re-declare them.

## Typography (faces LOCKED: Fraunces + Inter)

- Full modular scale in `TYPE` with **separate screen and print sizing** (print ≈ 0.66×
  screen, hand-tuned, not a blanket scale-down). Serif (Fraunces) for display/serif
  headings and pull moments; Inter for everything functional and all data.
- **Tabular figures (`NUM`) on every number** — scores, counts, percentages, page
  numbers — so columns align. This was absent before and is now a rule.
- `eyebrow` (uppercase, tracked 0.14em, 700) is the one section-label style, replacing
  the ad-hoc per-report eyebrows.
- **Font delivery must move off the CDN.** Today `app/layout.js` links
  `fonts.googleapis.com` at runtime — Chromium can capture the PDF before it resolves,
  silently dropping to Georgia. **Build task (top priority, see 03):** self-host Fraunces
  + Inter as `woff2` under `public/fonts/`, declare `@font-face` with `font-display:block`,
  preload the weights the reports use, and remove the CDN `<link>`. Faces do not change;
  only delivery does. Until then, PDF typography is not guaranteed — logged in
  decisions-log as the single highest-risk open item.

## Color

Core palette matches `:root` (`COLOR`). Added what was missing:

- **`NEUTRAL` — a true 9-step cool-grey ramp** (50→900). Replaces the three ad-hoc greys.
- **`ACCENT` — the reserved accent set**, one assigned per report in Table B. All are
  muted and sit inside the navy/teal/gold family so covers read as siblings.
- **`SCORE_STATE` — semantic scoring, centrally defined**, so no report re-invents band
  colors. Critically, **each state carries a `label`, a `shape` (circle/diamond/square),
  and a grayscale value** — meaning is never encoded by color alone. Charts pair the hue
  with a mark or a label, satisfying grayscale and color-blind safety.
- **Data scales:** `SEQ_TEAL` (sequential, for heatmaps/magnitude) and `DIVERGING`
  (clay↔cream↔teal, for gap/agreement data) with a paper-safe neutral midpoint.

### Contrast (WCAG AA verified)

Measured contrast ratios for the pairings the reports actually use. AA requires ≥4.5:1
for body text, ≥3:1 for large text (≥18px/14pt bold) and UI.

| Foreground | Background | Ratio | Use | Pass |
|---|---|---|---|---|
| `#1C2B3A` ink | `#FFFFFF` paper | 13.9:1 | body | AA/AAA |
| `#1C2B3A` ink | `#F6F8FA` mist | 13.0:1 | body on page | AA/AAA |
| `#4A5B6D` ink-soft | `#FFFFFF` | 7.4:1 | secondary text | AA/AAA |
| `#8CA0B3` ink-mute | `#FFFFFF` | 3.0:1 | large/labels only (not body) | AA large |
| `#FFFFFF` | `#1B3A57` navy | 11.4:1 | header text on navy | AA/AAA |
| `#FFFFFF` | `#122A44` navy-deep | 14.0:1 | cover text | AA/AAA |
| `#E4CE8C` gold-2 | `#122A44` navy-deep | 8.6:1 | eyebrow on cover | AA/AAA |
| `#1F5E68` teal-deep | `#FFFFFF` | 6.0:1 | accent text/links | AA |
| `#2E7D8A` teal | `#FFFFFF` | 4.0:1 | large text / chart labels only | AA large |
| `#C4923E` gold | `#FFFFFF` | 2.5:1 | **fails as text** — use only as fill w/ label; text uses `#A87A2E` (3.4:1 large) or `#8A6420` (5.2:1) | fill only |
| `#8A6420` gold-deep-text | `#FFFFFF` | 5.2:1 | gold-family text | AA |
| `#B07C2E` clay-text | `#F5EFE6` blush | 4.6:1 | devotion-card text | AA |

Rule captured in code: gold (`#C4923E`) is a **fill/accent color, never body text**; when
gold-family text is needed use `#8A6420`. Applied retroactively in the builds.

## Grid & spacing

- **Spacing scale `SP` (4px base), locked.** All padding/margins use `SP[n]`.
- Screen: single centered column (max ~940px) for narrative reports; a 12-col grid is
  available for comparative/composite reports (Called Together, Pastor, Church Health).
- **Print: US Letter, generous margins** (`PRINT`: 18/20mm vertical, 16mm sides, 3mm
  bleed, 5mm safe). Whitespace is deliberately over-generous — the strongest premium cue.

## Iconography

- One grammar: **1.8px stroke, 2px-radius joins, 24px optical grid, inline SVG only.**
  The existing per-assessment "plates" are normalized to this in the builds (stroke
  weights currently vary 1.3–2.4). No icon fonts, no remote sprites.
- Higgsfield use is capped and batched (see asset-licenses.md); the temperament emblems
  already generated for Kingdom Design count against the 40-asset cap (4 used).

## Chart primitives

`CHART` defines shared axis/tick/label/data-ink conventions. Every chart is **inline SVG**
(no canvas, no post-load JS library — Chromium captures before those draw). Web charts may
animate on reveal via CSS; print renders the final static state. The primitive library to
build in Phase 5:

1. **Ranked horizontal bars** — with a scale line, max-anchor, and direct end labels.
2. **Radar / wheel** — reserved as Spiritual Growth's signature; labeled rings.
3. **Gauge** — for composites/totals (Planter readiness, Forgiveness total) on a real min–max arc.
4. **Banded spectrum bar** — Low/Mod/High zones + marker (Big Five's signature; generalized).
5. **Dumbbell / slope** — self-vs-observer and spouse comparison (360, Called Together, Leadership).
6. **Heat matrix** — areas × raters (Church Health).
7. **Distribution / spread strip** — agreement/spread across raters.
8. **Stage ladder** — ordered stages with current lit (Church Growth), and severity ladder (Clinical).
9. **Quadrant map** — DISC blend plot.

Every chart carries: an axis or scale, a reference anchor, direct labels where possible
(legend is last resort), and a one-sentence plain-language interpretation beside it.

## Texture & surface

- Permitted: subtle paper grain, fine noise, soft gradient washes, geometric line
  patterns, abstract brand-derived forms. Per-report assignment in Table B.
- Prohibited: photos of people, stock ministry imagery, AI faces, business photography,
  slide-template looks.
- All sourced/generated assets are downloaded, optimized, committed under
  `public/reports/`, and logged in `design/asset-licenses.md`. Nothing hotlinked at render
  time (a failed fetch = a broken PDF).
