// Cross-assessment synthesis. Pure helpers, no app-specific imports.
//
// Given the report currently being viewed (`current`) and the same person's
// other completed assessments (`others`), weave a short, warm, pastoral
// second-person reflection plus a few concrete ministry-fit suggestions.
//
// Each item is { slug, name, result_type, headline }.
// Returns { narrative, fits, growthEdge, count }.
//
// House rule: never output an em dash. Everything here uses plain punctuation,
// and compose() scrubs any stray dash as a final safety net.

/* ---------------- small text helpers ---------------- */

function s(v) {
  return v == null ? "" : String(v);
}

// The part of a headline after the first colon ("Top gifts: A, B" -> "A, B").
function afterColon(h) {
  const t = s(h);
  const i = t.indexOf(":");
  return (i >= 0 ? t.slice(i + 1) : t).trim();
}

// Drop a trailing "(band)" / "(78)" qualifier.
function stripParen(t) {
  return s(t).replace(/\s*\(.*?\)\s*$/, "").trim();
}

// Join a list with an Oxford "and": [a,b,c] -> "a, b, and c".
function joinList(arr) {
  const a = (arr || []).map((x) => s(x).trim()).filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function capitalize(t) {
  const x = s(t).trim();
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
}

// Split a "A · B" or "A — B" style headline on its separators.
function splitParts(t) {
  return s(t)
    .split(/·|—|–| - /)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* ---------------- per-type fragment map ----------------
   Each fragment turns a headline into a lowercase clause that reads as an
   independent statement ("your spiritual gifts cluster around ..."). compose()
   capitalizes it into a sentence. */

const FRAGMENTS = {
  "gift-rank": (it) => {
    const gifts = joinList(afterColon(it.headline).split(","));
    return gifts
      ? `your spiritual gifts cluster around ${gifts}`
      : "your spiritual gifts point to clear places you are wired to serve";
  },
  "ranked-sum": (it) => {
    const callings = joinList(afterColon(it.headline).split("·"));
    return callings
      ? `your fivefold calling leans toward ${callings}`
      : "your fivefold calling shapes how you build up the church";
  },
  "domain-bands": (it) => {
    const domain = stripParen(afterColon(it.headline));
    return domain
      ? `you are strongest in ${domain}`
      : "your spiritual maturity is finding its footing";
  },
  "level-matrix": (it) => {
    const name = splitParts(it.headline)[0];
    return name
      ? `your church is growing at the ${name} stage`
      : "your church is finding its stage of growth";
  },
  "disc-blend": (it) => {
    const parts = splitParts(afterColon(it.headline) || it.headline);
    const figure = parts[parts.length - 1];
    return figure
      ? `your DISC blend comes through as ${figure}`
      : "your DISC blend shapes how you show up with people";
  },
  "big-five": (it) => {
    const trait = stripParen(afterColon(it.headline));
    return trait
      ? `your personality is marked most by ${trait}`
      : "your personality has its own clear signature";
  },
  "kingdom-design": (it) => {
    const parts = splitParts(afterColon(it.headline));
    const type = parts[0];
    return type
      ? `your Kingdom Design (type ${type}) shows how you are wired to process and decide`
      : "your Kingdom Design shows how you are wired to process and decide";
  },
  "leadership-stool": (it) => {
    const name = splitParts(afterColon(it.headline))[0];
    return name
      ? `your leadership style is ${name}`
      : "your leadership style has a shape all its own";
  },
  "type-pick": (it) => {
    const h = stripParen(it.headline);
    return h
      ? `your Enneagram points to ${h}`
      : "your Enneagram names what quietly drives you";
  },
  "planter": () => "your readiness to plant and pioneer is taking shape",
  "subscale-sum": () =>
    "your forgiveness profile speaks to how you release hurt and reconcile",
};

// Graceful generic fallback for any type without a specific fragment.
function fallbackFragment(it) {
  const name = s(it.name).trim() || "this assessment";
  const head = s(it.headline).trim();
  return head
    ? `your ${name} points to ${head.replace(/^[A-Z]/, (c) => c.toLowerCase())}`
    : `your ${name} adds another piece of the picture`;
}

function fragmentFor(it) {
  const fn = it && FRAGMENTS[it.result_type];
  const clause = fn ? fn(it) : "";
  return (clause && s(clause).trim()) || fallbackFragment(it);
}

function hasSpecificFragment(it) {
  return !!(it && FRAGMENTS[it.result_type]);
}

/* ---------------- ministry-fit rules ---------------- */

function buildFits(types) {
  const has = (t) => types.has(t);
  const out = [];

  if (has("gift-rank") && (has("leadership-stool") || has("ranked-sum")))
    out.push("Leading a ministry team that plays to your top gifts");
  if (has("kingdom-design") && has("gift-rank"))
    out.push("A serving role that matches both how you are wired and how you are gifted");
  if (has("big-five") && has("leadership-stool"))
    out.push("A leadership seat that fits your natural temperament");
  if (has("ranked-sum"))
    out.push("A place to exercise your fivefold calling in the local church");
  if (has("type-pick"))
    out.push("A rhythm of ministry that honors what motivates you underneath");
  if (has("domain-bands"))
    out.push("A discipleship path that builds on your strongest roots");
  if (has("subscale-sum"))
    out.push("A reconciling role that draws on your heart for forgiveness");
  if (has("planter"))
    out.push("A pioneering or church-planting role where you can build something new");
  if (has("gift-rank") && !out.some((f) => f.includes("top gifts")))
    out.push("A hands-on serving role shaped around your top gifts");

  // Warm generic fallbacks so we always return three.
  const generic = [
    "A serving role that fits the person these results describe",
    "A ministry team where your strengths and someone else's fill the gaps",
    "A next step that lets you serve from who you already are",
  ];
  for (const g of generic) {
    if (out.length >= 3) break;
    out.push(g);
  }

  // De-dupe, keep three.
  const seen = new Set();
  const fits = [];
  for (const f of out) {
    if (seen.has(f)) continue;
    seen.add(f);
    fits.push(f);
    if (fits.length >= 3) break;
  }
  return fits;
}

/* ---------------- growth invitation ---------------- */

function buildGrowthEdge(types) {
  if (types.has("domain-bands") || types.has("subscale-sum"))
    return "Your gifts are clear, so let the invitation be to keep tending the quieter places too, the roots that are still filling in. God grows the whole of you, not only your strengths.";
  if (types.has("leadership-stool") || types.has("ranked-sum"))
    return "You lead from real strength, and the next step is to lean into it on purpose while making room for the callings you carry less naturally. Growth comes as you serve alongside people who are wired differently than you.";
  return "You already know a good deal about how God has made you, so the invitation now is simple: take one strength into a place that stretches you, and trust that He uses the whole of you.";
}

/* ---------------- narrative compose ---------------- */

// Pick the current report plus the most relevant 1-2 others, without repeating
// a result_type. Ones with a specific fragment are preferred over generic.
function pickFeatured(current, others) {
  const rest = Array.isArray(others) ? others : [];
  const ranked = [
    ...rest.filter(hasSpecificFragment),
    ...rest.filter((o) => !hasSpecificFragment(o)),
  ];
  const featured = [];
  const usedTypes = new Set();
  if (current) {
    featured.push(current);
    usedTypes.add(current.result_type);
  }
  for (const o of ranked) {
    if (featured.length >= 3) break;
    if (usedTypes.has(o.result_type)) continue;
    usedTypes.add(o.result_type);
    featured.push(o);
  }
  return featured;
}

function compose(current, others) {
  const featured = pickFeatured(current, others);
  const total = (Array.isArray(others) ? others.length : 0) + 1;

  const sentences = [];
  sentences.push(
    total > 2
      ? `You have walked through ${total} of these assessments now, and a fuller portrait of you is coming into focus.`
      : "You have completed more than one of these assessments, and together they begin to sketch a fuller portrait of you."
  );

  for (const it of featured) {
    sentences.push(`${capitalize(fragmentFor(it))}.`);
  }

  sentences.push(
    "Taken together, they point to someone God has clearly been shaping, gifted in some ways and still growing in others."
  );
  sentences.push(
    "None of these scores is a verdict. Each one is an invitation to serve from who you already are."
  );
  sentences.push(
    "You are, in the words of Psalm 139, fearfully and wonderfully made, and every result here is one more angle on that truth."
  );

  // Safety net: never emit an em dash or en dash.
  return sentences.join(" ").replace(/\s*[—–]\s*/g, ", ");
}

/* ---------------- public API ---------------- */

export function buildSynthesis(current, others) {
  const rest = Array.isArray(others) ? others : [];
  const types = new Set();
  if (current && current.result_type) types.add(current.result_type);
  for (const o of rest) if (o && o.result_type) types.add(o.result_type);

  return {
    narrative: compose(current, rest),
    fits: buildFits(types),
    growthEdge: buildGrowthEdge(types),
    count: rest.length,
  };
}
