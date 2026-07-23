"use client";
import { useState } from "react";
import { GIFTS, ordinal as giftOrdinal } from "../lib/gifts";
import {
  SCORING_TYPE,
  FIVEFOLD,
  DISC_BLENDS,
  DISC_DIMS,
  GROWTH_LEVELS,
  ROOTED_MARKERS,
  LEADERSHIP_DOMAINS,
  PASTOR_PILLARS,
  PASTOR_DOMAINS,
  CHURCH_HEALTH_DOMAINS,
  SPIRITUAL_GROWTH_DOMAINS,
  SPIRITUAL_GROWTH_ORDER,
  ENNEAGRAM_TYPES,
  PLANTER_PRIMARY,
  PLANTER_CHARACTERISTICS,
  PLANTER_TIERS,
  rootedBand,
  domainBand,
  WELLBEING_CARE,
  EFMI_SUBSCALES,
  EFMI_ORDER,
  efmiBand,
  efmiTotalBand,
} from "../lib/content";

const GOLD = "#C4923E", TEAL = "#2E7D8A", GREY = "#8CA0B3", NAVY = "#1B3A57";

// ---- Sample datasets (illustrative) ----
function giftSample() {
  const letters = Object.keys(GIFTS);
  const scores = [14, 13, 13, 12, 11, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3];
  return letters.map((letter, i) => ({ letter, score: scores[i] ?? 3 }));
}
const SAMPLE = {
  "spiritual-gifts": { type: "gift-rank", ranked: giftSample(), max: 15 },
  "fivefold-calling": {
    type: "ranked-sum", max: 15,
    ranked: [["Shepherding", 13], ["Teaching", 11], ["Prophetic", 8], ["Evangelistic", 6], ["Pioneering (Apostolic)", 5]],
  },
  rooted: {
    type: "domain-bands", meta: ROOTED_MARKERS, band: rootedBand,
    domains: [["Abiding in Christ", 4.6], ["Word & Prayer", 4.2], ["Community & Accountability", 3.8], ["Fruit of the Spirit", 3.6], ["Serving & Gifts", 3.3], ["Witness & Mission", 3.0], ["Perseverance in Trials", 2.7], ["Stewardship", 2.4]],
  },
  "leadership-health": {
    type: "domain-bands", meta: LEADERSHIP_DOMAINS, band: domainBand,
    domains: [["Vision & Direction", 4.4], ["Integrity & Accountability", 4.2], ["Communication", 3.9], ["Decision-Making", 3.6], ["Growth & Adaptability", 3.3], ["Emotional & Spiritual Resilience", 3.0], ["Delegation & Team Building", 2.7], ["Conflict Navigation", 2.5]],
  },
  "wired-to-lead": {
    type: "disc", blend: "DC", dims: [["D", 30], ["I", 20], ["S", 18], ["C", 28]], max: 35,
  },
  "church-growth": {
    type: "level", winner: 3,
    levels: [[1, 8], [2, 15], [3, 24], [4, 18], [5, 12]], max: 30,
  },
  "pastor-profile": {
    type: "pillar",
    domains: [["Calling & Conviction", 4.7], ["Preaching & Teaching", 4.4], ["Character & Integrity", 4.3], ["Pastoral Care & Shepherding", 4.1], ["Leadership & Vision", 3.9], ["Mission & Evangelism", 3.7], ["Communication & Relationships", 3.6], ["Spiritual Vitality", 3.5], ["Disciple-Making & Multiplication", 3.3], ["Conflict Resolution", 3.1], ["Emotional Health", 3.0], ["Mentoring & Accountability", 2.8], ["Marriage & Family", 2.7], ["Rest, Rhythm & Health", 2.4]],
    wellbeing: "ok",
  },
  "church-health": {
    type: "team", raters: 6,
    domains: [["Worship That Connects", 4.3, 0.6], ["Prayer & Spiritual Depth", 4.0, 0.9], ["Groups & Discipleship", 3.7, 1.1], ["Leadership Development", 3.5, 0.8], ["Unity & Relational Health", 3.3, 1.6], ["Every-Member Ministry", 3.1, 1.0], ["Clear Systems & Communication", 2.8, 1.2], ["Outward Focus & Evangelism", 2.5, 0.9]],
  },
  "spiritual-growth": {
    type: "sg-wheel",
    domains: [["Abide in Christ", 4.4], ["Live in the Word", 4.1], ["Pray in Faith", 3.6], ["Minister to Others", 3.2], ["Fellowship with Believers", 2.9], ["Witness to the World", 2.5]],
  },
  enneagram: {
    type: "enneagram", primary: "2",
    ranked: [["2", 7], ["9", 6], ["6", 5], ["1", 4], ["4", 3], ["3", 3], ["5", 3], ["7", 3], ["8", 2]],
  },
  "church-planter": {
    type: "planter", tier: "develop", composite: 3.8,
    domains: [["Exercises Faith", 4.6], ["Visioning Capacity", 4.4], ["Intrinsically Motivated", 4.2], ["Resilience", 4.0], ["Effectively Builds Relationships", 3.9], ["Committed to Church Growth", 3.8], ["Flexible and Adaptable", 3.7], ["Creates Ownership of Ministry", 3.5], ["Utilizes the Giftedness of Others", 3.4], ["Builds Group Cohesiveness", 3.2], ["Responsive to the Community", 3.0], ["Spousal Cooperation", 3.4], ["Reaches the Unchurched", 2.8]],
  },
  "forgiveness-profile": {
    type: "forgiveness",
    understanding: "accurate",
    subscales: [
      ["Forgiveness as Good in Itself", 17], ["Self-Healing", 16], ["Consistency with Your Beliefs", 15],
      ["Community Harmony", 13], ["Self-Improvement", 12], ["Protection for Others Inside the Family", 12],
      ["Healing for the Other", 10], ["Protection for Others Outside the Family", 9],
      ["Improvement for the Other", 8], ["Improved Relationship", 7],
    ],
  },
  "big-five": {
    type: "big-five",
    traits: [["Openness", 78], ["Conscientiousness", 72], ["Extraversion", 50], ["Agreeableness", 64], ["Emotional Stability", 58]],
    facets: [["Vision (Future Orientation)", 83], ["Purpose & Meaning", 80], ["Kindness", 67], ["Humor", 30]],
  },
  "kingdom-design": {
    type: "kingdom-design", code: "INFJ", name: "The Counselor", mirror: "John the Beloved", temperament: "The Encouragers (NF)",
    // [label, A pole, B pole, winning letter, winning count, total, clarity]
    scales: [["Energy", "E", "I", "I", 12, 15, "Clear"], ["Information", "S", "N", "N", 13, 15, "Clear"], ["Decisions", "T", "F", "F", 11, 15, "Moderate"], ["Lifestyle", "J", "P", "J", 15, 15, "Very Clear"]],
  },
  "discover-leadership-style": {
    type: "leadership", style: "Building Leader", code: "ST-CH-SP", seat: 62,
    // [name, pct, color, band]
    legs: [["Strategy", 87, "#2E7D8A", "Signature strength"], ["Chemistry", 65, "#C57B57", "Solid strength"], ["Spirituality", 41, "#6A5AA0", "Developing"]],
  },
  "called-together": {
    type: "couple",
    // [area, lower-of-the-two score, band]
    domains: [["Shared Calling", 4.5, "Thriving"], ["Spiritual Partnership", 4.1, "Thriving"], ["Communication", 3.7, "Healthy"], ["Support & Encouragement", 3.9, "Healthy"], ["Rhythm & Boundaries", 3.1, "Growing"], ["Handling Conflict", 2.8, "Tend to this"]],
  },
};

