# Phase 1 — Report Audit & Differentiation Plan

Confirmed against the repo. The brief lists 10 reports; the engine actually produces 16
report experiences (the 10 + Spiritual Growth, Enneagram, Forgiveness, Big Five, Kingdom
Design, Church Growth). All are in scope. Two listed reports (Called Together, Church
Health) render through the couple/team routes rather than `results/[token]` and are
audited as their own contexts. The clinical wellness check is the quarantined wellbeing
module, surfaced inside Pastor Profile and (owner-only) on its own.

Renderers all live in `app/results/[token]/page.js` unless noted. Data shape = the
`scored_json` produced by `app/lib/scoring.js`.

---

## Per-report audit

### 1. CHC Spiritual Gifts — `GiftRank`
- **About (1 sentence):** where God has gifted this believer to serve, ranked across 25 gifts.
- **Data:** `{type:"gift-rank", ranked:[{letter,score}], max_per}` → joined to `GIFTS` (name, def, roles, develop, scripture).
- **Content:** top-3 hero cards, full 25 ranked list (expandable), per-gift definition + ministry roles + growth + scripture.
- **Dominant mode:** scriptural/formational + ranked list.
- **Has that others don't:** the full 25-gift ranked catalog; per-gift Scripture + ministry-role mapping.
- **Lacks:** no chart calibration (bars run to `max_per`, no scale/anchor); no radar; no gap/comparison.
- **Failures:** ranked bars are unanchored (a score of 12/15 vs 12/20 looks the same); top-3 cards are visually flat; 25-row list is a wall on paper.
- **Length:** long. **Read context:** read once, then returned to for serving decisions.
- **Most important moment:** the top-3 gifts revealed as an illuminated, scripture-anchored triptych.

### 2. Fivefold Calling — `RankedSum`
- **About:** the believer's primary and secondary Ephesians-4 calling (APEST).
- **Data:** `{type:"ranked-sum", ranked:[{key,score}], max_per}` + `FIVEFOLD` copy.
- **Content:** primary + secondary calling, all five scored, per-calling shadow/application.
- **Dominant mode:** narrative-scriptural with a small comparative chart.
- **Has:** the five-fold APEST frame + Ephesians 4 spine; "where it goes wrong" shadow copy.
- **Lacks:** biblical-character card; no radar; thin on visualization.
- **Failures:** five raw bars; primary/secondary distinction under-dramatized.
- **Length:** medium. **Moment:** the primary calling named on an Ephesians-4 "lane" spectrum.

### 3. Wired to Lead (DISC) — `DiscReport`
- **About:** how God wired this person to lead, as a DISC blend paired to a biblical leader.
- **Data:** `{type:"disc-blend", dims:[{key,score}], primary, secondary, blend, max_per}` + `DISC_BLENDS/DISC_DIMS`.
- **Content:** blend + biblical-leader pairing, D/I/S/C scores, strengths/watch-outs, growth.
- **Dominant mode:** diagnostic + comparative (blend), biblical-character.
- **Has:** the DISC quadrant; biblical-leader mirror; 12-blend map.
- **Lacks:** the quadrant is described, not plotted; no scale on the four dims.
- **Length:** medium. **Moment:** the person's blend plotted on a D/I/S/C quadrant map beside their biblical leader.

### 4. Rooted — `DomainBandsReport` (rooted band labels)
- **About:** spiritual maturity across 8 biblical markers — how deep the roots go.
- **Data:** `{type:"domain-bands", domains:[{domain,average,band,count}], scale_max}` + `ROOTED_MARKERS`.
- **Content:** per-marker band (Deeply Rooted/Growing/Needs Watering), top-2 + growth-2 with scripture/step.
- **Dominant mode:** formational + chart-led (radar today, shared).
- **Has:** the "root depth" metaphor; 8 maturity markers.
- **Lacks:** currently uses the *same* radar as Spiritual Growth (convergence risk); no distinctive metaphor visual.
- **Length:** medium. **Moment:** the 8 markers drawn as roots at literal depth in soil.

