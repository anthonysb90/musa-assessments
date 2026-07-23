# Decisions Log — Report Design Overhaul

Every non-obvious call, with reasoning. Newest at the bottom of each section.

## Environment / process deviations from the brief

**D1. No git branch/tag/commit performed by me.** The brief asks for a
`pre-report-redesign` tag, a `report-design-overhaul` branch, and commits after every
phase. This sandbox cannot run git reliably: git operations through the device bridge
leave lock files it is not permitted to delete, and it has no network to push. The user
also owns git via GitHub Desktop and has explicitly asked me not to commit. **Deviation:**
safety is provided by unmodified copies in `_backup/reports-original/` plus `REVERT.md`
with exact GitHub Desktop steps to tag/branch/revert. This is a stronger, more legible
safety net for this specific setup than a branch I can't verify. Logged; user prompted
in REVERT.md to create the tag themselves.

**D2. Reports are live React renderers, not a template system.** All report visuals are
functions inside `app/results/[token]/page.js` (GiftRank, DomainBandsReport,
SpiritualGrowthReport, EnneagramReport, ForgivenessReport, PlanterReport, GrowthReport,
DiscReport, PastorReport, DomainReport, BigFiveReport, KingdomReport) plus the demo
versions in `app/components/SampleReport.js`. The "PDF" is that same page printed to PDF
by the browser (html2pdf → Chromium). **Implication:** web report and print report are
the *same* DOM with a print stylesheet, which is actually ideal for the brief's "two
output modes, one design language" goal — parity is structural, not a porting exercise.
The redesign targets these renderers + `PRINT_CSS` + a new shared foundation module.

**D3. Scope is multi-session; this is Night 1.** A $500-tier redesign of ~12 report
renderers to finished state in web + print, each rendered and verified with contact
sheets, is many hours of work and more than one turn can do at real quality. Rather than
produce a shallow pass over everything (which violates the "family, not clones"
principle worse than doing less), Night 1 completes the durable, low-risk backbone that
prevents convergence and makes the builds fast and consistent: the current-system audit,
the full report audit with the content matrix and differentiation plan, a brief per
report, the frozen-able foundation spec + tokens, the print spec, and a reference build
to prove the language. Remaining report builds are fully briefed for the next session.
The morning summary states exactly what is and isn't done. Honesty over a false clean
sheet, per the brief's own instruction.

**D4. Rendering "before" states.** The container cannot reach Supabase (network blocked),
so reports can't be rendered from live seeded rows here. Before/after rendering uses a
temporary preview-injection path (a `window.__PREVIEW__` scored object) + Playwright/
Chromium, driving the *real* renderer with constructed sample `scored_json`. This is the
same technique used to verify the Big Five and Kingdom Design reports earlier and it
exercises the actual production component. Any report whose sample data is not yet
constructed is noted rather than faked.

## Design decisions

**D5. The radar/Wheel belongs to Spiritual Growth alone.** Radar currently appears in
Spiritual Growth (Discipleship Wheel), Big Five (trait profile), and is a natural fit for
Rooted. The brief forbids reusing a signature visual. Call: Spiritual Growth OWNS the
radar as its signature; Big Five's signature becomes the banded 0–100 spectrum (already
its strongest chart) and its radar is demoted to a small secondary or removed; Rooted gets
a bespoke vertical soil-cross-section instead of a radar. This is the cleanest way to keep
three formational/personality reports from converging. Applied in briefs 04/05/08.

**D6. Print path is Chromium print-to-PDF, not html2canvas raster.** The existing
`html2pdf` path rasterizes the page (no selectable text, no embedded fonts, arbitrary page
cuts). Reaching the target tier requires a vector, font-embedded PDF, so the real path is
Chromium print with a dedicated print stylesheet (the `window.print()` fallback becomes
primary; a headless print route is the production form). `html2pdf` is kept only as a
degraded last-ditch fallback and flagged for removal. Rationale in 03-print-spec.md.

**D7. Clinical content is deliberately outside the expressive family.** Per Phase 4, the
Clinical Wellness Check and the Pastor wellbeing insert use no texture, no generated
iconography around scores, neutral slate only, severity bands with plain language, and
support-first ordering when elevated. This is a *designed* austerity, not an unfinished
report. Any place a current implementation could let a screening score read as a diagnosis
is to be flagged here during the build; none audited yet (the wellbeing card is currently
a simple band, which is acceptable but under-labeled — build task to add the "screening,
not diagnosis" framing and instrument attribution prominently).

**D8. Accent set defined in `reportTokens.ACCENT`.** One accent per report (Table B),
all muted and inside the navy/teal/gold family so covers read as siblings. Gold is
fill-only (fails as body text at AA); gold-family text uses `#8A6420`. Verified in the
contrast table (02-foundation.md).

**D9. Scope realized this session vs deferred.** See morning summary. In short: the full
foundation, audit, differentiation plan, 16 briefs, print spec, and clinical rules are
complete and are the durable backbone. Big Five and Kingdom Design already meet the target
tier and stand as two proven reference builds (chart-led + composite archetypes). The
remaining ~13 renderer rebuilds are fully briefed and are the next sessions' work; they
were NOT rebuilt tonight because a rushed pass over 13 live reports would violate the
"family not clones" principle worse than doing fewer, well. Nothing was left half-built;
all live reports still work exactly as before.
