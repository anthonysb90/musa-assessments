// Interaction & dynamics content for the Mission USA assessment platform.
//
// This file is pure data plus small pure helper functions. It imports nothing,
// touches no database, and produces no side effects. It is the interpretive
// layer that sits on top of the raw assessment scores, describing what happens
// when two traits combine, when several gifts cluster, when an Enneagram type
// moves under grace or under stress, and how a DISC dimension reads at high,
// moderate, and low intensity.
//
// Voice: warm, direct, pastoral, second person. Developmental, never a verdict.
// No em dashes anywhere in the content.
//
// EXPORTS
// -------
// BIG5_PAIRS
//   The 10 unordered Big Five pairs (OC, OE, OA, OES, CE, CA, CES, EA, EES,
//   AES). Each pair has { a, b, quads } where a/b are trait keys and quads has
//   four entries keyed hi_hi, hi_lo, lo_hi, lo_lo. The first letter of a quad
//   key refers to the FIRST trait in the pair name, the second to the second.
//   Each quad is { title, body }.
//
// big5Interactions(traits)
//   traits is an array of { key, pct, band }, band being "high" | "moderate" |
//   "low". Considers only non-moderate traits. For each pair whose two members
//   are both non-moderate, selects the matching quad, ranks the results by
//   extremity (sum of each trait's distance from 50), and returns the top 3 as
//   { pairName, aName, bName, title, body }. Returns [] if none qualify.
//
// GIFT_CONSTELLATIONS
//   18 named gift themes, keyed by a sorted-letters signature of a common top-3
//   or top-2 combination. Each is { name, body, fits: [phrase, phrase], watch,
//   verse }.
//
// GIFT_FRAGMENTS / GIFT_NAMES
//   Per-letter helpers (A through Y) used to build a graceful fallback when no
//   named constellation matches.
//
// giftConstellation(topLetters)
//   topLetters is the person's ranked gift letters (highest first). Sorts the
//   top 3 into a signature and looks for an exact 3-letter match, then each
//   sorted 2-letter subset, then falls back to a stitched-together paragraph.
//   Returns { name, body, fits, watch, verse, exact }.
//
// ENNEAGRAM_DYNAMICS
//   Keyed "1" through "9". Each has wings (the two adjacent-type wings, each
//   { label, body }) and arrows ({ growth: { toward, body }, stress: { toward,
//   body } }) using the standard integration and disintegration lines.
//
// enneagramDynamics(typeKey)
//   Returns the dynamics object for a type key, or null.
//
// DISC_DIMENSIONS
//   Keyed D, I, S, C. Each is { name, high, moderate, low } with each intensity
//   being { title, body }.
//
// discDimensions(scales)
//   scales is an array of { key, pct }. Maps pct >= 60 high, 40-59 moderate,
//   < 40 low, and returns an array of { key, name, level, title, body } in
//   D, I, S, C order.

/* ------------------------------------------------------------------ */
/* 1. BIG FIVE PAIR INTERACTIONS                                       */
/* ------------------------------------------------------------------ */

const BIG5_NAME = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  ES: "Emotional Stability",
};