### 5. Spiritual Growth — `SpiritualGrowthReport`
- **About:** the state of one's walk across 6 discipleship disciplines.
- **Data:** `domain-bands` + `SPIRITUAL_GROWTH_DOMAINS/ORDER`.
- **Content:** the Discipleship Wheel (hexagon radar), per-discipline bands, strongest + growth with scripture/step.
- **Dominant mode:** chart-led diagnostic.
- **Has:** the hexagonal Discipleship Wheel — its defining, ownable radar.
- **Lacks:** wheel labels crowd; no scale rings labeled.
- **Length:** medium. **Moment:** the Discipleship Wheel. This report OWNS the radar.

### 6. Enneagram — `EnneagramReport`
- **About:** the believer's core type, turned toward Christ, with gift/trap/devotion.
- **Data:** `{type:"type-pick", ranked:[{type,score}], primary, total}` + `ENNEAGRAM_TYPES`.
- **Content:** core type + top-3, gift/watch/growth, scripture + written devotion.
- **Dominant mode:** narrative/type + formational.
- **Has:** the 9-type figure; a per-type written devotion.
- **Lacks:** the nonagon figure isn't drawn (type shown as a bar list); wings not shown.
- **Length:** medium-long. **Moment:** the Enneagram nonagon with the type + top-3 traced.

### 7. The Forgiveness Profile — `ForgivenessReport`
- **About:** what is actually moving this person's heart toward forgiveness (EFMI, licensed).
- **Data:** `{type:"subscale-sum", subscales:[{key,score,band}], total, total_band, reflection{...}}`.
- **Content:** total motivation gauge, 10 ranked motivations, the definition-comprehension verdict, private reflection recap.
- **Dominant mode:** diagnostic, clinical-adjacent restraint (licensed instrument).
- **Has:** the definition-comprehension verdict (accurate/near/misconception); licensed-instrument attribution; a recalled-offense reflection.
- **Lacks:** the total gauge is a number, not calibrated to 30–180; motivations are flat bars.
- **Length:** medium. **Moment:** the 10-motivation ridgeline with the total on a 30–180 gauge. Must respect EFMI attribution and stay restrained.

