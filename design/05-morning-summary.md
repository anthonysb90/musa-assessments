# Morning Summary — Report Design Overhaul (Night 1)

Read this first. It is honest, not a clean sheet.

## What was completed

- **Safety net.** Unmodified copies of every report file are in
  `_backup/reports-original/`. `REVERT.md` at the repo root has exact one-command restore
  steps and GitHub Desktop tag/branch instructions. Nothing was force-anything; no git
  history touched (I can't run git here — see below).
- **Phase 0 — current-system audit** (`design/00-current-system-audit.md`): real token
  extraction, honest strengths/weaknesses. Top finding: fonts load from a runtime CDN,
  which makes PDF typography unreliable; and the current PDF path is a raster screenshot,
  not a laid-out document.
- **Phase 1 — report audit + the two tables** (`design/01-report-audit.md`): all 16 report
  experiences audited (the brief's 10 + 6 more the engine actually produces). **Table A**
  (content matrix) fixes which bespoke components may appear where. **Table B**
  (differentiation plan) assigns every report a unique archetype + signature visual +
  accent + texture + length, with explicit collision checks.
- **Phase 2 — foundation** (`design/02-foundation.md` + **`app/lib/reportTokens.js`**, real
  usable code): locked type scale (screen + print), 9-step neutral ramp, reserved accent
  set, semantic scoring states that pair color with shape + label (grayscale/color-blind
  safe), sequential + diverging data scales, chart conventions, print geometry, a WCAG-AA
  contrast table with measured ratios.
- **Phase 2.5 — 16 briefs** (`design/briefs/`): one per report, each with positioning,
  archetype, unique signature visual, cover concept, rhythm, accent/texture, bespoke
  components, target page count, and — most importantly — "what this must NOT look like"
  naming its nearest sibling and how they're kept apart.
- **Phase 3 — print spec** (`design/03-print-spec.md`): the Chromium-print decision, font
  self-hosting plan, break-control rules, running header/footer, TOC, web→print parity.
- **Phase 4 — clinical rules**: captured in the Clinical brief + decisions-log D7 (austere
  by design, support-first, attribution preserved).
- **Decisions log** (`design/decisions-log.md`): every non-obvious call, D1–D9.
- **Asset licenses** (`design/asset-licenses.md`): sources/licenses + localization TODOs.

## What was NOT completed, and why

- **The renderer rebuilds (Phase 5) for ~13 of the 16 reports.** I did not rebuild them
  tonight. A single unattended pass rewriting 13 live report renderers to $500 quality —
  each with new signature charts, print layout, and rendered+verified proofs — is not
  achievable in one session at real quality, and a rushed pass would make the reports
  converge (the exact failure the brief is most worried about). Instead I built the durable
  backbone that makes those rebuilds fast, consistent, and non-converging, and briefed each
  one precisely. **Big Five and Kingdom Design already meet the target tier** (built and
  verified earlier) and stand as two proven reference builds spanning two archetypes
  (chart-led diagnostic; composite multi-part). The recommended third reference to build
  first is **Spiritual Gifts** (formational & scriptural — the most different archetype),
  its brief is ready.
- **Font self-hosting and the Chromium print route** — specced, not yet implemented.
- **Rendered before/after PDFs, grayscale proofs, contact sheets (Phase 6)** — the sandbox
  can't reach Supabase to render from seeded rows; the preview-injection render harness is
  in place (it's how Big Five/KDP were verified) but a full 16-report render pass is next-
  session work once renderers exist.
- **No git branch/tag/commits by me** — this environment can't run git reliably and you own
  git via GitHub Desktop; safety is via `_backup/` + `REVERT.md` instead (D1).

## The three biggest things to look at first

1. **Fonts off the CDN.** Until Fraunces + Inter are self-hosted and embedded, every PDF's
   typography is a coin flip. This is the highest-leverage single fix. (`design/03`, D-top.)
2. **Print path = Chromium, not html2canvas.** The current "Save as PDF" makes a blurry
   screenshot. Switching to the print-stylesheet path is what turns these into real
   documents. (`design/03`, D6.)
3. **Confirm the differentiation plan (Table B) reads right to you.** It's the spine of the
   whole overhaul. In particular, the two closest sibling pairs I flagged — **Called Together
   vs Leadership Health** (both dumbbell) and **Spiritual Growth vs Rooted vs Big Five**
   (all formerly radar) — are separated by signature/accent/texture and by demoting the
   radar to Spiritual Growth only (D5). If you disagree with any assignment, changing it now
   is cheap; changing it after the builds is not.

## Did anything end up looking too similar?

No reports were rebuilt tonight, so nothing converged. The *plan* explicitly de-risks the
convergence-prone pairs above. The one live pair that already share a look are the older
radar reports (Spiritual Growth vs Big Five) — resolved in the plan by D5, to be applied
when Big Five is next touched.

## Judgment calls you might disagree with

- Scoping Night 1 to foundation + briefs rather than a shallow rebuild of everything (D9).
- Radar reserved to Spiritual Growth; Big Five's radar demoted (D5).
- Church Planter split into candidate vs assessor editions, validity data never in the
  candidate copy (brief 10) — a privacy call I made without asking.
- Excluding 4 assessments from church partnership earlier today (Pastor, Called Together,
  Forgiveness, Church Planter) — related, and now admin-toggleable.
- Print path change and dropping html2canvas to a fallback (D6).

## Revert everything

See `REVERT.md`. Fastest: copy the seven files from `_backup/reports-original/` back over
their originals and commit in GitHub Desktop. The `design/` folder and `_backup/` are
additive and safe to leave. No live report was modified tonight, so there is nothing to
revert unless you also want to remove the two header tweaks and today's feature work,
which are separate commits in your GitHub Desktop history.