export const BIG5_PAIRS = {
  OC: {
    a: "O", b: "C",
    quads: {
      hi_hi: {
        title: "The visionary who finishes",
        body: "You see what could be, and you have the discipline to build it. That pairing is rare and powerful. Ideas do not die on a napkin with you, they become plans, budgets, and finished work. The tension is that your standards and your imagination can both run hot at once, so you take on more than any calendar can hold, and you polish long past the point of enough. You can also grow impatient with people who bring you either the dream or the details but not both. Pick one vision per season and let the others wait. Ship it at good, not perfect, and trust God with the rest.",
      },
      hi_lo: {
        title: "The dreamer with loose ends",
        body: "Your mind runs ahead to new ideas, but the follow-through lags behind. You start with real fire, then a fresher idea pulls your attention before the last one lands. People love your creativity and quietly wonder whether this one will finish. That gap is not a character flaw, it is a wiring you can build around. You do not need to become a systems person overnight. You need scaffolding: one list you check each morning, a deadline someone else can see, and a detail-strong partner who finishes what you start. Before you chase the next idea, close out the current one, even if closing it just means handing it off well.",
      },
      lo_hi: {
        title: "The faithful steward of what works",
        body: "You are organized, disciplined, and loyal to proven methods. When you commit, it gets done, and it gets done the way it has always worked. Ministries run on people like you. The growth edge is telling conviction apart from comfort. Not every old way is a biblical principle, and not every new idea is a threat. When you feel yourself resisting a change, ask whether the objection is Scripture, wisdom, or just the discomfort of unfamiliar ground. Defend the first two to the end. Hold the third loosely. Adopt one new method a year and give it an honest, full trial before you judge it.",
      },
      lo_lo: {
        title: "The grounded improviser",
        body: "You are practical and spontaneous, at home in the present and quick to help with whatever the day brings. You do not overthink, and you do not over-plan. That makes you flexible and easy to work with, a steady set of hands when a crisis needs a real person rather than a committee. The risk is drift. Without a plan or a proven method to lean on, important-but-not-urgent work slides quietly out of view, and long-term goals stall. Borrow structure for the few things that truly matter. Keep one short list, review it each morning, and pair with someone who thinks ahead so tomorrow does not ambush you both.",
      },
    },
  },
  OE: {
    a: "O", b: "E",
    quads: {
      hi_hi: {
        title: "The out-loud innovator",
        body: "You have ideas, and you love an audience for them. Vision does not stay locked in your head, it spills into rooms and lights people up. You can cast a picture of the future and make others want to build it. The double edge is that breadth comes so easily that depth can suffer, and you can fall in love with the newest idea in the room, including your own. You may talk a concept into existence before it is actually thought through. Slow down enough to test the vision with a small pilot, and speak last in some meetings so your energy does not drown out the quieter wisdom your idea still needs.",
      },
      hi_lo: {
        title: "The visionary who works alone",
        body: "You see what could be, but you would rather build it in quiet than sell it from a stage. Your best thinking happens alone, on a walk or over a long study, not in a crowded brainstorm. That depth is a gift, and the church needs original thinkers who are not addicted to applause. The tension is that a vision no one hears cannot gather anyone. Ideas need carriers, and carriers need to be recruited out loud. You do not have to become an extravert. Prepare your thoughts on paper, then share them early with two or three trusted people who can help you give them a wider voice.",
      },
      lo_hi: {
        title: "The grounded connector",
        body: "You are practical and social, a people person without much appetite for abstraction. You would rather connect folks, host the room, and solve the real problem in front of you than chase a theory. That makes you a natural at hospitality, mobilizing, and frontline ministry, and people trust that you are not selling them a fad. The growth edge is not dismissing the dreamers. When someone brings a new idea, your instinct may be to call it impractical before you have really heard it. Give innovators a fair hearing and a defined space to experiment. Your gift for people can help their good ideas actually reach the people they are meant for.",
      },
      lo_lo: {
        title: "The quiet keeper of what works",
        body: "You are reserved and practical, content to work steadily behind the scenes with proven methods and a few trusted people. You do not need novelty or a crowd, and you bring a calm, dependable presence to every team. This is the backbone many ministries quietly run on. The risk is that both your reserve and your love of the familiar can keep needed change and needed voices at a distance. You may guard the old way past its usefulness, and stay quiet when your insight would have shaped a better decision. Share your thinking early, even briefly. And once a year, let one new idea in for a genuine trial before you decide.",
      },
    },
  },
  OA: {
    a: "O", b: "A",
    quads: {
      hi_hi: {
        title: "The tender visionary",
        body: "You are imaginative and warm, full of ideas and full of heart. You dream about what could be, and you care deeply about the people who would be affected. That combination makes you a compassionate innovator, someone whose new ideas are aimed at human good, not just novelty. The tension is that both traits make it hard to say no. You see possibility everywhere and you hate to disappoint anyone, so you overcommit and then cannot bear to cut anything. Not every good idea is yours to carry, and kindness sometimes means a clear no. Decide your yes in advance, protect your margin, and let some beautiful possibilities belong to someone else.",
      },
      hi_lo: {
        title: "The blunt original",
        body: "You are a creative, independent thinker who says what others only think. You question the accepted answer, challenge weak ideas, and are not afraid to stand alone with a better one. Reformers and truth-tellers are wired like this, and the church needs them to keep it honest. The edge is that your originality plus your directness can cut. You can win the argument and lose the person, and dismiss those who value tradition as simply behind. People bruise easier than problems. Before you deliver the critique, name one thing the other person got right, and mean it. Your ideas will open doors. Only kindness will keep them open.",
      },
      lo_hi: {
        title: "The kind keeper",
        body: "You are warm, cooperative, and loyal to what works. You value people and you value the tried-and-true, which makes you a steadying, pastoral presence, the kind of person who holds a group together and honors its history. Care ministries, hospitality, and long faithful service flourish under you. The growth edge is courage with change and courage in conflict. Your kindness can avoid the hard conversation, and your love of the familiar can resist a needed shift, both for the sake of keeping peace. But peacemaking runs through honest conversation, not around it. Pick the one hard talk you have been postponing, prepare it gently, and have it this week.",
      },
      lo_lo: {
        title: "The plainspoken realist",
        body: "You are practical, direct, and independent. You deal in facts, not theories, and you say things plainly instead of dressing them up. People always know where you stand, and you make tough calls without being paralyzed by what others will think. In ministry that is a guarding gift, the person who protects the mission and confronts drift early. The risk is that concrete plus blunt can feel cold, and both encouragement and imagination can seem like a waste of time to you. Teams need both to thrive. Build one specific, unprompted word of encouragement into each day, and when a creative person brings an idea, ask a question before you shoot it down.",
      },
    },
  },
  OES: {
    a: "O", b: "ES",
    quads: {
      hi_hi: {
        title: "The calm explorer",
        body: "You are curious and steady at the same time. New ideas excite you, and change does not rattle you, so you can explore, experiment, and lead through uncertainty without losing your footing. That is a strong pairing for pioneering ministry, where you need both imagination and nerve. The quiet risk is that your calm plus your comfort with the untried can make you underestimate real cost. You may launch into something bold because it interests you and because your alarm bells ring softly, without counting what it will take. Invite a more cautious, detail-minded voice to stress-test your next big idea. Their concern is not a lack of faith. It is the runway your vision needs.",
      },
      hi_lo: {
        title: "The feeling artist",
        body: "You are imaginative and you feel things deeply. Beauty, meaning, and the ache in the world all land hard on you, and that sensitivity often shows up as real creative and spiritual depth. Some of the most moving worship, writing, and prayer comes from people wired like you. The tension is that a vivid inner world plus strong emotion can pull you into what is missing, into comparison, and into treating your feelings as the final truth about you. They are real, but they are not the deepest thing true about you. Anchor the vivid days with steady rhythms of Scripture and honest friendship, and let a trusted friend help you tell feeling from fact.",
      },
      lo_hi: {
        title: "The steady realist",
        body: "You are practical and hard to rattle. You deal with what is in front of you, you keep your head when things go sideways, and you rarely lose sleep over what might go wrong. In a crisis you are the non-anxious presence the room borrows courage from, and you make decisions from facts rather than fear. The edges are two. Your calm can miss the emotional weather of a room, and your practicality can wave off both new ideas and quiet warnings. When someone is hurting, lead with understanding before a fix. And take threats seriously on evidence, inviting a more sensitive teammate to catch what your steadiness skips right past.",
      },
      lo_lo: {
        title: "The grounded but tender one",
        body: "You are practical and down-to-earth, and you also feel stress more keenly than most. You are not chasing novelty, you want stable ground and proven ways, partly because change and pressure genuinely unsettle you. That makes you a faithful, relatable presence, someone who understands what worry feels like without living in the clouds. The risk is that when the familiar is threatened, both your caution and your reactivity can spike together, and change can feel like a loss you brace against. Build the anchors that steady you: kept rhythms of prayer and rest, and two truth-tellers who can tell you when your alarm is louder than the actual threat. Then take the next change one small step at a time.",
      },
    },
  },
  CE: {
    a: "C", b: "E",
    quads: {
      hi_hi: {
        title: "The organized front-runner",
        body: "You are disciplined and outgoing, a natural driver who can rally people and then actually deliver. You set goals, you move a room, and you follow through, which is why teams end up handing you the wheel. That is real leadership horsepower. The tension is pace. Your drive plus your energy can run you and everyone around you past healthy limits, and you can fill every silence and every calendar slot. Not everyone recovers as fast as you do, and productivity can quietly become an idol. Build margin into your plans, aim for eighty percent capacity, and in meetings ask two questions for every opinion you give so the quieter, wiser voices still get in.",
      },
      hi_lo: {
        title: "The quiet administrator",
        body: "You are disciplined and reserved, the person who gets the important work done without needing a stage. You plan, you follow through, and you would rather produce something excellent in the quiet than talk about it in a crowd. Ministries run on people like you, and much of your best work is never seen. The tension is that reserve plus a task focus can keep you heads-down when leadership needs your voice and your face. Your insight can go unheard, and people can read your quiet as distance. Share your thinking early in meetings, even briefly, and remember that a hallway conversation or a hospital visit can accomplish more than a perfect spreadsheet.",
      },
      lo_hi: {
        title: "The spontaneous host",
        body: "You are outgoing and spontaneous, quick to connect and quick to say yes. You bring energy and warmth to a room, you thrive on people, and you seize unplanned opportunities others miss. That makes you a wonderful welcomer and a great crisis responder. The risk is that easy yeses plus loose follow-through erode trust over time. You commit in the moment, then details and deadlines slip, and people start to wonder whether the promise will hold. Ministry credibility is built on kept promises. Promise a little less and deliver what you promise. Keep one list of commitments, review it each morning, and pair with a detail-strong friend for anything that has to actually land.",
      },
      lo_lo: {
        title: "The easygoing one",
        body: "You are relaxed and reserved, unhurried and low-key. You do not chase the spotlight or over-plan your days, and you bring a calm, unpressured presence that puts people at ease. In a frantic culture that steadiness is a gift. The risk is quiet drift. Without much drive or much social push, commitments can slide, your own good ideas can stay unspoken, and you can become easy to overlook. Neither problem is a character flaw, both are habits you can build around. Pick the two responsibilities that matter most and put simple systems around just those. And choose a few moments each week to step forward on purpose, in a meeting or a relationship, so your steadiness is seen and used.",
      },
    },
  },
  CA: {
    a: "C", b: "A",
    quads: {
      hi_hi: {
        title: "The dependable servant",
        body: "You are organized and kind, the rare person who both follows through and genuinely cares how people feel along the way. You keep your commitments, and you keep them warmly. That is the heart of trustworthy ministry, and it is why people lean on you. The tension is that duty plus compassion make it very hard to say no, so you carry more than you should and quietly head toward burnout. You can also hold volunteers to staff-level standards without meaning to, then feel guilty for it. Give people grace along with clear expectations. Before you accept a request, check your calendar and pray before you answer. Rest is obedience, not laziness. Guard it like the work.",
      },
      hi_lo: {
        title: "The exacting driver",
        body: "You are disciplined and direct, with high standards and the nerve to hold people to them. You say what needs saying, you confront problems early, and you do not let things slide. Ministries need this backbone, especially where excellence and accountability have gone soft. The edge is that high standards plus low patience for feelings can wound. You can prize the task over the person and judge less-structured people as lazy when they are simply wired differently. Competence opens doors, but only kindness keeps them open. When someone drops a ball, ask about their situation before you address the failure, and name one thing they did well before the correction. Mean it.",
      },
      lo_hi: {
        title: "The warm improviser",
        body: "You are warm, cooperative, and spontaneous, easy to be around and quick to help. You care about people and you go with the flow, which makes you flexible, available, and genuinely fun on a team. The risk is that kindness plus loose follow-through can quietly cost you. You say yes because you hate to disappoint, then details and deadlines slip, and the people you most wanted to serve end up let down. Your reputation is built on kept promises, so protect it by promising less. Keep one list you check each morning, wait before saying yes to anything longer than a week, and pair with a detail-strong friend on the commitments that truly matter.",
      },
      lo_lo: {
        title: "The free agent",
        body: "You are independent and unstructured, comfortable doing your own thing your own way. You do not need a plan or a crowd, you question easily, and you move without waiting for permission. That self-reliance can be a real asset in pioneering, frontline work where rigid planners struggle. The risk is that low follow-through plus a low need for others can leave you isolated and quietly unreliable. Loose ends pile up, and people are not sure they can count on you or reach you. You were not made to walk alone. Build a little scaffolding, one list, one deadline someone else can see, and let two or three people all the way in to share both the load and the accountability.",
      },
    },
  },
  CES: {
    a: "C", b: "ES",
    quads: {
      hi_hi: {
        title: "The steady anchor",
        body: "You are disciplined and calm, the person a team leans on when everything is shaking. You plan well, you follow through, and pressure does not knock you off your feet, so you become the dependable center others organize around. In crisis and over the long haul, this is invaluable. The quiet risk is two-fold. Your calm can miss the emotional weather around you, and your discipline can push you past limits you barely feel until your body complains. Calm, driven people burn out quietly. Check your own tank on a schedule, not just when you crash. And when someone is struggling, lead with understanding before the plan, because your steadiness can read as coldness to a hurting heart.",
      },
      hi_lo: {
        title: "The driven worrier",
        body: "You hold high standards and you feel the weight of them keenly. You plan carefully, you follow through, and part of your engine is a real anxiety about getting it wrong or letting people down. That concern makes you conscientious and prepared, and it can also make you very hard on yourself. The tension is that perfectionism plus a sensitive alarm system can curdle into overwork, sleeplessness, and shame. Struggling with anxiety is not weak faith. Write your worries down and sort them into act, pray, or release. Aim for good rather than flawless, build real margin into every plan, and if the pressure regularly disrupts your sleep or health, talking with a doctor or counselor is wise stewardship.",
      },
      lo_hi: {
        title: "The unhurried soul",
        body: "You are relaxed and steady, low on both drive and worry. Deadlines do not haunt you, setbacks do not linger, and you carry an easy, unpressured calm that settles the people around you. In an anxious, hurried world that peace is a genuine gift. The risk is that low urgency plus a quiet alarm system can let important things drift right past you. You may underestimate real risks and let commitments slide simply because nothing feels pressing. Borrow a little structure so your calm does not become neglect. Put the few things that truly matter on a calendar with reminders, and invite a more driven or watchful friend to flag what your easygoing nature tends to miss.",
      },
      lo_lo: {
        title: "The overwhelmed improviser",
        body: "You are spontaneous and you feel stress intensely, a combination that can leave you scattered when too much lands at once. You would rather stay flexible than work a plan, but without one, pressure piles up and can quickly feel like too much. Be gentle with yourself here. This is not a character flaw, it is a wiring that needs the right supports. The remedy is not to become a rigid planner overnight. It is small anchors: one short daily list so nothing lives only in your head, honest rhythms of prayer and rest that you keep even when busy, and one or two people who help you sort what is urgent from what only feels urgent. Start with the very next step.",
      },
    },
  },
  EA: {
    a: "E", b: "A",
    quads: {
      hi_hi: {
        title: "The warm connector",
        body: "You are outgoing and kind, the person who lights up a room and makes everyone in it feel welcome. You build relationships fast, you assume the best about people, and you love bringing folks together. Hospitality, welcome, and pastoral warmth flow naturally from you. The tension is that both traits make it hard to say no, and hard to have the difficult conversation. You overcommit because you love people and hate to disappoint them, and you can soften a hard truth until it loses its meaning. Real love is sometimes a clear no or an honest word. Protect your margin so warmth does not become depletion, and practice speaking the truth kindly instead of avoiding it to keep the peace.",
      },
      hi_lo: {
        title: "The bold voice",
        body: "You are outgoing and direct, a strong presence who says what needs saying and is not afraid of the pushback. You energize a room and you will name the hard thing out loud, which makes you a natural at rallying people and confronting what others tiptoe around. The edge is that a commanding voice plus a low need to please can steamroll. You can dominate a meeting, win the argument, and bruise people without noticing. Strength like yours opens doors, but tenderness keeps them open. Speak last sometimes and draw out the quiet ones by name. Before you press your point, ask whether you need to win this or just be heard, and let people see the loyalty under the directness.",
      },
      lo_hi: {
        title: "The gentle listener",
        body: "You are quiet and kind, a gentle, safe presence people open up to. You listen well, you assume the best, and you carry a warmth that does not need a stage. In one-on-one care, counseling, and quiet discipleship, this is a deep gift, and people feel genuinely heard by you. The risk is that reserve plus a hunger to keep peace can leave you overlooked and overextended at once. You avoid necessary conflict, you say yes when you mean no, and you can carry burdens alone in silence. Your voice matters as much as your listening. Share your thinking early so it shapes decisions, decide your no in advance, and let two or three people all the way in.",
      },
      lo_lo: {
        title: "The solitary straight-shooter",
        body: "You are reserved and direct, independent in both your company and your opinions. You keep a small circle, you say things plainly, and you are immune to flattery, which makes you a clear-eyed truth-teller who is not swayed by the crowd. Ministry needs that honesty. The risk is that few relationships plus a blunt style can leave you isolated and easily misread as cold. You can wound without noticing and carry hard things alone because asking for help does not come naturally. People bruise easier than problems, and you were not made to walk solo. Add one specific, unprompted encouragement to each day, and choose two or three people to let past your guard and share the load.",
      },
    },
  },
  EES: {
    a: "E", b: "ES",
    quads: {
      hi_hi: {
        title: "The confident presence",
        body: "You are outgoing and calm, an assured, non-anxious presence that draws people and steadies them at the same time. You work a room with ease, you handle pressure without flinching, and congregations borrow courage from your composure. That is a strong platform for leadership. The quiet risks come in pairs. Your energy plus your steadiness can make you talk more than you listen and miss the emotional undercurrents around you, and both can be mistaken for spiritual authority. Public confidence without private devotion is a slow leak. Guard your secret life with God the way Jesus withdrew to lonely places, listen for the quiet feelings under a room, and let your calm invite people in rather than out-talk them.",
      },
      hi_lo: {
        title: "The expressive feeler",
        body: "You are outgoing and you feel deeply, so your emotions are right on the surface and easy for everyone to read. You bring warmth, expressiveness, and a contagious aliveness, and people connect with you because you are so genuinely present and unguarded. The tension is that high energy plus strong emotion can swing the tone of a whole team without you realizing, and criticism can land hard and linger. Your moods are a gift when you lead them and a burden when they lead you. Build honest rhythms that steady you, name your top stress signals and tell someone close to watch for them, and debrief the hard ministry moments within a week, with God and with a trusted friend.",
      },
      lo_hi: {
        title: "The quiet steady one",
        body: "You are reserved and calm, a low-key, unflappable presence that asks for little attention and gives a lot of stability. You think before you speak, you keep your head under pressure, and people trust the weight of what you say precisely because you do not say much. This is quiet ballast a team can build on. The risk is that reserve plus steadiness can make you nearly invisible, overlooked in loud rooms and slow to show what a moment costs you. Your depth is needed, and so is your face. Take one stretching public assignment a season with real prep time, share your insight early in meetings, and check your own tank now and then, because steady people burn out quietly.",
      },
      lo_lo: {
        title: "The tender introvert",
        body: "You are quiet and sensitive, with a rich inner world and a small circle you hold close. You feel things deeply and process them inwardly, which often shows up as real depth in prayer, study, and one-on-one care. People trust your gentleness and the substance behind your few words. The tension is that reserve plus reactivity can pull you into isolation, carrying heavy feelings alone where they grow heavier. Being overlooked can sting, and you may withdraw further when you are hurting. You were not made to walk alone. Choose two or three people to let all the way in, prepare for the public moments that drain you and rest after them, and anchor the tender days in steady, kept rhythms with God.",
      },
    },
  },
  AES: {
    a: "A", b: "ES",
    quads: {
      hi_hi: {
        title: "The steady shepherd",
        body: "You are warm and calm, a compassionate, non-anxious presence, which is close to the ideal pastoral heart. You care deeply and you do not panic, so people feel both loved and safe with you, and you can walk with someone through a crisis without adding your own alarm to theirs. The tension is subtler than most. Your kindness plus your steadiness can make you slow to confront and slow to feel the urgency in a situation, so problems fester while everyone stays comfortable. Peacemaking is not the same as peacekeeping. Have the hard conversation you have been postponing, take some threats seriously on evidence rather than on how calm you feel, and let others own the responsibilities you are tempted to smooth over.",
      },
      hi_lo: {
        title: "The porous heart",
        body: "You are compassionate and deeply feeling, someone who not only notices another person's pain but absorbs it. That tender porousness makes you a gifted comforter, the wounded healer people seek out because you truly feel with them. It is a real gift for mercy and care ministry. The tension is that high empathy plus high sensitivity can leave you flooded, carrying everyone's burdens home and running dry. You may read neutral feedback as rejection and struggle to tell your feelings from the facts. Boundaries are not unkindness, they are what let you serve for the long haul. Take small, steady steps of compassion rather than heroic ones, keep honest rhythms of rest and prayer, and let a trusted friend help you set the pain down.",
      },
      lo_hi: {
        title: "The cool challenger",
        body: "You are direct and calm, cool under fire, the person who can deliver hard news and hold a hard line without losing composure. You are not swayed by flattery or rattled by conflict, so you make tough calls cleanly and stay clear-headed when others get emotional. In crisis and in negotiation, that is a real strength. The edge is that bluntness plus low reactivity can read as cold, even harsh, to people who are hurting. You can miss the emotional weather entirely and solve when someone needed to be understood first. Slow down and soften the delivery. When someone shares a worry, respond first with understanding, not a fix, and let people see the care underneath your steadiness.",
      },
      lo_lo: {
        title: "The sharp reactor",
        body: "You are direct and you feel things intensely, a combination that makes you honest and quick to speak, but also quick to spark under pressure. You say what others only think, and when you are stressed it can come out sharper than you mean. Your candor is valuable, and your reactivity is worth watching. Under strain, bluntness plus strong emotion can wound people and leave you carrying regret. The remedy is not to go silent, it is to build in a pause. Before you deliver a hard word, name what you are feeling, out loud to yourself or to God, and let it settle first. Add one genuine encouragement to each day, and recruit a truth-teller who can flag when the sharpness is talking louder than the truth.",
      },
    },
  },
};

