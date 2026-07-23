// Discover Your Leadership Style — data library.
// Framework: David T. Olson's three-legged Leadership Stool (Spirituality,
// Chemistry, Strategy) with a Leadership "seat", from "Discovering Your
// Leadership Style: The Power of Chemistry, Strategy and Spirituality"
// (InterVarsity Press). The assessment items, scoring, profiles, and report
// design here are an original recreation; the framework is credited to Olson.

export const BOOK = {
  title: "Discovering Your Leadership Style",
  subtitle: "The Power of Chemistry, Strategy and Spirituality",
  author: "David T. Olson",
  publisher: "InterVarsity Press",
  url: "https://amzn.to/4bRzkvZ",
};

// ---- The three legs + the seat ----------------------------------------------
// One color per leg, chosen to be distinct yet in the brand family. The seat is
// gold (the crown of the stool).
export const LEG_ORDER = ["SP", "CH", "ST"];
export const LEGS = {
  SP: { key: "SP", name: "Spirituality", call: "Loving God",
    color: "#6A5AA0", soft: "#EEEAF6",
    def: "Ongoing spiritual transformation through Scripture, prayer, and humility before God.",
    foundations: ["scripture", "disciplines", "humility"] },
  CH: { key: "CH", name: "Chemistry", call: "Loving people",
    color: "#C57B57", soft: "#F7EBE3",
    def: "Relational connection with individuals, teams, and crowds.",
    foundations: ["interpersonal", "team", "crowd"] },
  ST: { key: "ST", name: "Strategy", call: "Loving the world",
    color: "#2E7D8A", soft: "#E2F0F1",
    def: "Fulfilling God's mission through vision, building, and management.",
    foundations: ["envisioning", "building", "managing"] },
};
export const SEAT = {
  key: "L", name: "Leadership", color: "#C4923E", soft: "#F5EBD6",
  def: "The seat of the stool — the instinct, fruit, and multiplication that develop as the three legs grow stronger.",
  components: ["instinct", "fruit", "multiplication"],
};

// ---- Foundations (9 leg foundations + 3 seat components) --------------------
export const FOUNDATIONS = {
  scripture:     { key: "scripture", name: "Scripture Saturation", leg: "SP",
    blurb: "Time in the Word, and letting it shape everyday decisions." },
  disciplines:   { key: "disciplines", name: "Spiritual Disciplines", leg: "SP",
    blurb: "A living prayer life and practices like fasting, silence, and solitude." },
  humility:      { key: "humility", name: "Spiritual Humility", leg: "SP",
    blurb: "Accountability, quick repentance, and dependence on the Spirit." },
  interpersonal: { key: "interpersonal", name: "Interpersonal Chemistry", leg: "CH",
    blurb: "One-to-one care, listening, and staying connected." },
  team:          { key: "team", name: "Team Chemistry", leg: "CH",
    blurb: "Belonging, gift-spotting, and reading a team's mood." },
  crowd:         { key: "crowd", name: "Crowd Chemistry", leg: "CH",
    blurb: "Reading a room, raising energy, and gathering people." },
  envisioning:   { key: "envisioning", name: "Envisioning", leg: "ST",
    blurb: "Seeing and describing where the mission is headed." },
  building:      { key: "building", name: "Building", leg: "ST",
    blurb: "Turning ideas into systems, action, and finished work." },
  managing:      { key: "managing", name: "Managing", leg: "ST",
    blurb: "Administration, sequencing, delegation, and stewardship." },
  instinct:      { key: "instinct", name: "Leadership Instinct", leg: "L",
    blurb: "Sensing the right move and staying steady under pressure." },
  fruit:         { key: "fruit", name: "Leadership Fruit", leg: "L",
    blurb: "Lasting results that outlive your presence." },
  multiplication:{ key: "multiplication", name: "Leadership Multiplication", leg: "L",
    blurb: "Developing leaders who go on to develop others." },
};
export const FOUNDATION_ORDER_BY_LEG = {
  SP: ["scripture", "disciplines", "humility"],
  CH: ["interpersonal", "team", "crowd"],
  ST: ["envisioning", "building", "managing"],
};

