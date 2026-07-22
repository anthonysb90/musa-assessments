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
  // Leadership Health ships as a self-assessment now (domain bands); the
  // optional peer 360 comparison layer is added later.
  "leadership-health": "domain-bands",
  // Pastor Profile: 3-pillar / 14-domain self-assessment with a separate,
  // quarantined wellbeing module (scored + stored apart, never emailed).
  "pastor-profile": "pillar",
  // seeded but unpublished (dedicated flows pending)
  "called-together": "couple-lower",
  "church-health": "multi-rater",
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
  "pastor-profile": [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"],
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

/* Leadership Health — 8 domains, each with a practical next step.
   Ships as a self-assessment; optional peer 360 comparison comes later. */
export const LEADERSHIP_DOMAINS = {
  "Vision & Direction": {
    step: "Write your leadership vision in two sentences, then say it out loud to your team this week and ask them to repeat it back in their own words.",
  },
  "Decision-Making": {
    step: "Pick one decision you've been sitting on, set a deadline this week, and make the call once you have the input that actually matters, not all the input you could gather.",
  },
  Communication: {
    step: "After your next important ask, check for understanding by having the person tell you back what they heard before they walk away.",
  },
  "Delegation & Team Building": {
    step: "Hand one meaningful responsibility, not just a task, to someone this month, and resist the urge to step back in and take it over.",
  },
  "Emotional & Spiritual Resilience": {
    step: "Name your two earliest 'running on empty' warning signs and decide now what you'll do the moment you notice them.",
  },
  "Integrity & Accountability": {
    step: "Give one trusted person standing permission to question your decisions, and actually invite it at your next conversation with them.",
  },
  "Conflict Navigation": {
    step: "Name one tension you've been avoiding and schedule the direct conversation within the week, before it grows.",
  },
  "Growth & Adaptability": {
    step: "Choose one specific weakness and one concrete action you'll take on it this month, then tell someone so it's not just a private intention.",
    ref: "Proverbs 12:15",
  },
};

// Which metadata + report copy a domain-bands assessment uses, keyed by slug.
export const DOMAIN_META = {
  rooted: ROOTED_MARKERS,
  "leadership-health": LEADERSHIP_DOMAINS,
};

export const DOMAIN_REPORT_COPY = {
  rooted: {
    snapshot: "Your roots, marker by marker",
    strong: "Where you're deeply rooted",
    grow: "Where to grow",
    helper:
      "Every grower has roots still going down somewhere. These are simply where the next season of growth is waiting, not a verdict on your walk.",
  },
  "leadership-health": {
    snapshot: "Your leadership, domain by domain",
    strong: "Your strengths",
    grow: "Where to grow",
    helper:
      "Self-assessment is a start, not the whole picture. These are where the next season of growth is, not a verdict on your leadership. Adding trusted voices later will sharpen it further.",
  },
};

/* ------------------------------------------------------------------ */
/* Pastor Profile — 3 pillars, 14 domains, + a quarantined wellbeing   */
/* module. Wellbeing is scored and stored separately (owner-only) and  */
/* never appears in any shared report, export, or email.               */
/* ------------------------------------------------------------------ */
export const PASTOR_PILLARS = [
  "Character & Inner Life",
  "Competence",
  "Contribution & Support",
];

export const PASTOR_DOMAINS = {
  "Calling & Conviction": { pillar: "Character & Inner Life", step: "Write down the two or three moments God most clearly confirmed your call, and keep them where you'll see them in the hard weeks." },
  "Character & Integrity": { pillar: "Character & Inner Life", step: "Name one area you'd rather the congregation not see, and bring it into the light with one trusted person this month." },
  "Spiritual Vitality": { pillar: "Character & Inner Life", step: "Set aside time with God this week that has nothing to do with sermon prep, purely to be with Him." },
  "Emotional Health": { pillar: "Character & Inner Life", step: "Tell one safe person how you're actually doing this week, the unedited version, not the platform version." },
  "Rest, Rhythm & Health": { pillar: "Character & Inner Life", step: "Protect one full day off on the calendar this week, and let one person hold you to it." },
  "Marriage & Family": { pillar: "Character & Inner Life", step: "Put one unhurried, ministry-free evening with your family on the calendar this week and guard it like a meeting." },
  "Preaching & Teaching": { pillar: "Competence", step: "Ask two people you trust for honest feedback on your last message, then pick one thing to sharpen." },
  "Pastoral Care & Shepherding": { pillar: "Competence", step: "Name the person whose burden you're carrying hardest, and decide who can help you carry that weight." },
  "Leadership & Vision": { pillar: "Competence", step: "Write your church's direction in one sentence, then say it out loud to your team this week." },
  "Conflict Resolution": { pillar: "Competence", step: "Name one conversation you've been avoiding and schedule it within the week, before it grows." },
  "Communication & Relationships": { pillar: "Competence", step: "Pick one relationship that needs repair and make the first move this week." },
  "Disciple-Making & Multiplication": { pillar: "Contribution & Support", step: "Choose one person to intentionally disciple this season, and take the first concrete step with them." },
  "Mentoring & Accountability": { pillar: "Contribution & Support", step: "If you don't have a mentor or real accountability, ask one person this month to speak into your ministry. Isolation is the quiet risk in ministry." },
  "Mission & Evangelism": { pillar: "Contribution & Support", step: "Build one genuine friendship with someone far from God, starting this month." },
};

// Wellbeing module — 0 to 3 per item, last two weeks.
export const WELLBEING_OPTIONS = [
  [0, "Not at all"], [1, "Several days"], [2, "More than half the days"], [3, "Nearly every day"],
];

// The two items that force the "significant strain" band when elevated.
export const WELLBEING_FLAG_TEXTS = [
  "I've felt down, discouraged, or hopeless.",
  "I've wondered whether I can keep going.",
];

export const WELLBEING_NOTICE =
  "This next short section is a private check on how you're really doing. It is not shared with your local church or congregation, and never appears in any report they could see. It is held in confidence by the Mission USA care team, so that if you're carrying a heavy load, someone can reach out and walk with you. Please answer honestly, thinking about the last two weeks.";

// Non-diagnostic bands. Care copy is fixed wording — do not soften the
// significant-strain resource message without review.
export function wellbeingBand(total, elevated) {
  if (elevated || total >= 15) return { key: "significant", label: "Carrying a heavy load" };
  if (total >= 7) return { key: "strain", label: "Some strain" };
  return { key: "ok", label: "Doing okay" };
}

export const WELLBEING_CARE = {
  ok: {
    title: "You're doing okay",
    body:
      "This is good to see. Keep tending your own soul the way you tend everyone else's. Rest, honest friendship, and unhurried time with God are not luxuries for you, they're how you last.",
  },
  strain: {
    title: "This season sounds heavy",
    body:
      "What you named is worth paying attention to, not pushing through. Consider protecting real rest this week, telling a trusted friend how you're actually doing, and letting someone pastor you for a change. You don't have to carry this at full strength alone.",
  },
  significant: {
    title: "How you're feeling matters, and you don't have to carry it alone",
    body:
      "Please reach out to someone you trust, a doctor, a counselor, or a friend who will stay close. If you are struggling, the 988 Suicide and Crisis Lifeline is available 24/7: call or text 988 in the US. Reaching out is not weakness. You are worth caring for, and this weight is not yours to carry by yourself.",
  },
};

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

/* ------------------------------------------------------------------ */
/* Per-assessment landing content: imagery, copy, and a demo report.   */
/* Photos: Pexels (free license). id → images.pexels.com CDN.          */
/* ------------------------------------------------------------------ */
const pexels = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop`;

export const ASSESSMENT_IMAGE = {
  "spiritual-gifts": pexels(2019333),
  rooted: pexels(8552609),
  "fivefold-calling": pexels(7459355),
  "wired-to-lead": pexels(3183183),
  "church-growth": pexels(7816621),
  "leadership-health": pexels(11633988),
  "called-together": pexels(33521772),
  "church-health": pexels(7691722),
  "church-planter": pexels(30867724),
  "pastor-profile": pexels(18999688),
};

export function assessmentImage(slug) {
  return ASSESSMENT_IMAGE[slug] || pexels(1370295);
}

export const ASSESSMENT_LANDING = {
  "spiritual-gifts": {
    tagline: "Discover how God has gifted you to serve.",
    about:
      "Spiritual Gifts looks at 25 gift areas drawn from Romans 12, 1 Corinthians 12, and Ephesians 4. You'll answer 125 short statements, and your report ranks every gift from strongest to least, so you can see clearly where you're wired to serve.",
    measures: [
      "25 gifts across Romans 12, 1 Corinthians 12, and Ephesians 4",
      "Your dominant and supporting gifts",
      "A full ranked profile, not just a single label",
    ],
    youGet: [
      "Your top gifts revealed first",
      "Every gift ranked with a score",
      "A definition, Scripture, and ministry-fit for each",
    ],
    demo: { headline: "Top gift: Teaching", sub: "Your 3 strongest of 25 gifts",
      bars: [["Teaching", 14, 15], ["Leadership", 13, 15], ["Exhortation", 12, 15]] },
  },
  rooted: {
    tagline: "How deep do your roots go?",
    about:
      "Rooted is a mirror, not a test. Over 40 statements you'll reflect on eight biblical markers of spiritual maturity, and see where you're deeply planted and where your roots still need to go down.",
    measures: [
      "8 biblical markers of maturity",
      "From Abiding in Christ to Perseverance in Trials",
      "Per-marker bands, no single grade",
    ],
    youGet: [
      "A radar across all 8 markers",
      "Your two strongest markers, affirmed",
      "Your two growth markers, each with a Scripture and a next step",
    ],
    demo: { headline: "Deeply Rooted: Abiding in Christ", sub: "8 markers of maturity",
      bars: [["Abiding in Christ", 4.4, 5], ["Word & Prayer", 4.0, 5], ["Serving & Gifts", 3.2, 5], ["Stewardship", 2.6, 5]] },
  },
  "fivefold-calling": {
    tagline: "Find your primary ministry calling.",
    about:
      "Ephesians 4 names five ways God equips His church. Over 25 short statements, Fivefold Calling shows your primary and secondary calling, with a plain description of how you're most useful in the body.",
    measures: [
      "5 callings: Pioneering, Prophetic, Evangelistic, Shepherding, Teaching",
      "Your primary and secondary lane",
      "All five scored, none ranked above another",
    ],
    youGet: [
      "Your primary and secondary calling, described",
      "All five shown on a radar",
      "Where each calling can go wrong, and how to use it well",
    ],
    demo: { headline: "Primary calling: Shepherding", sub: "Your Ephesians 4 wiring",
      bars: [["Shepherding", 13, 15], ["Teaching", 11, 15], ["Prophetic", 7, 15]] },
  },
  "wired-to-lead": {
    tagline: "How has God wired you to lead?",
    about:
      "A simple lens on how you naturally move through decisions, people, and pressure. Over 28 statements, Wired to Lead shows your DISC blend, paired with a biblical leader who shares it.",
    measures: [
      "Four dimensions: Drive, Influence, Steadiness, Conscientiousness",
      "One of 12 blends, each with a biblical parallel",
      "Your full wiring, not a flattened label",
    ],
    youGet: [
      "Your blend and its biblical parallel",
      "Strengths and watch-outs, both",
      "Where you're best used, and one growth challenge",
    ],
    demo: { headline: "Your blend: DC — Nehemiah, the Builder", sub: "Drive + Conscientiousness",
      bars: [["Drive", 30, 35], ["Conscientiousness", 28, 35], ["Influence", 20, 35], ["Steadiness", 18, 35]] },
  },
  "church-growth": {
    tagline: "Where is your church actually headed?",
    about:
      "Not where you hope it's headed, where the evidence says it's headed. 50 statements, mixed so no stage is identifiable while you answer, give an honest read on your church's current stage, from decline to multiplication.",
    measures: [
      "5 stages: Decline, Plateaued, Adding, Reproducing, Multiplying",
      "Each stage scored independently",
      "A transition flag when you're between stages",
    ],
    youGet: [
      "Your current stage and its message",
      "All five stages side by side",
      "Where to focus to reach the next stage",
    ],
    demo: { headline: "A Church Adding — Please Come", sub: "Your stage, of five",
      bars: [["Adding", 24, 30], ["Reproducing", 18, 30], ["Plateaued", 15, 30]] },
  },
  "leadership-health": {
    tagline: "How healthy is your leadership, really?",
    about:
      "An honest self-assessment across eight areas every leader needs. Over 40 statements you'll reflect on how you actually lead, not how you wish you led, and see where you're strong and where to grow.",
    measures: [
      "8 leadership domains, from Vision to Adaptability",
      "An honest self-read",
      "Optional peer input for blind spots (coming soon)",
    ],
    youGet: [
      "A radar across all 8 domains",
      "Your two strongest domains",
      "Your two growth domains, each with a next step",
    ],
    demo: { headline: "Strength: Vision & Direction", sub: "8 leadership domains",
      bars: [["Vision & Direction", 4.4, 5], ["Integrity", 4.2, 5], ["Delegation", 3.0, 5], ["Conflict", 2.6, 5]] },
  },
  "called-together": {
    tagline: "Your marriage carries more than most.",
    about:
      "Ministry puts a weight on a marriage most never carry. Called Together is an honest look at how yours is holding up, taken privately by each spouse, then shown side by side.",
    measures: [
      "8 domains, from Shared Calling to Support & Community",
      "Taken separately by each spouse",
      "A confidential safety check, never shared",
    ],
    youGet: [
      "A couple report, both scores side by side",
      "Your strengths and growth domains",
      "The single biggest gap between you, named gently",
    ],
    demo: { headline: "Strongest: Shared Calling", sub: "8 domains, both spouses",
      bars: [["Shared Calling", 4.6, 5], ["Support & Community", 4.0, 5], ["Margin & Rest", 2.8, 5]] },
  },
  "church-health": {
    tagline: "How healthy is your church, really?",
    about:
      "Not how it feels from the platform, how it actually is, according to the people leading alongside you. Your whole leadership team answers privately, and the results combine into one honest picture.",
    measures: [
      "8 qualities of a healthy church",
      "Taken by your whole leadership team",
      "A 3-rater minimum protects anonymity",
    ],
    youGet: [
      "A radar of all 8 qualities",
      "Your weakest area, called out first",
      "Where your team sees things differently",
    ],
    demo: { headline: "Weakest area: Outward Focus", sub: "8 qualities, whole team",
      bars: [["Worship That Connects", 4.2, 5], ["Leadership Development", 3.6, 5], ["Outward Focus", 2.5, 5]] },
  },
  "church-planter": {
    tagline: "Are you ready to plant?",
    about:
      "A clear, honest look at your readiness to plant a church, across thirteen characteristics that consistently mark effective planters, through your answers, your spouse's perspective, and a trained assessor.",
    measures: [
      "13 planter characteristics, primary five weighted",
      "Candidate, spouse, and assessor together",
      "A validity layer that rewards honesty",
    ],
    youGet: [
      "Where you'll excel and what to watch for",
      "A readiness picture, never a verdict",
      "Where you and your spouse align, and where to talk",
    ],
    demo: { headline: "Readiness: Develop First", sub: "13 planter characteristics",
      bars: [["Visioning Capacity", 4.2, 5], ["Resilience", 3.8, 5], ["Reaches the Unchurched", 2.9, 5]] },
  },
  "pastor-profile": {
    tagline: "An honest look at your life and ministry.",
    about:
      "Pastoring asks everything of a person. Pastor Profile looks at all of it, honestly and without judgment, across three pillars and fourteen domains, plus a private, confidential read on how you're really doing.",
    measures: [
      "14 domains across Character, Competence, and Contribution",
      "A three-pillar balance view",
      "A confidential wellbeing check, private to you",
    ],
    youGet: [
      "A three-pillar snapshot of all 14 domains",
      "Your strengths and focus areas",
      "A private read on your own wellbeing and rest",
    ],
    demo: { headline: "Balanced across three pillars", sub: "Character · Competence · Contribution",
      bars: [["Character & Inner Life", 4.3, 5], ["Competence", 4.0, 5], ["Contribution & Support", 3.4, 5]] },
  },
};