export function big5Interactions(traits) {
  const byKey = {};
  for (const t of traits || []) {
    if (t && t.key) byKey[t.key] = t;
  }
  const results = [];
  for (const pairName of Object.keys(BIG5_PAIRS)) {
    const pair = BIG5_PAIRS[pairName];
    const a = byKey[pair.a];
    const b = byKey[pair.b];
    if (!a || !b) continue;
    const aExtreme = a.band === "high" || a.band === "low";
    const bExtreme = b.band === "high" || b.band === "low";
    if (!aExtreme || !bExtreme) continue;
    const quadKey =
      (a.band === "high" ? "hi" : "lo") + "_" + (b.band === "high" ? "hi" : "lo");
    const quad = pair.quads[quadKey];
    if (!quad) continue;
    const extremity =
      Math.abs((a.pct || 0) - 50) + Math.abs((b.pct || 0) - 50);
    results.push({
      pairName,
      aName: BIG5_NAME[pair.a],
      bName: BIG5_NAME[pair.b],
      title: quad.title,
      body: quad.body,
      extremity,
    });
  }
  results.sort((x, y) => y.extremity - x.extremity);
  return results.slice(0, 3).map((r) => ({
    pairName: r.pairName,
    aName: r.aName,
    bName: r.bName,
    title: r.title,
    body: r.body,
  }));
}

