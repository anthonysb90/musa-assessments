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
} from "./content";
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
    const groups = groupBy(itemMap, answers, (it) => it.domain, smin, smax);
    const domains = Object.entries(groups)
      .map(([domain, vals]) => {
        const average = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        return { domain, average, count: vals.length, band: rootedBand(average).label };
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
    // winner: highest score, tie broken toward the more mature (higher) level
    let winner = levels[0];
    for (const l of levels) if (l.score > winner.score) winner = l;
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
