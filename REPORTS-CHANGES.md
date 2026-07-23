# Report Improvements — Morning Summary (overnight 2026-07-23)

All changes below are **on your disk, built clean, and NOT deployed.** You deployed
the security fixes earlier; these report changes are separate and still need review +
a push. Two files changed:

- `app/lib/interactions.js` — **NEW.** All the newly-written ministry content.
- `app/results/[token]/page.js` — modified to render it + print fixes.

## READ THIS FIRST: what needs your eyes vs. what's mechanical

**Needs your review (new content in your voice):** `app/lib/interactions.js` is ~all
new writing. I matched the tone of your `content.js` and `bigfive.js` as closely as I
could, kept it warm, second-person, Scripture-woven, no em dashes. But it is AI-written
devotional/leadership content that a paying pastor will read, so **read it before you
push.** It's one self-contained file, organized in four clearly-commented sections. Skim
each section; fix any phrasing that doesn't sound like you. Nothing else depends on the
wording, so you can edit freely.

**Mechanical (verify by looking, low risk):** the edits to the results page — new
sections rendered, print bugs fixed, chart labels. These are structural, build-verified.

## What the new content adds (the "worth $100" gap the audit named)

The audit's core finding was that reports were band-lookup with **zero** combination-aware
content. This closes that for four assessments:

1. **Big Five — "How your traits work together."** 40 paragraphs covering all 10 trait
   pairs × 4 high/low quadrants. A reader now gets 2–3 paragraphs specific to *their*
   combination (e.g. high Openness + low Extraversion), not just five separate trait blurbs.
2. **Spiritual Gifts — "Your gift constellation."** 18 named themes for common top-3 gift
   combinations (The Equipper, The Servant Heart, The Shepherd's Care, …) plus a graceful
   fallback that composes from per-gift fragments when a combo isn't one of the 18. Gift
   content was previously identical for everyone; now the top-3 *combination* gets its own
   theme, fits, watch-out, and verse.
3. **Enneagram — "Wings and growth."** Both wings + the growth and stress arrows for each
   of the nine types (standard integration/disintegration lines). This is the content the
   Enneagram was missing entirely.
4. **DISC / Wired to Lead — "Your DISC dimensions."** Per-dimension intensity narrative
   (High/Moderate/Low for D, I, S, C). DISC previously had no per-dimension writing at all.

Plus **tie/near-tie honesty notes**: when a DISC blend is a near-tie (top two dimensions
within ~5%) the report now says so instead of silently picking one.

## Print / chart fixes (mechanical)

- **Enneagram type profiles now print.** They were click-to-expand only, so the printed
  PDF silently dropped all nine profiles. Now forced visible in print (same trick the gift
  studies already used). Same fix applied to the Forgiveness (EFMI) subscale details.
- **Church Planter radar is now labeled.** The 13-spoke radar had no axis labels (you
  couldn't tell which spoke was which). Added numbered vertices 1–13 with a legend.
- **Tabular numerals** on ranked score columns so digits line up.

## Deliberately NOT done overnight (needs a focused session, higher risk)

- **Full design-token migration** (replacing the 187 inline font sizes with `reportTokens.js`).
  This is a large visual refactor that a build can't verify — too much regression risk to run
  unattended. Left for a session where you can eyeball each report.
- **Band-cutoff reference lines on bars** — skipped because bars are rendered ad hoc in many
  places with different scales; touching all of them was too invasive to do blind.
- **Localizing the external report images** (Higgsfield/Pexels/Unsplash) into /public.
- **Server-side PDF route** (cover page, TOC, page numbers), **per-report Leadership-style
  architecture** (answer playback, 90-day plans everywhere), and **cross-assessment synthesis**.
  These are the big WO-10b/d/e items — real projects, best done with you in the loop.
- **Norming** — still the cheapest credibility win once you have ~500 takers per instrument.

## To ship these report changes

Review `app/lib/interactions.js`, edit any wording, then:

```
cd musa-assessments
git add app/lib/interactions.js "app/results/[token]/page.js"
git commit -m "Reports: interaction content, wings/arrows, DISC dimensions, print fixes"
git push
```
