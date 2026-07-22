"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { APP_URL } from "../../lib/config";
import InviteSender from "../../components/InviteSender";

const ROLES = {
  "leadership-health": [{ key: "peer", label: "Peers & team members" }],
  // Church Planter: the candidate only invites their spouse. Mission USA
  // always provides the assessor, who is notified separately.
  "church-planter": [{ key: "spouse", label: "Your spouse" }],
};

export default function CircleReport() {
  const { code } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [agg, setAgg] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("circle_aggregate", { p_code: code });
      if (!data?.ok) { setState("notfound"); return; }
      setAgg(data); setState("ready");
    })();
  }, [code, supabase]);

  const rows = useMemo(() => {
    if (!agg) return [];
    const self = Object.fromEntries((agg.self || []).map((d) => [d.domain, Number(d.average)]));
    const obs = Object.fromEntries((agg.observers || []).map((d) => [d.domain, Number(d.average)]));
    const domains = Array.from(new Set([...Object.keys(self), ...Object.keys(obs)]));
    return domains.map((domain) => {
      const s = self[domain] ?? null, o = obs[domain] ?? null;
      const gap = s != null && o != null ? +(s - o).toFixed(1) : null;
      return { domain, self: s, obs: o, gap };
    }).sort((a, b) => (b.obs ?? b.self ?? 0) - (a.obs ?? a.self ?? 0));
  }, [agg]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "notfound") return <Center>We couldn&rsquo;t find that circle.</Center>;

  const roles = ROLES[agg.base_slug] || [{ key: "peer", label: "Others" }];
  const hasObs = agg.observer_count > 0;
  const blindspots = rows.filter((r) => r.gap != null && r.gap >= 0.75).sort((a, b) => b.gap - a.gap).slice(0, 3);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
          <div style={kicker}>Co-rater report · multiple voices</div>
          <h1 className="serif" style={hName}>{agg.subject_name || "Your circle"}</h1>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.8)", marginTop: 6 }}>
            {agg.observer_count} {agg.observer_count === 1 ? "person has" : "people have"} added their perspective
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 28px 70px" }}>
        <section style={{ ...card, marginBottom: 20 }}>
          <div className="serif" style={{ fontSize: 20, color: "var(--ink)", marginBottom: 6 }}>The fullest picture comes from more than one voice.</div>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
            Your own view matters, but the people around you see things you can&rsquo;t see about yourself.
            Invite a few honest voices below. Their input stays private, only the combined picture shows here.
          </p>
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            {roles.map((r) => {
              const link = `${APP_URL}/observe/${code}?role=${r.key}`;
              return (
                <div key={r.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <InviteSender link={link} context={`a review for ${agg.subject_name || "a leader"}`} fromName={agg.subject_name} roleLabel={`Invite: ${r.label}`} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ ...codeInp }} />
                    <CopyBtn value={link} />
                  </div>
                </div>
              );
            })}
          </div>
          {agg.base_slug === "church-planter" && (
            <div style={{ marginTop: 14, fontSize: 13.5, color: "var(--ink-soft)", background: "var(--mist)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.55 }}>
              A Mission USA assessor completes the evidence-based review for every candidate. They&rsquo;ve
              already been notified, and their rating will appear here automatically, alongside your spouse&rsquo;s.
            </div>
          )}
        </section>

        {!hasObs ? (
          <section style={waitCard}>
            <div className="serif" style={{ fontSize: 20, color: "var(--ink)", marginBottom: 6 }}>No one has responded yet</div>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              As soon as someone completes their part, their view appears here next to yours. Share a link above to get started.
            </p>
          </section>
        ) : (
          <>
            <section style={{ padding: "4px 0 6px" }}>
              <div style={label}>You vs. how others see you</div>
              <div style={legend}>
                <span><span style={{ ...dot, background: "#2E7D8A" }} /> You</span>
                <span><span style={{ ...dot, background: "#C4923E" }} /> Others (avg of {agg.observer_count})</span>
              </div>
              <div style={chart}>
                {rows.map((r) => (
                  <div key={r.domain} style={row}>
                    <span style={rName}>{r.domain}</span>
                    <span style={{ display: "grid", gap: 5 }}>
                      <Bar frac={(r.self ?? 0) / 5} color="#2E7D8A" />
                      <Bar frac={(r.obs ?? 0) / 5} color="#C4923E" />
                    </span>
                    <span style={{ ...rScore, minWidth: 74, textAlign: "right", color: "#3A4A5A" }}>
                      {r.self != null ? r.self.toFixed(1) : "—"} / {r.obs != null ? r.obs.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {blindspots.length > 0 && (
              <section style={{ padding: "18px 0 4px" }}>
                <div style={label}>Where you may have a blind spot</div>
                {blindspots.map((r) => (
                  <div key={r.domain} style={{ ...card, marginBottom: 12 }}>
                    <div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{r.domain}</div>
                    <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "6px 0 0", lineHeight: 1.55 }}>
                      You rated this about {r.gap.toFixed(1)} point{r.gap === 1 ? "" : "s"} higher than others did
                      (you {r.self.toFixed(1)}, others {r.obs.toFixed(1)}). Where you see yourself more highly than
                      the people around you, that gap is worth a humble, honest look.
                    </p>
                  </div>
                ))}
              </section>
            )}
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 18, lineHeight: 1.55 }}>
              This is a mirror held by people who know you, not a verdict. Take what rings true to God in prayer,
              and keep leading from your real design.
            </p>
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
  return <button className="btn btn-ghost" style={{ padding: "9px 14px" }} onClick={() => { navigator.clipboard?.writeText(value); setC(true); setTimeout(() => setC(false), 1500); }}>{c ? "Copied" : "Copy"}</button>;
}
const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "var(--ink-soft)", textAlign: "center" }}>{children}</main>
);
const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "38px 0 30px" };
const kicker = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700, marginBottom: 8 };
const hName = { fontWeight: 500, fontSize: 34, margin: 0 };
const label = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const card = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" };
const waitCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px" };
const chart = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "6px 10px" };
const row = { display: "grid", gridTemplateColumns: "1fr 2fr 74px", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 8, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const rScore = { fontSize: 14, fontWeight: 700 };
const legend = { display: "flex", gap: 18, fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, fontWeight: 600 };
const dot = { display: "inline-block", width: 10, height: 10, borderRadius: 999, marginRight: 6, verticalAlign: "middle" };
const codeInp = { flex: 1, fontFamily: "monospace", fontSize: 12, padding: "9px 11px", borderRadius: 8, border: "1.5px solid var(--line)" };
