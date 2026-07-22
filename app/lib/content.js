// Display + scoring metadata for each assessment, keyed by slug.
// Item banks and scale ranges live in the database; this file holds the
// human-facing content each report renders (descriptions, Scripture, next
// steps) and the scoring type the engine should apply.
//
// SOURCE OF TRUTH: the completed assessment package files. Do not change
// scoring keys, band cutoffs, level messages, or DISC blend content without
// checking them back against those packages.

// Which scorer runs for each published/known assessment.
export const SCORING_TYPE = {
  "spiritual-gifts": "gift-rank",
  "church-growth": "level-matrix",
  rooted: "domain-bands",
  "fivefold-calling": "ranked-sum",
  "wired-to-lead": "disc-blend",
  // seeded but unpublished (dedicated flows pending)
  "called-together": "couple-lower",
  "church-health": "multi-rater",
  "leadership-health": "self-peer",
};

// Answer scale options per slug (value stored + label shown).
// Falls back to a numeric scale built from the DB range when a slug is absent.
export const SCALE_OPTIONS = {
  "spiritual-gifts": [
    [0, "Not at all"], [1, "Little"], [2, "Some"], [3, "Much"],
  ],
  "church-growth": [
    [0, "Not at all"], [1, "Rarely"], [2, "Sometimes"], [3, "Consistently"],
  ],
  "fivefold-calling": [
    [0, "Not at all true"], [1, "A little true"], [2, "Somewhat true"], [3, "Very true"],
  ],
  rooted: [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"],
  ],
  "wired-to-lead": [
    [1, "Not me at all"], [2, "A little"], [3, "Somewhat"], [4, "Mostly me"], [5, "Completely me"],
  ],
  "called-together": [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"],
  ],
  "church-health": [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"],
  ],
  "leadership-health": [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"],
  ],
};

export function scaleOptions(assessment) {
  if (!assessment) return [];
  const preset = SCALE_OPTIONS[assessment.slug];
  if (preset) return preset;
  const out = [];
  for (let v = assessment.scale_min; v <= assessment.scale_max; v++) out.push([v, String(v)]);
  return out;
}

// "Take this next" cross-promotion. Keys are slugs; values are slugs to plug.
export const CROSS_PROMO = {
  "spiritual-gifts": ["wired-to-lead", "fivefold-calling"],
  "fivefold-calling": ["wired-to-lead", "spiritual-gifts"],
  "wired-to-lead": ["fivefold-calling", "spiritual-gifts"],
  rooted: ["spiritual-gifts", "fivefold-calling"],
  "church-growth": ["fivefold-calling", "wired-to-lead"],
};

export const PROMO_HOOK = {
  "spiritual-gifts": "See the 25 gifts God has placed in you.",
  "fivefold-calling": "Find your primary Ephesians 4 calling.",
  "wired-to-lead": "Discover your leadership wiring and its biblical parallel.",
  rooted: "Take an honest look at where your roots go down.",
  "church-growth": "Get an honest read on your church's stage.",
};

/* ------------------------------------------------------------------ */
/* Church Growth — 5 levels (highest column wins)                      */
/* ------------------------------------------------------------------ */
export const GROWTH_LEVELS = {
  1: {
    name: "A Church in Decline",
    message: "Please Stay",
    desc:
      "Your church is losing ground. This is a critical season requiring honest evaluation, prayer, and a clear renewal plan. Stable, committed leadership is the most important thing right now.",
  },
  2: {
    name: "A Church Plateaued",
    message: "Please Stay",
    desc:
      "Your church is holding steady but not growing. Plateau left unaddressed becomes decline. A renewed vision and an intentional growth strategy are the next step.",
  },
  3: {
    name: "A Church Adding",
    message: "Please Come",
    desc:
      "Your church is growing and gaining momentum. The focus now is strengthening discipleship and building the leadership pipeline that sustains growth. There is room and readiness for more.",
  },
  4: {
    name: "A Church Reproducing Campuses",
    message: "Please Come",
    desc:
      "Your church is expanding beyond its walls. You are thinking and operating at a regional level. Your model is working, and expansion is the natural next step.",
  },
  5: {
    name: "A Church Multiplying",
    message: "Please GO",
    desc:
      "Your church is sending, planting, and producing other churches. This is the exponential level. Your calling is to release leaders and resources into new works that will do the same.",
  },
};