// ---- Score bands ------------------------------------------------------------
export const BANDS = [
  { key: "signature", label: "Signature strength", min: 80, color: "#1F7A4D",
    meaning: "God uses this consistently through you. Lead from it." },
  { key: "solid", label: "Solid strength", min: 60, color: "#2E7D8A",
    meaning: "Reliable, with clear room to sharpen." },
  { key: "developing", label: "Developing", min: 40, color: "#C4923E",
    meaning: "Present but inconsistent. Needs intentional practice." },
  { key: "growth", label: "Growth priority", min: 0, color: "#B4653A",
    meaning: "Currently underfeeding your leadership. Address this first." },
];
export function leadBand(pct) {
  return BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1];
}

// ---- The eight role versions ------------------------------------------------
// Each supplies the wording for the seven role-adaptive slots. The taker picks
// their role at the start; item text is substituted before the questions.
export const ROLE_ORDER = [
  "senior-pastor", "church-staff", "youth-pastor", "lay-leader",
  "org-leader", "org-staff", "admin-support", "ministry-spouse",
];
export const ROLES = {
  "senior-pastor": { key: "senior-pastor", label: "Senior Pastor",
    wording: { GROUPS: "teams and ministries of our church", TEAM: "leadership team or congregation", SPEAK: "preach", MINISTRY: "our church", ROLE: "pastorate", MINISTRIES: "ministries of our church", VOLUNTEERS: "lay leaders" } },
  "church-staff": { key: "church-staff", label: "Church Staff",
    wording: { GROUPS: "ministry areas I oversee", TEAM: "staff team or volunteer team", SPEAK: "teach or speak", MINISTRY: "my ministry areas", ROLE: "staff position", MINISTRIES: "ministry areas I lead", VOLUNTEERS: "volunteers and lay leaders I work with" } },
  "youth-pastor": { key: "youth-pastor", label: "Youth Pastor",
    wording: { GROUPS: "youth group and student leadership team", TEAM: "room full of students", SPEAK: "speak to students", MINISTRY: "our youth ministry", ROLE: "youth ministry role", MINISTRIES: "student ministries I lead", VOLUNTEERS: "volunteers, student leaders, and parents who serve with me" } },
  "lay-leader": { key: "lay-leader", label: "Lay Leader",
    wording: { GROUPS: "ministry teams I serve on", TEAM: "group I lead", SPEAK: "speak or teach at church", MINISTRY: "the ministry I help lead", ROLE: "ministry responsibilities", MINISTRIES: "ministries I help lead", VOLUNTEERS: "other volunteers" } },
  "org-leader": { key: "org-leader", label: "Christian Organization Leader",
    wording: { GROUPS: "teams across our organization", TEAM: "staff or board", SPEAK: "speak or present", MINISTRY: "our organization", ROLE: "executive role", MINISTRIES: "departments and initiatives I lead", VOLUNTEERS: "staff and volunteer leaders" } },
  "org-staff": { key: "org-staff", label: "Christian Organization Staff",
    wording: { GROUPS: "teams I serve on", TEAM: "project team", SPEAK: "present or lead a meeting", MINISTRY: "my area of responsibility", ROLE: "position", MINISTRIES: "projects and programs I carry", VOLUNTEERS: "coworkers and volunteers I help train" } },
  "admin-support": { key: "admin-support", label: "Administrative Support",
    wording: { GROUPS: "office and ministry teams I support", TEAM: "office or team", SPEAK: "communicate with a group", MINISTRY: "the ministry I support", ROLE: "support role", MINISTRIES: "systems and processes I manage", VOLUNTEERS: "volunteers I coordinate" } },
  "ministry-spouse": { key: "ministry-spouse", label: "Ministry Spouse",
    wording: { GROUPS: "church groups I am part of", TEAM: "gathering in our home or church", SPEAK: "share or speak with a group", MINISTRY: "the ministry my spouse and I share", ROLE: "family and ministry life", MINISTRIES: "areas where I serve", VOLUNTEERS: "people my spouse and I encourage and mentor" } },
};
export function roleLabel(key) { return ROLES[key]?.label || null; }