/* ------------------------------------------------------------------ */
/* 2. GIFT CONSTELLATIONS                                              */
/* ------------------------------------------------------------------ */

// Display names for the 25 gifts, used by the fallback stitcher.
const GIFT_NAMES = {
  A: "Prophecy", B: "Pastor", C: "Teaching", D: "Wisdom", E: "Knowledge",
  F: "Exhortation", G: "Discerning of Spirits", H: "Giving", I: "Helps",
  J: "Mercy", K: "Missionary", L: "Evangelist", M: "Hospitality", N: "Faith",
  O: "Leadership", P: "Administration", Q: "Miracles", R: "Healing",
  S: "Tongues", T: "Interpretation", U: "Voluntary Poverty", V: "Singleness",
  W: "Intercession", X: "Exorcism", Y: "Service",
};

// One warm clause per gift, stitched into the fallback paragraph.
export const GIFT_FRAGMENTS = {
  A: "a prophet's edge for the truth",
  B: "a pastor's long faithfulness",
  C: "a teacher's clarity",
  D: "a discerning, God-angled wisdom",
  E: "a hunger to understand and explain",
  F: "an encourager's timely word",
  G: "an eye for what is really going on",
  H: "a giver's open hand",
  I: "a helper's ready hands",
  J: "a heart quick to feel another's pain",
  K: "a heart for the nations",
  L: "a bent toward the lost",
  M: "a welcoming, open door",
  N: "a faith that trusts God past the obstacle",
  O: "a leader's pull toward a goal",
  P: "an organizer's steady systems",
  Q: "an expectancy that God will move",
  R: "a channel for God's healing",
  S: "a Spirit-given prayer language",
  T: "an ear that makes a message plain",
  U: "a freedom to live simply for the kingdom",
  V: "a singleness given to focused service",
  W: "an intercessor's staying power in prayer",
  X: "a boldness to confront the darkness",
  Y: "a servant's eye for the unmet need",
};

