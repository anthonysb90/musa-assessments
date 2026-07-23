"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { domainBand, CHURCH_HEALTH_DOMAINS } from "../../lib/content";
import { APP_URL } from "../../lib/config";

export default function TeamResults() {
  const { code } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [group, setGroup] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      // Code-gated RPC (rater_groups has no anon SELECT policy): returns group
      // metadata plus the aggregate only once the min-raters floor is met.
      const { data } = await supabase.rpc("team_by_code", { p_code: code });
      if (!data?.ok) { setState("notfound"); return; }
      setGroup(data.group); setAssessment(data.assessment); setState("ready");
    })();
  }, [code, supabase]);

  const domains = useMemo(() => {
    const ds = group?.aggregate_json?.domains || [];
    return ds.map((d) => ({ ...d, average: Number(d.average), spread: Number(d.spread) }));
  }, [group]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "notfound") return <Center>We couldn't find that team.</Center>;

  const ready = !!group.aggregate_json && domains.length > 0;
  const raterLink = `${APP_URL}/assessment/${assessment?.slug}/start?team=${group.team_code}`;
  const min = group.min_raters || 3;

  // weakest leads; widest spread; top 2 strengths
  const byScore = [...domains].sort((a, b) => a.average - b.average);
  const weakest = byScore[0];
  const strengths = [...domains].sort((a, b) => b.average - a.average).slice(0, 2);
  const widest = [...domains].sort((a, b) => b.spread - a.spread)[0];
  const focus = byScore.slice(0, 2);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
          <div style={kicker}>{assessment?.name} · Team report</div>
          <h1 className="serif" style={hName}>{group.church_name || "Your leadership team"}</h1>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.8)", marginTop: 6 }}>
            {group.rater_count} {group.rater_count === 1 ? "response" : "responses"}
            {!ready && ` · ${Math.max(0, min - group.rater_count)} more to unlock`}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 28px 70px" }}>
        {!ready ? (
          <section style={waitCard}>
            <div className="serif" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>
              {group.rater_count} of {min} responses in
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, marginTop: 0 }}>
              The combined report unlocks once at least {min} leaders have completed it. This protects
              everyone's anonymity, no individual answers are ever shown. Keep sharing the link:
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...inp, fontFamily: "monospace", fontSize: 13 }} readOnly value={raterLink} onFocus={(e) => e.target.select()} />
              <CopyBtn value={raterLink} />
            </div>
          </section>
        ) : (
          <>
            <section style={{ padding: "6px 0 4px" }}>
              <div style={label}>Where to focus first</div>
              <div style={{ ...card, borderLeft: "5px solid #C4923E" }}>
                <div className="serif" style={{ fontSize: 24, color: "var(--ink)" }}>{weakest.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(weakest.average).color, margin: "4px 0 10px" }}>
                  {weakest.average.toFixed(1)} · {domainBand(weakest.average).label}
                </div>
                <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>
                  Your church is as healthy as its weakest area until this one gets attention, so it leads the report.
                </p>
              </div>
            </section>

            <section style={{ padding: "22px 0 6px" }}>
              <div style={label}>All eight qualities</div>
              <div style={chart}>
                {domains.map((d) => {
                  const band = domainBand(d.average);
                  return (
                    <div key={d.domain} style={row}>
                      <span style={rName}>{d.domain}</span>
                      <span style={track}><span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(d.average / 5) * 100}%`, background: band.color }} /></span>
                      <span style={{ ...rScore, color: band.color }}>{d.average.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ padding: "10px 0 4px" }}>
              <div style={label}>Where you're strong</div>
              <div style={grid2}>
                {strengths.map((d) => (
                  <div key={d.domain} style={card}>
                    <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{d.domain}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1B3A57", marginTop: 4 }}>{d.average.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </section>

            {widest && (
              <section style={{ padding: "16px 0 4px" }}>
                <div style={label}>Where your team disagrees most</div>
                <div style={card}>
                  <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{widest.domain}</div>
                  <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "6px 0 0", lineHeight: 1.55 }}>
                    Your leaders' scores here span {widest.spread.toFixed(1)} points. A wide gap is information
                    the average hides, it's worth talking through as a team.
                  </p>
                </div>
              </section>
            )}

            <section style={{ padding: "16px 0 4px" }}>
              <div style={label}>Bring to your next leadership meeting</div>
              {focus.map((d) => (
                <div key={d.domain} style={{ ...card, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{d.domain}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: domainBand(d.average).color }}>{domainBand(d.average).label}</div>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.55 }}>
                    {CHURCH_HEALTH_DOMAINS[d.domain]?.step}
                  </p>
                </div>
              ))}
            </section>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 12.5, color: "#8CA0B3" }}>
              Based on {group.rater_count} anonymous responses · A ministry resource of Mission USA
            </div>
          </>
        )}
      </div>
    </main>
  );
}

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
const row = { display: "grid", gridTemplateColumns: "1fr 2fr 46px", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const rScore = { fontSize: 15, fontWeight: 700, textAlign: "right" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 };
const inp = { width: "100%", padding: "11px 13px", fontSize: 14, borderRadius: 10, border: "1.5px solid var(--line)" };