export default function SampleReportButton({ slug, name }) {
  const [open, setOpen] = useState(false);
  const sample = SAMPLE[slug];
  if (!sample) return null;
  return (
    <>
      <button className="sample-btn" onClick={() => setOpen(true)}>
        <span style={{ fontSize: 18 }}>◔</span> Look at a sample report
      </button>
      {open && (
        <div style={backdrop} onClick={() => setOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalBar}>
              <span style={sampleTag}>Sample report</span>
              <button style={closeBtn} onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
              <div style={repHeader}>
                <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700 }}>{name}</div>
                <div className="serif" style={{ fontSize: 30, marginTop: 6 }}>Jordan Sample</div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>An example of what you'll receive</div>
              </div>
              <div style={{ padding: "20px 26px 28px" }}>
                <Report sample={sample} name={name} />
              </div>
            </div>
            <div style={modalFoot}>
              <span style={{ fontSize: 13, color: "#4A5B6D" }}>Your real report is personal and interactive, with a downloadable PDF.</span>
              <button className="btn btn-primary" onClick={() => setOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .sample-btn{display:inline-flex;align-items:center;gap:9px;background:#fff;border:1.5px solid var(--line);color:var(--navy);font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;}
        .sample-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(27,58,87,.14);border-color:var(--teal);}
      `}</style>
    </>
  );
}

function Report({ sample }) {
  switch (sample.type) {
    case "gift-rank": return <GiftRank s={sample} />;
    case "ranked-sum": return <RankedSum s={sample} />;
    case "domain-bands": return <DomainBands s={sample} />;
    case "disc": return <Disc s={sample} />;
    case "level": return <Level s={sample} />;
    case "pillar": return <Pillar s={sample} />;
    case "team": return <Team s={sample} />;
    case "sg-wheel": return <SgWheel s={sample} />;
    case "enneagram": return <Enneagram s={sample} />;
    case "planter": return <Planter s={sample} />;
    case "forgiveness": return <Forgiveness s={sample} />;
    case "big-five": return <BigFive s={sample} />;
    case "kingdom-design": return <Kingdom s={sample} />;
    case "leadership": return <Leadership s={sample} />;
    case "couple": return <Couple s={sample} />;
    default: return null;
  }
}

function Leadership({ s }) {
  return (
    <>
      <Section label="Your leadership style">
        <div style={{ ...card, borderLeft: `5px solid ${s.legs[0][2]}` }}>
          <div className="serif" style={{ fontSize: 24, color: "#1C2B3A" }}>{s.style}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8CA0B3", marginTop: 2 }}>{s.code}</div>
        </div>
      </Section>
      <Section label="Your three legs + the seat" style={{ padding: "16px 0 4px" }}>
        <div style={card}>
          {s.legs.map(([name, pct, color, band]) => (
            <div key={name} style={{ padding: "11px 4px", borderBottom: "1px solid #F0F2F4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C2B3A" }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct} · {band}</span>
              </div>
              <div style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
          <div style={{ padding: "11px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C2B3A" }}>Leadership (the seat)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{s.seat} · Solid strength</span>
            </div>
            <div style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.seat}%`, background: GOLD, borderRadius: 999 }} />
            </div>
          </div>
        </div>
        <p style={{ ...defP, marginTop: 10 }}>Your full report draws your leadership stool to these scores, then adds your style in depth, nine foundations, a leg-by-leg analysis, a 90-day plan, team pairings, and a coaching guide.</p>
      </Section>
    </>
  );
}

