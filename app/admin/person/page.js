import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

// Per-person drill-down: everything about one person — their info, every
// assessment they've taken, each result summary, timing, and links to the
// full reports. Reached by clicking a name in the People / CRM list.
export default async function PersonPage({ searchParams }) {
  const email = searchParams?.e || "";
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  if (!udata?.user) redirect(`/login?next=/admin/person?e=${encodeURIComponent(email)}`);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return <Center>Not authorized. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;
  if (!email) return <Center>No person selected. <Link href="/admin/people" style={link}>Back to People</Link></Center>;

  // All results whose contact email matches, then their sessions.
  const { data: results } = await supabase
    .from("results")
    .select("session_id,scored_json,created_at,delivered_at")
    .filter("scored_json->contact->>email", "eq", email);
  const byId = Object.fromEntries((results || []).map((r) => [r.session_id, r]));
  const ids = (results || []).map((r) => r.session_id);

  let sessions = [];
  if (ids.length) {
    const { data } = await supabase
      .from("sessions")
      .select("id,result_token,completed_at,duration_seconds,mode,source_tag,church_id,assessments(name,slug)")
      .in("id", ids);
    sessions = data || [];
  }
  const { data: churches } = await supabase.from("churches").select("id,name");
  const churchName = Object.fromEntries((churches || []).map((c) => [c.id, c.name]));

  const items = sessions
    .map((s) => ({ s, r: byId[s.id] }))
    .filter((x) => x.r)
    .sort((a, b) => new Date(b.s.completed_at) - new Date(a.s.completed_at));

  // Profile from the most recent contact block.
  const latest = items[0]?.r?.scored_json?.contact || {};
  const totalSeconds = items.reduce((t, x) => t + (x.s.duration_seconds || 0), 0);
  const first = items.length ? items[items.length - 1].s.completed_at : null;
  const last = items.length ? items[0].s.completed_at : null;

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "34px 24px 70px" }}>
        <Link href="/admin/people" style={link}>← People</Link>
        <h1 className="serif" style={{ fontSize: 30, margin: "12px 0 4px", color: "var(--ink)" }}>
          {`${latest.first_name || ""} ${latest.last_name || ""}`.trim() || email}
        </h1>
        <div style={{ color: "var(--ink-soft)", marginBottom: 22 }}>{email}</div>

        <div style={grid}>
          <Info label="Phone" value={latest.phone} />
          <Info label="Role" value={latest.ministry_role} />
          <Info label="Age" value={latest.age_band} />
          <Info label="CHC" value={latest.is_chc === true ? "Yes" : latest.is_chc === false ? "No" : ""} />
          <Info label="Church" value={items[0]?.s?.church_id ? churchName[items[0].s.church_id] : ""} />
        </div>

        <div style={statRow}>
          <Stat label="Assessments taken" value={items.length} />
          <Stat label="Total time" value={fmtDur(totalSeconds)} />
          <Stat label="First taken" value={fmtDate(first)} />
          <Stat label="Most recent" value={fmtDate(last)} />
        </div>

        <div style={{ fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, margin: "8px 0 14px" }}>
          Everything they've taken
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {items.map(({ s, r }) => {
            const sc = r.scored_json || {};
            return (
              <div key={s.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{s.assessments?.name || "—"}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{fmtDate(s.completed_at)} · {fmtDur(s.duration_seconds)}</div>
                </div>
                <div style={{ fontSize: 14, color: "#2E7D8A", fontWeight: 600, margin: "6px 0 10px" }}>{summarize(sc)}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <TopScores sc={sc} />
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 13, color: "var(--ink-soft)" }}>
                  {s.result_token && <a href={`/results/${s.result_token}`} target="_blank" rel="noreferrer" style={link}>View full report →</a>}
                  <span>Source: {s.source_tag || "public"}{r.delivered_at ? " · emailed" : ""}</span>
                </div>
              </div>
            );
          })}
          {!items.length && <p style={{ color: "var(--ink-soft)" }}>No completed assessments found for this email.</p>}
        </div>
      </div>
    </main>
  );
}

function TopScores({ sc }) {
  let list = [];
  if (sc.type === "domain-bands" || sc.type === "planter") list = (sc.domains || []).slice(0, 4).map((d) => [d.domain, d.average?.toFixed?.(1) ?? d.average]);
  else if (sc.type === "ranked-sum" || sc.type === "gift-rank") list = (sc.ranked || []).slice(0, 3).map((d) => [d.key || d.letter, d.score]);
  else if (sc.type === "pillar") list = (sc.pillars || []).map((p) => [p.pillar, p.average?.toFixed?.(1)]);
  else if (sc.type === "type-pick") list = (sc.ranked || []).slice(0, 3).map((d) => [`Type ${d.type}`, d.score]);
  if (!list.length) return null;
  return (
    <>
      {list.map(([k, v], i) => (
        <span key={i} style={{ fontSize: 12.5, background: "#EEF3F4", color: "#1B3A57", padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>{k}: {v}</span>
      ))}
    </>
  );
}

function summarize(sc) {
  const t = sc.type;
  if (!t) return "";
  if (t === "gift-rank") return `Top gift: ${sc.ranked?.[0]?.letter || ""}`;
  if (t === "ranked-sum") return `Primary: ${sc.ranked?.[0]?.key || ""}`;
  if (t === "domain-bands") return sc.domains?.[0] ? `Strongest: ${sc.domains[0].domain}` : "";
  if (t === "type-pick") return `Type ${sc.primary || ""}`;
  if (t === "planter") return sc.tier_label || "";
  if (t === "disc-blend") return `Blend: ${sc.blend || ""}`;
  if (t === "level-matrix") return `Level ${sc.winnerLevel || ""}`;
  if (t === "pillar") return sc.domains?.[0] ? `Top: ${sc.domains[0].domain}` : "";
  return "";
}

const Info = ({ label, value }) => value ? (
  <div style={infoCard}><div style={infoLabel}>{label}</div><div style={{ color: "var(--ink)", fontWeight: 600 }}>{value}</div></div>
) : null;
const Stat = ({ label, value }) => (
  <div style={statCard}><div style={{ fontSize: 22, fontWeight: 700, color: "#1B3A57" }}>{value}</div><div style={statLbl}>{label}</div></div>
);
const Center = ({ children }) => <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDur = (s) => !s ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 };
const infoCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" };
const infoLabel = { fontSize: 11.5, color: "#8CA0B3", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 2 };
const statRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 26 };
const statCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px" };
const statLbl = { fontSize: 12, color: "#8CA0B3", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, marginTop: 2 };
const card = { background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" };
