// Big Five (Five Factor Model) content: band helper, trait band reports, and
// facet interpretations. Sourced from the assessment's interpretation sections.
// Trait % = (raw − n) / (4n) × 100 where n = item count. Bands: Low 0–39,
// Moderate 40–69, High 70–100.
//
// The fifth trait is stored as Neuroticism (N) internally, but the report
// LEADS with Emotional Stability (ES = 100 − N). The three N band reports below
// describe emotional patterns accurately: a High-Neuroticism report describes a
// LOW-Emotional-Stability person, and vice-versa. The renderer selects the N
// band report by the person's Neuroticism band while labeling the section
// "Emotional Stability."

export function big5Band(pct) {
  if (pct >= 70) return { key: "high", label: "High" };
  if (pct >= 40) return { key: "moderate", label: "Moderate" };
  return { key: "low", label: "Low" };
}

// A score within 3 points of a cutoff (37–42 or 67–72) sits near a boundary.
export function big5Boundary(pct) {
  return (pct >= 37 && pct <= 42) || (pct >= 67 && pct <= 72);
}

export const BIG5_TRAIT_ORDER = ["O", "C", "E", "A", "ES"];

// Display metadata for the five traits (ES = the Emotional Stability framing of N).
export const BIG5_TRAIT_META = {
  O: { key: "O", name: "Openness", tag: "Curiosity, imagination, and love of ideas", color: "#6B4E7A", highWord: "Curious & imaginative", lowWord: "Practical & grounded" },
  C: { key: "C", name: "Conscientiousness", tag: "Order, discipline, and follow-through", color: "#2E7D8A", highWord: "Organized & driven", lowWord: "Flexible & spontaneous" },
  E: { key: "E", name: "Extraversion", tag: "Energy from people and activity", color: "#C4923E", highWord: "Outgoing & expressive", lowWord: "Reserved & reflective" },
  A: { key: "A", name: "Agreeableness", tag: "Compassion, cooperation, and warmth", color: "#3E7C63", highWord: "Warm & cooperative", lowWord: "Direct & independent" },
  ES: { key: "ES", name: "Emotional Stability", tag: "Calm, steadiness, and resilience under stress", color: "#1F5E68", highWord: "Calm & resilient", lowWord: "Sensitive & reactive", note: "Emotional Stability is the inverse of Neuroticism. A higher score means calmer and steadier; a lower score means you feel emotional highs and lows more intensely." },
};

