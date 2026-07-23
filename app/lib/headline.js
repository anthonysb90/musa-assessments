// One-line human summary of a scored result, for dashboards and lists.
import { GROWTH_LEVELS, DISC_BLENDS, DISC_DIMS } from "./content";
import { BIG5_TRAIT_META } from "./bigfive";
import { KDP_NAMES } from "./kingdom";
import { GIFTS } from "./gifts";

export function headlineFor(scored) {
  if (!scored) return "";
  switch (scored.type) {
    case "gift-rank": {
      const top = scored.ranked?.slice(0, 3).map((r) => GIFTS[r.letter]?.name || r.letter);
      return top?.length ? `Top gifts: ${top.join(", ")}` : "Spiritual gifts";
    }
    case "ranked-sum": {
      const top = scored.ranked?.slice(0, 2).map((r) => r.key);
      return top?.length ? `Calling: ${top.join(" · ")}` : "Fivefold calling";
    }
    case "domain-bands": {
      const top = scored.domains?.[0];
      return top ? `Strongest: ${top.domain} (${top.band})` : "Spiritual maturity";
    }
    case "level-matrix": {
      const l = GROWTH_LEVELS[scored.winnerLevel];
      return l ? `${l.name} — ${l.message}` : "Church growth level";
    }
    case "disc-blend": {
      const b = DISC_BLENDS[scored.blend];
      return b ? `${scored.blend} · ${b.figure}, ${b.title}` : `Blend ${scored.blend}`;
    }
    case "big-five": {
      const top = [...(scored.traits || [])].sort((a, b) => b.pct - a.pct)[0];
      return top ? `Strongest trait: ${BIG5_TRAIT_META[top.key]?.name || top.key} (${top.pct})` : "Big Five profile";
    }
    case "kingdom-design": {
      return scored.code ? `Type: ${scored.code} · ${KDP_NAMES[scored.code] || ""}`.trim().replace(/·\s*$/, "") : "Kingdom Design Profile";
    }
    case "leadership-stool": {
      return scored.style_name ? `Style: ${scored.style_name} · ${scored.style_code}` : "Leadership style";
    }
    case "domain-average": {
      const top = scored.domains?.[0];
      return top ? `Strongest: ${top.domain}` : "Results";
    }
    default:
      return "Results";
  }
}