function Couple({ s }) {
  const bc = { Thriving: "#1F7A4D", Healthy: "#2E7D8A", Growing: "#C4923E", "Tend to this": "#B4653A" };
  return (
    <>
      <Section label="Where you stand together">
        <div style={card}>
          {s.domains.map(([area, score, band]) => (
            <div key={area} style={{ padding: "11px 4px", borderBottom: "1px solid #F0F2F4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C2B3A" }}>{area}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: bc[band] || TEAL }}>{score.toFixed(1)} · {band}</span>
              </div>
              <div style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(score / 5) * 100}%`, background: bc[band] || TEAL, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
        <p style={{ ...defP, marginTop: 10 }}>Each of you answers privately. Your couple report shows the picture at the lower of your two scores, so you always see the true state of things and can talk it through together, side by side.</p>
      </Section>
    </>
  );
}

function Kingdom({ s }) {
  const cc = { "Very Clear": "#1F5E68", Clear: "#2E7D8A", Moderate: "#C4923E", Slight: "#8CA0B3" };
  return (
    <>
      <Section label="Your type">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {s.code.split("").map((l, i) => (
              <span key={i} style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 24, color: "#8A6420", background: "#F5EFE6", border: "1px solid #EADFC9", borderRadius: 8, width: 34, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{l}</span>
            ))}
          </div>
          <div className="serif" style={{ fontSize: 21, color: "#1C2B3A" }}>{s.name}</div>
          <div style={{ ...defP, marginTop: 4 }}>Biblical mirror: {s.mirror} · {s.temperament}</div>
        </div>
      </Section>
      <Section label="Your four preferences" style={{ padding: "16px 0 4px" }}>
        <div style={card}>
          {s.scales.map(([label, a, b, letter, win, total, clarity]) => {
            const markerLeft = letter === a ? Math.round(((total - win) / total) * 100) : Math.round((win / total) * 100);
            const col = cc[clarity] || TEAL;
            return (
              <div key={label} style={{ padding: "12px 4px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2B3A" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{letter} · {clarity}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, color: letter === a ? "#1B3A57" : "#B4BEC9", width: 20, textAlign: "center" }}>{a}</span>
                  <div style={{ position: "relative", height: 10, background: "#EEF1F4", borderRadius: 999 }}>
                    <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "#D3DAE1" }} />
                    <div style={{ position: "absolute", top: -4, height: 16, width: 16, borderRadius: "50%", background: col, border: "2px solid #fff", left: `calc(${markerLeft}% - 8px)` }} />
                  </div>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, color: letter === b ? "#1B3A57" : "#B4BEC9", width: 20, textAlign: "center" }}>{b}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ ...defP, marginTop: 10 }}>Your full report adds your biblical mirror, your calling, your place in the church and family, spiritual disciplines, a prayer, and a 30-day plan for your type.</p>
      </Section>
    </>
  );
}

function BigFive({ s }) {
  const bandOf = (p) => (p >= 70 ? ["High", TEAL] : p >= 40 ? ["Moderate", GOLD] : ["Low", GREY]);
  return (
    <>
      <Section label="Your five traits">
        <div style={card}>
          {s.traits.map(([name, pct]) => {
            const [label, color] = bandOf(pct);
            return (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "center", gap: 12, padding: "11px 4px", borderBottom: "1px solid #F0F2F4" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2B3A" }}>{name}</span>
                <span style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color, minWidth: 96, textAlign: "right" }}>{pct} · {label}</span>
              </div>
            );
          })}
        </div>
        <p style={{ ...defP, marginTop: 12 }}>Each trait is scored 0 to 100 against the trait itself. There are no good or bad scores. Your full report adds a radar chart, a deep write-up for every trait, and six expanded facets.</p>
      </Section>
      <Section label="Signature strengths & growth areas" style={{ padding: "16px 0 4px" }}>
        {s.facets.map(([name, pct]) => {
          const [label, color] = bandOf(pct);
          return (
            <div key={name} style={{ ...card, borderLeft: `5px solid ${color}`, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="serif" style={{ fontSize: 17, color: "#1C2B3A" }}>{name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color }}>{pct} · {label}</span>
            </div>
          );
        })}
      </Section>
    </>
  );
}

function Forgiveness({ s }) {
  const per = 18;
  const subs = [...s.subscales].map(([key, score]) => ({ key, score })).sort((a, b) => b.score - a.score);
  const total = subs.reduce((a, x) => a + x.score, 0);
  const totalBand = efmiTotalBand(total);
  const top3 = subs.slice(0, 3);
  const bottom2 = [...subs].slice(-2).reverse();
  const U = { accurate: ["A clear understanding of forgiveness", TEAL], near: ["A close understanding of forgiveness", GOLD], misconception: ["A common misunderstanding of forgiveness", GREY] }[s.understanding] || [];
  return (
    <>
      <Section label="Your motivation to forgive">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ ...bigScore, fontSize: 34 }}>{total}</span><span style={{ fontSize: 13, color: GREY }}>/ 180</span>
          </div>
          <div className="serif" style={{ fontSize: 20, color: "#1C2B3A", marginTop: 4 }}>{totalBand.label}</div>
          <p style={{ ...defP, marginTop: 8 }}>Forgiveness grows from many motivations at once. This is a picture of what draws your heart toward it right now, not a grade on whether you&rsquo;ve arrived.</p>
        </div>
      </Section>
      <Section label="Understanding of forgiveness" style={{ padding: "16px 0 4px" }}>
        <div style={{ ...card, borderLeft: `5px solid ${U[1]}` }}>
          <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{U[0]}</div>
          <p style={{ ...defP, marginTop: 6 }}>The person picks the best of eight definitions of forgiveness. Only two describe genuine forgiveness, so this shows whether their answers rest on the real thing or a common look-alike like reconciliation or simply moving on.</p>
        </div>
      </Section>
      <Section label="What moves you most" style={{ padding: "16px 0 4px" }}>
        {top3.map((x) => {
          const m = EFMI_SUBSCALES[x.key] || {}; const b = efmiBand(x.score);
          return (
            <div key={x.key} style={{ ...card, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{x.key}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: b.color }}>{x.score}/{per} · {b.label}</div>
              </div>
              <p style={{ ...defP, marginTop: 6 }}>{m.body}</p>
              {m.verse && <div style={refLine}>{m.verse}</div>}
            </div>
          );
        })}
      </Section>
      <Section label="All ten motivations" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {subs.map((x, i) => {
            const b = efmiBand(x.score);
            return (
              <div key={x.key} style={{ ...rowGrid, gridTemplateColumns: "26px 1fr 2fr 40px" }}>
                <span style={rRank}>{i + 1}</span>
                <span style={rName}>{x.key}</span>
                <Bar frac={x.score / per} color={b.color} />
                <span style={{ ...rScore, color: b.color }}>{x.score}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Where forgiveness is quieter" style={{ padding: "16px 0 4px" }}>
        {bottom2.map((x) => {
          const m = EFMI_SUBSCALES[x.key] || {};
          return (
            <div key={x.key} style={{ ...card, marginBottom: 12 }}>
              <div className="serif" style={{ fontSize: 17, color: "#1C2B3A" }}>{x.key}</div>
              <p style={{ ...defP, marginTop: 6 }}>{m.short}</p>
            </div>
          );
        })}
      </Section>
    </>
  );
}

function Planter({ s }) {
  const per = 5;
  const tier = PLANTER_TIERS[s.tier];
  const domains = s.domains.map(([domain, average]) => ({ domain, average, primary: PLANTER_PRIMARY.includes(domain) }));
  const top3 = [...domains].sort((a, b) => b.average - a.average).slice(0, 3);
  const watch = [...domains].sort((a, b) => a.average - b.average).slice(0, 2);
  return (
    <>
      <Section label="Your readiness">
        <div style={{ ...card, borderLeft: `5px solid ${tier.color}` }}>
          <div style={{ ...rankKick, color: tier.color }}>Developmental, never a verdict</div>
          <div className="serif" style={{ fontSize: 24, color: "#1C2B3A", marginTop: 4 }}>{tier.label}</div>
          <p style={{ ...defP, marginTop: 8 }}>{tier.body}</p>
          <div style={{ marginTop: 10, fontSize: 13, color: "#4A5B6D" }}>Weighted readiness score: <strong style={{ color: NAVY }}>{s.composite.toFixed(1)}</strong> / {per}</div>
        </div>
      </Section>
      <Section label="All 13 characteristics" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {[...domains].sort((a, b) => b.average - a.average).map((d) => {
            const b = domainBand(d.average);
            return (
              <div key={d.domain} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 118px" }}>
                <span style={rName}>{d.domain}{d.primary && <span style={{ fontSize: 10, fontWeight: 700, color: "#B07C2E", marginLeft: 6 }}>◆</span>}</span>
                <Bar frac={d.average / per} color={b.color} />
                <span style={{ ...rScore, color: b.color, minWidth: 118 }}>{d.average.toFixed(1)} · {b.label}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Where you'll excel" style={{ padding: "16px 0 4px" }}>
        {top3.map((d) => (
          <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{d.domain}</div>
            <Block h="Lean into it" t={PLANTER_CHARACTERISTICS[d.domain]?.leanIn} />
          </div>
        ))}
      </Section>
      <Section label="What to watch for" style={{ padding: "16px 0 4px" }}>
        {watch.map((d) => (
          <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{d.domain}</div>
            <Block h="A next step" t={PLANTER_CHARACTERISTICS[d.domain]?.step} />
          </div>
        ))}
      </Section>
    </>
  );
}

function SgWheel({ s }) {
  const per = 5;
  const byName = Object.fromEntries(s.domains.map(([d, a]) => [d, a]));
  const order = SPIRITUAL_GROWTH_ORDER.filter((n) => byName[n] != null);
  const domains = [...s.domains].map(([domain, average]) => ({ domain, average })).sort((a, b) => b.average - a.average);
  const R = 92, cx = 150, cy = 148, N = order.length || 6;
  const ang = (i) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i, v) => [cx + (v / per) * R * Math.cos(ang(i)), cy + (v / per) * R * Math.sin(ang(i))];
  const ringPoly = (v) => order.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoly = order.map((n, i) => pt(i, byName[n]).map((x) => x.toFixed(1)).join(",")).join(" ");
  const shortN = (n) => ({ "Fellowship with Believers": "Fellowship", "Witness to the World": "Witness", "Minister to Others": "Ministry", "Abide in Christ": "Abide", "Live in the Word": "The Word", "Pray in Faith": "Prayer" }[n] || n);
  const top2 = domains.slice(0, 2), bottom2 = [...domains].slice(-2).reverse();
  return (
    <>
      <Section label="Your Discipleship Wheel">
        <div style={{ ...card, display: "flex", justifyContent: "center", padding: "14px 8px" }}>
          <svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: 340 }}>
            {[1, 2, 3, 4, 5].map((v) => <polygon key={v} points={ringPoly(v)} fill="none" stroke="#E7E9EC" strokeWidth="1" />)}
            {order.map((_, i) => { const [x, y] = pt(i, per); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E7E9EC" strokeWidth="1" />; })}
            <polygon points={dataPoly} fill="rgba(46,125,138,.22)" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" />
            {order.map((n, i) => { const [px, py] = pt(i, byName[n]); return <circle key={n} cx={px} cy={py} r="3.5" fill="#1F5E68" />; })}
            {order.map((n, i) => {
              const [lx, ly] = pt(i, per * 1.32);
              const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
              return <text key={n} x={lx} y={ly} textAnchor={anchor} fontSize="10" fontWeight="700" fill="#1C2B3A" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{shortN(n)}</text>;
            })}
          </svg>
        </div>
      </Section>
      <Section label="Every discipline" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {domains.map((d) => { const b = domainBand(d.average); return (
            <div key={d.domain} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 140px" }}>
              <span style={rName}>{d.domain}</span>
              <Bar frac={d.average / per} color={b.color} />
              <span style={{ ...rScore, color: b.color, minWidth: 140 }}>{Math.round(d.average * 10)}/50 · {b.label}</span>
            </div>
          ); })}
        </div>
      </Section>
      <Section label="Where to grow next" style={{ padding: "16px 0 4px" }}>
        {bottom2.map((d) => (
          <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{d.domain}</div>
            <Block h="A next step" t={SPIRITUAL_GROWTH_DOMAINS[d.domain]?.step} />
            <div style={refLine}>{SPIRITUAL_GROWTH_DOMAINS[d.domain]?.ref}</div>
          </div>
        ))}
      </Section>
    </>
  );
}

function Enneagram({ s }) {
  const per = 8;
  const t = ENNEAGRAM_TYPES[s.primary];
  const ranked = s.ranked.map(([type, score]) => ({ type, score }));
  return (
    <>
      <Section label="Your core type">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div style={rankKick}>Type {s.primary} · {t.tagline}</div>
          <div className="serif" style={{ fontSize: 25, color: "#1C2B3A", marginTop: 4 }}>{t.name}</div>
          <p style={{ ...defP, marginTop: 8 }}>{t.essence}</p>
        </div>
      </Section>
      <Section label="All nine types" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {ranked.map((r) => {
            const color = r.type === s.primary ? GOLD : r.score >= (ranked[2]?.score || 0) ? TEAL : GREY;
            return (
              <div key={r.type} style={{ ...rowGrid, gridTemplateColumns: "26px 150px 1fr 40px" }}>
                <span style={rRank}>{r.type}</span>
                <span style={rName}>{ENNEAGRAM_TYPES[r.type].name}</span>
                <Bar frac={r.score / per} color={color} />
                <span style={{ ...rScore, color }}>{r.score}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label={`A devotion · ${t.verse}`} style={{ padding: "16px 0 4px" }}>
        <div style={{ background: "#FBF6EC", border: "1px solid #EADFC9", borderRadius: 14, padding: "16px 18px" }}>
          <Block h="Your gift to the body" t={t.gift} />
          <Block h="Where you grow" t={t.grows} />
          <p style={{ fontSize: 13.5, color: "#3A4A5A", lineHeight: 1.6, margin: "6px 0 0" }}>{t.devotion}</p>
        </div>
      </Section>
    </>
  );
}

/* shared bits */
const Bar = ({ frac, color }) => (
  <span style={track}><span style={{ display: "block", height: "100%", borderRadius: 999, width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color }} /></span>
);
const Section = ({ label, children, style }) => (
  <section style={{ padding: "6px 0 4px", ...style }}>
    <div style={secLabel}>{label}</div>
    {children}
  </section>
);
const Block = ({ h, t }) => t ? (
  <div style={{ marginBottom: 12 }}>
    <div style={blockH}>{h}</div>
    <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.55 }}>{t}</p>
  </div>
) : null;

function GiftRank({ s }) {
  const ranked = s.ranked;
  const top = ranked.slice(0, 3);
  const first = GIFTS[ranked[0].letter];
  return (
    <>
      <Section label="Your top gifts">
        <div style={grid}>
          {top.map((g, i) => (
            <div key={g.letter} style={card}>
              <div style={rankKick}>{giftOrdinal(i + 1)}</div>
              <div className="serif" style={cardName}>{GIFTS[g.letter].name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "4px 0 10px" }}>
                <span style={bigScore}>{g.score}</span><span style={{ fontSize: 13, color: GREY }}>/ {s.max}</span>
              </div>
              <p style={defP}>{GIFTS[g.letter].def}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section label="All gifts, ranked" style={{ padding: "18px 0 4px" }}>
        <div style={chart}>
          {ranked.map((g, i) => {
            const color = i < 3 ? GOLD : i < 8 ? TEAL : GREY;
            return (
              <div key={g.letter} style={rowGrid}>
                <span style={rRank}>{i + 1}</span>
                <span style={rName}>{GIFTS[g.letter].name}</span>
                <Bar frac={g.score / s.max} color={color} />
                <span style={{ ...rScore, color }}>{g.score}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label={`More on ${first.name}`} style={{ padding: "18px 0 4px" }}>
        <div style={{ ...card, padding: "18px 20px" }}>
          <p style={defP}>{first.def}</p>
          <Block h="Where this gift serves" t={first.roles} />
          <Block h="Growing in this gift" t={first.develop} />
          <div style={refLine}>{first.refs}</div>
        </div>
      </Section>
    </>
  );
}

function RankedSum({ s }) {
  const ranked = s.ranked;
  return (
    <>
      <Section label="Your calling">
        <div style={grid}>
          {ranked.slice(0, 2).map(([key, score], i) => (
            <div key={key} style={card}>
              <div style={rankKick}>{i === 0 ? "Primary" : "Secondary"}</div>
              <div className="serif" style={cardName}>{key}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "4px 0 10px" }}>
                <span style={bigScore}>{score}</span><span style={{ fontSize: 13, color: GREY }}>/ {s.max}</span>
              </div>
              <p style={defP}>{FIVEFOLD[key]?.short}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section label="All five callings" style={{ padding: "18px 0 4px" }}>
        <div style={chart}>
          {ranked.map(([key, score], i) => {
            const color = i === 0 ? GOLD : i === 1 ? TEAL : GREY;
            return (
              <div key={key} style={{ borderBottom: "1px solid #F0F2F4", padding: "4px 2px" }}>
                <div style={rowGrid}>
                  <span style={rRank}>{i + 1}</span>
                  <span style={rName}>{key}</span>
                  <Bar frac={score / s.max} color={color} />
                  <span style={{ ...rScore, color }}>{score}</span>
                </div>
                {i < 2 && (
                  <div style={{ padding: "2px 14px 12px 46px" }}>
                    <Block h="Where it can go wrong" t={FIVEFOLD[key]?.shadow} />
                    <Block h="Ministry application" t={FIVEFOLD[key]?.application} />
                    <div style={refLine}>{FIVEFOLD[key]?.ref}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function DomainBands({ s }) {
  const band = s.band;
  const domains = s.domains.map(([domain, average]) => ({ domain, average }));
  const bottom2 = [...domains].slice(-2).reverse();
  const top2 = domains.slice(0, 2);
  return (
    <>
      <Section label="Your results, domain by domain">
        <div style={chart}>
          {domains.map((d) => {
            const b = band(d.average);
            return (
              <div key={d.domain} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 128px" }}>
                <span style={rName}>{d.domain}</span>
                <Bar frac={d.average / 5} color={b.color} />
                <span style={{ ...rScore, color: b.color, minWidth: 128 }}>{d.average.toFixed(1)} · {b.label}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Your strengths" style={{ padding: "16px 0 4px" }}>
        <div style={grid}>
          {top2.map((d) => (
            <div key={d.domain} style={card}>
              <div className="serif" style={{ ...cardName, fontSize: 19 }}>{d.domain}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginTop: 4 }}>{d.average.toFixed(1)} <span style={{ fontSize: 13, color: GREY }}>{band(d.average).label}</span></div>
            </div>
          ))}
        </div>
      </Section>
      <Section label="Where to grow" style={{ padding: "16px 0 4px" }}>
        {bottom2.map((d) => (
          <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{d.domain}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: band(d.average).color }}>{d.average.toFixed(1)} · {band(d.average).label}</div>
            </div>
            <Block h="A next step" t={s.meta[d.domain]?.step} />
            {s.meta[d.domain]?.ref && <div style={refLine}>{s.meta[d.domain].ref}</div>}
          </div>
        ))}
      </Section>
    </>
  );
}

function Disc({ s }) {
  const b = DISC_BLENDS[s.blend];
  const order = { D: 0, I: 1, S: 2, C: 3 };
  const dims = [...s.dims].sort((a, b2) => order[a[0]] - order[b2[0]]);
  const [primary, secondary] = [s.blend[0], s.blend[1]];
  return (
    <>
      <Section label="Your blend">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div style={rankKick}>{s.blend} · {DISC_DIMS[primary]} + {DISC_DIMS[secondary]}</div>
          <div className="serif" style={{ fontSize: 25, color: "#1C2B3A", marginTop: 4 }}>{b.figure}, {b.title}</div>
        </div>
      </Section>
      <Section label="Your four dimensions" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {dims.map(([k, score]) => {
            const color = k === primary ? GOLD : k === secondary ? TEAL : GREY;
            return (
              <div key={k} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 56px" }}>
                <span style={rName}>{DISC_DIMS[k]}</span>
                <Bar frac={score / s.max} color={color} />
                <span style={{ ...rScore, color }}>{score}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Your blend, in depth" style={{ padding: "16px 0 4px" }}>
        <div style={{ ...card, padding: "18px 20px" }}>
          <Block h="Strengths" t={b.strengths} />
          <Block h="Watch-outs" t={b.watchouts} />
          <Block h="Best used for" t={b.bestFor} />
          <Block h="Growth challenge" t={b.growth} />
        </div>
      </Section>
    </>
  );
}

function Level({ s }) {
  const w = GROWTH_LEVELS[s.winner];
  const per = s.max;
  return (
    <>
      <Section label="Your church's level">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div className="serif" style={{ fontSize: 26, color: "#1C2B3A" }}>{w.name}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: "5px 0 10px" }}>{w.message}</div>
          <p style={defP}>{w.desc}</p>
        </div>
      </Section>
      <Section label="All five stages" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {s.levels.map(([lvl, score]) => {
            const isWin = lvl === s.winner;
            const color = isWin ? GOLD : GREY;
            return (
              <div key={lvl} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 56px" }}>
                <span style={{ ...rName, fontWeight: isWin ? 700 : 600 }}>{GROWTH_LEVELS[lvl].name}</span>
                <Bar frac={score / per} color={color} />
                <span style={{ ...rScore, color }}>{score}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="The whole path" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div key={lvl} style={{ padding: "11px 14px", borderBottom: "1px solid #F0F2F4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="serif" style={{ fontSize: 15.5, color: "#1C2B3A" }}>{GROWTH_LEVELS[lvl].name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{GROWTH_LEVELS[lvl].message}</span>
              </div>
              <p style={{ fontSize: 13, color: "#4A5B6D", margin: "5px 0 0", lineHeight: 1.5 }}>{GROWTH_LEVELS[lvl].desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Pillar({ s }) {
  const domains = s.domains.map(([domain, average]) => ({ domain, average, pillar: PASTOR_DOMAINS[domain]?.pillar }));
  const pillars = PASTOR_PILLARS.map((p) => {
    const ds = domains.filter((d) => d.pillar === p);
    const avg = ds.length ? ds.reduce((a, d) => a + d.average, 0) / ds.length : 0;
    return { pillar: p, average: avg };
  });
  const top2 = [...domains].sort((a, b) => b.average - a.average).slice(0, 2);
  const bottom2 = [...domains].sort((a, b) => a.average - b.average).slice(0, 2);
  const care = WELLBEING_CARE[s.wellbeing];
  return (
    <>
      <Section label="Your three pillars">
        <div style={grid}>
          {pillars.map((p) => {
            const b = domainBand(p.average);
            return (
              <div key={p.pillar} style={card}>
                <div className="serif" style={{ ...cardName, fontSize: 18 }}>{p.pillar}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginTop: 4 }}>{p.average.toFixed(1)} <span style={{ fontSize: 12.5, color: b.color }}>{b.label}</span></div>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Every domain" style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {[...domains].sort((a, b) => b.average - a.average).map((d) => {
            const b = domainBand(d.average);
            return (
              <div key={d.domain} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 120px" }}>
                <span style={rName}>{d.domain}</span>
                <Bar frac={d.average / 5} color={b.color} />
                <span style={{ ...rScore, color: b.color, minWidth: 120 }}>{d.average.toFixed(1)} · {b.label}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Where to focus" style={{ padding: "16px 0 4px" }}>
        {bottom2.map((d) => (
          <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{d.domain}</div>
            <Block h="A next step" t={PASTOR_DOMAINS[d.domain]?.step} />
          </div>
        ))}
      </Section>
      {care && (
        <div style={{ marginTop: 8, background: "#fff", border: "1px solid #E7E9EC", borderLeft: `5px solid ${TEAL}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ ...blockH, marginBottom: 6 }}>Private · How you're doing</div>
          <div className="serif" style={{ fontSize: 18, color: "#1C2B3A", marginBottom: 6 }}>{care.title}</div>
          <p style={{ fontSize: 14, color: "#3A4A5A", margin: 0, lineHeight: 1.6 }}>{care.body}</p>
        </div>
      )}
    </>
  );
}

