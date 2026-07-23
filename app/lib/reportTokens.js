// ============================================================================
// REPORT FOUNDATION TOKENS (Tier 1 — locked once FOUNDATION-FROZEN.md is written)
// One source of truth for the report design system. Every report renderer pulls
// spacing, type, color, scoring states, and chart conventions from here. No
// report re-declares these. Expression/bespoke values live in each report, not
// here. See design/02-foundation.md for rationale.
// ============================================================================

// ---- Type faces (LOCKED — do not change the faces) ----
export const FONT_SERIF = "'Fraunces', Georgia, serif";  // display
export const FONT_SANS = "'Inter', system-ui, -apple-system, sans-serif"; // body
// Tabular numerals for all data. Apply via style={{ fontVariantNumeric: NUM }}.
export const NUM = "tabular-nums lining-nums";

// ---- Modular type scale (screen px / print pt). Print is NOT screen scaled. ----
// 1.25 major-third-ish scale, tuned to the existing faces.
export const TYPE = {
  displayXl: { size: 40, print: 26, line: 1.06, weight: 500, face: FONT_SERIF, track: "-0.01em" }, // cover title
  display:   { size: 32, print: 21, line: 1.1,  weight: 500, face: FONT_SERIF, track: "-0.005em" }, // section opener
  h1:        { size: 26, print: 17, line: 1.15, weight: 500, face: FONT_SERIF },
  h2:        { size: 21, print: 14.5, line: 1.2, weight: 500, face: FONT_SERIF },
  h3:        { size: 18, print: 12.5, line: 1.25, weight: 600, face: FONT_SANS },
  bodyLg:    { size: 16, print: 11, line: 1.6,  weight: 400, face: FONT_SANS },
  body:      { size: 14.5, print: 10, line: 1.55, weight: 400, face: FONT_SANS },
  small:     { size: 13, print: 9,  line: 1.5,  weight: 400, face: FONT_SANS },
  micro:     { size: 11.5, print: 8, line: 1.4, weight: 600, face: FONT_SANS },
  // eyebrow / section label, always uppercase tracked
  eyebrow:   { size: 12, print: 8, line: 1.2, weight: 700, face: FONT_SANS, track: "0.14em", upper: true },
  dataXl:    { size: 34, print: 22, line: 1,   weight: 700, face: FONT_SANS, num: true }, // big score
  data:      { size: 15, print: 10.5, line: 1, weight: 700, face: FONT_SANS, num: true },
};

// ---- Spacing scale (LOCKED). 4px base. Use SP[n], never raw numbers. ----
export const SP = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64, 11: 80, 12: 96 };

// ---- Radius & elevation ----
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const SHADOW = {
  0: "none",
  1: "0 1px 2px rgba(16,32,52,.06)",
  2: "0 6px 18px rgba(27,58,87,.09)",
  3: "0 16px 40px rgba(27,58,87,.12)",
  4: "0 30px 70px rgba(16,32,52,.22)",
};

// ---- Core palette (mirrors :root in globals.css) ----
export const COLOR = {
  ink: "#1C2B3A", inkSoft: "#4A5B6D", inkMute: "#8CA0B3",
  paper: "#FFFFFF", mist: "#F6F8FA", mist2: "#EEF3F6", blush: "#F5EFE6",
  navy: "#1B3A57", navyDeep: "#122A44",
  teal: "#2E7D8A", tealDeep: "#1F5E68",
  gold: "#C4923E", goldSoft: "#F0E4CB",
  line: "#E7E9EC",
};

// ---- Neutral ramp (9 steps, cool grey — the missing ramp). ----
export const NEUTRAL = {
  50: "#F7F9FB", 100: "#EEF3F6", 200: "#E0E6EC", 300: "#CBD4DC", 400: "#A9B6C1",
  500: "#8093A2", 600: "#5E7183", 700: "#45566A", 800: "#2C3A4A", 900: "#1C2B3A",
};

// ---- Reserved accent set. One assigned per report in design/01 Table B. ----
export const ACCENT = {
  gold: "#C4923E", teal: "#2E7D8A", tealDeep: "#1F5E68", plum: "#6B4E7A",
  sage: "#3E7C63", indigo: "#3B5B7A", steel: "#5A6A78", clay: "#B4703A",
  rose: "#A65A6B", navy: "#1B3A57", navyDeep: "#122A44", goldDeep: "#A87A2E",
  mutedTeal: "#4E8C93", slate: "#5A6A78",
};

// ---- Semantic scoring states. NEVER color-only: each carries a label + shape. ----
// shape hints let charts pair color with a mark (●▲■) or fill pattern for
// grayscale + color-blind safety.
export const SCORE_STATE = {
  high:     { color: "#2E7D8A", label: "High",     shape: "circle", grey: "#3A4A57" },
  moderate: { color: "#C4923E", label: "Moderate", shape: "diamond", grey: "#7C8A98" },
  low:      { color: "#8CA0B3", label: "Low",      shape: "square",  grey: "#B4BEC9" },
  strength: { color: "#2E7D8A", label: "Strength", shape: "circle", grey: "#3A4A57" },
  steady:   { color: "#C4923E", label: "Steady",   shape: "diamond", grey: "#7C8A98" },
  attention:{ color: "#8CA0B3", label: "Needs attention", shape: "square", grey: "#B4BEC9" },
};

// ---- Data-viz scales ----
// Sequential (single hue, light→dark) for magnitude/heatmaps.
export const SEQ_TEAL = ["#EAF3F4", "#CFE3E5", "#9FC9CD", "#6FAFB4", "#3F9199", "#1F5E68"];
// Diverging (for gap/agreement: negative↔neutral↔positive). Neutral is the paper-safe mid.
export const DIVERGING = ["#B4703A", "#D9A96A", "#EDE3D2", "#9FC0C4", "#2E7D8A"];

// ---- Chart primitive conventions (shared across every SVG chart) ----
export const CHART = {
  axis: NEUTRAL[300],        // axis line
  tick: NEUTRAL[200],        // gridline / tick
  tickLabel: COLOR.inkMute,  // axis labels
  dataInk: COLOR.ink,        // default series
  anchor: NEUTRAL[400],      // reference-anchor line (e.g. midpoint, norm)
  trackBg: "#EEF1F4",        // unfilled bar track
  strokeW: 1,                // gridline weight
  dataStrokeW: 2.4,          // data stroke
  labelSize: 10.5,           // in-chart label px
  // Every chart MUST have: an axis or scale, a reference anchor, direct labels
  // where possible, and a one-line plain-language interpretation beside it.
};

// ---- Print page geometry (US Letter) ----
export const PRINT = {
  page: "letter",
  marginTop: "18mm", marginBottom: "20mm", marginX: "16mm",
  bleed: "3mm", safe: "5mm",
  runningHeader: true, runningFooter: true, // name · assessment · page n
};

// ---- Helpers ----
export const px = (n) => `${n}px`;
export function typeStyle(key) {
  const t = TYPE[key] || TYPE.body;
  const s = { fontFamily: t.face, fontSize: t.size, lineHeight: t.line, fontWeight: t.weight };
  if (t.track) s.letterSpacing = t.track;
  if (t.upper) { s.textTransform = "uppercase"; }
  if (t.num) s.fontVariantNumeric = NUM;
  return s;
}
export function scoreState(key) { return SCORE_STATE[key] || SCORE_STATE.moderate; }