/* ------------------------------------------------------------------ */
/* Rooted — 8 markers, each with Scripture anchor + a next step        */
/* ------------------------------------------------------------------ */
export const ROOTED_MARKERS = {
  "Abiding in Christ": {
    ref: "John 15:4-5",
    step:
      "Set one fixed anchor point in your day, morning or evening, to consciously reconnect with Christ before anything else pulls at you.",
  },
  "Word & Prayer": {
    ref: "Joshua 1:8 · Psalm 1:2",
    step:
      "Pick a short book of the Bible and read a few verses at the same time each day this week, ending with two minutes of silent listening.",
  },
  "Fruit of the Spirit": {
    ref: "Galatians 5:22-23",
    step:
      "Name the one fruit you most want to grow, then ask someone close to you to point out honestly where they see it and where they don't.",
  },
  "Community & Accountability": {
    ref: "Proverbs 27:17 · Hebrews 10:24-25",
    step:
      "Invite one trusted person into a standing monthly check-in where they have permission to ask you hard questions.",
  },
  "Serving & Gifts": {
    ref: "1 Peter 4:10",
    step:
      "Say yes to one concrete way to serve this month that uses a gift you already know you have.",
  },
  "Witness & Mission": {
    ref: "Matthew 5:16 · 1 Peter 3:15",
    step:
      "Write down two people who don't yet know Christ, pray for them by name daily, and look for one natural opening to share.",
  },
  Stewardship: {
    ref: "Luke 16:10-11 · 2 Corinthians 9:7",
    step:
      "Review where your time and money actually went last month and choose one adjustment that reflects trust in God over comfort.",
  },
  "Perseverance in Trials": {
    ref: "James 1:2-4 · Romans 5:3-5",
    step:
      "Name one hard season God carried you through and write down what it taught you, so the next trial meets a settled memory.",
  },
};

export const ROOTED_BANDS = [
  { min: 4.0, label: "Deeply Rooted", color: "#2E7D8A" },
  { min: 2.75, label: "Growing", color: "#C4923E" },
  { min: 0, label: "Needs Watering", color: "#8CA0B3" },
];

export function rootedBand(avg) {
  return ROOTED_BANDS.find((b) => avg >= b.min) || ROOTED_BANDS[ROOTED_BANDS.length - 1];
}

/* ------------------------------------------------------------------ */
/* Fivefold Calling — 5 callings                                       */
/* ------------------------------------------------------------------ */
export const FIVEFOLD = {
  "Pioneering (Apostolic)": {
    short:
      "You are wired to start what doesn't yet exist, to see opportunity early and get new things off the ground.",
    shadow:
      "Unchecked, pioneering can move on before things are established and leave people behind in the rush to what's next.",
    application:
      "Launching new ministries, reaching groups no one is reaching, and getting stalled initiatives off the ground.",
    ref: "Ephesians 2:20",
  },
  Prophetic: {
    short:
      "You sense when something is off before others do and feel a pull toward truth, even when it's uncomfortable.",
    shadow:
      "Unchecked, the prophetic edge can turn harsh or divisive, valuing being right over being redemptive.",
    application:
      "Discernment, calling the church back to conviction, and guarding integrity in leadership.",
    ref: "Ephesians 4:11 · 1 Corinthians 14:3",
  },
  Evangelistic: {
    short:
      "You come alive sharing the gospel with people who don't yet know Christ and can explain it simply.",
    shadow:
      "Unchecked, evangelistic zeal can prize the new decision over the long, patient work of discipleship that follows.",
    application:
      "Outreach, personal witness, evangelistic events, and equipping others to share their faith.",
    ref: "Acts 8:26-40 (Philip)",
  },
  Shepherding: {
    short:
      "You are drawn to care for people over the long haul and notice when someone is drifting.",
    shadow:
      "Unchecked, shepherding can resist necessary change to protect people, and struggle to let anyone be uncomfortable.",
    application:
      "Pastoral care, follow-up, small-group leadership, and walking with people through hard seasons.",
    ref: "John 10:11-14",
  },
  Teaching: {
    short:
      "You love studying Scripture deeply and making it clear, and you care about accuracy and depth.",
    shadow:
      "Unchecked, teaching can over-value information over transformation and assume understanding equals obedience.",
    application:
      "Bible teaching, curriculum and doctrinal instruction, and training other leaders.",
    ref: "Ezra 7:10",
  },
};

