"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { GIFTS } from "../../lib/gifts";
import {
  ordinal,
  GROWTH_LEVELS,
  rootedBand,
  FIVEFOLD,
  DISC_BLENDS,
  DISC_DIMS,
  domainBand,
  DOMAIN_META,
  DOMAIN_REPORT_COPY,
  PASTOR_PILLARS,
  PASTOR_DOMAINS,
  WELLBEING_CARE,
} from "../../lib/content";
import DonationCard from "../../components/DonationCard";

export default function ResultsPage() {
  const { token } = useParams();
  const [scored, setScored] = useState(null);
  const [meta, setMeta] = useState(null);
  const [wb, setWb] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase
        .from("sessions").select("id,assessment_id").eq("result_token", token).single();
      if (!session) { setState("notfound"); return; }
      const { data: result } = await supabase
        .from("results").select("scored_json,created_at").eq("session_id", session.id).single();
      const { data: assessment } = await supabase
        .from("assessments").select("name,subtitle").eq("id", session.assessment_id).single();
      if (!result) { setState("notfound"); return; }
      // Wellbeing (owner or Mission USA care/admin only, by RLS). Returns
      // nothing for anyone else, so the card simply doesn't render for them.
      const { data: wbRow } = await supabase
        .from("wellbeing_results")
        .select("total,max_total,band,elevated")
        .eq("session_id", session.id)
        .maybeSingle();
      setScored(result.scored_json);
      setMeta({ ...assessment, created_at: result.created_at });
      setWb(wbRow || null);
      setState("ready");
    })();
  }, [token]);

  if (state === "loading") return <Centered>Loading your results…</Centered>;
  if (state === "notfound")
    return <Centered>We couldn't find those results. The link may be incomplete.</Centered>;

  const contact = scored.contact || {};
  const suppressDonation = ["mip", "church-class"].includes(contact.source_tag);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <style>{PRINT_CSS}</style>
      <header style={hd}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
          <div style={hdRow}>
            <div>
              <div style={kicker}>{meta?.name}</div>
              <h1 className="serif" style={hName}>
                {contact.first_name} {contact.last_name}
              </h1>
            </div>
            <div style={hMeta}>
              {meta?.created_at &&
                new Date(meta.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
              {contact.email && <div style={{ opacity: 0.75 }}>{contact.email}</div>}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 60px" }}>
        <div className="no-print" style={actions}>
          <button className="btn btn-primary" onClick={() => window.print()}>Download PDF / Print</button>
          <a className="btn btn-ghost" href="/">Take another →</a>
        </div>

        {scored.type === "gift-rank" && <GiftRank scored={scored} />}
        {scored.type === "ranked-sum" && <RankedSum scored={scored} />}
        {scored.type === "domain-bands" && <DomainBandsReport scored={scored} />}
        {scored.type === "level-matrix" && <GrowthReport scored={scored} />}
        {scored.type === "disc-blend" && <DiscReport scored={scored} />}
        {scored.type === "pillar" && <PastorReport scored={scored} />}
        {scored.type === "domain-average" && <DomainReport scored={scored} />}

        {wb && <WellbeingCard wb={wb} />}

        <DonationCard suppressed={suppressDonation} />
        <footer style={ft}>A ministry resource of Mission USA · gomissionusa.com</footer>
      </div>
    </main>
  );
}