export const BIG5_TRAITS = {
  O: {
    high: {
      snapshot: "You are curious, imaginative, and energized by new ideas. You enjoy exploring meaning, asking \"what if,\" and connecting concepts others keep separate. Routine bores you; possibility fuels you.",
      strengths: ["Generates fresh ideas, programs, and approaches", "Learns quickly and enjoys deep study", "Appreciates art, story, and creative communication", "Comfortable with complexity and abstract questions", "Adapts well to change and new environments"],
      watchouts: ["Can chase new ideas before finishing current ones", "May grow impatient with tradition and people who value it", "Risk of overcomplicating simple things", "Can seem impractical or \"up in the clouds\" to concrete thinkers"],
      application: "High Openness leaders are often visionaries, teachers, creatives, and church planters. You likely see what a ministry could become before others do. Your challenge is honoring the people and traditions already in place while you innovate. Pair yourself with a detail-strong implementer, and translate your vision into concrete next steps others can act on.",
      growth: ["Before launching a new idea, finish or formally close one existing project.", "When proposing change, name what you will preserve, not just what you will replace.", "Test big ideas with one practical, low-risk pilot before a full rollout."],
      scripture: { text: "See, I am doing a new thing! Now it springs up; do you not perceive it?", ref: "Isaiah 43:19" },
    },
    moderate: {
      snapshot: "You balance curiosity with practicality. You enjoy new ideas when they serve a clear purpose, but you do not chase novelty for its own sake. You can move between visionary conversations and concrete planning.",
      strengths: ["Bridges innovators and traditionalists on a team", "Open to change when the case is made", "Keeps creative projects grounded in reality", "Learns new methods without discarding proven ones"],
      watchouts: ["May hesitate at the edge of a truly bold decision", "Can be pulled back and forth between visionary and practical voices", "Risk of settling for \"good enough\" when a season calls for imagination"],
      application: "Moderate Openness is a translator's gift. You can help a visionary pastor land the plane, and help a traditional board see why a change matters. Use that position deliberately: in meetings, restate the dreamers' ideas in practical terms and the skeptics' concerns in constructive terms.",
      growth: ["Identify which context pulls you more creative and which more conventional, and use each on purpose.", "Once a quarter, expose yourself to one idea source outside your normal stream.", "When you feel resistance to a new idea, ask whether the objection is practical or just unfamiliar."],
      scripture: { text: "Test everything; hold fast what is good.", ref: "1 Thessalonians 5:21" },
    },
    low: {
      snapshot: "You are practical, grounded, and loyal to what works. You prefer proven methods over experiments, and concrete facts over abstract theory. People know where you stand, and you bring stability to every room you enter.",
      strengths: ["Protects proven, effective practices", "Makes decisions efficiently without endless speculation", "Reliable and consistent; not swayed by fads", "Excellent at practical, hands-on problem-solving", "Honors heritage and institutional memory"],
      watchouts: ["Can resist needed change too long", "May dismiss creative people as unrealistic", "Risk of confusing \"the way we've always done it\" with \"the right way\"", "Can undervalue art, story, and imagination as ministry tools"],
      application: "Low Openness leaders are often the backbone of ministry operations, stewardship, and faithfulness over the long haul. Churches need leaders who keep commitments and guard what is essential. Your growth edge is distinguishing conviction from comfort. Doctrine does not change; methods must. Give innovators on your team a fair hearing and a defined space to experiment.",
      growth: ["When you oppose a change, write down whether the issue is biblical principle, wisdom, or preference. Only defend the first two to the end.", "Adopt one small new method per year and give it a full, honest trial.", "Partner with a high-Openness colleague and agree to trade critiques kindly."],
      scripture: { text: "Stand at the crossroads and look; ask for the ancient paths, ask where the good way is, and walk in it.", ref: "Jeremiah 6:16" },
    },
  },
  C: {
    high: {
      snapshot: "You are organized, disciplined, and dependable. You plan ahead, follow through, and hold high standards for yourself. When you say you will do something, it gets done.",
      strengths: ["Exceptional follow-through and reliability", "Plans, systems, and processes come naturally", "Manages time, money, and resources well", "Sets and reaches long-term goals", "Models integrity between word and action"],
      watchouts: ["Perfectionism; struggle to say \"done\"", "Can be rigid when plans change", "May judge less-structured people as lazy or uncommitted", "Prone to overwork and burnout", "Can prioritize the task over the person in front of you"],
      application: "High Conscientiousness leaders are natural administrators, executive pastors, treasurers, and project leads. Ministries run on your faithfulness. Two cautions: first, grace — hold volunteers to standards without crushing them; they are not staff. Second, sabbath — your discipline can become an idol of productivity. Rest is obedience, not laziness.",
      growth: ["Build margin into every plan (aim for 80% capacity, not 100%).", "When someone drops a ball, ask about their situation before addressing the failure.", "Schedule rest with the same seriousness you schedule work."],
      scripture: { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    },
    moderate: {
      snapshot: "You can be organized when it matters and flexible when it doesn't. You meet real deadlines but do not need every detail systematized. You adapt your level of structure to the demands of the moment.",
      strengths: ["Flexes between planning and improvising", "Handles interruptions without losing the thread", "Sets realistic standards for self and others", "Comfortable in both structured and unstructured roles"],
      watchouts: ["Discipline may fade when external accountability is missing", "Important-but-not-urgent work can slide", "Can underestimate how much structure a growing ministry needs"],
      application: "Moderate Conscientiousness serves well in roles that mix people and process, such as ministry directors and team leads. Your flexibility keeps teams human. Your risk is drift: without deadlines and systems, projects stall quietly. Borrow structure — checklists, recurring reviews, an accountability partner — for the seasons and projects that demand it.",
      growth: ["Identify your two highest-stakes responsibilities and build simple written systems for just those.", "Use a weekly review (30 minutes) to catch slipping commitments early.", "Say no to one new commitment for every new one you accept."],
      scripture: { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", ref: "Proverbs 21:5" },
    },
    low: {
      snapshot: "You are spontaneous, adaptable, and comfortable with loose ends. You respond to what the moment brings rather than working a master plan. Structure feels confining, and you do your best work with freedom and variety.",
      strengths: ["Thrives amid change and surprise", "Available and interruptible — often a great crisis responder and people-minister", "Doesn't over-engineer simple things", "Brings spontaneity and freshness to teams", "Quick to seize unplanned opportunities"],
      watchouts: ["Deadlines, details, and follow-through can slip", "May frustrate structured teammates and erode trust", "Long-term goals stall without external systems", "Risk of overcommitting because saying yes is easy in the moment"],
      application: "Low Conscientiousness leaders often shine in relational, frontline, and rapidly changing ministry settings where rigid planners struggle. But ministry credibility is built on kept promises. Do not try to become a systems person overnight; instead, build scaffolding: calendars with alarms, a short daily list, and a detail-strong partner for events and administration. Protect your reputation by promising less and delivering what you promise.",
      growth: ["Keep one list of commitments, review it every morning, and let nothing live only in your head.", "Before saying yes, wait 24 hours on any commitment longer than a week.", "Delegate or pair up on administration rather than avoiding it."],
      scripture: { text: "Let your 'Yes' be yes, and your 'No,' no.", ref: "James 5:12" },
    },
  },
  E: {
    high: {
      snapshot: "You are outgoing, energetic, and expressive. People energize you, groups feel natural, and you rarely lack something to say. You make connections easily and often set the emotional tone of the room.",
      strengths: ["Builds relationships and networks quickly", "Communicates with warmth and confidence", "Energizes teams, rooms, and events", "Comfortable up front: preaching, hosting, leading gatherings", "Natural at welcoming newcomers and connecting people"],
      watchouts: ["Can talk more than listen", "May dominate meetings and unintentionally silence quieter voices", "Depth can suffer when breadth comes so easily", "Solitude, study, and prayer alone may feel like a chore", "Energy can be mistaken for spiritual authority"],
      application: "High Extraversion leaders excel in evangelism, hospitality, platform ministry, and mobilizing people. Your presence is a gift; steward it. In meetings, speak last sometimes and draw out the quiet members by name. And guard your private life with God: public gifting without secret devotion is a slow leak. What Jesus modeled in withdrawing to lonely places, you must schedule.",
      growth: ["In group settings, ask two questions for every opinion you give.", "Book recurring solitude for prayer and study, and treat it as unmovable.", "Identify one quiet team member and become their advocate in discussions."],
      scripture: { text: "Everyone should be quick to listen, slow to speak.", ref: "James 1:19" },
    },
    moderate: {
      snapshot: "You are an ambivert. You enjoy people and can work a room, but you also need quiet to recharge. You can lead up front or work behind the scenes, and neither feels foreign.",
      strengths: ["Reads the room; knows when to speak and when to listen", "Comfortable in both large gatherings and one-on-one depth", "Connects extraverts and introverts on a team", "Flexible across public and private ministry roles"],
      watchouts: ["Others may misread you: too quiet for the extraverts, too social for the introverts", "Energy management is less predictable; you can misjudge your reserves", "May avoid fully committing to either platform or depth roles"],
      application: "Moderate Extraversion is one of the most versatile profiles in ministry leadership. You can preach on Sunday and disciple one person on Tuesday with equal authenticity. Your key discipline is energy awareness: learn which activities fill you and which drain you, and schedule recovery after heavy relational seasons like conferences and holidays.",
      growth: ["Track your energy for two weeks; note what drains and what restores you.", "Alternate high-people days with focused work days where possible.", "Volunteer for the role your team lacks — up front if they're all quiet, behind the scenes if they're all loud."],
      scripture: { text: "There is a time for everything… a time to be silent and a time to speak.", ref: "Ecclesiastes 3:1,7" },
    },
    low: {
      snapshot: "You are quiet, reflective, and selective with your words. You prefer depth over breadth: a few meaningful relationships over a wide circle, one real conversation over an evening of small talk. You think before you speak, and people trust the weight of what you say.",
      strengths: ["Deep focus for study, writing, and prayer", "Listens well; people feel genuinely heard", "Builds few but deep, loyal relationships", "Calm, non-anxious presence in tense moments", "Leads by substance rather than charisma"],
      watchouts: ["Can be overlooked in rooms that reward volume", "May avoid necessary visibility, networking, or platform moments", "Others can misread reserve as coldness or disinterest", "Risk of isolation, carrying burdens alone"],
      application: "Low Extraversion leaders often make outstanding teachers, counselors, writers, intercessors, and one-on-one disciplers. The church does not need you to become an extravert; it needs your depth. That said, leadership requires some visibility. Prepare for public moments in advance (notes reduce drain), schedule recovery after them, and force yourself into the relational moments that matter — a hospital visit or a hallway conversation may accomplish more than a perfect document.",
      growth: ["Accept one stretching public assignment per season, with preparation time built in.", "Share your thinking in meetings early, even briefly, so your insight shapes decisions.", "Choose two or three people to let all the way in; do not walk alone."],
      scripture: { text: "Make it your ambition to lead a quiet life… so that your daily life may win the respect of outsiders.", ref: "1 Thessalonians 4:11–12" },
    },
  },
  A: {
    high: {
      snapshot: "You are kind, compassionate, and cooperative. You notice needs, assume the best about people, and would rather serve than compete. Others experience you as warm, safe, and generous.",
      strengths: ["Builds trust and emotional safety quickly", "Serves sacrificially and notices overlooked people", "Peacemaker; de-escalates conflict naturally", "Team-first; shares credit freely", "Embodies mercy, hospitality, and pastoral care"],
      watchouts: ["Struggles to say no; prone to overcommitment and burnout", "Avoids necessary confrontation; problems can fester", "Vulnerable to being taken advantage of", "May soften hard truths until they lose their meaning", "Can derive worth from being needed"],
      application: "High Agreeableness leaders are the pastoral heart of a church: care ministries, hospitality, counseling, and visitation flourish under you. Your growth edge is courage. Shepherds carry both a staff and a rod; love sometimes requires a hard conversation, a firm boundary, or a \"no\" that protects the mission. Remember that avoiding conflict is not the same as making peace — peacemaking runs through honest conversation, not around it.",
      growth: ["Before accepting a request, check your calendar and pray before answering; never answer on the spot.", "Practice direct feedback with a script: affirm, state the issue plainly, agree on next steps.", "Let others own their responsibilities; rescuing them robs their growth."],
      scripture: { text: "Speaking the truth in love, we will grow to become in every respect the mature body of him who is the head, that is, Christ.", ref: "Ephesians 4:15" },
    },
    moderate: {
      snapshot: "You balance compassion with candor. You care about people and cooperate readily, but you can push back, negotiate, and hold a line when it matters. You are neither a pushover nor a fighter.",
      strengths: ["Gives honest feedback without cruelty", "Sets boundaries while staying relational", "Mediates well: sees both the person and the problem", "Trusts appropriately, without naivety or cynicism"],
      watchouts: ["Others may find you hard to predict — warm one day, firm the next", "Under stress you may swing to whichever extreme is easier in the moment", "Can be seen as political when you shift between accommodation and challenge"],
      application: "Moderate Agreeableness is well suited to leadership roles requiring both care and accountability: senior leadership, board service, supervision, and conflict mediation. You can deliver a hard decision with a warm hand. Be transparent about your reasoning so your firmness never reads as favoritism, and let people know your care is constant even when your answers vary.",
      growth: ["When you must be firm, explain the \"why\" — people accept decisions they understand.", "Ask trusted colleagues whether you lean too soft or too hard under pressure, and correct toward the middle.", "Decide your non-negotiables in advance so pressure doesn't decide them for you."],
      scripture: { text: "Let your speech always be gracious, seasoned with salt.", ref: "Colossians 4:6" },
    },
    low: {
      snapshot: "You are direct, independent, and unafraid of conflict. You value truth over harmony and results over approval. You question claims, challenge weak ideas, and negotiate hard for what you believe is right.",
      strengths: ["Says what others only think; confronts problems early", "Immune to flattery and manipulation", "Makes tough calls without being paralyzed by people-pleasing", "Strong advocate and defender of the mission", "Sharpens ideas through honest challenge"],
      watchouts: ["Can wound people without noticing", "Skepticism may read as cynicism or distrust", "Wins arguments but loses relationships", "May undervalue encouragement, which teams need to thrive", "Competitiveness can creep into collaboration"],
      application: "Low Agreeableness leaders are often the truth-tellers, reformers, and guardians a ministry needs: they protect doctrine, confront sin, challenge drift, and negotiate wisely with vendors and partners. But ministry is finally about people, and people bruise easier than problems. Your competence will open doors; only kindness will keep them open. Slow down, soften your delivery, and let others see the loyalty underneath your directness.",
      growth: ["Before delivering critique, name one thing the person did well — and mean it.", "Ask \"Do I need to win this, or just be heard?\" before engaging a disagreement.", "Build encouragement into your rhythm: one specific, unprompted affirmation per day."],
      scripture: { text: "Be completely humble and gentle; be patient, bearing with one another in love.", ref: "Ephesians 4:2" },
    },
  },
  // Keyed by NEUROTICISM band. Renderer labels the section "Emotional Stability."
  N: {
    high: {
      snapshot: "You feel deeply and notice threats early. Worry, self-doubt, and mood swings visit you more often than they visit others. You are hard on yourself, replay conversations, and sense what could go wrong before anyone else does.",
      strengths: ["Early-warning radar; spots risks others miss", "Deep empathy for people who are hurting or anxious", "Conscientious about doing right, driven partly by healthy concern", "Emotionally rich inner life; often powerful in prayer, worship, and creative work", "Motivated to prepare because you take threats seriously"],
      watchouts: ["Worry can crowd out peace and distort decisions", "Self-criticism can curdle into shame and paralysis", "Moods may swing the tone of your team without you realizing", "Prone to burnout and compassion fatigue", "May read neutral feedback as rejection"],
      application: "Leaders who feel emotions intensely often minister with unusual tenderness — the wounded make the best healers. Your sensitivity is an asset in counseling, intercession, and crisis care. But you must lead your emotions rather than be led by them. Build honest rhythms: prayer that casts anxiety on God, trusted friends who can tell you when your radar is misreading, rest that is scheduled and kept. And hear this plainly: struggling with anxiety or low moods is not weak faith. If negative emotion regularly disrupts your sleep, health, or ministry, talking with a doctor or counselor is an act of stewardship, not a failure.",
      growth: ["Write worries down and sort them: act, pray, or release. Assign each one.", "Establish a daily rhythm of Scripture and prayer aimed at anchoring, not performing (Philippians 4:6–7).", "Recruit two truth-tellers who can gently flag when self-criticism is talking louder than truth."],
      scripture: { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
    },
    moderate: {
      snapshot: "You experience the normal range of human emotion. Stress affects you, but it does not usually run you. You worry when there is something worth worrying about, and you recover in reasonable time.",
      strengths: ["Emotionally relatable; neither icy nor volatile", "Healthy concern motivates preparation without paralysis", "Can empathize with anxious people and steady them", "Recovers from setbacks with modest support"],
      watchouts: ["Prolonged stress can push you into more reactive patterns", "May underestimate your limits because you usually cope well", "Emotional dips can surprise you because they are not your norm"],
      application: "A moderate emotional profile gives you an honest connection with your people. You know what discouragement feels like without living there. Your task is maintenance: the rhythms of rest, prayer, exercise, and friendship that keep you in your healthy range, especially during heavy seasons — building programs, conflicts, grief in the congregation. Watch your leading indicators (sleep, irritability, dread) and act early.",
      growth: ["Name your top three stress signals and tell someone close to watch for them.", "Protect recovery practices during busy seasons instead of dropping them first.", "Debrief hard ministry events within a week — with God and with a person."],
      scripture: { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    },
    low: {
      snapshot: "You are calm, steady, and resilient. Stress rolls off you, setbacks don't keep you down long, and you rarely lose sleep over what might go wrong. In a crisis, you are the non-anxious presence in the room.",
      strengths: ["Stays clear-headed under pressure and in crisis", "Absorbs criticism without spiraling", "Provides emotional ballast for anxious teams and congregations", "Makes decisions from facts rather than fear", "Consistent mood; people know what they will get"],
      watchouts: ["May underestimate real risks because alarm bells ring quietly", "Can seem detached or unmoved to people in pain", "May miss the emotional subtext of a room", "Risk of impatience with anxious teammates (\"just calm down\" doesn't help)", "Own stress can go unnoticed until the body complains"],
      application: "Highly stable leaders are invaluable in crisis, conflict, and long-haul leadership. Congregations borrow courage from your calm. Two disciplines matter. First, empathy on purpose: since you don't naturally feel what anxious people feel, ask questions and validate before solving. A grieving family needs your presence, not your composure lecture. Second, take threats seriously on evidence, not on feeling — invite your more sensitive teammates to stress-test your plans; their radar catches what your calm skips.",
      growth: ["When someone shares a worry, respond first with understanding, not a fix.", "Assign a formal risk review to your planning process; don't rely on your gut alarm.", "Check your own tank quarterly — calm people burn out quietly."],
      scripture: { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", ref: "Isaiah 26:3" },
    },
  },
};

export const BIG5_FACET_ORDER = ["creative-expression", "vision", "kindness", "innovation", "humor", "purpose"];

export const BIG5_FACETS = {
  "creative-expression": {
    name: "Creative Expression", related: "Openness (aesthetic side)", color: "#6B4E7A",
    desc: "Whether art, music, writing, and story are how you process and express life.",
    high: "Creativity is a language for you, and often a stress reliever. Use it in ministry: worship, media, writing, teaching illustrations, and communications all benefit. Protect regular time to create; it is part of how God wired you to stay healthy.",
    low: "You express yourself in other ways — action, service, or words — and that is fine. Just don't dismiss creative ministry as decoration; for many people you serve, a song or story reaches what a sermon point cannot. Partner with creatives rather than sidelining them.",
  },
  vision: {
    name: "Vision (Future Orientation)", related: "Conscientiousness + Openness", color: "#2E7D8A",
    desc: "How naturally you look ahead, anticipate, and plan long-range.",
    high: "You see down the road: where the ministry could be in five years, what problems are coming, what to build now. This is a core leadership gift — steward it with written vision, succession thinking, and multi-year plans. Watch that you don't live so far ahead that you miss today's people.",
    low: "You live in the present, which makes you responsive and available. But ministries need runway. Borrow foresight: use annual planning templates, sit with visionary colleagues, and put long-range items (budgets, leadership pipeline, maintenance) on a calendar so the future doesn't ambush you.",
  },
  kindness: {
    name: "Kindness", related: "Agreeableness (altruism side)", color: "#3E7C63",
    desc: "Everyday, practical acts of care — favors, encouragement, brightening someone's day.",
    high: "You minister in small, constant kindnesses, and they compound. This is frontline pastoral care whether or not you hold the title. Guard your margin so generosity doesn't become depletion, and let others serve you sometimes.",
    low: "Care may not show up in small daily gestures for you; you may show it through big commitments, provision, or truth-telling instead. Recognize that most people feel love through the small stuff. Pick one deliberate act of kindness per day; it will change how your leadership is received.",
  },
  innovation: {
    name: "Innovation", related: "Openness (ideas side)", color: "#C4923E",
    desc: "Whether you generate new methods and unexpected solutions.",
    high: "You improve things by instinct — procedures, programs, problems all look like drafts to you. Ministries need this, especially ones stuck in decline. Present innovations as experiments with review dates, and honor what came before, so improvement doesn't feel like insult.",
    low: "You optimize by consistency rather than reinvention, which protects stability. When change is needed, you may feel stuck; that's the moment to borrow an innovator and give their idea a fair pilot rather than defaulting to what's familiar.",
  },
  humor: {
    name: "Humor", related: "Extraversion (positive-emotion side)", color: "#C4923E",
    desc: "Playfulness and the instinct to lighten a room.",
    high: "Your humor builds connection, disarms tension, and makes ministry human. Used well it opens hearts to hard truths. Watch timing and targets: never at the expense of the vulnerable, and know when a room needs your seriousness more than your joke.",
    low: "You are steady and sincere, and people trust your gravity. You don't need to perform jokes — but do let joy show. Celebrate wins visibly and receive others' playfulness warmly, so your seriousness reads as depth rather than disapproval.",
  },
  purpose: {
    name: "Purpose & Meaning", related: "Openness (transcendence side)", color: "#1F5E68",
    desc: "Felt connection to higher purpose and the sense that life carries meaning beyond the material.",
    high: "You have a strong sense of calling and see God's hand at work in your story. This fuels perseverance and gives your leadership weight. Steward it by helping others find their calling, not just following yours — purpose multiplies when it is transferred.",
    low: "A lower score here often signals a season, not a settled trait — fatigue, disappointment, and routine can mute the sense of purpose. Treat it as a prompt for reflection: revisit your calling story, take a retreat, and talk with a mentor. Meaning tends to return when we reconnect cause and daily task.",
  },
};
