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
  // Spiritual Growth (LifeWay-based): 6 disciplines, scored by domain bands,
  // shown as a Discipleship Wheel radar.
  "spiritual-growth": "domain-bands",
  // Enneagram: 36 forced-choice pairs, each statement keyed to a type; the
  // taker picks one per pair and the type counts rank 1-9 (top three matter).
  enneagram: "type-pick",
  // Church Planter: candidate self-assessment across 13 characteristics
  // (primary five weighted 2x), with a validity layer. Spouse/assessor layers
  // are a later phase; this scores and reports the candidate self-assessment.
  "church-planter": "planter",
  // The Forgiveness Profile (licensed EFMI): 30 items, 10 motivation subscales
  // (3 items each, summed 3-18), total 30-180. Ranks the motivations.
  "forgiveness-profile": "subscale-sum",
  // Big Five (Five Factor Model): 96 items, 5 traits (12 each) + 6 facets
  // (6 each), reverse-keyed, scored to 0-100 percentages with Low/Mod/High
  // bands. Fifth trait reported as Emotional Stability (100 - Neuroticism).
  "big-five": "big-five",
  // Kingdom Design Profile (Myers-Briggs): 60 forced-choice items, 4 dichotomies
  // (EI/SN/TF/JP), a 4-letter type + clarity per letter, and a full type report.
  "kingdom-design": "kingdom-design",
  // Discover Your Leadership Style (based on David T. Olson's Leadership Stool):
  // 48 items, 12 foundations (4 each) → 3 legs + a Leadership seat, ranked into
  // one of six styles. Role-adaptive item wording chosen at the start.
  "discover-leadership-style": "leadership-stool",
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
  "spiritual-growth": [
    [1, "Never"], [2, "Seldom"], [3, "Occasionally"], [4, "Frequent"], [5, "Always"],
  ],
  "forgiveness-profile": [
    [1, "Strongly Disagree"], [2, "Disagree"], [3, "Slightly Disagree"],
    [4, "Slightly Agree"], [5, "Agree"], [6, "Strongly Agree"],
  ],
  "big-five": [
    [1, "Very Inaccurate"], [2, "Moderately Inaccurate"], [3, "Neither"],
    [4, "Moderately Accurate"], [5, "Very Accurate"],
  ],
  "discover-leadership-style": [
    [1, "Not Really"], [2, "Occasionally"], [3, "Sometimes"], [4, "Often"], [5, "Almost Always"],
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

/* Church Health — 8 team qualities, each with a focus step (multi-rater). */
export const CHURCH_HEALTH_DOMAINS = {
  "Leadership Development": { step: "Name one emerging leader and give them a real, defined next step this quarter, not just another task to cover." },
  "Every-Member Ministry": { step: "Build one simple path this month that helps a new person discover their gifts and land somewhere to serve." },
  "Prayer & Spiritual Depth": { step: "Put dedicated prayer into a decision your leadership is facing right now, not as an opener, but as the actual process." },
  "Clear Systems & Communication": { step: "Pick the one broken hand-off your team feels most, follow-up, check-in, or communication, and fix that one first." },
  "Worship That Connects": { step: "Walk your service through the eyes of a first-time guest this week, and remove one point of confusion." },
  "Groups & Discipleship": { step: "Choose one group to help multiply, or one barrier to joining a group to remove, this season." },
  "Outward Focus & Evangelism": { step: "Plan one concrete way your whole church engages the community in the next 60 days, not just a designated team." },
  "Unity & Relational Health": { step: "Name one unresolved tension on the team and address it directly and biblically, before it hardens." },
};

/* ------------------------------------------------------------------ */
/* Spiritual Growth — 6 disciplines (LifeWay Discipleship Wheel).       */
/* Scored 1-5 by domain average; shown as a Discipleship Wheel radar.   */
/* Each discipline total ranges 10-50 (10 statements). Content below is */
/* Mission USA's own next-step + Scripture for each discipline.         */
/* ------------------------------------------------------------------ */
export const SPIRITUAL_GROWTH_ORDER = [
  "Abide in Christ",
  "Live in the Word",
  "Pray in Faith",
  "Fellowship with Believers",
  "Witness to the World",
  "Minister to Others",
];

export const SPIRITUAL_GROWTH_DOMAINS = {
  "Abide in Christ": {
    ref: "John 15:4-5",
    blurb: "Staying connected to Jesus as the source of your life, not just serving in His name.",
    step: "Set one fixed time this week to be with Christ with no agenda, not sermon prep, not a task, just abiding. Guard it like a meeting.",
  },
  "Live in the Word": {
    ref: "Joshua 1:8 · 2 Timothy 3:16-17",
    blurb: "Letting Scripture shape how you think, decide, and live day to day.",
    step: "Pick one short book of the Bible and read a few verses at the same time each day, ending with one question: what does this ask of me today?",
  },
  "Pray in Faith": {
    ref: "Philippians 4:6-7 · James 5:16",
    blurb: "Talking with God honestly and often, and trusting Him with the results.",
    step: "Add two minutes of listening to the end of your prayers this week. Say less, and give God room to speak.",
  },
  "Fellowship with Believers": {
    ref: "Hebrews 10:24-25 · Proverbs 27:17",
    blurb: "Living in real, accountable relationships with other believers, not faith in isolation.",
    step: "Invite one trusted person into a standing check-in where they have permission to ask you hard questions and you actually answer.",
  },
  "Witness to the World": {
    ref: "Matthew 28:19-20 · 1 Peter 3:15",
    blurb: "Sharing Christ with people who don't yet know Him, in word and in life.",
    step: "Write down two people who don't yet know Christ, pray for them by name daily, and look for one natural opening to share this month.",
  },
  "Minister to Others": {
    ref: "1 Peter 4:10 · Matthew 25:40",
    blurb: "Using your gifts, time, and resources to serve others the way Christ served you.",
    step: "Say yes to one concrete way to serve this month that uses a gift you already have, and do it without expecting anything back.",
  },
};

/* ------------------------------------------------------------------ */
/* Enneagram — 9 types. Mission USA's own redemptive, Scripture-rooted  */
/* profiles (original wording), so the report is spiritual, not just a  */
/* personality label. Keyed by type number "1".."9".                    */
/* ------------------------------------------------------------------ */
export const ENNEAGRAM_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const ENNEAGRAM_TYPES = {
  "1": {
    name: "The Reformer",
    tagline: "The principled, conscientious one",
    essence:
      "You carry a strong inner sense of right and wrong and a longing for things to be as they should be. You work hard, hold high standards, and can be trusted to do what is good even when no one is watching.",
    gift: "A steady conscience the body of Christ needs, and the discipline to follow through on what is right.",
    watch: "The inner critic can turn on you and on others. Grace can start to feel like lowered standards, and resentment can build when people fall short.",
    grows:
      "Let grace be as real as your standards. You are loved before you are useful, and God is not grading you. Rest is not laziness, it is trust.",
    verse: "Micah 6:8",
    devotion:
      "God does not ask you to be perfect before He accepts you. In Christ you already stand accepted, not because your work is flawless but because His is. Let that settle in. Do good this week out of a full heart, not to quiet a critic that Jesus already silenced at the cross.",
  },
  "2": {
    name: "The Helper",
    tagline: "The caring, generous one",
    essence:
      "You notice what people need, often before they say it, and you move toward them with warmth. You are generous, sincere, and quick to give yourself away for others.",
    gift: "Genuine, sacrificial love that makes the church feel like family, and eyes that see the person everyone else overlooks.",
    watch: "You can serve to be needed, ignore your own needs until you are empty, and quietly keep score of the love you give.",
    grows:
      "Let yourself be cared for, not just the caregiver. Receiving is not weakness. You do not have to earn love by being useful, it is already yours.",
    verse: "Mark 12:31",
    devotion:
      "You tell everyone else they are loved as they are. This week, believe it about yourself. God does not love you for what you do for Him. Sit still long enough to be filled before you pour out again, and let Him meet the need you keep hiding.",
  },
  "3": {
    name: "The Achiever",
    tagline: "The driven, effective one",
    essence:
      "You get things done and you get them done well. You are adaptable, confident, and motivated to succeed, and you often inspire others by what you accomplish.",
    gift: "Energy, excellence, and the ability to move a vision from idea to reality, and to model what is possible.",
    watch: "Your worth can quietly fuse to your performance. Image can outrun honesty, and you can lose track of who you are beneath what you do.",
    grows:
      "Learn to rest in being a beloved child before you are a successful one. Let people see the real you, not just the highlight reel.",
    verse: "Galatians 1:10",
    devotion:
      "At Jesus' baptism the Father said He was well pleased before Jesus had preached a sermon or healed anyone. That is the order of the gospel: loved first, then sent. Your identity is not your résumé. Take one honest step this week where you are known, not just admired.",
  },
  "4": {
    name: "The Individualist",
    tagline: "The sensitive, authentic one",
    essence:
      "You feel deeply and long for what is real and meaningful. You are honest about the ache in things, creative, and drawn to beauty and depth others rush past.",
    gift: "Emotional honesty and depth that gives the church permission to be real, and the ability to find meaning in suffering.",
    watch: "You can dwell in what is missing, compare your inside to everyone's outside, and mistake your feelings for the final truth about you.",
    grows:
      "You are not too much, and nothing essential is missing from you. Your identity is settled in Christ, not in your moods. Gratitude is a way home.",
    verse: "Psalm 139:14",
    devotion:
      "The feelings are real, but they are not the deepest thing true about you. In Christ you are seen, chosen, and complete, on the flat days as much as the vivid ones. This week, name three ordinary gifts God has already given you, and let ordinary grace be enough.",
  },
  "5": {
    name: "The Investigator",
    tagline: "The perceptive, thoughtful one",
    essence:
      "You want to understand. You observe carefully, think deeply, and value competence and clarity. You are often the calm, insightful presence others come to when they need to make sense of something.",
    gift: "Wisdom, perspective, and the kind of careful thought that keeps the church from shallow answers.",
    watch: "You can retreat into your head, hoard time and energy, and hold people at a distance while you feel prepared to engage.",
    grows:
      "God is not only understood, He is trusted and enjoyed. You have enough. Move toward people and toward God before you feel fully ready.",
    verse: "Proverbs 3:5-6",
    devotion:
      "Knowledge can become a wall you hide behind. But God does not ask you to figure everything out before you trust Him, He asks you to lean on Him. This week, share yourself with one person before you feel ready, and give away some time as an act of faith that God will provide more.",
  },
  "6": {
    name: "The Loyalist",
    tagline: "The faithful, steadfast one",
    essence:
      "You are committed, responsible, and dependable. You think ahead, spot problems early, and stay when others leave. People trust you because you show up and follow through.",
    gift: "Faithfulness, perseverance, and the loyalty that holds a community together through hard seasons.",
    watch: "Anxiety and worst-case thinking can run the show. You can look for security in everything except the God who actually holds you.",
    grows:
      "Courage grows as you trust the Shepherd, not just the plan. God has not given you a spirit of fear. You are held, even when the ground feels unsure.",
    verse: "Isaiah 41:10",
    devotion:
      "Fear says prepare for everything or the floor will fall out. Faith says the floor is God, and He does not move. You do not have to carry tomorrow's what-ifs today. This week, when worry rises, name it as a prayer and hand it back to the One who is already there.",
  },
  "7": {
    name: "The Enthusiast",
    tagline: "The joyful, visionary one",
    essence:
      "You bring energy, optimism, and possibility. You see the bright side, love new ideas and experiences, and lift the room simply by being in it.",
    gift: "Joy, vision, and a contagious hope that reminds the church the good news really is good.",
    watch: "You can outrun pain instead of facing it, scatter across too many things, and keep moving so you never have to sit with what hurts.",
    grows:
      "Real joy can hold sorrow without running. Presence beats novelty. Stay in one thing, and one feeling, long enough for God to meet you in it.",
    verse: "Psalm 16:11",
    devotion:
      "The deepest joy is not the next exciting thing, it is God Himself, and He is found in the present moment, not the next one. This week, resist the urge to escape a hard feeling. Sit with it, and with Him, and discover that He is enough even when the day is heavy.",
  },
  "8": {
    name: "The Challenger",
    tagline: "The strong, protective one",
    essence:
      "You are decisive, direct, and strong. You take charge, protect the vulnerable, and are not afraid of hard truth or hard work. People feel safer when you are in the room.",
    gift: "Strength used for others, the courage to confront what is wrong, and a heart that defends the weak.",
    watch: "You can guard your heart so hard that vulnerability feels like danger. Strength can tip into control, and tenderness can feel like a threat.",
    grows:
      "True strength includes the courage to be tender and to let others in. You do not always have to be the strong one. God is your protector too.",
    verse: "Micah 6:8",
    devotion:
      "It takes more strength to be gentle than to be forceful. Jesus, the strongest person who ever lived, washed feet and wept. You are allowed to be protected, not only the protector. This week, let one trusted person see the softer place you usually guard.",
  },
  "9": {
    name: "The Peacemaker",
    tagline: "The steady, reconciling one",
    essence:
      "You bring calm and see all sides. You are accepting, easygoing, and a steadying presence who helps people feel at ease and helps groups stay together.",
    gift: "Peace, patience, and the rare gift of helping divided people hear one another.",
    watch: "You can keep the peace by disappearing, avoid conflict until it festers, and lose your own voice and priorities in everyone else's.",
    grows:
      "Your presence and your voice matter. Real peace sometimes means showing up and speaking up. You are not invisible to God, and you should not be to yourself.",
    verse: "Matthew 5:9",
    devotion:
      "Peacemaking is not the same as peacekeeping. Peacekeeping avoids, but peacemaking engages, the way Jesus did. You matter enough to have an opinion and to take up space. This week, name one thing you actually want or think, and say it out loud instead of going along.",
  },
};

/* ------------------------------------------------------------------ */
/* Called Together — 8 marriage & ministry domains + a confidential     */
/* Safety check. Taken privately by each spouse; the couple report shows */
/* both side by side. The couple band is the lower of the two views.     */
/* ------------------------------------------------------------------ */
export const CALLED_TOGETHER_DOMAINS = {
  "Shared Calling": {
    step: "Talk about where you each sense God leading next, and whether the call still feels shared or has quietly become one person's.",
  },
  "Boundaries: Home vs Ministry": {
    step: "Name one place ministry has crept into your home, and agree together on one line you'll protect this season.",
  },
  "Role & Expectations": {
    step: "Say out loud what you each expect of the other in ministry, especially the expectations you've never actually spoken.",
  },
  "Connection & Intimacy": {
    step: "Put one unhurried, ministry-free time together on the calendar this week, and guard it like an appointment.",
  },
  "Conflict & Communication": {
    step: "Pick one recurring argument and agree on how you'll handle it differently the next time it comes up.",
  },
  "Margin, Rest & Finances": {
    step: "Look honestly at where your time and money actually go, and name one change that would give your marriage more margin.",
  },
  "Criticism & Resilience": {
    step: "Talk about how criticism of one of you lands on both of you, and agree on how you'll protect each other from it.",
  },
  "Support & Community": {
    step: "Name the people who actually pour into your marriage. If the list is thin, agree on one couple to pursue this season.",
  },
};

// Confidential safety check (single item, quarantined). Never in the couple
// report. A private, supportive message is shown to a spouse who indicates
// they don't feel safe, and the care team is alerted quietly.
export const CALLED_TOGETHER_SAFETY_NOTICE =
  "One last question, just for you. It is completely private. Your spouse never sees your answer to it, and it never appears in your couple report.";

// Safety item scale (1-5, low = does not feel safe). Flagged at 2 or below.
export const SAFETY_OPTIONS = [
  [5, "Yes, I feel safe"], [4, "Mostly"], [3, "Unsure"], [2, "Not really"], [1, "No, I don't"],
];

export const CALLED_TOGETHER_SAFETY_CARE = {
  title: "Thank you for your honesty. You matter, and you don't have to carry this alone.",
  body:
    "What you shared is important. Please reach out to someone you trust. If you are in immediate danger, call 911. The National Domestic Violence Hotline is available 24/7, free and confidential: call 1-800-799-7233 or text START to 88788. Reaching out is not disloyalty. Your safety matters to God, and it matters to us.",
};

/* ------------------------------------------------------------------ */
/* Church Planter — 13 characteristics (primary five weighted 2x).      */
/* Candidate self-assessment. Each characteristic has a plain descriptor,*/
/* a way to lean into it in a plant, and a growth step. Original wording.*/
/* ------------------------------------------------------------------ */
export const PLANTER_PRIMARY = [
  "Visioning Capacity",
  "Intrinsically Motivated",
  "Creates Ownership of Ministry",
  "Reaches the Unchurched",
  "Spousal Cooperation",
];

export const PLANTER_CHARACTERISTICS = {
  "Visioning Capacity": {
    primary: true,
    blurb: "Seeing a future that doesn't exist yet and making others want to build it with you.",
    leanIn: "Put your vision in words people can repeat. A plant lives or dies on whether others can see what you see.",
    step: "Write the future of your plant in three sentences, then say it out loud to five people this month and watch which parts land.",
  },
  "Intrinsically Motivated": {
    primary: true,
    blurb: "Driving toward the goal when no one is watching and no one is making you.",
    leanIn: "Planting has long unseen stretches. Your inner engine has to run without applause.",
    step: "Name the deeper why behind your call and write it where you'll see it, so the empty weeks meet a settled reason.",
  },
  "Creates Ownership of Ministry": {
    primary: true,
    blurb: "Handing real responsibility to others so the work becomes theirs, not just yours.",
    leanIn: "You cannot plant alone. The plants that last are the ones where other people own the mission early.",
    step: "Give one meaningful responsibility away this month, and resist the urge to take it back when it's done differently than you'd do it.",
  },
  "Reaches the Unchurched": {
    primary: true,
    blurb: "Building real friendships with people far from God, not just gathering churchgoers.",
    leanIn: "A plant that only draws existing Christians isn't a plant, it's a transfer. Your reach outward is the whole point.",
    step: "Name two people far from God in your life. If you can't, that's the finding. Start one genuine friendship this month.",
  },
  "Spousal Cooperation": {
    primary: true,
    blurb: "You and your spouse united in the call, with eyes open to what it will cost.",
    leanIn: "Planting is a family calling. A divided or exhausted marriage is the most common reason plants fail.",
    step: "Have one honest conversation this week about what planting will actually cost your family, and don't rush past the hesitations.",
  },
  "Effectively Builds Relationships": {
    primary: false,
    blurb: "People find you easy to approach, and you build trust across different kinds of people.",
    leanIn: "A plant grows at the speed of trust. Your ability to connect widely is fuel.",
    step: "This week, start one conversation with someone very different from you, and stay curious longer than is comfortable.",
  },
  "Committed to Church Growth": {
    primary: false,
    blurb: "You want the ministry to reach more people, and you'll change methods to do it.",
    leanIn: "Hold the mission tightly and the methods loosely. Growth asks you to keep adjusting.",
    step: "Name one thing you do out of habit rather than fruitfulness, and change it this month.",
  },
  "Responsive to the Community": {
    primary: false,
    blurb: "You shape ministry around a real community's actual needs, not a generic template.",
    leanIn: "Learn your community before you build for it. The plant that fits its place takes root.",
    step: "Spend one afternoon this month simply listening to your community, and let one real need shape a next step.",
  },
  "Utilizes the Giftedness of Others": {
    primary: false,
    blurb: "You help people find what they're good at and place them there.",
    leanIn: "Your job isn't to do everything, it's to see the gift in others and unlock it.",
    step: "Name one person's gift they haven't fully used, and give them a real place to use it this month.",
  },
  "Flexible and Adaptable": {
    primary: false,
    blurb: "When the plan changes, you adapt without losing the mission.",
    leanIn: "Almost nothing in a plant goes to plan. Steady hands on the mission, open hands on the method.",
    step: "Recall the last time a plan fell apart. Name what you learned, so the next surprise meets a wiser you.",
  },
  "Builds Group Cohesiveness": {
    primary: false,
    blurb: "You move a group from strangers to a team that genuinely bonds.",
    leanIn: "A plant is built on a core team that loves each other. You knit people together.",
    step: "Create one unhurried moment for your core people to connect as friends, not just co-workers, this month.",
  },
  Resilience: {
    primary: false,
    blurb: "You recover from setbacks and criticism and keep moving.",
    leanIn: "Planting will knock you down. Getting back up, again and again, is the skill that outlasts talent.",
    step: "Name one person who can help you carry the hard days, and tell them that's the role you need from them.",
  },
  "Exercises Faith": {
    primary: false,
    blurb: "Your walk with God is the real engine, and you've taken steps only He could carry.",
    leanIn: "A plant is a step off the edge. Faith isn't a slogan here, it's the ground you stand on.",
    step: "Name one thing you're trusting God for that you can't manufacture, and pray it by name daily this month.",
  },
};

export const PLANTER_TIERS = {
  ready: {
    key: "ready",
    label: "Ready to Plant",
    color: "#2E7D8A",
    body:
      "You show real strength across the characteristics that matter most for planting, with no major gaps. This is an encouraging picture. Use the assessor conversation to confirm it and to sharpen a few edges, then plant with confidence and a strong team around you.",
  },
  develop: {
    key: "develop",
    label: "Develop First",
    color: "#C4923E",
    body:
      "There is real promise here, with one or two specific areas to grow before you plant. This is not a no, it's a wise not-yet in a few places. Name those areas plainly, build a short development plan, and revisit. Many strong planters started exactly here.",
  },
  elsewhere: {
    key: "elsewhere",
    label: "Better Suited Elsewhere For Now",
    color: "#8CA0B3",
    body:
      "Right now, the pattern points away from lead planting as the best fit for this season. That is about fit, not failure. Many people here thrive on a planting team or in an existing-church role that uses their real strengths. Talk this through honestly with your assessor and sending leaders.",
  },
};

export const PLANTER_PRAY = [
  "Where is my sense of calling to plant clearest, and where is it still unsettled?",
  "What would it cost the people I love most if I plant, and have we counted that cost together?",
  "Where am I trusting my own ability more than God's provision?",
  "Who has God already put around me to build with, and who is still missing?",
];

export const PLANTER_SCRIPTURES = [
  ["Matthew 28:18-20", "The commission that sends every plant."],
  ["Acts 13:1-3", "The church sends its best, with prayer and fasting."],
  ["1 Corinthians 3:6-9", "You plant, another waters, God gives the growth."],
  ["Nehemiah 2", "Vision, honest assessment, and a plan before the building starts."],
];

/* ------------------------------------------------------------------ */
/* The Forgiveness Profile (licensed EFMI). 10 motivation subscales,    */
/* each summed 3-18. Descriptions below are Mission USA's own warm,      */
/* Scripture-anchored write-ups of each motivation. Credit + the        */
/* research base are shown in the report.                               */
/* ------------------------------------------------------------------ */
export const EFMI_ORDER = [
  "Self-Healing",
  "Self-Improvement",
  "Healing for the Other",
  "Improvement for the Other",
  "Improved Relationship",
  "Protection for Others Outside the Family",
  "Protection for Others Inside the Family",
  "Forgiveness as Good in Itself",
  "Community Harmony",
  "Consistency with Your Beliefs",
];

export const EFMI_SUBSCALES = {
  "Self-Healing": {
    short: "You forgive to find peace and be free of resentment yourself.",
    body: "Much of what moves you toward forgiveness is your own healing. You'd rather not carry the weight of anger, and you want peace inside more than you want to hold on to the hurt. That's a healthy, honest starting place.",
    verse: "Ephesians 4:31-32",
  },
  "Self-Improvement": {
    short: "You forgive so the hurt makes you a better person.",
    body: "You're motivated to let this experience grow you, not shrink you. Forgiveness, for you, is tied to becoming a stronger, better person and improving how you live. Hard things become the soil for character.",
    verse: "Romans 5:3-4",
  },
  "Healing for the Other": {
    short: "You want the one who hurt you to find peace and be well.",
    body: "This is a tender, generous motivation. Even toward the person who hurt you, you carry a desire for their peace and well-being. That is close to the heart of what forgiveness actually is: mercy offered for the other's sake.",
    verse: "Luke 6:27-28",
  },
  "Improvement for the Other": {
    short: "You want the one who hurt you to grow and become better.",
    body: "You don't just want the offense overlooked, you want the person to genuinely grow from it. Wanting good for someone who wronged you, including their growth in character, is a strong and mature motivation.",
    verse: "Galatians 6:1",
  },
  "Improved Relationship": {
    short: "You hope to mend and rebuild the relationship.",
    body: "Part of what moves you is the hope of repair, of being able to come together again. Forgiveness and reconciliation are not the same thing, and reconciliation takes both people and rebuilt trust. But the desire to mend is a good and human longing.",
    verse: "Matthew 5:23-24",
  },
  "Protection for Others Outside the Family": {
    short: "You forgive so your hurt doesn't spill onto others around you.",
    body: "You're aware that unhealed anger leaks. You'd rather not let what happened to you spill over onto friends, coworkers, or others. Forgiving, for you, is partly an act of care for the people in your wider world.",
    verse: "Hebrews 12:15",
  },
  "Protection for Others Inside the Family": {
    short: "You forgive to protect the peace of your home and family.",
    body: "You feel the pull to keep your home a place of peace. You'd rather not carry conflict into the family or let your anger land on the people closest to you. Forgiveness becomes a way of guarding those you love.",
    verse: "Colossians 3:13-14",
  },
  "Forgiveness as Good in Itself": {
    short: "You forgive because forgiveness itself is good and loving.",
    body: "For you, forgiveness needs no other payoff. It is good in and of itself, an expression of love, worth doing regardless of the outcome. This is one of the purest motivations there is, and it echoes the heart of the gospel.",
    verse: "Colossians 3:13",
  },
  "Community Harmony": {
    short: "You forgive for the sake of a peaceful community.",
    body: "You see past yourself to the wider good. A community is healthier when its people aren't ruled by anger, and you're willing to forgive with that bigger peace in mind. That's a generous, outward-looking motivation.",
    verse: "Romans 12:18",
  },
  "Consistency with Your Beliefs": {
    short: "You forgive because your faith calls you to it.",
    body: "Your convictions move you. Forgiveness, for you, is part of being faithful, of living consistently with what you believe. When our deepest beliefs shape how we treat those who hurt us, forgiveness has a firm foundation.",
    verse: "Matthew 6:14-15",
  },
};

// Subscale bands (score 3-18): strong 15-18, moderate 9-14, quiet <=8.
export const EFMI_BANDS = [
  { min: 15, label: "Strong", color: "#2E7D8A" },
  { min: 9, label: "Moderate", color: "#C4923E" },
  { min: 0, label: "Quiet", color: "#8CA0B3" },
];
export function efmiBand(score) {
  return EFMI_BANDS.find((b) => score >= b.min) || EFMI_BANDS[EFMI_BANDS.length - 1];
}

// Total bands (30-180, midpoint 105). Framed gently.
export function efmiTotalBand(total) {
  if (total >= 135) return { key: "strong", label: "A strong, broad heart to forgive", color: "#2E7D8A" };
  if (total >= 75) return { key: "growing", label: "A genuine and growing motivation", color: "#C4923E" };
  return { key: "early", label: "Forgiveness may feel far off right now, and that's okay", color: "#8CA0B3" };
}

export const EFMI_CREDIT =
  "Based on the Enright Forgiveness Motivation Inventory (EFMI), © 2026 Robert Enright, Jacqueline Song, Yan Li, and Jichan Kim, International Forgiveness Institute (internationalforgiveness.com). Used by license.";

export const EFMI_REFERENCES = [
  "Enright, R. D., & Fitzgibbons, R. P. (2015). Forgiveness Therapy: An Empirical Guide for Resolving Anger and Restoring Hope. American Psychological Association.",
  "Enright, R. D., & Fitzgibbons, R. P. (2000). Helping Clients Forgive: An Empirical Guide for Resolving Anger and Restoring Hope. American Psychological Association.",
  "Rique, J., et al. (2022). Validating the Enright Forgiveness Inventory – 30 (EFI-30): International Studies. European Journal of Psychological Assessment, 38(2).",
  "Enright, R. D., Song, J., Li, Y., & Kim, J. (2026). Enright Forgiveness Motivation Inventory (EFMI). International Forgiveness Institute.",
];

/* ------------------------------------------------------------------ */
/* EFMI Reflection Scale (instrument pages 3-4). The 30 motivation      */
/* items ask "I forgive because…", so first the person recalls a real   */
/* offense, states where they are with forgiving it, and picks the best */
/* definition of forgiveness. The definition question is a comprehension */
/* check: only two of the eight options describe genuine forgiveness.    */
/* ------------------------------------------------------------------ */
export const EFMI_INTRO =
  "We are sometimes unfairly hurt by other people, whether in family, friendship, school, work, or other situations. Bring to mind the most severe experience of someone being very unfair to you. For a few moments, picture what happened. Try to see the person, and try to recall what it was like. You'll answer the rest of this reflection with that one experience in mind.";

export const EFMI_HURT_OPTIONS = [
  [1, "No hurt"], [2, "A little hurt"], [3, "Some hurt"], [4, "Much hurt"], [5, "A great deal of hurt"],
];
export const EFMI_WHO_OPTIONS = ["Child", "Spouse", "Relative", "Parent", "Friend", "Employer", "Other"];
export const EFMI_TIME_UNITS = ["days", "weeks", "months", "years"];
// Degree of forgiveness so far — 1 to 5, labels anchored at 1/3/5 (per the instrument).
export const EFMI_DEGREE_OPTIONS = [
  [1, "Not at all"], [2, ""], [3, "In progress"], [4, ""], [5, "Complete forgiveness"],
];

// The eight definitions of forgiveness (instrument page 4). Verdicts and the
// plain explanations follow the instrument's scoring notes (pages 12-14):
// only "reduce resentment and offer love for the other's sake" is accurate,
// and "be good to the one who offended you" is near-accurate. The rest are
// common misunderstandings (reconciliation, forgetting, moving on, ceasing
// the pursuit of justice, self-focused anger relief).
export const EFMI_DEFINITIONS = [
  { text: "When people forgive, they try to rise above their angry feelings by thinking positive thoughts about issues that do not necessarily relate to the injustice.",
    verdict: "misconception",
    why: "Forgiveness is a moral response toward a person, not a situation. Only easing your own anger keeps the focus on yourself, not on the one who acted unjustly. Forgiveness offers mercy to that person." },
  { text: "When people forgive, they come together with the one who offended them and so they have mutual trust.",
    verdict: "misconception",
    why: "This describes reconciliation, not forgiveness. Reconciliation is two people coming back together in mutual trust. A person can forgive and still not reconcile." },
  { text: "When people forgive, they stop seeking a fair solution to the problem between themselves and the people who behaved badly.",
    verdict: "misconception",
    why: "Forgiveness is about mercy, not justice. You can forgive and still seek a fair outcome. Forgiveness and justice can happen together." },
  { text: "When people forgive, they try, as best they can today, to be good to the one who offended them.",
    verdict: "near",
    why: "This is close to a complete definition. What it is missing is the idea of reducing resentment toward the person." },
  { text: "When people forgive, they can let go of what happened to them and so it no longer bothers those who forgive.",
    verdict: "misconception",
    why: "A person can move past the incident yet still quietly dismiss the offender as less than human. Forgiveness includes a change of heart toward the person, not only relief from the memory." },
  { text: "When people forgive, they try to reduce resentment and offer love to the other for the other's sake.",
    verdict: "accurate",
    why: "This is an accurate definition. It reduces the negative feelings toward the offender and adds the positive, especially love offered for the other person's sake." },
  { text: "When people forgive, the key issue is that they move on from the situation by putting it behind them.",
    verdict: "misconception",
    why: "This can be a way of diverting attention away from what happened and from the offender. To forgive is to have mercy on the person, not to move past the event." },
  { text: "When people forgive, the key issue is that they try to forget the injustice that happened to them.",
    verdict: "misconception",
    why: "When people forgive, they stay aware that the injustice was real and still choose to offer mercy to the offender. Forgiveness is not forgetting." },
];

// Classify a chosen definition (0-based index) for the report.
export const EFMI_UNDERSTANDING = {
  accurate: {
    label: "A clear understanding of forgiveness",
    body: "You chose a definition that describes genuine forgiveness: reducing resentment and offering goodwill to the one who hurt you, for their sake. That is a strong foundation. It means the reflection you just did rests on the real thing, not a look-alike.",
  },
  near: {
    label: "A close understanding of forgiveness",
    body: "You chose a definition that is close to the real thing: choosing to be good to the one who hurt you. The one piece it leaves out is the inner work of letting resentment go. Genuine forgiveness is both, softening toward the person and offering goodwill.",
  },
  misconception: {
    label: "A common misunderstanding of forgiveness",
    body: "The definition you chose is one many people hold, but it describes something other than forgiveness, often reconciliation, forgetting, simply moving on, or easing your own anger. Genuine forgiveness means reducing resentment toward the person and offering them goodwill for their sake, while still being honest that the wrong was real. Knowing that changes how the rest of this reflection reads.",
  },
};

export function efmiUnderstanding(defIndex) {
  const d = EFMI_DEFINITIONS[defIndex];
  if (!d) return null;
  return { verdict: d.verdict, ...EFMI_UNDERSTANDING[d.verdict], chosen: d.text, why: d.why };
}

// Which metadata + report copy a domain-bands assessment uses, keyed by slug.
export const DOMAIN_META = {
  rooted: ROOTED_MARKERS,
  "leadership-health": LEADERSHIP_DOMAINS,
  "spiritual-growth": SPIRITUAL_GROWTH_DOMAINS,
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
  "spiritual-growth": {
    snapshot: "Your six disciplines",
    strong: "Where you're strongest",
    grow: "Where to grow next",
    helper:
      "This is a mirror for one moment in your journey, not a grade on your walk with God. Every disciple has areas still filling in. These are simply where the next bit of growth is waiting.",
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
  "spiritual-growth": pexels(1112048),
  enneagram: pexels(3771069),
  "forgiveness-profile": pexels(34823825),
  "big-five": pexels(1181671),
  "kingdom-design": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&h=1000&q=70",
  "discover-leadership-style": "https://d8j0ntlcm91z4.cloudfront.net/user_3GoBKZ7LDxzXwROWee1djylMiED/hf_20260723_060448_5853fdcc-6c6a-4f4a-89c4-0fc68749876c.png",
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
  "spiritual-growth": {
    tagline: "How is your walk with God, honestly?",
    about:
      "A prayerful look at six spiritual disciplines every follower of Christ grows in. Over 60 short statements you'll reflect on your own walk, then see it drawn as a Discipleship Wheel, so you can tell where your faith is strong and where the next season of growth is waiting. Based on LifeWay's Spiritual Growth Assessment.",
    measures: [
      "6 disciplines: Abide, the Word, Prayer, Fellowship, Witness, and Ministry",
      "Your own honest self-reflection, before God",
      "A Discipleship Wheel that shows the whole picture at a glance",
    ],
    youGet: [
      "Your Discipleship Wheel across all six disciplines",
      "Your strongest disciplines, affirmed",
      "Your growth disciplines, each with a Scripture and a next step",
    ],
    demo: { headline: "Strongest: Abide in Christ", sub: "6 disciplines · Discipleship Wheel",
      bars: [["Abide in Christ", 4.4, 5], ["Live in the Word", 4.1, 5], ["Minister to Others", 3.2, 5], ["Witness to the World", 2.6, 5]] },
  },
  enneagram: {
    tagline: "Understand how you're wired, and grow.",
    about:
      "The Enneagram describes nine ways people see and move through the world. Over 36 quick either-or choices, this finds the type that fits you best, then turns it toward Christ, with Scripture and a short devotion written to help you grow, not just get a label.",
    measures: [
      "9 types, from the Reformer to the Peacemaker",
      "Your top three, so a close call is never forced",
      "A redemptive read: your gift, your watch-out, and where to grow",
    ],
    youGet: [
      "Your core type, described honestly",
      "All nine scored, with your top three highlighted",
      "A Scripture and a written devotion for your type",
    ],
    demo: { headline: "Your type: 2 · The Helper", sub: "Top three of nine types",
      bars: [["2 · Helper", 7, 8], ["9 · Peacemaker", 6, 8], ["6 · Loyalist", 5, 8]] },
  },
  "forgiveness-profile": {
    tagline: "What moves you toward forgiveness?",
    about:
      "Forgiveness is one of the hardest and most freeing things we do. This reflective profile brings to mind someone who hurt you, then looks at the many reasons that draw a person to forgive, from your own peace, to care for the other, to your faith. Over 30 short statements, it shows which motivations are strongest in you right now. Built on the research-based Enright Forgiveness Motivation Inventory.",
    measures: [
      "10 motivations, from Self-Healing to Consistency with Your Beliefs",
      "Your overall motivation to forgive",
      "Your unique profile: which reasons pull hardest on your heart",
    ],
    youGet: [
      "Your strongest motivations, named and described with Scripture",
      "All ten motivations, ranked",
      "A gentle, private, personal read, yours alone",
    ],
    demo: { headline: "Strongest: Forgiveness as Good in Itself", sub: "10 motivations to forgive",
      bars: [["Good in Itself", 17, 18], ["Self-Healing", 15, 18], ["Community Harmony", 11, 18], ["Improved Relationship", 8, 18]] },
  },
  "big-five": {
    tagline: "The most researched map of who you are.",
    about:
      "The Big Five is the most scientifically supported model of personality in the world. Over 96 short items, about ten to fifteen minutes, it measures five core traits and six expanded facets, then hands you a full personal report: where each trait puts you, what it means for how you lead and serve, and a next step for growth. There are no good or bad scores, only an honest, useful picture of how you're wired.",
    measures: [
      "5 core traits: Openness, Conscientiousness, Extraversion, Agreeableness, Emotional Stability",
      "6 expanded facets, from Creative Expression to Purpose & Meaning",
      "Every trait on a clear 0–100 scale with Low / Moderate / High bands",
    ],
    youGet: [
      "A trait profile chart and a facet breakdown",
      "A full report for each trait: strengths, watch-outs, ministry application, and a growth step",
      "Your signature strengths and growth areas, named",
    ],
    demo: { headline: "A clear five-trait profile", sub: "5 traits · 6 facets · 0–100",
      bars: [["Conscientiousness", 75, 100], ["Agreeableness", 68, 100], ["Openness", 60, 100], ["Emotional Stability", 54, 100]] },
  },
  "kingdom-design": {
    tagline: "Who God made you, and why He made you that way.",
    about:
      "The Kingdom Design Profile takes the time-tested Myers-Briggs framework of 16 personality types and joins it to Scripture. Over 60 quick either-or questions, about 12 to 15 minutes, it finds your four-letter type, then hands you a full personal report: how God wired you, your biblical mirror, where you fit in the church and the family, your growth edges, and a 30-day plan. Psychology describes how you're wired. The Word tells you what the wiring is for.",
    measures: [
      "4 preferences: Energy (E/I), Information (S/N), Decisions (T/F), Lifestyle (J/P)",
      "Your four-letter type, with a clarity read on each letter",
      "Your temperament: Pillar, Responder, Encourager, or Architect",
    ],
    youGet: [
      "Your type and temperament, on a clear visual profile",
      "A complete report: your design, your biblical mirror, your calling, and your watch-outs",
      "Spiritual disciplines, verses, a prayer, and a 30-day plan for your type",
    ],
    demo: { headline: "Your type: INFJ · The Counselor", sub: "4 preferences · 16 types · clarity",
      bars: [["Introversion", 12, 15], ["Intuition", 13, 15], ["Feeling", 11, 15], ["Judging", 10, 15]] },
  },
  "discover-leadership-style": {
    tagline: "Which leg carries your weight, which supports it, and which needs bracing.",
    about:
      "Christian leadership rests on a three-legged stool. Spirituality is loving God. Chemistry is loving people. Strategy is loving the world by fulfilling God's mission. On top of the legs sits Leadership itself. In about five minutes, 48 honest statements adapted to your exact ministry role, this assessment measures all three legs and nine foundations, names your leadership style from the six possible orderings, and hands you a full report: your genius and your shadow, a biblical mirror, a 90-day plan, team pairings, and a coaching guide. No style is better than another. Each is a stewardship, and the Church needs all six.",
    measures: [
      "3 legs: Spirituality, Chemistry, Strategy, each on a 0-100 scale",
      "9 foundations plus a separate Leadership seat score",
      "Your style, one of six, from the rank order of your three legs",
    ],
    youGet: [
      "Your leadership stool, drawn to your actual scores",
      "Your style in depth: genius, shadow, biblical picture, and best-fit roles",
      "A 90-day development plan, team pairings, and a coaching guide",
    ],
    demo: { headline: "Your style: Building Leader · ST-CH-SP", sub: "3 legs · 9 foundations · 6 styles",
      bars: [["Strategy", 87, 100], ["Chemistry", 65, 100], ["Spirituality", 41, 100]] },
    credit: {
      text: "Based on the Leadership Stool framework from David T. Olson's book",
      book: "Discovering Your Leadership Style: The Power of Chemistry, Strategy and Spirituality",
      publisher: "InterVarsity Press",
      url: "https://amzn.to/4bRzkvZ",
    },
  },
};