### 8. Big Five — `BigFiveReport`
- **About:** the most-researched map of personality across 5 traits + 6 facets.
- **Data:** `{type:"big-five", traits:[{key,pct,band}], facets:[...]}`.
- **Content:** trait radar, banded 0–100 spectrum bars, deep per-trait sections, facet strengths.
- **Dominant mode:** chart-led diagnostic.
- **Has:** banded 0–100 spectrum bars (Low/Mod/High zones) — the strongest calibrated chart in the app.
- **Lacks:** currently also draws a radar → collides with Spiritual Growth's signature.
- **Length:** long. **Moment:** the banded 0–100 trait spectrum. This report OWNS the banded-spectrum. (Decision: drop/reduce Big Five's radar so the Wheel stays unique to Spiritual Growth — see decisions-log D5.)

### 9. Kingdom Design Profile (Myers-Briggs) — `KingdomReport`
- **About:** who God made you (16 MBTI-style types), joined to Scripture.
- **Data:** `{type:"kingdom-design", code, temperament, scales:[{key,letter,clarity,a,b}]}` + `KDP_TYPES`.
- **Content:** 4-letter type hero, 4 dichotomy spectra with clarity, 16-type grid, temperament emblem, full type report, prayer, 30-day plan.
- **Dominant mode:** composite multi-part.
- **Has:** the four dichotomy spectra + the 16-type grid + Higgsfield temperament emblems; a per-type prayer & 30-day plan.
- **Length:** long. **Moment:** the 4-letter type reveal + the four clarity spectra.

### 10. Church Planter (+ spouse, + assessor) — `PlanterReport`
- **About:** a candidate's readiness to plant across 13 traits, with a hidden validity layer.
- **Data:** `{type:"planter", domains:[{domain,average,primary,band}], composite, tier, validity{candor,attention,infrequency}, married}`.
- **Content:** readiness tier, weighted composite, primary-5 vs secondary traits, validity panel (assessor-only), prayer/scripture.
- **Dominant mode:** composite multi-part diagnostic.
- **Has that NO other report has:** a validity/candor layer (assessor-only, never shown to candidate); a readiness *tier* verdict; a spouse-input comparison layer.
- **Lacks:** the composite isn't gauged; validity is text, not a clear flag panel; primaries not visually separated from secondaries.
- **Length:** long. **Moment:** the readiness dial (weighted composite + tier) with the primary-trait cluster; validity as a separate assessor panel.

### 11. Pastor Profile (+ wellbeing + 360) — `PastorReport`
- **About:** an honest read of a pastor's whole life & ministry across 3 pillars / 14 domains.
- **Data:** `{type:"pillar", pillars:[{pillar,average}], domains:[{domain,average,band,pillar}]}` + quarantined wellbeing + optional peer/360.
- **Content:** three-pillar composite (Character/Competence/Contribution), 14 domain bands, restrained wellbeing insert, optional 360 blind-spot.
- **Dominant mode:** composite multi-part.
- **Has:** the 3-pillar architecture; a *clinical* wellbeing insert (must be restrained); a 360 blind-spot layer.
- **Length:** long. **Moment:** the three pillars as an architectural structure carrying their domains.

### 12. Called Together — couple route (`app/couple/[code]`, `couple-lower` scoring)
- **About:** how a ministry marriage is really holding up, taken by each spouse, shown side by side.
- **Content:** paired domain scores (his/hers/lower-of-two), shared strengths + attention areas, a domestic-safety notice.
- **Dominant mode:** comparative & relational.
- **Has that NO other report has:** true spouse side-by-side comparison; the "lower of the two" convention; a safety module.
- **Length:** medium. **Moment:** the paired his/hers dumbbell across shared domains. Bespoke: safety notice, worked-through-with-spouse pacing.

### 13. Church Health — team route (`app/team/[code]`, `multi-rater`)
- **About:** a leadership team's honest, aggregated read of the church across 8 areas.
- **Content:** team aggregate per area, agreement/spread (where the team agrees vs splits), 8-area diagnostic.
- **Dominant mode:** chart-led diagnostic (aggregate/comparative).
- **Has that NO other has:** multi-rater aggregation; agreement/spread across raters.
- **Length:** medium. **Moment:** the team heat matrix (areas × raters) + an agreement spread strip.

### 14. Leadership Health — `DomainBandsReport` + peer/360 (`CircleInvite`)
- **About:** a leader's self-read across 8 areas, with an optional observer (360) comparison.
- **Content:** 8-domain self bands; when peers respond, self-vs-observer gaps ("blind spots").
- **Dominant mode:** comparative (self vs observer).
- **Has:** 360 self-vs-observer gap data (shared conceptually with Pastor 360; kept apart by visual — see below).
- **Length:** medium. **Moment:** the blind-spot dumbbell — self vs observer per domain, sorted by gap.

### 15. Clinical Wellness Check — wellbeing module (`scoreWellbeing`)
- **About:** a brief screening of emotional wellbeing (quarantined, owner/care-only).
- **Content:** total score, severity band, plain-language "what this does/doesn't measure," support guidance, licensed attribution.
- **Dominant mode:** restrained clinical.
- **Has that NO other has:** clinical severity bands; mandatory instrument attribution; early support guidance on elevated risk.
- **Length:** short. **Moment:** the score on a plain, labeled severity ladder — no decoration.

### 16. Church Growth — `GrowthReport` (`level-matrix`)
- **About:** which of 5 growth stages a church is actually in, decline → multiplication.
- **Content:** current stage, 5 stages side by side, transition flag, next-stage focus.
- **Dominant mode:** chart-led diagnostic (stage).
- **Has:** a single-winner *stage* model + transition flag.
- **Length:** short-medium. **Moment:** the 5-stage ladder with the church's stage lit and a transition marker.

---

## Table A — Content matrix

Rows = reports; columns = content types. ✓ = present. This drives which bespoke
components exist and where they may appear.

| Report | Ranked list | Radar/Wheel | Banded/calibrated bars | Spectrum poles | Scripture blocks | Biblical character | Prayer/devotion | Action/30-day plan | Domain clusters | Self-vs-observer (360) | Spouse comparison | Clinical severity | Validity/candor | Readiness tier/stage | Team aggregate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Spiritual Gifts | ✓ | | ✓ | | ✓ | | | ✓ | | | | | | | |
| Fivefold Calling | ✓ | | ✓ | ✓ | ✓ | | | | | | | | | | |
| Wired to Lead (DISC) | | | ✓ | ✓ | ✓ | ✓ | | ✓ | | | | | | | |
| Rooted | | ✓ | ✓ | | ✓ | | | ✓ | ✓ | | | | | | |
| Spiritual Growth | | ✓ | ✓ | | ✓ | | | ✓ | ✓ | | | | | | |
| Enneagram | ✓ | | ✓ | | ✓ | | ✓ | ✓ | | | | | | | |
| Forgiveness Profile | ✓ | | ✓ | | ✓ | | | | | | | ✓* | | | |
| Big Five | | (2ndary) | ✓ | ✓ | | | | ✓ | ✓ | | | | | | |
| Kingdom Design (MBTI) | | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | | | |
| Church Planter | | | ✓ | | ✓ | | ✓ | ✓ | ✓ | | ✓(spouse) | | ✓ | ✓ | |
| Pastor Profile | | | ✓ | | ✓ | | ✓ | ✓ | ✓ | ✓(360) | | ✓(wellbeing) | | | |
| Called Together | | | ✓ | | ✓ | | | ✓ | ✓ | | ✓ | | | | |
| Church Health | | ✓ | ✓ | | | | | ✓ | ✓ | ✓(raters) | | | | | ✓ |
| Leadership Health | | ✓ | ✓ | | | | | ✓ | ✓ | ✓(360) | | | | | |
| Clinical Wellness | | | ✓ | | | | | ✓ | | | | ✓ | | | |
| Church Growth | | | ✓ | | ✓ | | | ✓ | | | | | | ✓ | |

\*Forgiveness "clinical severity" = the licensed EFMI total band + definition-comprehension verdict; treated with clinical restraint, not a diagnosis.

**Bespoke components this matrix justifies:**
- Scripture callout + biblical-character card → Gifts, Fivefold, DISC, Rooted, Growth, Enneagram, KDP, Planter, Pastor, Called Together.
- Prayer/devotion card → Enneagram, KDP, Planter, Pastor.
- Self-vs-observer gap (dumbbell) → Pastor 360, Leadership Health, Church Health (rater spread).
- Spouse side-by-side → Called Together (and Planter spouse layer).
- Clinical severity band → Clinical Wellness, Pastor wellbeing insert, (restrained) Forgiveness total.
- Validity/candor panel → Church Planter only (assessor-only).
- Readiness tier / stage ladder → Church Planter, Church Growth.
- Team aggregate + agreement spread → Church Health only.

No bespoke component may appear in a report without a ✓ above.

---

## Table B — Differentiation plan

No two reports share **both** archetype and signature visual. Accents are drawn from the
foundation accent set (Phase 2). Lengths are relative targets.

| Report | Archetype | Signature visual (unique) | Accent | Texture | Length |
|---|---|---|---|---|---|
| Spiritual Gifts | Formational & scriptural | Illuminated top-3 gift triptych over a full ranked "gift ladder" | Gold `#C4923E` | Parchment grain | Long |
| Fivefold Calling | Narrative-led profile | APEST five-lane "calling spectrum" with primary lane lit | Teal `#2E7D8A` | Fine horizontal rule field | Medium |
| Wired to Lead (DISC) | Comparative & relational | D/I/S/C quadrant map with the blend plotted + biblical-leader pairing | Plum `#6B4E7A` | Soft grid wash | Medium |
| Rooted | Formational & scriptural | Vertical "root-depth" soil cross-section (8 markers as roots at depth) | Sage `#3E7C63` | Earth/soil line strata | Medium |
| Spiritual Growth | Chart-led diagnostic | The hexagonal **Discipleship Wheel** (owns the radar) | Teal-deep `#1F5E68` | Concentric ring guides | Medium |
| Enneagram | Narrative-led profile | The **nonagon** with core type + top-3 wings traced | Indigo `#3B5B7A` | Geometric point-lattice | Medium-long |
| Forgiveness Profile | Chart-led diagnostic (restrained) | 10-motivation **ridgeline** + 30–180 total gauge | Muted teal `#4E8C93` | None (restraint) | Medium |
| Big Five | Chart-led diagnostic | **Banded 0–100 trait spectrum** (owns the banded-spectrum) | Steel `#5A6A78` | Faint dot-grid | Long |
| Kingdom Design (MBTI) | Composite multi-part | Four **clarity dichotomy spectra** + 16-type grid + temperament emblem | Navy+Gold | Engraved medallion (emblems) | Long |
| Church Planter | Composite multi-part | **Readiness dial** (composite gauge + tier) + separate validity panel | Clay `#B4703A` | Blueprint fold lines | Long |
| Pastor Profile | Composite multi-part | **Three-pillar architecture** carrying 14 domains | Deep navy `#122A44` | Stone-column line motif | Long |
| Called Together | Comparative & relational | **His/hers paired dumbbell** across shared domains | Rose `#A65A6B` | Interlocking-rings wash | Medium |
| Church Health | Chart-led diagnostic | **Team heat matrix** (areas × raters) + agreement spread | Teal-deep `#1F5E68` | Grid-cell field | Medium |
| Leadership Health | Comparative & relational | **Blind-spot dumbbell** (self vs observer, gap-sorted) | Gold-deep `#A87A2E` | Fine grid wash | Medium |
| Clinical Wellness | Restrained clinical | **Severity-band ladder** (labeled scale, no decoration) | Slate `#5A6A78` (neutral only) | None | Short |
| Church Growth | Chart-led diagnostic | **Five-stage ladder** with current stage lit + transition marker | Navy `#1B3A57` | Ascending step motif | Short-medium |

Collision checks:
- Archetype "Chart-led diagnostic" is shared by Spiritual Growth, Forgiveness, Big Five,
  Church Health, Church Growth — but their **signature visuals are all different** (wheel /
  ridgeline / banded-spectrum / heat-matrix / stage-ladder), so no pair shares both. ✓
- "Comparative & relational" shared by DISC, Called Together, Leadership Health — signatures
  differ (quadrant / his-hers dumbbell / blind-spot dumbbell). Called Together and Leadership
  Health both use a dumbbell family; kept apart by **what's compared** (two spouses vs
  self-vs-observer), **orientation/labels**, and **accent+texture** (rose interlocking-rings
  vs gold grid). Noted as the closest sibling pair to watch in verification.
- "Formational & scriptural" shared by Spiritual Gifts and Rooted — signatures differ
  (gift triptych/ladder vs soil root-depth). ✓
- "Composite multi-part" shared by KDP, Church Planter, Pastor Profile — signatures differ
  (dichotomy spectra+grid / readiness dial+validity / three-pillar architecture). ✓
- Radar/Wheel is used only by Spiritual Growth (signature), Rooted, Church Health,
  Leadership Health. To avoid signature reuse, **only Spiritual Growth uses the radar as its
  signature**; Rooted's signature is the soil cross-section (radar demoted or dropped),
  Church Health's is the heat matrix, Leadership Health's is the dumbbell. Big Five's radar
  is demoted so the banded-spectrum is its signature. Logged as D5.

**Closest sibling pairs to watch in the differentiation audit:** (a) Called Together vs
Leadership Health (both dumbbell); (b) Spiritual Growth vs Rooted vs Big Five (all
formerly radar). The plan separates each by signature, accent, and texture.