export const GIFT_CONSTELLATIONS = {
  // --- Three-letter themes ---
  CDE: {
    name: "The Equipper",
    body: "You are wired to make people wiser. Teaching gives you the ability to open Scripture so others actually learn, wisdom lets you see a situation from God's angle and offer a Spirit-led way forward, and knowledge drives you to dig until the truth is clear. Together they make you an equipper, the person a church leans on to ground its people and steady its decisions. You do not just inform, you form. Others leave your teaching with something they can live on. The watch is that all three gifts live in the head, and depth can quietly become distance. Truth is meant to be lived, not just understood. Keep teaching close to real people and real obedience, and let your study lead you back to worship, not just to more answers.",
    fits: ["Bible teaching and discipleship curriculum", "An advisory or elder role where sound counsel matters"],
    watch: "Guard against loving the study more than the people you are studying for.",
    verse: "2 Timothy 2:15",
  },
  IJM: {
    name: "The Servant Heart",
    body: "You meet needs before anyone announces them. Helps puts your hands to work behind the scenes, mercy makes you feel the pain of the hurting and move toward it, and hospitality turns your presence and your home into a place where people feel safe and cared for. Together they form a servant heart, the quiet engine of a healthy church. You are the one who notices the person on the edge of the room and the practical need no one else caught. Much of your best work is never seen, and that is its glory. The watch is depletion. A heart this open gives until it is empty and rarely asks for anything back. Set gentle boundaries, let others serve you too, and remember you are loved for who you are, not only for what you do.",
    fits: ["Care, visitation, and benevolence ministry", "Hospitality and welcome for newcomers and guests"],
    watch: "Your open heart can pour out until it runs dry, so guard your own margin.",
    verse: "1 Peter 4:9-10",
  },
  BFJ: {
    name: "The Shepherd's Care",
    body: "You are built to walk with people over the long haul. The pastor in you takes real, lasting responsibility for others, exhortation gives you the timely word that comforts and steadies, and mercy makes you feel their pain as your own. Together they make a shepherd, someone who does not just lead people but tends them. You stay when others leave, you notice the wound behind the behavior, and you speak the encouragement that keeps a person going. This is deep, patient work. The watch is that carrying people this closely can blur the line between their burdens and yours, and avoiding a hard truth can start to feel like kindness. Love sometimes says the difficult thing. Keep your own soul fed, and let the Good Shepherd carry the ones you cannot.",
    fits: ["Small group shepherding and pastoral care", "Mentoring and long-term discipleship"],
    watch: "Carrying people closely can leave you without margin, so tend your own soul first.",
    verse: "1 Peter 5:2",
  },
  LNO: {
    name: "The Pioneer",
    body: "You are wired to go first. Evangelism gives you a heart for people far from God and the ability to draw them in, faith lets you trust God past the obstacle when the outcome is not yet visible, and leadership rallies others toward a goal worth building. Together they make a pioneer, the kind of person who starts things that did not exist before. You see a field others call empty and believe it can become a harvest. Church planting, outreach, and new ministry come alive under you. The watch is that vision and drive can outrun the people and the details. A pioneer without a team is just someone walking fast alone. Bring others into ownership early, pair with a strong administrator, and keep your faith anchored in God rather than in your own momentum.",
    fits: ["Church planting and new ministry launch", "Outreach and evangelistic leadership"],
    watch: "Your vision can outrun your team, so hand real ownership to others early.",
    verse: "Romans 10:14-15",
  },
  NOP: {
    name: "The Vision Builder",
    body: "You both dream and build. Faith lets you believe God for more than the current reality, leadership gathers people around that vision, and administration turns it into a plan that actually gets done. Together they make a vision builder, rare because most people have one of these and not all three. You can see the future, cast it compellingly, and then organize the steps, budgets, and people to reach it. Ministries move forward under leaders like you. The watch is that turning vision into machinery can slowly crowd out the people it was meant to serve. Plans are for people, not the other way around. Before your next big push, ask one person how it is affecting them, and keep your faith fixed on God as the one who gives the growth.",
    fits: ["Directing a ministry or major initiative", "Turning vision into workable plans and systems"],
    watch: "In building the machine, do not lose the people it was built to serve.",
    verse: "Nehemiah 2:17-18",
  },
  AFW: {
    name: "The Prophetic Intercessor",
    body: "You hear from God for the sake of others. Prophecy gives you a sharpened sense of God's heart and the courage to speak it, exhortation shapes that word into comfort and challenge people can receive, and intercession keeps you in the place of prayer where such things are born. Together they make a prophetic intercessor, someone who carries people to God and God's word back to people. You sense what is really going on, and you pray it through before you ever speak it. The watch is that this kind of sensitivity can grow heavy and isolating, and a hard word delivered without love wounds rather than heals. Test what you sense with mature believers, wrap every word in genuine care, and guard your own rest so the burden does not crush the carrier.",
    fits: ["Prayer and intercession ministry", "Prophetic encouragement under accountable leadership"],
    watch: "Test what you sense with mature believers, and never let a hard word outrun love.",
    verse: "1 Corinthians 14:3",
  },
  GWX: {
    name: "The Deliverer",
    body: "You are wired for the frontlines of the unseen battle. Discernment lets you tell what is truly of God from what only claims to be, intercession keeps you covered and persistent in prayer, and the gift for deliverance gives you authority to confront darkness in Jesus' name and set people free. Together they make a deliverer, someone God uses to bring freedom where others sense only that something is wrong. This is holy, serious work. The watch is that it must never be done alone or in your own strength. Pride, isolation, and fear are real dangers here. Always serve under mature spiritual covering, saturate your mind with Scripture, and give every victory to Jesus, whose authority, not yours, does the work.",
    fits: ["Deliverance and freedom ministry under covering", "Intercession and spiritual warfare teams"],
    watch: "Never do this work alone or in your own strength, always under mature covering.",
    verse: "Luke 10:19-20",
  },
  QRW: {
    name: "The Healing Presence",
    body: "You expect God to move, and you stay in prayer until He does. The gift for miracles makes you a vessel for what defies natural explanation, healing makes you a channel for God's restoring work in body, mind, and spirit, and intercession keeps you pressing in when the answer is slow. Together they make a healing presence, someone people bring their impossible situations to. You carry an unusual expectancy that God is still the God who acts. The watch is guarding your heart when healing does not come as hoped. God is good whether or not the miracle arrives, and the glory is always His, never yours. Stay compassionate toward those still waiting, give Him every result, and keep your own trust anchored in His character, not in outcomes.",
    fits: ["Prayer and altar ministry", "Hospital visitation and healing services"],
    watch: "Guard your heart when healing does not come, and give God the glory either way.",
    verse: "James 5:14-16",
  },
  HIY: {
    name: "The Quiet Backbone",
    body: "You keep the whole thing running, usually without being seen. Giving opens your hand to fund the work with cheerful generosity, helps puts your effort behind other people's ministry so they can flourish, and service gives you an eye for the practical need and the will to meet it. Together they make the quiet backbone of a church, the people every ministry depends on and few think to thank. You would rather get it done than get the credit. The watch is that unseen faithfulness can slide into being taken for granted, and you can pour out so steadily that you forget you have limits too. Serve from fullness, not fumes. Let leaders know how you are actually doing, and receive thanks when it comes instead of deflecting it.",
    fits: ["Behind-the-scenes operations and logistics", "Stewardship and generous giving"],
    watch: "Quiet faithfulness can be taken for granted, so serve from fullness and name your limits.",
    verse: "Galatians 6:9-10",
  },
  KLM: {
    name: "The Sent One",
    body: "You are made to cross lines and bring people in. The missionary in you carries the gospel across cultures and comfort zones, the evangelist shares Christ in a way that draws people to actually follow, and hospitality turns your welcome into the first place a stranger feels they belong. Together they make a sent one, someone who both goes out and gathers in. You see no border as final and no person as beyond reach. The watch is that a heart this outward can neglect its own roots, and constant giving to those far off can leave those closest to you underfed. Sustainable mission is fed by deep devotion and honest community. Learn the culture before you build for it, guard your walk with God, and let the people nearest you receive your love too.",
    fits: ["Cross-cultural mission and church planting", "Outreach and welcoming ministry to newcomers"],
    watch: "A heart turned outward can starve its own roots, so guard your devotion and closest relationships.",
    verse: "Acts 1:8",
  },
  ABC: {
    name: "The Preaching Shepherd",
    body: "You speak for God and stay to tend the people you speak to. Prophecy gives your words weight and conviction, the pastor in you takes lasting responsibility for the flock, and teaching lets you open Scripture so people truly learn. Together they make a preaching shepherd, someone who does not just deliver a message and leave but feeds the same people over years. Your preaching is not performance, it is care with a pulpit. The watch is the weight of it. Carrying conviction, responsibility, and instruction all at once can leave you running on empty and hard on yourself when people do not respond. You are a shepherd, not the Savior. Keep your own soul fed, preach grace to yourself first, and let God grow what you can only plant.",
    fits: ["Preaching and pulpit ministry", "Lead or associate pastoral roles"],
    watch: "Carrying conviction and care together can drain you, so preach grace to yourself first.",
    verse: "2 Timothy 4:2",
  },
  BCF: {
    name: "The Discipler",
    body: "You are built to grow people up in the faith. The pastor in you commits to them for the long haul, teaching gives you the clarity to open truth, and exhortation gives you the timely word that keeps them moving when they want to quit. Together they make a discipler, the person who patiently walks someone from where they are to maturity in Christ. You do not just transfer information, you form character. Real change happens in the kind of steady relationship you offer. The watch is that pouring into a few can quietly become carrying them, and encouragement can soften into never challenging. Growth needs truth as well as comfort. Keep speaking the honest word in love, let people own their own walk, and trust the Spirit to do what your investment cannot.",
    fits: ["One-on-one and small group discipleship", "Mentoring emerging leaders"],
    watch: "Encouragement without honest challenge stalls growth, so keep speaking truth in love.",
    verse: "Colossians 1:28",
  },
  FJM: {
    name: "The Comforter",
    body: "You are the safe place people come to when they are hurting. Exhortation gives you the word that steadies a shaking heart, mercy makes you feel their pain and move toward it, and hospitality gives them a warm, unhurried space to be honest. Together they make a comforter, someone God uses to bind up the wounded. People feel genuinely met by you, not fixed or rushed, just cared for. That ministry of presence is rarer and more powerful than it looks. The watch is that absorbing this much pain can flood you, and comfort can become avoidance of the harder truth someone also needs. Care sometimes includes a challenge. Keep boundaries that let you serve long-term, hand the burdens to God in prayer, and do not carry alone what only He can hold.",
    fits: ["Care, grief, and recovery ministry", "Hospitality that creates safe space for the hurting"],
    watch: "Absorbing others' pain can flood you, so set the burden down with God in prayer.",
    verse: "2 Corinthians 1:3-4",
  },
  STW: {
    name: "The Prayer Warrior",
    body: "You are wired for the deep place of prayer. The gift of tongues gives you a Spirit-led prayer language when words run out, interpretation lets you make a message plain so the church is built up, and intercession keeps you faithful in the long, hidden work of praying for others. Together they make a prayer warrior, someone whose real ministry happens where no one sees, on your knees. You carry burdens to God that others do not even know to name, and you often see specific answers. The watch is that a life this hidden can grow isolated, and unusual gifts can breed either pride or self-doubt. Stay tethered to a community and to Scripture, submit what you sense to leadership, and remember the goal is always to build others up, not to stand apart.",
    fits: ["Intercessory prayer teams and prayer leadership", "Serving in Spirit-led worship and prayer gatherings"],
    watch: "A hidden prayer life can drift into isolation, so stay tethered to community and Scripture.",
    verse: "1 Corinthians 14:13",
  },
  CEK: {
    name: "The Cross-Cultural Teacher",
    body: "You are made to carry truth across borders. Teaching lets you open Scripture so people learn, knowledge drives you to study until it is clear and accurate, and the missionary in you can do all of that in a second culture, crossing language and custom for the sake of Christ. Together they make a cross-cultural teacher, someone who can ground new believers far from where the gospel is familiar. You do not just know the truth, you can translate it into a world that has never heard it. The watch is that depth of content can outrun sensitivity to people, and a teacher far from home can grow weary and isolated. Learn the culture as humbly as you teach it, keep the truth tied to real relationships, and guard your own walk and your own rest.",
    fits: ["Cross-cultural teaching and discipleship training", "Curriculum and theological instruction on the field"],
    watch: "Content can outrun cultural sensitivity, so learn the people as humbly as you teach them.",
    verse: "Matthew 28:19-20",
  },
  // --- Two-letter themes (fallback matches for close pairs) ---
  OP: {
    name: "The Organizer",
    body: "You turn vision into reality. Leadership gives you the pull toward a God-honoring goal and the ability to move people toward it, and administration gives you the systems to actually get there, breaking a big dream into steps, roles, and timelines that work. Together they make an organizer, the person who does not just decide where to go but builds the path to get there. Ministries thrive on this pairing because vision without execution stays a wish. The watch is that in driving the plan you can run over the people the plan is for, and efficiency can quietly become the goal. Slow down enough to check how the push is landing on your team, prioritize by God's purposes and not just what is measurable, and lead with a humility that invites feedback.",
    fits: ["Ministry director or executive leadership", "Project and operations management"],
    watch: "Do not run over people in pursuit of the plan, the plan exists to serve them.",
    verse: "1 Corinthians 14:40",
  },
  JM: {
    name: "The Open Door",
    body: "You make people feel they belong. Mercy gives you a heart that feels others' pain and moves toward it, and hospitality gives you the instinct to open your space and your table so the hurting have somewhere warm to land. Together they make an open door, the person a lonely or wounded stranger is quietly drawn to. You notice who is on the edge of the room, and you make sure they are not alone. That welcome preaches the gospel before a word is spoken. The watch is that an open door can wear you thin, and a heart this soft can struggle to say the hard thing or set a needed limit. Boundaries protect the very generosity people rely on. Guard your margin, let others care for you too, and serve for the long haul.",
    fits: ["Welcome, hospitality, and newcomer care", "Compassion and outreach ministry"],
    watch: "An open door can wear you thin, so set the boundaries that let your generosity last.",
    verse: "Hebrews 13:2",
  },
  CD: {
    name: "The Trusted Counsel",
    body: "People bring you their hard questions. Teaching gives you the clarity to open Scripture so others learn, and wisdom lets you see a situation from God's perspective and offer a practical, Spirit-led way forward. Together they make trusted counsel, the person a leader pulls aside before a big decision. You do not just know what is true, you know how it applies right here, right now. That blend of understanding and discernment is exactly what steadies a church through complexity. The watch is that being the wise one can grow isolating, and quiet counsel can become a way to avoid your own hard conversations. Wisdom is meant to be lived, not just dispensed. Stay teachable, keep your own counselors, and put the wisdom you offer to work in your own walk first.",
    fits: ["Advisory, elder, or counseling roles", "Teaching that helps people apply truth wisely"],
    watch: "Being the wise one can isolate you, so keep your own counselors and stay teachable.",
    verse: "James 1:5",
  },
};