// Substitute {TOKENS} in an item string using a role's wording. Falls back to a
// neutral default if a token has no role wording (should not happen).
const DEFAULT_WORDING = { GROUPS: "groups", TEAM: "team", SPEAK: "speak publicly", MINISTRY: "our ministry", ROLE: "role", MINISTRIES: "ministries", VOLUNTEERS: "volunteer leaders" };
export function applyRoleWording(text, roleKey) {
  const w = ROLES[roleKey]?.wording || DEFAULT_WORDING;
  return String(text || "").replace(/\{([A-Z]+)\}/g, (_, tok) => w[tok] ?? DEFAULT_WORDING[tok] ?? tok.toLowerCase());
}

// ---- The six styles ---------------------------------------------------------
export const STYLE_ORDER = ["SP-CH-ST", "SP-ST-CH", "CH-SP-ST", "CH-ST-SP", "ST-CH-SP", "ST-SP-CH"];
export const STYLES = {
  "SP-CH-ST": {
    code: "SP-CH-ST", name: "Sacred Leader", order: ["SP", "CH", "ST"],
    headline: "Leads people into the deep things of God.",
    genius: "Sacred Leaders live close to God and draw others into that closeness. Their prayer life, love of Scripture, and spiritual discernment give their leadership unusual depth and authority. People leave their presence more aware of God.",
    shadow: "Depth without direction. Sacred Leaders can struggle to translate spiritual insight into plans, structures, and decisions. Ministries under them may be rich in prayer and thin on execution.",
    biblical: { name: "Moses", ref: "Exodus 18", text: "Who met with God face to face, yet needed Jethro's counsel to build a structure that could carry the people." },
    bestFit: "Spiritual formation, prayer ministry, teaching, spiritual direction, crisis care.",
    pairing: "Partner with a Building or Mission Leader who turns discernment into a plan.",
    practices: [
      "Schedule vision and planning time with the same discipline you give prayer.",
      "End every discernment season with one written, dated decision.",
      "Recruit a strategist as your second chair.",
      "Teach others your habits of prayer; multiplication is your stewardship.",
      "Put your yearly ministry plan on one page and review it monthly.",
      "Say yes to fewer counseling appointments so the mission moves.",
      "Translate every sermon or lesson into one concrete next step for hearers.",
      "Practice reading a budget until it stops feeling foreign.",
      "Ask “What must change?” as often as you ask “What is God saying?”",
      "Let your depth set the temperature of your team, not just your own soul.",
    ],
  },
  "SP-ST-CH": {
    code: "SP-ST-CH", name: "Imaginative Leader", order: ["SP", "ST", "CH"],
    headline: "Receives fresh vision from God and builds new models.",
    genius: "Imaginative Leaders receive fresh vision from God and design new models to carry it. They combine spiritual sensitivity with strategic creativity. They see ministry approaches no one else sees yet.",
    shadow: "Vision without warmth. Their creative intensity can run past people. Team members may feel like resources for the vision rather than sheep to be shepherded.",
    biblical: { name: "Joseph", ref: "Genesis 41", text: "Who received God-given dreams and then built the systems that saved nations." },
    bestFit: "Church planting design, innovation teams, new campus or new initiative launches, creative communication.",
    pairing: "Partner with a Relational Leader who keeps the community healthy while the model evolves.",
    practices: [
      "Share vision as an invitation, not an announcement.",
      "Build a feedback loop: two trusted people who can tell you when people are hurting.",
      "Celebrate people publicly more than you celebrate progress.",
      "Slow the rollout: one major innovation per season.",
      "Eat meals with team members with no agenda.",
      "Write down names, birthdays, and stories; review before meetings.",
      "Test new ideas with the people they affect before you finalize them.",
      "Grieve what a change costs people before you champion what it gains.",
      "Keep a “parking lot” journal so every new idea does not become a new project.",
      "Anchor every innovation to a Scripture and a story, not just a diagram.",
    ],
  },
  "CH-SP-ST": {
    code: "CH-SP-ST", name: "Relational Leader", order: ["CH", "SP", "ST"],
    headline: "Builds loving, connected community.",
    genius: "Relational Leaders love people one at a time and create communities where people feel known. Warmth, empathy, and presence are their native language. Trust follows them.",
    shadow: "Community without destination. They can keep a group happy and connected while the mission drifts. Hard conversations and hard decisions get postponed to protect harmony.",
    biblical: { name: "Barnabas", ref: "Acts 9, 15", text: "The son of encouragement, who lifted Paul and Mark and knit the early church together." },
    bestFit: "Congregational care, small groups, assimilation, staff care, hospitality, counseling.",
    pairing: "Partner with a Mission or Building Leader who sets direction and pace.",
    practices: [
      "Attach a goal to every relationship-rich ministry you lead.",
      "Practice one hard conversation per month; kindness includes truth.",
      "Let someone else's plan discipline your calendar.",
      "Measure care by growth, not just contact.",
      "Ask “Where are we taking these people?” in every planning meeting.",
      "Learn to end meetings with decisions, not just fellowship.",
      "Guard your devotional life from being crowded out by people time.",
      "Delegate care so you are not the only shepherd.",
      "Say no to one good relational request each week to protect the mission.",
      "Celebrate when people you love are sent out, not just gathered in.",
    ],
  },
  "CH-ST-SP": {
    code: "CH-ST-SP", name: "Inspirational Leader", order: ["CH", "ST", "SP"],
    headline: "Energizes and mobilizes people around vision.",
    genius: "Inspirational Leaders move crowds. They read a room, tell the story, raise the energy, and call people to action. Vision becomes contagious in their mouths. They gather and mobilize like few others.",
    shadow: "Platform without depth. The public gift can outpace the private walk. When applause substitutes for abiding, burnout or moral drift follows.",
    biblical: { name: "Peter at Pentecost", ref: "John 21, Acts 2", text: "Whose bold public voice was forged by private restoration with Jesus." },
    bestFit: "Preaching and communication, vision campaigns, events, fundraising, movement building.",
    pairing: "Partner with a Sacred Leader who guards your soul, and a Managing-strong leader who follows through after the big moment.",
    practices: [
      "Build a private devotional life no audience ever sees.",
      "Keep one accountability relationship with full access to your life.",
      "Prepare your soul before you prepare your talk.",
      "Follow every inspirational moment with a concrete system for next steps.",
      "Fast from the platform periodically; let others speak.",
      "Track lasting fruit, not attendance spikes.",
      "Take a day of silence each quarter.",
      "Invite critique of your ideas, not just applause for your delivery.",
      "Disciple three people slowly and privately at all times.",
      "Remember: the crowd is not your congregation; individuals are.",
    ],
  },
  "ST-CH-SP": {
    code: "ST-CH-SP", name: "Building Leader", order: ["ST", "CH", "SP"],
    headline: "Creates the conditions and systems for growth.",
    genius: "Building Leaders grow organizations. They see the systems, structures, teams, and processes that turn vision into durable ministry. They enlist leaders, organize people toward a common direction, and create the conditions where growth becomes normal. They finish what they start.",
    shadow: "Machinery without fire. The organization can run beautifully while the leader's own soul runs dry. Spirituality becomes the neglected leg: prayer gets scheduled out, devotions become sermon prep, and dependence on God quietly becomes dependence on competence.",
    biblical: { name: "Nehemiah", ref: "Nehemiah 1–6", text: "Who surveyed the wall, organized the families, answered the critics, and finished in fifty-two days, all while praying at every turn." },
    bestFit: "Executive pastor, denominational leadership, church revitalization, operations, multi-site systems, program development.",
    pairing: "Partner with a Sacred Leader who calls you deeper, and empower Relational Leaders to keep the culture warm.",
    practices: [
      "Put prayer on the calendar before meetings go on the calendar.",
      "Begin planning sessions with unhurried Scripture, not a devotional garnish.",
      "Recruit a spiritual director or prayer partner with permission to ask hard questions.",
      "Fast from productivity one day a month; be with God with no agenda.",
      "Measure your walk with God as honestly as you measure your ministry metrics.",
      "Delegate one system per year to a leader you are developing.",
      "Ask “Who is becoming more like Jesus because of this system?”",
      "Slow down enough to be interrupted; some interruptions are assignments.",
      "Share the story behind the strategy so people follow with their hearts.",
      "Let Sabbath be a system you never optimize away.",
    ],
  },
  "ST-SP-CH": {
    code: "ST-SP-CH", name: "Mission Leader", order: ["ST", "SP", "CH"],
    headline: "Multiplies leaders and ministries for the Kingdom.",
    genius: "Mission Leaders advance the Kingdom. They combine strategic drive with deep conviction from God, cast bold gospel vision, start new works, and multiply leaders and ministries. They think in movements, not meetings.",
    shadow: "Mission without empathy. People can become instruments of the cause. The relational leg is weakest, so team members may feel driven rather than shepherded, and conflict may be handled bluntly.",
    biblical: { name: "Paul", ref: "Acts 13–20", text: "Relentlessly strategic and deeply devoted, planting churches across the map while learning, sometimes painfully, to value people like Mark." },
    bestFit: "Church planting, missions leadership, evangelism, movement and network leadership, turnaround assignments.",
    pairing: "Partner with a Relational Leader who humanizes the pace and heals the bruises.",
    practices: [
      "Put people's names, not just goals, in your prayer list.",
      "Debrief every hard push by asking who got bruised and going to them.",
      "Slow your speech in conflict; ask two questions before you answer.",
      "Celebrate faithfulness in team members, not only performance.",
      "Build rest into the mission plan; sustained pace beats sprints.",
      "Let a trusted friend veto your pace twice a year.",
      "Learn each team member's story and their family's names.",
      "Share credit specifically and often.",
      "Stay long enough to love the people, not just launch the work.",
      "Remember the mission is people, not just progress toward them.",
    ],
  },
};