/* ------------------------------------------------------------------ */
/* Wired to Lead — DISC dimensions + 12 blend profiles                 */
/* ------------------------------------------------------------------ */
export const DISC_DIMS = {
  D: "Drive",
  I: "Influence",
  S: "Steadiness",
  C: "Conscientiousness",
};

// Tiebreak priority when a tie affects primary or secondary.
export const DISC_PRIORITY = ["D", "I", "S", "C"];

export const DISC_BLENDS = {
  DI: {
    figure: "Elijah", title: "The Bold Voice",
    strengths: "Decisive under pressure, unafraid of public confrontation, rallies people around a clear stand, brings intensity that shakes people out of neutral.",
    watchouts: "Can crash hard after a big moment (1 Kings 19), can burn relational bridges by moving too fast, may struggle in sustained low-visibility seasons.",
    bestFor: "Calling a church back to conviction, leading through crisis, moments requiring a clear public stand.",
    growth: "Build in a planned rest and debrief after every major public moment, before the crash finds you first.",
  },
  DS: {
    figure: "Joshua", title: "The Steady Commander",
    strengths: "Decisive but patient, follows through over the long haul, leads with courage without needing the spotlight, honors the leaders before him.",
    watchouts: "Can be slow to speak up when patience tips into passivity, may under-communicate vision because action feels like enough.",
    bestFor: "Succession seasons, long building projects, leading a team through a multi-year vision.",
    growth: "Practice narrating your vision out loud at least once a week, not just executing it quietly.",
  },
  DC: {
    figure: "Nehemiah", title: "The Builder",
    strengths: "Goal-driven and highly organized, turns a big vision into a workable plan, handles opposition firmly without losing focus, prays first and moves fast.",
    watchouts: "Can run over people's feelings in pursuit of the plan, may struggle to slow down for those who need more process.",
    bestFor: "Capital projects, organizational turnarounds, any season requiring both vision and execution.",
    growth: "Before your next big push, ask one person how the plan is affecting them personally, and actually wait for the answer.",
  },
  ID: {
    figure: "Peter", title: "The Passionate Leader",
    strengths: "Bold, relationally warm, quick to act, brings others along through sheer enthusiasm and conviction.",
    watchouts: "Can speak or commit before thinking it through, prone to overpromising under emotion and underdelivering under pressure.",
    bestFor: "Rallying a team emotionally, pioneering new relationships and partnerships, leading through personal example.",
    growth: "Practice a 24-hour pause before committing to anything significant, especially when you're excited.",
  },
  IS: {
    figure: "Barnabas", title: "The Encourager",
    strengths: "Builds people up consistently, connects others to opportunity, steady and loyal support, sees potential others miss.",
    watchouts: "Can avoid necessary confrontation to protect the relationship, may struggle to hold someone accountable once they've been encouraged.",
    bestFor: "Mentoring emerging leaders, team chaplaincy, any role built on long-term relational investment.",
    growth: "The next time someone you're encouraging needs correction, give it within the week, not “eventually.”",
  },
  IC: {
    figure: "Miriam", title: "The Expressive Guardian",
    strengths: "Leads worship and celebration naturally, watches over details and people others overlook, combines public expression with quiet vigilance.",
    watchouts: "Can let emotion override process in the moment, may struggle when asked to step back from a visible role.",
    bestFor: "Worship leadership, protective and pastoral care roles, ministry blending public expression with behind-the-scenes watchfulness.",
    growth: "Practice handing off a visible role to someone else for a season, and notice what that reveals about your identity.",
  },
  SD: {
    figure: "Esther", title: "The Patient Strategist",
    strengths: "Waits for the right moment instead of forcing one, calm under real threat, decisive when the moment finally calls for it.",
    watchouts: "Can wait too long out of caution, may need a push to act when timing will never feel perfect.",
    bestFor: "High-stakes negotiations, seasons requiring discernment before action, advocacy on behalf of others.",
    growth: "Set a deadline for your next big decision, so patience doesn't quietly become avoidance.",
  },
  SI: {
    figure: "Abigail", title: "The Wise Peacemaker",
    strengths: "Reads a volatile situation clearly, speaks persuasively without escalating conflict, calm and steady under pressure, generous with people.",
    watchouts: "Can over-function to prevent conflict that isn't actually hers to manage, may absorb the fallout of other people's poor decisions.",
    bestFor: "Conflict mediation, diplomacy between leaders or factions, de-escalating tense congregational moments.",
    growth: "Name one conflict you've been managing that actually belongs to someone else, and hand it back.",
  },
  SC: {
    figure: "Job", title: "The Enduring Witness",
    strengths: "Remains faithful through prolonged hardship, reasons carefully rather than reacting emotionally, doesn't abandon conviction under pressure.",
    watchouts: "Can internalize suffering rather than seeking support, may struggle to ask for help even when clearly needed.",
    bestFor: "Walking with people through long-term grief or crisis, roles requiring endurance over years, not months.",
    growth: "Identify one person you'd let speak into your hardest season, and actually let them.",
  },
  CD: {
    figure: "Moses", title: "The Reluctant Commander",
    strengths: "Meticulous about following God's instructions exactly, capable of decisive action when the moment requires it, deeply relational with God even while leading a nation.",
    watchouts: "Can hesitate at the start out of self-doubt, may become impatient with people once finally moving.",
    bestFor: "High-stakes leadership requiring precision, seasons where getting the details of God's instruction right matters more than moving fast.",
    growth: "Before your next decisive action, name what specifically you're impatient about, out loud, to someone else.",
  },
  CI: {
    figure: "Ezra", title: "The Teaching Scholar",
    strengths: "Deeply prepared and detail-oriented, communicates what he's studied clearly to real audiences, credible because the depth is genuine.",
    watchouts: "Can over-invest in preparation and under-invest in relationship, may assume understanding transferred just because it was taught well.",
    bestFor: "Teaching and curriculum development, credentialing and doctrinal instruction, any role where accuracy and clarity both matter.",
    growth: "After your next teaching moment, follow up personally with one person instead of assuming the content did the work.",
  },
  CS: {
    figure: "Daniel", title: "The Principled Diplomat",
    strengths: "Unwavering conviction paired with genuine relational favor, calm under extreme pressure, consistent in private discipline regardless of who's watching.",
    watchouts: "Can be slow to act when principle isn't clearly at stake, may avoid necessary boldness by defaulting to careful diplomacy.",
    bestFor: "Navigating politically complex environments, holding a consistent standard across a long career, mentoring younger leaders in integrity.",
    growth: "Identify one place where careful diplomacy has actually become avoidance, and take the direct action instead.",
  },
};

// Shared band model for 1-5 domain assessments (Strength / Steady / Needs Attention).
export const DOMAIN_BANDS = [
  { min: 4.0, label: "Strength", color: "#2E7D8A" },
  { min: 2.75, label: "Steady", color: "#C4923E" },
  { min: 0, label: "Needs Attention", color: "#8CA0B3" },
];
export function domainBand(avg) {
  return DOMAIN_BANDS.find((b) => avg >= b.min) || DOMAIN_BANDS[DOMAIN_BANDS.length - 1];
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
