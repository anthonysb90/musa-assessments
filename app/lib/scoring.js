// Server-side scoring. One entry point, dispatched by the assessment's
// scoring type (see content.js). Every scorer returns a `scored_json` object
// with a `type` field the results page and PDF renderer key off, plus the
// taker's `contact` block so a report can render without an auth user.
//
// Do not change scoring keys or band cutoffs without checking the source
// package files — these are what make each instrument valid.

import {
  SCORING_TYPE,
  GROWTH_LEVELS,
  DISC_PRIORITY,
  rootedBand,
  domainBand,
  PASTOR_PILLARS,
  PASTOR_DOMAINS,
  WELLBEING_FLAG_TEXTS,
  wellbeingBand,
  PLANTER_PRIMARY,
  PLANTER_CHARACTERISTICS,
  PLANTER_TIERS,
  efmiBand,
  efmiTotalBand,
} from "./content";
import { big5Band } from "./bigfive";
import {
  LEGS, SEAT, LEG_ORDER, FOUNDATIONS, FOUNDATION_ORDER_BY_LEG,
  leadBand, roleLabel, STYLES,
} from "./leadership";
import { CONSENT_VERSION } from "./config";

function contactBlock(profile) {
  return {
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    email: profile?.email,
    phone: profile?.phone,
    age_band: profile?.age_band,
    ministry_role: profile?.ministry_role || null,
    is_chc: profile?.is_chc ?? null,
    church_id: profile?.church_id || null,
    consent_statement_version: profile?.consent_statement_version || CONSENT_VERSION,
    consent_agreed_at: new Date().toISOString(),
  };
}

// value with reverse-scoring applied when flagged
function adj(item, value, scaleMin, scaleMax) {
  const v = Number(value);
  if (item?.is_reverse_scored) return scaleMin + scaleMax - v;
  return v;
}

// group answers by a key function -> { key: [values...] }
function groupBy(itemMap, answers, keyFn, scaleMin, scaleMax) {
  const g = {};
  for (const [itemId, value] of Object.entries(answers)) {
    const it = itemMap[itemId];
    if (!it || it.is_scored === false) continue;
    const key = keyFn(it);
    if (key == null || key === "") continue;
    (g[key] ||= []).push(adj(it, value, scaleMin, scaleMax));
  }
  return g;
}

