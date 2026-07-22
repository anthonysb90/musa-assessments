"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { GIFTS, ordinal } from "../../lib/gifts";

export default function ResultsPage() {
  const { token } = useParams();
  const [scored, setScored] = useState(null);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState("loading");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      // find session by result_token, then its result + assessment
      const { data: session } = await supabase
        .from("sessions").select("id,assessment_id").eq("result_token", token).single();
      if (!session) { setState("notfound"); return; }
      const { data: result } = await supabase
        .from("results").select("scored_json,created_at").eq("session_id", session.id).single();
      const { data: assessment } = await supabase
        .from("assessments").select("name,subtitle").eq("id", session.assessment_id).single();
      if (!result) { setState("notfound"); return; }
      setScored(result.scored_json);
      setMeta({ ...assessment, created_at: result.created_at });
      setState("ready");
    })();
  }, [token]);

  const ranked = useMemo(() => {
    if (!scored || scored.type !== "gift-rank") return [];
    return scored.ranked.map((g, i) => ({
      ...g, ...GIFTS[g.letter], rank: i,
      tier: i < 3 ? "top" : i < 8 ? "mid" : "low",
    }));
  }, [scored]);

  if (state === "loading")
    return <Centered>Loading your results…</Centered>;
  if (state === "notfound")
    return <Centered>We couldn't find those results. The link may be incomplete.</Centered>;

  const contact = scored.contact || {};
  const topThree = ranked.slice(0, 3);

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
              {meta?.created_at && new Date(meta.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              {contact.email && <div style={{ opacity: .75 }}>{contact.email}</div>}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 60px" }}>
        {/* action bar */}
        <div className="no-print" style={actions}>
          <button className="btn btn-primary" onClick={() => window.print()}>Download PDF / Print</button>
          <a className="btn btn-ghost" href="/">Take another →</a>
        </div>

        {scored.type === "gift-rank" ? (
          <>
            <section style={{ padding: "8px 0 8px" }}>
              <div style={sectionLabel}>Your top gifts</div>
              <div style={topGrid}>
                {topThree.map((g) => (
                  <div key={g.letter} style={topCard}>
                    <div style={topRank}>{ordinal(g.rank + 1)}</div>
                    <div className="serif" style={topName}>{g.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "6px 0 12px" }}>
                      <span style={topScore}>{g.score}</span>
                      <span style={{ fontSize: 14, color: "#8CA0B3" }}>/ 15</span>
                    </div>
                    <p style={topDef}>{g.def}</p>
                  </div>
                ))}
              </div>
              <p style={helper}>
                These are your strongest gifts, the places you're most clearly wired to serve.
                Every gift is ranked below so you can see your full profile.
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
                        <span style={track}>
                          <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(g.score / 15) * 100}%`, background: color }} />
                        </span>
                        <span style={{ ...rScore, color }}>{g.score}</span>
                        <span className="no-print" style={{ color: "#B4BEC9", fontSize: 18, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
                      </button>
                      {isOpen && (
                        <div style={detail}>
                          <p style={{ fontSize: 14.5, color: "#2B3A4A", margin: "0 0 14px", lineHeight: 1.55 }}>{g.def}</p>
                          <Block h="Where this gift serves" t={g.roles} />
                          <Block h="Growing in this gift" t={g.develop} />
                          <div style={{ fontSize: 12, color: "#8CA0B3", fontStyle: "italic", marginTop: 12 }}>{g.refs}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <DomainReport scored={scored} />
        )}

        <footer style={ft}>A ministry resource of Mission USA · gomissionusa.com</footer>
      </div>
    </main>
  );
}

function DomainReport({ scored }) {
  const max = 5;
  return (
    <section style={{ padding: "16px 0" }}>
      <div style={sectionLabel}>Your results</div>
      <div style={chart}>
        {scored.domains.map((d, i) => (
          <div key={d.domain} style={{ display: "grid", gridTemplateColumns: "1fr 60px 40px", alignItems: "center", gap: 12, padding: "14px", borderBottom: "1px solid #F0F2F4" }}>
            <span style={rName}>{d.domain}</span>
            <span style={track}><span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(d.average / max) * 100}%`, background: i < 2 ? "#C4923E" : "#2E7D8A" }} /></span>
            <span style={{ ...rScore, color: i < 2 ? "#C4923E" : "#2E7D8A" }}>{d.average}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const Block = ({ h, t }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 5 }}>{h}</div>
    <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.55 }}>{t}</p>
  </div>
);
const Centered = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "var(--ink-soft)" }}>{children}</main>
);

const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "40px 0 34px" };
const hdRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 10 };
const hName = { fontWeight: 500, fontSize: 38, margin: 0 };
const hMeta = { fontSize: 13.5, textAlign: "right", lineHeight: 1.5 };
const actions = { display: "flex", gap: 12, padding: "24px 0", flexWrap: "wrap" };
const sectionLabel = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 18 };
const topGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const topCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 24px" };
const topRank = { fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, color: "#C4923E", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" };
const topName = { fontWeight: 500, fontSize: 23, marginTop: 4 };
const topScore = { fontSize: 34, fontWeight: 700, color: "#1B3A57", lineHeight: 1 };
const topDef = { fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.5 };
const helper = { fontSize: 13.5, color: "#4A5B6D", marginTop: 20, lineHeight: 1.55, maxWidth: 640 };
const chart = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "6px 10px", overflow: "hidden" };
const barBtn = { width: "100%", display: "grid", gridTemplateColumns: "26px 150px 1fr 34px 16px", alignItems: "center", gap: 12, padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" };
const rRank = { fontSize: 13, color: "#8CA0B3", fontWeight: 600 };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden", width: "100%" };
const rScore = { fontSize: 15, fontWeight: 700, textAlign: "right" };
const detail = { padding: "4px 16px 22px 52px" };
const ft = { textAlign: "center", padding: "34px 0 0", fontSize: 12.5, color: "#7C8A9C" };

const PRINT_CSS = `
@media print {
  .no-print { display:none !important; }
  body { background:#fff !important; }
  .bar { break-inside: avoid; }
}
.bar:hover { background:#F8FAFB; }
`;