function Team({ s }) {
  const domains = s.domains.map(([domain, average, spread]) => ({ domain, average, spread }));
  const weakest = [...domains].sort((a, b) => a.average - b.average)[0];
  const widest = [...domains].sort((a, b) => b.spread - a.spread)[0];
  const strengths = [...domains].sort((a, b) => b.average - a.average).slice(0, 2);
  return (
    <>
      <Section label="Where to focus first">
        <div style={{ ...card, borderLeft: `5px solid ${GOLD}` }}>
          <div className="serif" style={{ fontSize: 22, color: "#1C2B3A" }}>{weakest.domain}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: domainBand(weakest.average).color, margin: "4px 0 8px" }}>{weakest.average.toFixed(1)} · {domainBand(weakest.average).label}</div>
          <p style={defP}>A church is as healthy as its weakest area until this one gets attention, so it leads the report.</p>
        </div>
      </Section>
      <Section label={`All eight qualities · ${s.raters} anonymous responses`} style={{ padding: "16px 0 4px" }}>
        <div style={chart}>
          {domains.map((d) => {
            const b = domainBand(d.average);
            return (
              <div key={d.domain} style={{ ...rowGrid, gridTemplateColumns: "1fr 2fr 46px" }}>
                <span style={rName}>{d.domain}</span>
                <Bar frac={d.average / 5} color={b.color} />
                <span style={{ ...rScore, color: b.color }}>{d.average.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section label="Where your team disagrees most" style={{ padding: "16px 0 4px" }}>
        <div style={card}>
          <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{widest.domain}</div>
          <p style={{ ...defP, marginTop: 6 }}>Your leaders' scores here span {widest.spread.toFixed(1)} points. A wide gap is information the average hides, worth talking through as a team.</p>
        </div>
      </Section>
    </>
  );
}

/* styles */
const backdrop = { position: "fixed", inset: 0, background: "rgba(18,42,68,.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4vh 16px", backdropFilter: "blur(2px)" };
const modal = { background: "#F6F8FA", borderRadius: 20, width: "100%", maxWidth: 720, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,.35)" };
const modalBar = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#fff", borderBottom: "1px solid #E7E9EC" };
const sampleTag = { fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", background: "#F5EFE6", border: "1px solid #EADFC9", padding: "5px 12px", borderRadius: 999 };
const closeBtn = { background: "#F0F2F4", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#4A5B6D", fontSize: 15 };
const repHeader = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "22px 26px" };
const modalFoot = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "14px 18px", background: "#fff", borderTop: "1px solid #E7E9EC", flexWrap: "wrap" };
const secLabel = { fontSize: 12, letterSpacing: ".13em", textTransform: "uppercase", color: TEAL, fontWeight: 700, marginBottom: 12 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
const card = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 18px 20px" };
const rankKick = { fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, color: GOLD, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" };
const cardName = { fontWeight: 500, fontSize: 20, color: "#1C2B3A", marginTop: 3 };
const bigScore = { fontSize: 30, fontWeight: 700, color: NAVY, lineHeight: 1 };
const defP = { fontSize: 13, color: "#4A5B6D", margin: 0, lineHeight: 1.5 };
const chart = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "4px 10px", overflow: "hidden" };
const rowGrid = { display: "grid", gridTemplateColumns: "26px 150px 1fr 40px", alignItems: "center", gap: 10, padding: "11px 8px", borderBottom: "1px solid #F0F2F4" };
const rRank = { fontSize: 12.5, color: GREY, fontWeight: 600 };
const rName = { fontSize: 14, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 9, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const rScore = { fontSize: 14, fontWeight: 700, textAlign: "right" };
const blockH = { fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: TEAL, fontWeight: 700, marginBottom: 5 };
const refLine = { fontSize: 11.5, color: GREY, fontStyle: "italic", marginTop: 10 };