// Complementary pairings for the team section, keyed by style code.
export const TEAM_PAIRINGS = {
  "ST-CH-SP": [
    { code: "SP-CH-ST", they: "Depth, discernment, prayer covering", you: "Direction, structure, follow-through", watch: "You may treat their pace as inefficiency; it is often obedience." },
    { code: "CH-SP-ST", they: "Warm culture, pastoral care", you: "Clarity, systems that scale their care", watch: "They may hear your plans as pressure; share the heart first." },
    { code: "ST-SP-CH", they: "Kingdom drive, multiplication energy", you: "Systems that make their vision durable", watch: "Two drivers, one car; agree on lanes early." },
  ],
};
// Generic fallback pairing rule: pair a leader with styles that lead from their
// weakest leg. Used when a style has no bespoke table above.
export function pairingsFor(code) {
  if (TEAM_PAIRINGS[code]) return TEAM_PAIRINGS[code];
  const style = STYLES[code];
  const weakest = style.order[2];
  return STYLE_ORDER
    .filter((c) => c !== code && STYLES[c].order[0] === weakest)
    .slice(0, 2)
    .map((c) => ({
      code: c,
      they: `Strength in ${LEGS[weakest].name}, your growth leg`,
      you: `Strength in ${LEGS[style.order[0]].name}, their growth leg`,
      watch: "Name your different default speeds early, and cover for each other on purpose.",
    }));
}

// Higgsfield-generated hero stool. Loads from the Higgsfield CDN for now (the
// build container has no network to download it); TODO localize to
// /public/reports/leadership/ and repoint. The report's live centerpiece is a
// bespoke SVG stool drawn to the taker's scores, so this image is decorative
// only and degrades gracefully if it fails to load.
export const ASSETS = {
  heroStool: "https://d8j0ntlcm91z4.cloudfront.net/user_3GoBKZ7LDxzXwROWee1djylMiED/hf_20260723_060448_5853fdcc-6c6a-4f4a-89c4-0fc68749876c.png",
};