function joinList(arr) {
  const a = (arr || []).filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return a[0] + " and " + a[1];
  return a.slice(0, -1).join(", ") + ", and " + a[a.length - 1];
}

export function giftConstellation(topLetters) {
  const letters = (topLetters || [])
    .filter(Boolean)
    .map((x) => String(x).toUpperCase());
  const top3 = letters.slice(0, 3);

  // Exact 3-letter (or fewer) signature match.
  const sig = top3.slice().sort().join("");
  if (GIFT_CONSTELLATIONS[sig]) {
    const c = GIFT_CONSTELLATIONS[sig];
    return { name: c.name, body: c.body, fits: c.fits, watch: c.watch, verse: c.verse, exact: true };
  }

  // Try each sorted 2-letter subset of the top 3.
  const pairs = [];
  for (let i = 0; i < top3.length; i++) {
    for (let j = i + 1; j < top3.length; j++) {
      pairs.push([top3[i], top3[j]].sort().join(""));
    }
  }
  for (const p of pairs) {
    if (GIFT_CONSTELLATIONS[p]) {
      const c = GIFT_CONSTELLATIONS[p];
      return { name: c.name, body: c.body, fits: c.fits, watch: c.watch, verse: c.verse, exact: true };
    }
  }

  // Graceful fallback: stitch the top-3 names and fragments into a warm paragraph.
  const names = top3.map((l) => GIFT_NAMES[l]).filter(Boolean);
  const frags = top3.map((l) => GIFT_FRAGMENTS[l]).filter(Boolean);
  let body;
  if (names.length === 0) {
    body =
      "Your gifts come together in a way that is uniquely yours. Whatever the exact mix, God has wired you to build up the body of Christ, and He gives each one a manifestation of the Spirit for the common good.";
  } else {
    body =
      "Your strongest gifts, " +
      joinList(names) +
      ", form a blend all your own. In you they show up as " +
      joinList(frags) +
      ", and the body of Christ is stronger because you bring them together in one person.";
  }
  return {
    name: "A Blend of Your Own",
    body,
    fits: [
      "Serving where your top gifts naturally overlap",
      "A role shaped around this particular blend, not a generic slot",
    ],
    watch: "With several strong gifts, guard against spreading yourself so thin that none of them goes deep.",
    verse: "1 Corinthians 12:7",
    exact: false,
  };
}

/* ------------------------------------------------------------------ */
/* 3. ENNEAGRAM DYNAMICS (wings + arrows)                              */
/* ------------------------------------------------------------------ */

