"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { domainBand, CALLED_TOGETHER_DOMAINS } from "../../lib/content";
import { APP_URL } from "../../lib/config";

export default function CoupleReport() {
  const { code } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [couple, setCouple] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      // Code-gated RPC (couples has no anon SELECT policy): returns names and
      // progress always, spouse domain JSONs only once both are done.
      const { data } = await supabase.rpc("couple_by_code", { p_code: code });
      if (!data?.ok) { setState("notfound"); return; }
      setCouple(data.couple); setAssessment(data.assessment); setState("ready");
    })();
  }, [code, supabase]);

  const both = !!(couple?.spouse1_done_at && couple?.spouse2_done_at);
  const name1 = couple?.spouse1_name || "Spouse 1";
  const name2 = couple?.spouse2_name || "Spouse 2";

  const rows = useMemo(() => {
    if (!both) return [];
    const d1 = Object.fromEntries((couple.spouse1_json?.domains || []).map((d) => [d.domain, Number(d.average)]));
    const d2 = Object.fromEntries((couple.spouse2_json?.domains || []).map((d) => [d.domain, Number(d.average)]));
    const names = Object.keys(CALLED_TOGETHER_DOMAINS).filter((n) => d1[n] != null || d2[n] != null);
    return names.map((domain) => {
      const a = d1[domain] ?? 0, b = d2[domain] ?? 0;
      const lower = Math.min(a, b);
      return { domain, a, b, lower, gap: +Math.abs(a - b).toFixed(1) };
    });
  }, [couple, both]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "notfound") return <Center>We couldn't find that couple report.</Center>;

  const takeLink = `${APP_URL}/assessment/${assessment?.slug}/start?couple=${couple.couple_code}`;
  const doneCount = (couple.spouse1_done_at ? 1 : 0) + (couple.spouse2_done_at ? 1 : 0);

  const byLower = [...rows].sort((x, y) => x.lower - y.lower);
  const focusFirst = byLower[0];
  const strengths = [...rows].sort((x, y) => y.lower - x.lower).slice(0, 2);
  const widest = [...rows].sort((x, y) => y.gap - x.gap)[0];
  const conversation = byLower.slice(0, 2);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
          <div style={kicker}>{assessment?.name} · Couple report</div>
          <h1 className="serif" style={hName}>{both ? `${name1} & ${name2}` : "Your couple report"}</h1>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.8)", marginTop: 6 }}>
            {doneCount} of 2 finished{!both && " · one more to unlock"}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 28px 70px" }}>
        {!both ? (
          <section style={waitCard}>
            <div className="serif" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>
              {doneCount === 0 ? "No one has finished yet" : `${couple.spouse1_done_at ? name1 : name2} has finished`}
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, marginTop: 0 }}>
              Your report unlocks the moment you've both completed your part. Send the same link to whoever
              hasn't finished yet. Neither of you sees the other's individual answers, only the combined
              picture below, once you're both done.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...inp, fontFamily: "monospace", fontSize: 13 }} readOnly value={takeLink} onFocus={(e) => e.target.select()} />
              <CopyBtn value={takeLink} />
            </div>
          </section>
        ) : (
          <>
            <section style={{ padding: "6px 0 4px" }}>
              <div style={label}>Where to grow first, together</div>
              <div style={{ ...card, borderLeft: "5px solid #C4923E" }}>
                <div className="serif" style={{ fontSize: 24, color: "var(--ink)" }}>{focusFirst.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(focusFirst.lower).color, margin: "4px 0 10px" }}>
                  {domainBand(focusFirst.lower).label}
                </div>
                <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>
                  {CALLED_TOGETHER_DOMAINS[focusFirst.domain]?.step}
                </p>
              </div>
            </section>

            <section style={{ padding: "22px 0 6px" }}>
              <div style={label}>All eight domains, both of you</div>
              <div style={legend}>
                <span><span style={{ ...dot, background: "#2E7D8A" }} /> {name1}</span>
                <span><span style={{ ...dot, background: "#C4923E" }} /> {name2}</span>
              </div>
              <div style={chart}>
                {rows.map((d) => (
                  <div key={d.domain} style={row}>
                    <span style={rName}>{d.domain}</span>
                    <span style={{ display: "grid", gap: 5 }}>
                      <Bar frac={d.a / 5} color="#2E7D8A" />
                      <Bar frac={d.b / 5} color="#C4923E" />
                    </span>
                    <span style={{ ...rScore, color: domainBand(d.lower).color, minWidth: 70, textAlign: "right" }}>
                      {d.a.toFixed(1)} / {d.b.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              <p style={helper}>
                Each domain shows both of your views. The report leans on the lower of the two, because a
                marriage is carried at the pace of whoever is finding it harder right now. That's not a
                criticism, it's where love shows up.
              </p>
            </section>

            <section style={{ padding: "10px 0 4px" }}>
              <div style={label}>Where you're strongest together</div>
              <div style={grid2}>
                {strengths.map((d) => (
                  <div key={d.domain} style={card}>
                    <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{d.domain}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1B3A57", marginTop: 4 }}>
                      {d.a.toFixed(1)} · {d.b.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {widest && widest.gap >= 1 && (
              <section style={{ padding: "16px 0 4px" }}>
                <div style={label}>The biggest gap between you</div>
                <div style={card}>
                  <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{widest.domain}</div>
                  <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "6px 0 10px", lineHeight: 1.55 }}>
                    Here you see this part of your marriage about {widest.gap} point{widest.gap === 1 ? "" : "s"} differently
                    ({name1} {widest.a.toFixed(1)}, {name2} {widest.b.toFixed(1)}). That gap isn't a problem to fix, it's a
                    conversation to have. The one who scored it lower is worth listening to first.
                  </p>
                  <p style={{ fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.55 }}>
                    {CALLED_TOGETHER_DOMAINS[widest.domain]?.step}
                  </p>
                </div>
              </section>
            )}

            <section style={{ padding: "16px 0 4px" }}>
              <div style={label}>Talk through these this week</div>
              {conversation.map((d) => (
                <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{d.domain}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: domainBand(d.lower).color }}>{domainBand(d.lower).label}</div>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.55 }}>
                    {CALLED_TOGETHER_DOMAINS[d.domain]?.step}
                  </p>
                </div>
              ))}
            </section>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 12.5, color: "#8CA0B3" }}>
              A private couple report · A ministry resource of Mission USA · Assessment by Mission USA of the Congregational Holiness Church.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const Bar = ({ frac, color }) => (
  <span style={track}><span style={{ display: "block", height: "100%", borderRadius: 999, width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color }} /></span>
);
function CopyBtn({ value }) {
  const [c, setC] = useState(false);
  return (
    <button className="btn btn-ghost" style={{ padding: "10px 14px" }}
      onClick={() => { navigator.clipboard?.writeText(value); setC(true); setTimeout(() => setC(false), 1500); }}>
      {c ? "Copied" : "Copy"}
    </button>
  );
}
const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "var(--ink-soft)", textAlign: "center" }}>{children}</main>
);
const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "38px 0 30px" };
const kicker = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700, marginBottom: 8 };
const hName = { fontWeight: 500, fontSize: 34, margin: 0 };
const label = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const card = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" };
const waitCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "26px 24px" };
const chart = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "6px 10px" };
const row = { display: "grid", gridTemplateColumns: "1fr 2fr 70px", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 8, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const rScore = { fontSize: 14, fontWeight: 700, textAlign: "right" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 };
const inp = { width: "100%", padding: "11px 13px", fontSize: 14, borderRadius: 10, border: "1.5px solid var(--line)" };
const legend = { display: "flex", gap: 18, fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, fontWeight: 600 };
const dot = { display: "inline-block", width: 10, height: 10, borderRadius: 999, marginRight: 6, verticalAlign: "middle" };
const helper = { fontSize: 13.5, color: "var(--ink-soft)", marginTop: 16, lineHeight: 1.55 };