export function scoreAssessment(assessment, itemMap, answers, profile) {
  const contact = contactBlock(profile);
  const type = SCORING_TYPE[assessment.slug] || "domain-average";
  const smin = assessment.scale_min ?? 0;
  const smax = assessment.scale_max ?? 3;
  const base = { slug: assessment.slug, contact };

  if (type === "gift-rank") {
    const groups = groupBy(itemMap, answers, (it) => it.gift_letter, smin, smax);
    const counts = Object.values(groups).map((a) => a.length);
    const maxCount = counts.length ? Math.max(...counts) : 5;
    const ranked = Object.entries(groups)
      .map(([letter, vals]) => ({ letter, score: vals.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.score - a.score || a.letter.localeCompare(b.letter));
    return { ...base, type: "gift-rank", max_per: maxCount * smax, ranked };
  }

  if (type === "ranked-sum") {
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const counts = Object.values(groups).map((a) => a.length);
    const maxCount = counts.length ? Math.max(...counts) : 5;
    const ranked = Object.entries(groups)
      .map(([key, vals]) => ({ key, score: vals.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    return { ...base, type: "ranked-sum", max_per: maxCount * smax, ranked };
  }

  if (type === "domain-bands") {
    // Rooted uses the Deeply Rooted / Growing / Needs Watering band labels;
    // every other domain-bands assessment uses Strength / Steady / Needs Attention.
    const bandFn = assessment.slug === "rooted" ? rootedBand : domainBand;
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const domains = Object.entries(groups)
      .map(([domain, vals]) => {
        const average = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        return { domain, average, count: vals.length, band: bandFn(average).label };
      })
      .sort((a, b) => b.average - a.average || a.domain.localeCompare(b.domain));
    return { ...base, type: "domain-bands", scale_max: smax, domains };
  }

  if (type === "level-matrix") {
    // domain holds the level number "1".."5"
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const maxPer =
      Math.max(...Object.values(groups).map((a) => a.length), 10) * smax;
    const levels = [1, 2, 3, 4, 5].map((lvl) => ({
      level: lvl,
      score: (groups[String(lvl)] || []).reduce((a, b) => a + b, 0),
      max: maxPer,
    }));
    // winner: highest score, tie broken toward the more mature (higher) level.
    // levels are in ascending order, so `>=` lets a later (higher) level win a tie.
    let winner = levels[0];
    for (const l of levels) if (l.score >= winner.score) winner = l;
    // transition: an adjacent level within 4 points of the winner
    let transition = null;
    for (const adjLvl of [winner.level - 1, winner.level + 1]) {
      const other = levels.find((l) => l.level === adjLvl);
      if (other && Math.abs(winner.score - other.score) <= 4) {
        const a = Math.min(winner.level, adjLvl);
        const b = Math.max(winner.level, adjLvl);
        transition = { a, b };
        break;
      }
    }
    return { ...base, type: "level-matrix", levels, winnerLevel: winner.level, transition };
  }

  if (type === "type-pick") {
    // Forced-choice: each item carries a type for option A (gift_letter) and
    // option B (option_b_letter). The stored value is 0 (chose A) or 1 (B).
    // Count picks per type, rank all nine, top three are what matter.
    const counts = {};
    let total = 0;
    for (const [itemId, value] of Object.entries(answers)) {
      const it = itemMap[itemId];
      if (!it || it.is_scored === false) continue;
      const picked = Number(value) === 1 ? it.option_b_letter : it.gift_letter;
      if (!picked) continue;
      counts[picked] = (counts[picked] || 0) + 1;
      total += 1;
    }
    const ranked = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
      .map((t) => ({ type: t, score: counts[t] || 0 }))
      .sort((a, b) => b.score - a.score || Number(a.type) - Number(b.type));
    return { ...base, type: "type-pick", total, ranked, primary: ranked[0]?.type };
  }

  if (type === "subscale-sum") {
    // The Forgiveness Profile (EFMI): 10 subscales, each the sum of 3 items
    // (range 3-18). Total 30-180. Ranked highest-to-lowest motivation.
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const subscales = Object.entries(groups)
      .map(([key, vals]) => {
        const score = vals.reduce((a, b) => a + b, 0);
        return { key, score, count: vals.length, band: efmiBand(score).label };
      })
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    const total = subscales.reduce((a, s) => a + s.score, 0);
    const tb = efmiTotalBand(total);
    return { ...base, type: "subscale-sum", subscales, total, max_total: 180, max_per: 18, total_band: tb.key, total_label: tb.label };
  }

  if (type === "kingdom-design") {
    // MBTI-style forced choice. Value 0 = option A (gift_letter pole), 1 = option B
    // (option_b_letter pole). Four scales (EI/SN/TF/JP), 15 items each. The higher
    // count wins each scale; clarity comes from the winning count (out of 15).
    const SC = ["EI", "SN", "TF", "JP"];
    const counts = {};
    for (const s of SC) counts[s] = { A: 0, B: 0, aPole: null, bPole: null };
    for (const [itemId, value] of Object.entries(answers)) {
      const it = itemMap[itemId];
      if (!it || it.is_scored === false) continue;
      const s = it.domain;
      if (!counts[s]) continue;
      counts[s].aPole = it.gift_letter;
      counts[s].bPole = it.option_b_letter;
      if (Number(value) === 1) counts[s].B += 1; else counts[s].A += 1;
    }
    const clar = (n) => (n >= 14 ? "very-clear" : n >= 12 ? "clear" : n >= 10 ? "moderate" : "slight");
    const scales = SC.map((s) => {
      const c = counts[s];
      const aWins = c.A >= c.B; // 15 items → ties impossible when complete; default to A
      const letter = aWins ? c.aPole : c.bPole;
      const win = Math.max(c.A, c.B), tot = c.A + c.B;
      return { key: s, letter, a_pole: c.aPole, b_pole: c.bPole, a: c.A, b: c.B, total: tot, win, clarity: clar(win), pct: tot ? Math.round((win / tot) * 100) : 50 };
    });
    const code = scales.map((x) => x.letter).join("");
    const temperament = code[1] === "S" ? (code[3] === "J" ? "SJ" : "SP") : (code[2] === "F" ? "NF" : "NT");
    return { ...base, type: "kingdom-design", code, temperament, scales };
  }

  if (type === "big-five") {
    // Five traits (O,C,E,A,N; 12 items each) + six facets (6 items each).
    // Reverse keying already applied by adj(). Percentage puts every scale on
    // 0-100: % = (sum - n) / (4n) * 100, where each item is 1-5 (min n, max 5n).
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const stat = (vals) => {
      const arr = vals || [];
      const sum = arr.reduce((a, b) => a + b, 0);
      const n = arr.length;
      const pct = n ? Math.round(((sum - n) / (4 * n)) * 100) : 0;
      return { sum, n, pct };
    };
    const traits = [];
    for (const k of ["O", "C", "E", "A"]) {
      const s = stat(groups[k]);
      traits.push({ key: k, pct: s.pct, raw: s.sum, count: s.n, band: big5Band(s.pct).key });
    }
    // Fifth trait: stored/scored as Neuroticism, reported as Emotional Stability.
    const nStat = stat(groups["N"]);
    const esPct = 100 - nStat.pct;
    traits.push({
      key: "ES", pct: esPct, raw: nStat.sum, count: nStat.n,
      band: big5Band(esPct).key, n_pct: nStat.pct, n_band: big5Band(nStat.pct).key,
    });
    const facets = ["creative-expression", "vision", "kindness", "innovation", "humor", "purpose"]
      .map((k) => {
        const s = stat(groups[k]);
        return { key: k, pct: s.pct, raw: s.sum, count: s.n, band: big5Band(s.pct).key };
      });
    return { ...base, type: "big-five", traits, facets };
  }

  if (type === "planter") {
    // Candidate self-assessment. Trait items are scored (is_scored=true);
    // candor + attention-check items are is_scored=false, so groupBy skips them.
    const married = (profile?.marital_status || "").toLowerCase() !== "single";
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    if (!married) delete groups["Spousal Cooperation"];

    const domains = Object.entries(groups)
      .map(([domain, vals]) => {
        const average = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        const primary = PLANTER_PRIMARY.includes(domain);
        return { domain, average, primary, band: domainBand(average).label };
      })
      .sort((a, b) => b.average - a.average || a.domain.localeCompare(b.domain));

    // Weighted composite: primaries 2x, secondaries 1x.
    let wSum = 0, w = 0;
    for (const d of domains) { const wt = d.primary ? 2 : 1; wSum += d.average * wt; w += wt; }
    const composite = w ? +(wSum / w).toFixed(2) : 0;

    const primaries = domains.filter((d) => d.primary);
    const minPrimary = primaries.length ? Math.min(...primaries.map((d) => d.average)) : 0;
    const weakPrimaries = primaries.filter((d) => d.average < 3.0).length;

    // Readiness tier (developmental, never a verdict). Ready = strong across all
    // primaries; Develop = real promise with at most one primary to grow;
    // Elsewhere = multiple primary gaps or a low overall picture.
    let tier;
    if (composite >= 4.0 && minPrimary >= 3.75 && weakPrimaries === 0) tier = "ready";
    else if (composite >= 3.25 && weakPrimaries <= 1) tier = "develop";
    else tier = "elsewhere";

    // Validity layer (assessor-only; computed here, not shown to the candidate).
    let candor = 0, attentionFail = 0, infrequency = false;
    for (const [itemId, value] of Object.entries(answers)) {
      const it = itemMap[itemId];
      if (!it) continue;
      const v = Number(value);
      if (it.domain === "Candor" && v >= 4) candor += 1;
      if (it.domain === "Attention") {
        if (/select disagree/i.test(it.text || "")) { if (v !== 2) attentionFail += 1; }
        else if (/succeeded at everything/i.test(it.text || "")) { if (v >= 4) infrequency = true; }
      }
    }
    const validity = {
      candor,
      candor_flag: candor >= 4 ? "high" : candor >= 2 ? "moderate" : "low",
      attention_fail: attentionFail,
      infrequency,
    };

    return {
      ...base, type: "planter", scale_max: smax, married,
      domains, composite, tier, tier_label: PLANTER_TIERS[tier].label, validity,
    };
  }

  if (type === "disc-blend") {
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const dims = ["D", "I", "S", "C"].map((key) => ({
      key,
      score: (groups[key] || []).reduce((a, b) => a + b, 0),
    }));
    // rank by score, tie broken by D>I>S>C priority
    const ranked = [...dims].sort(
      (a, b) =>
        b.score - a.score ||
        DISC_PRIORITY.indexOf(a.key) - DISC_PRIORITY.indexOf(b.key)
    );
    const primary = ranked[0].key;
    const secondary = ranked[1].key;
    const perDim = Math.max(...Object.values(groups).map((a) => a.length), 7);
    return {
      ...base,
      type: "disc-blend",
      dims,
      primary,
      secondary,
      blend: primary + secondary,
      max_per: perDim * smax,
    };
  }

  if (type === "pillar") {
    // Domain averages grouped into pillar composites. The Wellbeing module is
    // never scored here — it is computed and stored separately (scoreWellbeing).
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    delete groups["Wellbeing"];
    const domains = Object.entries(groups)
      .map(([domain, vals]) => {
        const average = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        return {
          domain,
          average,
          band: domainBand(average).label,
          pillar: PASTOR_DOMAINS[domain]?.pillar || null,
        };
      })
      .sort((a, b) => b.average - a.average || a.domain.localeCompare(b.domain));
    const pillars = PASTOR_PILLARS.map((p) => {
      const ds = domains.filter((d) => d.pillar === p);
      const average = ds.length
        ? +(ds.reduce((a, d) => a + d.average, 0) / ds.length).toFixed(2)
        : 0;
      return { pillar: p, average, count: ds.length };
    });
    return { ...base, type: "pillar", scale_max: smax, domains, pillars };
  }

  if (type === "leadership-stool") {
    // Three legs (Spirituality, Chemistry, Strategy) + a Leadership seat, each
    // built on three foundations of 4 items (1-5). Percent-of-maximum keeps
    // everything transparent: foundation % = (raw-4)/16*100; leg % = (raw-12)/48*100.
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const fSum = (k) => (groups[k] || []).reduce((a, b) => a + b, 0);
    const fN = (k) => (groups[k] || []).length;

    // Foundation scores (all 12: 9 leg foundations + 3 seat components).
    const foundation = {};
    for (const k of Object.keys(FOUNDATIONS)) {
      const raw = fSum(k), n = fN(k) || 4;
      const pct = Math.round(((raw - n) / (4 * n)) * 100);
      foundation[k] = { key: k, raw, pct, leg: FOUNDATIONS[k].leg, band: leadBand(pct).key };
    }

    // Leg scores (sum the three foundations that make up each leg).
    const legOf = (legKey) => {
      const fs = legKey === "L" ? SEAT.components : FOUNDATION_ORDER_BY_LEG[legKey];
      const raw = fs.reduce((a, k) => a + fSum(k), 0);
      const nTotal = fs.reduce((a, k) => a + (fN(k) || 4), 0) || 12;
      const pct = Math.round(((raw - nTotal) / (4 * nTotal)) * 100);
      return { key: legKey, raw, pct, band: leadBand(pct).key };
    };
    const legs = {}; for (const k of LEG_ORDER) legs[k] = legOf(k);
    const seat = legOf("L");

    // Rank SP/CH/ST for the style. Tie-break: higher single foundation within the
    // leg, then a fixed SP>CH>ST order for determinism.
    const topFoundationPct = (legKey) =>
      Math.max(...FOUNDATION_ORDER_BY_LEG[legKey].map((k) => foundation[k].pct));
    const fixed = { SP: 0, CH: 1, ST: 2 };
    const ranked = [...LEG_ORDER].sort((a, b) =>
      legs[b].pct - legs[a].pct ||
      topFoundationPct(b) - topFoundationPct(a) ||
      fixed[a] - fixed[b]
    );
    const code = ranked.join("-");
    const style = STYLES[code];

    // Seat components with a plain-language level.
    const level = (p) => (p >= 60 ? "high" : p >= 40 ? "medium" : "low");
    const components = SEAT.components.map((k) => ({
      key: k, pct: foundation[k].pct, level: level(foundation[k].pct),
    }));

    // Strongest + lowest of the nine leg foundations (drives the plan).
    const nine = Object.values(foundation).filter((f) => f.leg !== "L");
    const strongest = nine.reduce((a, b) => (b.pct > a.pct ? b : a));
    const lowest = nine.reduce((a, b) => (b.pct < a.pct ? b : a));

    // Response pattern buckets (for the "what your answers show" section).
    const patterns = { low: [], high: [] }; // items answered 1-2 vs 5
    for (const [itemId, value] of Object.entries(answers)) {
      const it = itemMap[itemId];
      if (!it || it.is_scored === false || !it.domain) continue;
      const v = Number(value);
      const entry = { text: it.text, foundation: it.domain, leg: FOUNDATIONS[it.domain]?.leg };
      if (v <= 2) patterns.low.push(entry);
      else if (v >= 5) patterns.high.push(entry);
    }

    return {
      ...base, type: "leadership-stool",
      role: { key: profile?.leadership_role_key || null, label: profile?.leadership_role || roleLabel(profile?.leadership_role_key) || null },
      legs, ranked, seat, components,
      style_code: code, style_name: style?.name || null,
      foundation,
      strongest_foundation: strongest.key,
      lowest_foundation: lowest.key,
      patterns,
    };
  }

  // Generic domain-average fallback (used only if an unexpected slug submits)
  const groups = groupBy(itemMap, answers, (it) => it.domain || "General", smin, smax);
  const domains = Object.entries(groups)
    .map(([domain, vals]) => {
      const average = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      return { domain, average, count: vals.length, band: domainBand(average).label };
    })
    .sort((a, b) => b.average - a.average);
  return { ...base, type: "domain-average", scale_max: smax, domains };
}

// Wellbeing module — scored on its own (0-3 per item), returned to the caller
// so it can be stored in the owner-only wellbeing_results table. This output
// must never be written into results.scored_json or emailed.
export function scoreWellbeing(itemMap, answers) {
  let total = 0;
  let maxTotal = 0;
  let elevated = false;
  for (const [itemId, value] of Object.entries(answers)) {
    const it = itemMap[itemId];
    if (!it || it.domain !== "Wellbeing") continue;
    const v = Number(value);
    total += v;
    maxTotal += 3;
    if (WELLBEING_FLAG_TEXTS.includes(it.text) && v >= 2) elevated = true;
  }
  const band = wellbeingBand(total, elevated);
  return { total, maxTotal, elevated, band: band.key, band_label: band.label };
}