export const ENNEAGRAM_DYNAMICS = {
  "1": {
    wings: {
      "9": {
        label: "1w9 - The Idealist",
        body: "With a Nine wing, your conviction runs quieter and cooler. You still hold high standards, but you carry them with more calm and detachment, preferring principle over confrontation. You are the steady, thoughtful reformer who would rather model the right way than argue for it. The gift is a settled, non-anxious integrity. The growth is not letting your desire for peace bury the honest word that needs saying.",
      },
      "2": {
        label: "1w2 - The Advocate",
        body: "With a Two wing, your sense of right and wrong turns outward and warm. You do not just want things to be correct, you want to help people, and you feel the reformer's fire on behalf of others. This makes you a passionate advocate for what is good. The gift is conviction married to compassion. The growth is watching that helping does not curdle into criticism when people fall short of your standards.",
      },
    },
    arrows: {
      growth: {
        toward: "7",
        body: "In health, you move toward the Seven. The grip of the inner critic loosens, and you rediscover joy, spontaneity, and play. You learn that goodness is not only earned through effort but received as a gift, and you let yourself enjoy life instead of only improving it. Rest starts to feel like trust rather than laziness. Give yourself real permission to delight in what God has already made good, without a to-do list attached.",
      },
      stress: {
        toward: "4",
        body: "Under stress, you move toward the unhealthy Four. The critic turns inward and moods darken, and you can slide into feeling misunderstood, resentful, and quietly wronged. Small failures feel like proof that something is deeply off with you or with everyone else. When you notice this, name it as a sign you are depleted, not a revelation of truth. Step back, rest, and let grace be as real as your standards. You are loved before you are useful.",
      },
    },
  },
  "2": {
    wings: {
      "1": {
        label: "2w1 - The Servant",
        body: "With a One wing, your care comes with conscience and structure. You help out of a sense of duty as much as warmth, and you hold yourself to a high standard of doing right by people. This makes you a principled, dependable servant. The gift is love with backbone. The growth is easing the guilt that tells you you can never do quite enough, and letting your service flow from fullness rather than obligation.",
      },
      "3": {
        label: "2w3 - The Host",
        body: "With a Three wing, your warmth becomes charming, ambitious, and outward. You love connecting people and you shine when you are helping in a visible, appreciated way. This makes you a magnetic host and encourager. The gift is warmth with drive. The growth is noticing when helping becomes a way to be admired, and letting yourself be loved for who you are, not only for what you offer others.",
      },
    },
    arrows: {
      growth: {
        toward: "4",
        body: "In health, you move toward the Four. You turn inward and finally tend to your own heart, honestly naming your needs and feelings instead of burying them under everyone else's. You give yourself the same permission to be cared for that you give others. This is not selfishness, it is the honesty that keeps love sustainable. Let yourself sit still long enough to be filled by God before you pour out again.",
      },
      stress: {
        toward: "8",
        body: "Under stress, you move toward the unhealthy Eight. The warmth can flip to sudden force, and years of quietly kept score can spill out as anger or control. You may become demanding of the very people you serve, hurt that your love was not returned in kind. When you feel this rising, it is a signal you have given past empty. Step back, admit your own needs plainly, and receive care before resentment makes the choice for you.",
      },
    },
  },
  "3": {
    wings: {
      "2": {
        label: "3w2 - The Charmer",
        body: "With a Two wing, your drive comes wrapped in warmth. You succeed by connecting with people, and you genuinely want to help even as you achieve. This makes you an engaging, relational achiever who lifts others while you climb. The gift is excellence with heart. The growth is making sure the warmth is real and not a performance, and letting people see you when you are not succeeding.",
      },
      "4": {
        label: "3w4 - The Professional",
        body: "With a Four wing, your ambition carries more depth and introspection. You want your work to mean something, not just to impress, and you feel the pull toward authenticity beneath the drive to achieve. This makes you a serious, substantive professional. The gift is success with soul. The growth is not letting comparison and self-doubt undercut the good you are actually doing.",
      },
    },
    arrows: {
      growth: {
        toward: "6",
        body: "In health, you move toward the Six. You stop performing long enough to be loyal, honest, and committed to something bigger than your own image. You invest in people and causes for their sake, not the applause, and you let yourself be part of a team rather than the star of it. Take one honest step this week where you are known rather than admired, and rest in being a beloved child before you are a successful one.",
      },
      stress: {
        toward: "9",
        body: "Under stress, you move toward the unhealthy Nine. The engine that always runs suddenly stalls, and you go numb, checking out, avoiding, and losing the drive that usually defines you. Exhaustion masquerades as apathy. When this hits, it is your soul telling you the pace was never sustainable. Stop striving and let yourself simply be, without producing anything. Your worth was never in the output, it was settled before you did a single thing.",
      },
    },
  },
  "4": {
    wings: {
      "3": {
        label: "4w3 - The Aristocrat",
        body: "With a Three wing, your depth comes with drive and polish. You want to turn your inner world into something beautiful and seen, and you carry both sensitivity and ambition. This makes you an expressive, image-aware creative. The gift is emotional honesty with the energy to share it. The growth is not measuring your insides against everyone else's outsides, and not needing to be extraordinary to be enough.",
      },
      "5": {
        label: "4w5 - The Bohemian",
        body: "With a Five wing, your feeling turns inward and thoughtful. You process deeply, guard your privacy, and are drawn to ideas as much as emotions. This makes you an original, quietly intense thinker. The gift is depth paired with perception. The growth is coming out of your inner world to share yourself with people, before you feel fully ready or fully understood.",
      },
    },
    arrows: {
      growth: {
        toward: "1",
        body: "In health, you move toward the One. Feelings stop being the final word, and you get grounded in principle and action. You do the good, steady thing whether or not the mood is there, and you discover a calm that your emotions alone never gave you. Structure becomes a friend, not a cage. Name three ordinary gifts God has already given you, and let ordinary faithfulness carry you on the flat days.",
      },
      stress: {
        toward: "2",
        body: "Under stress, you move toward the unhealthy Two. To escape the ache of feeling misunderstood, you can over-focus on others, becoming clingy, needy, or given to helping in order to be needed. You lose yourself trying to secure a connection. When you notice this, it is a sign you have drifted from your own center. Come back to God, who already sees and settles your identity, and let that steady you before you reach for someone else to fill the gap.",
      },
    },
  },
  "5": {
    wings: {
      "4": {
        label: "5w4 - The Iconoclast",
        body: "With a Four wing, your thinking carries feeling and originality. You are drawn not just to information but to meaning, and you often see the world from an angle no one else does. This makes you a creative, unconventional thinker. The gift is depth of insight with a soul behind it. The growth is not retreating so far into your inner world that people can never reach you.",
      },
      "6": {
        label: "5w6 - The Problem Solver",
        body: "With a Six wing, your analysis turns practical and loyal. You want to understand so you can build something reliable, and you commit to the people and systems you trust. This makes you a grounded, dependable investigator. The gift is careful thought put to real use. The growth is trusting God and people before you feel fully prepared, and not letting worst-case thinking rule.",
      },
    },
    arrows: {
      growth: {
        toward: "8",
        body: "In health, you move toward the Eight. You stop merely observing and step into the arena, acting decisively and taking up space with confidence. The knowledge you have gathered becomes courage put to work. You lead instead of only analyzing, and you find that you have more than enough to give. Move toward people and toward God before you feel completely ready, and let your competence become service rather than a wall.",
      },
      stress: {
        toward: "7",
        body: "Under stress, you move toward the unhealthy Seven. The careful mind scatters, and you can flee into distraction, restless activity, or a swirl of ideas to escape feeling overwhelmed and depleted. Focus fragments right when you need it. When this happens, it is a sign your reserves are gone. Withdraw briefly and on purpose to refill, then return, rather than numbing out. God is not only understood, He is trusted and enjoyed, and you have enough.",
      },
    },
  },
  "6": {
    wings: {
      "5": {
        label: "6w5 - The Defender",
        body: "With a Five wing, your loyalty comes with study and self-reliance. You handle fear by understanding threats deeply and preparing thoroughly, and you commit to a trusted few. This makes you a thoughtful, steady defender. The gift is faithfulness backed by real substance. The growth is not letting analysis and worst-case planning wall you off from the people and the God who actually hold you.",
      },
      "7": {
        label: "6w7 - The Buddy",
        body: "With a Seven wing, your faithfulness comes with warmth and humor. You cope with anxiety by staying connected and keeping things light, and you are engaging and fun even under pressure. This makes you a loyal, likable companion. The gift is commitment with joy. The growth is not using activity and good cheer to outrun the fears you would rather not face directly.",
      },
    },
    arrows: {
      growth: {
        toward: "9",
        body: "In health, you move toward the Nine. The anxious mind quiets, and you settle into a trusting, peaceful steadiness. You stop scanning for the next threat and rest in the God who actually holds you. Courage grows, not because the dangers vanished, but because you know the floor is Him and He does not move. When worry rises this week, name it as a prayer and hand tomorrow's what-ifs back to the One already there.",
      },
      stress: {
        toward: "3",
        body: "Under stress, you move toward the unhealthy Three. Anxiety drives you into overwork and image management, trying to outrun fear by proving yourself through frantic activity and appearance. You get busy to feel secure. When you catch this, it is a sign fear is running the show. Slow down and remember that your security was never in your performance or your plan. It is in the Shepherd who holds you when the ground feels unsure.",
      },
    },
  },
  "7": {
    wings: {
      "6": {
        label: "7w6 - The Entertainer",
        body: "With a Six wing, your enthusiasm comes with loyalty and a little more caution. You love fun and possibility, but you also care about the people and commitments around you, and you are more grounded than the average Seven. This makes you a warm, engaging, and dependable presence. The gift is joy with faithfulness. The growth is not letting anxiety hide behind constant activity and good cheer.",
      },
      "8": {
        label: "7w8 - The Realist",
        body: "With an Eight wing, your energy comes with drive and boldness. You do not just imagine possibilities, you go after them hard, and you bring assertive force to your optimism. This makes you a powerful, get-it-done enthusiast. The gift is vision with muscle. The growth is not using speed and intensity to steamroll people or to avoid slowing down for what actually hurts.",
      },
    },
    arrows: {
      growth: {
        toward: "5",
        body: "In health, you move toward the Five. You slow down, go deep, and stay with one thing long enough to master it. The scattered energy focuses, and you discover that presence is richer than novelty. You stop escaping into the next exciting thing and let the current moment be enough. This week, resist the urge to flee a hard feeling. Sit with it, and with God, and find that He meets you there.",
      },
      stress: {
        toward: "1",
        body: "Under stress, you move toward the unhealthy One. The easy optimism hardens into criticism and perfectionism, and you get irritable, rigid, and quick to find fault, especially with others. Joy curdles into judgment. When this shows up, it is a sign you are running from something painful rather than facing it. Stop moving long enough to name what hurts, bring it to God, and let real joy, which can hold sorrow, replace the frantic kind.",
      },
    },
  },
  "8": {
    wings: {
      "7": {
        label: "8w7 - The Maverick",
        body: "With a Seven wing, your strength comes with energy and appetite. You are bold, driven, and eager to make things happen, charging at life with force and enthusiasm. This makes you a dynamic, high-octane leader. The gift is power with vision. The growth is not staying so busy and forceful that you never slow down to let anyone reach the softer place you guard.",
      },
      "9": {
        label: "8w9 - The Bear",
        body: "With a Nine wing, your strength comes with calm. You are powerful but steadier, less quick to explode, protective without needing to dominate every room. This makes you a grounded, approachable challenger, strong and settled at once. The gift is force under control. The growth is not letting your calm become stubbornness, and letting people see the tenderness beneath the steadiness.",
      },
    },
    arrows: {
      growth: {
        toward: "2",
        body: "In health, you move toward the Two. The guard comes down, and your strength turns openly warm and caring. You use your power to nurture rather than only to protect, and you let yourself be tender without feeling exposed. This is not weakness, it is the courage Jesus showed when He washed feet and wept. Let one trusted person see the softer place you usually defend, and lead with heart as well as strength.",
      },
      stress: {
        toward: "5",
        body: "Under stress, you move toward the unhealthy Five. The bold leader withdraws, going quiet, guarded, and detached, retreating to protect yourself from feeling vulnerable or out of control. Strength turns into isolation. When you notice this pulling away, it is a sign you feel unsafe, not that you are better off alone. You do not always have to be the strong one. Let someone in, and remember that God is your protector too.",
      },
    },
  },
  "9": {
    wings: {
      "8": {
        label: "9w8 - The Referee",
        body: "With an Eight wing, your calm comes with a backbone of strength. You keep the peace, but you can plant your feet and push back when something matters. This makes you a steady presence with real teeth when needed. The gift is peace that can stand firm. The growth is not letting the desire for comfort silence the strength you actually have, and using your voice before conflict festers.",
      },
      "1": {
        label: "9w1 - The Dreamer",
        body: "With a One wing, your peace comes with principle. You long for harmony and you also care about what is right, so your easygoing nature carries a quiet moral conviction. This makes you a gentle, idealistic peacemaker. The gift is calm with conscience. The growth is not letting the fear of conflict keep you from acting on the convictions you genuinely hold.",
      },
    },
    arrows: {
      growth: {
        toward: "3",
        body: "In health, you move toward the Three. You wake up, engage, and pursue real goals with energy and focus. Instead of going along and blending in, you show up fully, own your priorities, and put your gifts to work. Your presence and your voice start to shape things. Name one thing you actually want or think this week, and say it out loud instead of merging into what everyone else prefers. You matter enough to take up space.",
      },
      stress: {
        toward: "6",
        body: "Under stress, you move toward the unhealthy Six. The easy calm gives way to anxiety and worst-case worry, and you can become fretful, indecisive, and clingy to the very stability you fear losing. Peace turns into low-grade dread. When this rises, it is a sign you have been avoiding something you need to face. Bring the worry to God as a prayer, take one small honest step, and remember you are not invisible to Him, and should not be to yourself.",
      },
    },
  },
};