/* ---------------- Spiritual Gifts (ranked A–Y) ---------------- */
function GiftRank({ scored }) {
  const [open, setOpen] = useState(null);
  const ranked = useMemo(
    () =>
      scored.ranked.map((g, i) => ({
        ...g, ...GIFTS[g.letter], rank: i,
        tier: i < 3 ? "top" : i < 8 ? "mid" : "low",
      })),
    [scored]
  );
  const topThree = ranked.slice(0, 3);
  const per = scored.max_per || 15;
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your top gifts</div>
        <div style={topGrid}>
          {topThree.map((g) => (
            <div key={g.letter} style={topCard}>
              <div style={topRank}>{ordinal(g.rank + 1)}</div>
              <div className="serif" style={topName}>{g.name}</div>
              <div style={scoreRow}>
                <span style={topScore}>{g.score}</span>
                <span style={{ fontSize: 14, color: "#8CA0B3" }}>/ {per}</span>
              </div>
              <p style={topDef}>{g.def}</p>
            </div>
          ))}
        </div>
        <p style={helper}>
          These are your strongest gifts, the places you're most clearly wired to serve. Every gift
          is ranked below so you can see your full profile.
        </p>
      </section>
      <section style={{ padding: "24px 0 8px" }}>
        <div style={sectionLabel}>All gifts, ranked</div>
        <div style={chart}>
          {ranked.map((g) => {
            const color = g.tier === "top" ? "#C4923E" : g.tier === "mid" ? "#2E7D8A" : "#8CA0B3";
            const isOpen = open === g.letter;
            return (
              <div key={g.letter} style={{ borderBottom: "1px solid #F0F2F4" }}>
                <button onClick={() => setOpen(isOpen ? null : g.letter)} style={barBtn} className="bar">
                  <span style={rRank}>{g.rank + 1}</span>
                  <span style={rName}>{g.name}</span>
                  <span style={track}><span style={fill(g.score / per, color)} /></span>
                  <span style={{ ...rScore, color }}>{g.score}</span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                {isOpen && (
                  <div style={detail}>
                    <p style={detailP}>{g.def}</p>
                    <Block h="Where this gift serves" t={g.roles} />
                    <Block h="Growing in this gift" t={g.develop} />
                    <div style={refLine}>{g.refs}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ---------------- Fivefold Calling (ranked sum) ---------------- */
function RankedSum({ scored }) {
  const per = scored.max_per || 15;
  const ranked = scored.ranked;
  const topScore = ranked[0]?.score;
  const secondScore = ranked[1]?.score;
  const primaries = ranked.filter((r) => r.score === topScore);
  const secondaries = ranked.filter((r) => r.score === secondScore && r.score !== topScore);
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your calling</div>
        <div style={topGrid}>
          {[...primaries, ...secondaries].slice(0, 2).map((r, i) => {
            const m = FIVEFOLD[r.key] || {};
            const label = primaries.length > 1 ? "Co-primary" : i === 0 ? "Primary" : "Secondary";
            return (
              <div key={r.key} style={topCard}>
                <div style={topRank}>{label}</div>
                <div className="serif" style={topName}>{r.key}</div>
                <div style={scoreRow}>
                  <span style={topScore}>{r.score}</span>
                  <span style={{ fontSize: 14, color: "#8CA0B3" }}>/ {per}</span>
                </div>
                <p style={topDef}>{m.short}</p>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          No calling outranks another. All five are shown below with what each looks like in ministry,
          and where it can go wrong if left unchecked.
        </p>
      </section>
      <section style={{ padding: "24px 0 8px" }}>
        <div style={sectionLabel}>All five callings</div>
        <div style={chart}>
          {ranked.map((r, i) => {
            const color = i === 0 ? "#C4923E" : i === 1 ? "#2E7D8A" : "#8CA0B3";
            const m = FIVEFOLD[r.key] || {};
            return (
              <div key={r.key} style={{ borderBottom: "1px solid #F0F2F4", padding: "6px 4px" }}>
                <div style={barBtn}>
                  <span style={rRank}>{i + 1}</span>
                  <span style={rName}>{r.key}</span>
                  <span style={track}><span style={fill(r.score / per, color)} /></span>
                  <span style={{ ...rScore, color }}>{r.score}</span>
                  <span />
                </div>
                <div style={{ padding: "2px 16px 14px 52px" }}>
                  <p style={detailP}>{m.short}</p>
                  <Block h="Where it can go wrong" t={m.shadow} />
                  <Block h="Ministry application" t={m.application} />
                  <div style={refLine}>{m.ref}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ---------------- Rooted / Leadership Health (domain bands) ---------------- */
function DomainBandsReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains;
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  const bandFn = scored.slug === "rooted" ? rootedBand : domainBand;
  const meta = DOMAIN_META[scored.slug] || {};
  const copy = DOMAIN_REPORT_COPY[scored.slug] || {
    snapshot: "Your results, domain by domain",
    strong: "Your strengths",
    grow: "Where to grow",
    helper: "These are simply where the next season of growth is, not a verdict.",
  };
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>{copy.snapshot}</div>
        <div style={chart}>
          {domains.map((d) => {
            const band = bandFn(d.average);
            return (
              <div key={d.domain} style={rowGrid}>
                <span style={rName}>{d.domain}</span>
                <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                <span style={{ ...rScore, color: band.color, minWidth: 128, textAlign: "right" }}>
                  {d.average.toFixed(1)} · {band.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>{copy.strong}</div>
        <div style={topGrid}>
          {top2.map((d) => (
            <div key={d.domain} style={topCard}>
              <div className="serif" style={{ ...topName, fontSize: 20 }}>{d.domain}</div>
              <div style={{ ...scoreRow, marginTop: 4 }}>
                <span style={{ ...topScore, fontSize: 26 }}>{d.average.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#8CA0B3" }}>{bandFn(d.average).label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>{copy.grow}</div>
        {bottom2.map((d) => {
          const m = meta[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: bandFn(d.average).color }}>
                  {d.average.toFixed(1)} · {bandFn(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
              {m.ref && <div style={refLine}>{m.ref}</div>}
            </div>
          );
        })}
        <p style={helper}>{copy.helper}</p>
      </section>
    </>
  );
}

/* ---------------- Church Growth (level matrix) ---------------- */
function GrowthReport({ scored }) {
  const winner = GROWTH_LEVELS[scored.winnerLevel];
  const per = scored.levels[0]?.max || 30;
  const t = scored.transition;
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your church's level</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div className="serif" style={{ fontSize: 28, color: "#1C2B3A" }}>{winner.name}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1B3A57", margin: "6px 0 12px", letterSpacing: ".02em" }}>
            {winner.message}
          </div>
          <p style={{ ...topDef, fontSize: 15 }}>{winner.desc}</p>
        </div>
        {t && (
          <div style={transitionBox}>
            Your church may be in transition between {GROWTH_LEVELS[t.a].name} and{" "}
            {GROWTH_LEVELS[t.b].name}. That's worth discussing with your leadership team, not a sign
            something's wrong.
          </div>
        )}
      </section>
      <section style={{ padding: "20px 0" }}>
        <div style={sectionLabel}>All five stages, side by side</div>
        <div style={chart}>
          {scored.levels.map((l) => {
            const g = GROWTH_LEVELS[l.level];
            const isWin = l.level === scored.winnerLevel;
            const color = isWin ? "#C4923E" : "#8CA0B3";
            return (
              <div key={l.level} style={rowGrid}>
                <span style={{ ...rName, fontWeight: isWin ? 700 : 600 }}>{g.name}</span>
                <span style={track}><span style={fill(l.score / per, color)} /></span>
                <span style={{ ...rScore, color }}>
                  {l.score}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{per}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "4px 0 8px" }}>
        <div style={sectionLabel}>The whole path</div>
        <div style={chart}>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div key={lvl} style={{ padding: "12px 14px", borderBottom: "1px solid #F0F2F4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="serif" style={{ fontSize: 16, color: "#1C2B3A" }}>{GROWTH_LEVELS[lvl].name}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2E7D8A" }}>{GROWTH_LEVELS[lvl].message}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: "6px 0 0", lineHeight: 1.5 }}>{GROWTH_LEVELS[lvl].desc}</p>
            </div>
          ))}
        </div>
        <p style={helper}>
          This assessment is a starting point for honest conversation, not a final verdict. Use it to
          name strengths, name gaps, and build a focused plan forward.
        </p>
      </section>
    </>
  );
}

/* ---------------- Wired to Lead (DISC blend) ---------------- */
function DiscReport({ scored }) {
  const b = DISC_BLENDS[scored.blend] || {};
  const per = scored.max_per || 35;
  const order = { D: 0, I: 1, S: 2, C: 3 };
  const dims = [...scored.dims].sort((a, b2) => order[a.key] - order[b2.key]);
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your blend</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div style={topRank}>{scored.blend} · {DISC_DIMS[scored.primary]} + {DISC_DIMS[scored.secondary]}</div>
          <div className="serif" style={{ fontSize: 27, color: "#1C2B3A", marginTop: 4 }}>
            {b.figure}, {b.title}
          </div>
        </div>
      </section>
      <section style={{ padding: "18px 0" }}>
        <div style={sectionLabel}>Your four dimensions</div>
        <div style={chart}>
          {dims.map((d) => {
            const isTop = d.key === scored.primary || d.key === scored.secondary;
            const color = d.key === scored.primary ? "#C4923E" : d.key === scored.secondary ? "#2E7D8A" : "#8CA0B3";
            return (
              <div key={d.key} style={rowGrid}>
                <span style={{ ...rName, fontWeight: isTop ? 700 : 600 }}>{DISC_DIMS[d.key]}</span>
                <span style={track}><span style={fill(d.score / per, color)} /></span>
                <span style={{ ...rScore, color }}>
                  {d.score}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{per}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "4px 0 8px" }}>
        <div style={chart}>
          <div style={{ padding: "18px 20px" }}>
            <Block h="Strengths" t={b.strengths} />
            <Block h="Watch-outs" t={b.watchouts} />
            <Block h="Best used for" t={b.bestFor} />
            <Block h="Growth challenge" t={b.growth} />
          </div>
        </div>
        <p style={helper}>
          A blend is a description of how you're wired, not a limit on how God can use you. Lead from
          your actual design.
        </p>
      </section>
    </>
  );
}

/* ---------------- Pastor Profile (3 pillars, 14 domains) ---------------- */
function PastorReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains;
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your three pillars</div>
        <div style={topGrid}>
          {scored.pillars.map((p) => {
            const band = domainBand(p.average);
            return (
              <div key={p.pillar} style={topCard}>
                <div className="serif" style={{ ...topName, fontSize: 19 }}>{p.pillar}</div>
                <div style={{ ...scoreRow, marginTop: 4 }}>
                  <span style={{ ...topScore, fontSize: 26 }}>{p.average.toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: band.color }}>{band.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          Character, Competence, and Contribution are meant to grow together. When one pillar runs far
          ahead of another, that gap is worth as much attention as any single low score.
        </p>
      </section>

      <section style={{ padding: "22px 0 4px" }}>
        <div style={sectionLabel}>Every domain</div>
        {PASTOR_PILLARS.map((pillar) => {
          const ds = domains.filter((d) => (PASTOR_DOMAINS[d.domain]?.pillar) === pillar);
          if (!ds.length) return null;
          return (
            <div key={pillar} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1B3A57", margin: "0 0 8px" }}>{pillar}</div>
              <div style={chart}>
                {ds.map((d) => {
                  const band = domainBand(d.average);
                  return (
                    <div key={d.domain} style={rowGrid}>
                      <span style={rName}>{d.domain}</span>
                      <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                      <span style={{ ...rScore, color: band.color, minWidth: 128, textAlign: "right" }}>
                        {d.average.toFixed(1)} · {band.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section style={{ padding: "8px 0 4px" }}>
        <div style={sectionLabel}>Where you're strong</div>
        <div style={topGrid}>
          {top2.map((d) => (
            <div key={d.domain} style={topCard}>
              <div className="serif" style={{ ...topName, fontSize: 20 }}>{d.domain}</div>
              <div style={{ ...scoreRow, marginTop: 4 }}>
                <span style={{ ...topScore, fontSize: 26 }}>{d.average.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#8CA0B3" }}>{domainBand(d.average).label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>Where to focus</div>
        {bottom2.map((d) => {
          const m = PASTOR_DOMAINS[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(d.average).color }}>
                  {d.average.toFixed(1)} · {domainBand(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
            </div>
          );
        })}
        <p style={helper}>
          This is developmental, never a verdict on your calling. No score here confirms or denies that
          God has called you. It simply shows where the next bit of growth is.
        </p>
      </section>
    </>
  );
}

/* ---------------- Private wellbeing card (Pastor Profile) ---------------- */
function WellbeingCard({ wb }) {
  const care = WELLBEING_CARE[wb.band] || WELLBEING_CARE.ok;
  const isSignificant = wb.band === "significant";
  const border = isSignificant ? "#C4923E" : "#E7E9EC";
  return (
    <section
      style={{
        marginTop: 28,
        background: isSignificant ? "#FBF6EC" : "#fff",
        border: `1px solid ${border}`,
        borderLeft: `5px solid ${isSignificant ? "#C4923E" : "#2E7D8A"}`,
        borderRadius: 16,
        padding: "22px 24px",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 8 }}>
        Private · How you're doing
      </div>
      <div className="serif" style={{ fontSize: 21, color: "#1C2B3A", marginBottom: 8 }}>{care.title}</div>
      <p style={{ fontSize: 15, color: "#3A4A5A", lineHeight: 1.65, margin: 0 }}>{care.body}</p>
      <p style={{ fontSize: 12.5, color: "#8CA0B3", marginTop: 14, marginBottom: 0 }}>
        This section is held in confidence by the Mission USA care team and is never shown to your local
        church or in any shared report.
      </p>
    </section>
  );
}

/* ---------------- Generic domain-average fallback ---------------- */
function DomainReport({ scored }) {
  const per = scored.scale_max || 5;
  return (
    <section style={{ padding: "16px 0" }}>
      <div style={sectionLabel}>Your results</div>
      <div style={chart}>
        {scored.domains.map((d) => {
          const band = domainBand(d.average);
          return (
            <div key={d.domain} style={rowGrid}>
              <span style={rName}>{d.domain}</span>
              <span style={track}><span style={fill(d.average / per, band.color)} /></span>
              <span style={{ ...rScore, color: band.color }}>{d.average}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- shared bits ---------------- */
const Block = ({ h, t }) =>
  t ? (
    <div style={{ marginBottom: 14 }}>
      <div style={blockH}>{h}</div>
      <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.55 }}>{t}</p>
    </div>
  ) : null;
const Centered = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "var(--ink-soft)" }}>
    {children}
  </main>
);
const fill = (frac, color) => ({
  display: "block", height: "100%", borderRadius: 999,
  width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color,
});
const chevron = (open) => ({
  color: "#B4BEC9", fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s",
});

const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "40px 0 34px" };
const hdRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 10 };
const hName = { fontWeight: 500, fontSize: 38, margin: 0 };
const hMeta = { fontSize: 13.5, textAlign: "right", lineHeight: 1.5 };
const actions = { display: "flex", gap: 12, padding: "24px 0", flexWrap: "wrap" };
const sectionLabel = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 18 };
const topGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const topCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 24px" };
const topRank = { fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, color: "#C4923E", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" };
const topName = { fontWeight: 500, fontSize: 23, marginTop: 4 };
const scoreRow = { display: "flex", alignItems: "baseline", gap: 5, margin: "6px 0 12px" };
const topScore = { fontSize: 34, fontWeight: 700, color: "#1B3A57", lineHeight: 1 };
const topDef = { fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.5 };
const helper = { fontSize: 13.5, color: "#4A5B6D", marginTop: 20, lineHeight: 1.55, maxWidth: 640 };
const chart = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "6px 10px", overflow: "hidden" };
const barBtn = { width: "100%", display: "grid", gridTemplateColumns: "26px 150px 1fr 46px 16px", alignItems: "center", gap: 12, padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" };
const rowGrid = { display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rRank = { fontSize: 13, color: "#8CA0B3", fontWeight: 600 };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden", width: "100%" };
const rScore = { fontSize: 15, fontWeight: 700, textAlign: "right" };
const detail = { padding: "4px 16px 22px 52px" };
const detailP = { fontSize: 14.5, color: "#2B3A4A", margin: "0 0 14px", lineHeight: 1.55 };
const blockH = { fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 5 };
const refLine = { fontSize: 12, color: "#8CA0B3", fontStyle: "italic", marginTop: 12 };
const growCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const transitionBox = { background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", marginTop: 14, fontSize: 14, color: "#4A5B6D", lineHeight: 1.55 };
const ft = { textAlign: "center", padding: "34px 0 0", fontSize: 12.5, color: "#7C8A9C" };

const PRINT_CSS = `
@media print {
  .no-print { display:none !important; }
  body { background:#fff !important; }
  .bar { break-inside: avoid; }
}
.bar:hover { background:#F8FAFB; }
`;