export function enneagramDynamics(typeKey) {
  return ENNEAGRAM_DYNAMICS[String(typeKey)] || null;
}

/* ------------------------------------------------------------------ */
/* 4. DISC DIMENSIONS                                                  */
/* ------------------------------------------------------------------ */

export const DISC_DIMENSIONS = {
  D: {
    name: "Drive",
    high: {
      title: "Wired to Take Charge",
      body: "You are decisive, direct, and driven toward results. You make the call, take the hill, and thrive when there is a mountain to move. In ministry this is the courage that leads through crisis and pushes past no. The caution is people. Your intensity can run over the very folks you are trying to lead, and speed can crowd out their feelings. Before your next big push, ask one person how the plan is landing on them, and actually wait for the answer.",
    },
    moderate: {
      title: "Firm When It Counts",
      body: "You can take charge when the moment calls for it, but you do not need to run everything. You hold your ground on what matters and let go of what does not, which makes you a balanced, steady leader others trust. The caution is knowing your own line. Under pressure you may hesitate where boldness is needed, or push where patience would serve better. Decide in advance which hills are worth taking, so the moment does not decide for you.",
    },
    low: {
      title: "Leads by Serving",
      body: "You are cooperative and low-key, more comfortable supporting than commanding. You would rather build consensus than give orders, and you bring a gentleness that makes people feel safe rather than pushed. This is real strength in team and care ministry. The caution is that necessary decisions can stall while you wait for everyone to agree, and your own good ideas can go unspoken. When a call needs making, make it. Your steadiness has earned you a voice, so use it.",
    },
  },
  I: {
    name: "Influence",
    high: {
      title: "Wired to Connect",
      body: "You are outgoing, expressive, and persuasive, the person who lights up a room and brings people along through warmth and enthusiasm. In ministry this is a gift for rallying teams, welcoming newcomers, and casting vision that sticks. The caution is depth and follow-through. You can talk more than you listen and promise more than you deliver in the heat of the moment. Ask two questions for every opinion you offer, and let your yes be something people can count on.",
    },
    moderate: {
      title: "Warm and Grounded",
      body: "You connect easily with people, but you also value substance over show. You can work a room and then get quiet and get things done, which makes you both relational and reliable. The caution is that you may under-use your influence, holding back the encouragement or vision-casting a moment needs. Your voice carries more weight than you think. When a team needs lifting or a truth needs saying warmly, step forward on purpose rather than waiting to be drawn out.",
    },
    low: {
      title: "Steady and Sincere",
      body: "You are reserved and reflective, more comfortable with a few deep relationships than a wide circle. You listen well, you think before you speak, and people trust the weight of your words because you do not waste them. In ministry this is depth others lean on. The caution is visibility. You can be overlooked in loud rooms and read as distant when you are simply quiet. Share your thinking early in meetings, and let people in, so your steadiness is seen and not missed.",
    },
  },
  S: {
    name: "Steadiness",
    high: {
      title: "Wired for Faithfulness",
      body: "You are patient, loyal, and dependable, the steady presence that holds a team together through long, unglamorous seasons. You follow through, you keep the peace, and people know they can count on you. In ministry this consistency is priceless. The caution is that your love of stability can make you slow to speak up and slow to embrace needed change, and you may absorb stress silently until you are running on empty. Your voice matters as much as your steadiness. Say the hard thing, and let others carry some of the load.",
    },
    moderate: {
      title: "Steady but Flexible",
      body: "You bring consistency without rigidity. You value stability and follow-through, but you can flex when the situation shifts, which makes you a dependable teammate who does not resist every change. The caution is that under pressure you may swing between digging in and going along, unsure which the moment needs. Know your own rhythm. Decide where you need firm ground and where you can bend, so change does not unsettle you and stubbornness does not slow you down.",
    },
    low: {
      title: "Wired for Change",
      body: "You are adaptable and fast-moving, comfortable with change and quick to pivot when something better comes along. You do not need routine to function, and you bring fresh energy that keeps a ministry from getting stuck. The caution is that others may need more stability and warning than you do, and your pace can leave slower teammates rattled. Follow-through and patience are the growth edges. Give people time to adjust, and finish what you start before the next new thing pulls you away.",
    },
  },
  C: {
    name: "Conscientiousness",
    high: {
      title: "Wired for Excellence",
      body: "You are careful, accurate, and committed to doing things right. You dig into the details, you hold high standards, and you catch the errors others miss, which makes your work trustworthy. In ministry this protects integrity and quality. The caution is perfectionism. Your standards can tip into overwork, and you can be hard on people who are wired more loosely than you. Aim for excellent, not flawless, build in real margin, and extend to others the grace you struggle to give yourself.",
    },
    moderate: {
      title: "Careful and Practical",
      body: "You value quality and follow-through, but you can also let good enough be good enough when it truly is. You bring order without getting lost in the weeds, which makes you both reliable and workable. The caution is that without deadlines or accountability, standards can quietly slip on the things that matter less to you. Put simple systems around your highest-stakes responsibilities, and use a regular review to catch what is drifting before it becomes a problem.",
    },
    low: {
      title: "Wired for Flexibility",
      body: "You are spontaneous and big-picture, comfortable with loose ends and unbothered by the fine print. You do not over-engineer things, and you can move fast and improvise when rigid planners freeze. In ministry this keeps you available and adaptable. The caution is that details, deadlines, and follow-through can slip, and ministry trust is built on kept promises. You do not need to become a systems person. Keep one list, pair with a detail-strong partner, and promise a little less so you can deliver what you promise.",
    },
  },
};

export function discDimensions(scales) {
  const byKey = {};
  for (const s of scales || []) {
    if (s && s.key) byKey[s.key] = s;
  }
  const order = ["D", "I", "S", "C"];
  const out = [];
  for (const k of order) {
    const dim = DISC_DIMENSIONS[k];
    if (!dim) continue;
    const s = byKey[k];
    const pct = s && typeof s.pct === "number" ? s.pct : 0;
    const level = pct >= 60 ? "high" : pct >= 40 ? "moderate" : "low";
    const block = dim[level];
    out.push({ key: k, name: dim.name, level, title: block.title, body: block.body });
  }
  return out;
}
