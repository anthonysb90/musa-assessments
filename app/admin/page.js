import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import { headlineFor } from "../lib/headline";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  const user = udata?.user;
  if (!user) redirect("/login?next=/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <h1 className="serif" style={{ color: "var(--ink)" }}>Not authorized</h1>
          <p style={{ color: "var(--ink-soft)" }}>This area is limited to Mission USA staff.</p>
          <a className="btn btn-ghost" href="/dashboard">Go to my dashboard</a>
        </div>
      </Centered>
    );
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,result_token,completed_at,status,mode,source_tag,church_id,duration_seconds,assessments(name,slug)")
    .order("completed_at", { ascending: false })
    .limit(2000);

  const ids = (sessions || []).map((s) => s.id);
  let results = [];
  if (ids.length) {
    const { data } = await supabase.from("results").select("session_id,scored_json,delivered_at").in("session_id", ids);
    results = data || [];
  }
  const scoredBy = Object.fromEntries(results.map((r) => [r.session_id, r]));

  const completed = (sessions || []).filter((s) => s.status === "completed");
  const byAssessment = tally(completed.map((s) => s.assessments?.name || "—"));
  const roles = completed.map((s) => scoredBy[s.id]?.scored_json?.contact?.ministry_role || "Unspecified");
  const byRole = tally(roles);
  const chc = completed.map((s) => {
    const v = scoredBy[s.id]?.scored_json?.contact?.is_chc;
    return v === true ? "CHC" : v === false ? "Non-CHC" : "Unspecified";
  });
  const byChc = tally(chc);
  const delivered = results.filter((r) => r.delivered_at).length;
  const avgMin = completed.length
    ? Math.round(
        (completed.reduce((a, s) => a + (s.duration_seconds || 0), 0) / completed.length) / 60 * 10
      ) / 10
    : 0;

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={wrap}>
          <div style={kicker}>Mission USA · Admin</div>
          <h1 className="serif" style={{ fontSize: 32, margin: 0 }}>Assessment analytics</h1>
        </div>
      </header>
      <div style={{ ...wrap, padding: "26px 24px 70px" }}>
        <div style={statGrid}>
          <Stat n={completed.length} label="Completions" />
          <Stat n={(sessions || []).length} label="Sessions started" />
          <Stat n={delivered} label="Reports emailed" />
          <Stat n={avgMin ? `${avgMin}m` : "—"} label="Avg. time" />
        </div>

        <div style={{ display: "flex", gap: 12, margin: "18px 0 26px", flexWrap: "wrap" }}>
          <a className="btn btn-ghost" href="/api/admin/export?type=contacts">Export contacts (CSV)</a>
          <a className="btn btn-ghost" href="/api/admin/export?type=scores">Export scores (CSV)</a>
        </div>

        <Panel title="By assessment"><Bars data={byAssessment} /></Panel>
        <Panel title="By ministry role"><Bars data={byRole} /></Panel>
        <Panel title="CHC vs non-CHC"><Bars data={byChc} /></Panel>

        <Panel title="Recent completions">
          <div style={{ display: "grid", gap: 8 }}>
            {completed.slice(0, 15).map((s) => (
              <Link key={s.id} href={`/results/${s.result_token || ""}`} style={recentRow}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{s.assessments?.name}</span>
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  {headlineFor(scoredBy[s.id]?.scored_json)}
                </span>
                <span style={{ color: "var(--ink-soft)", fontSize: 12.5, textAlign: "right" }}>
                  {s.completed_at && new Date(s.completed_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
            {completed.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No completions yet.</p>}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function tally(arr) {
  const m = {};
  for (const k of arr) m[k] = (m[k] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function Stat({ n, label }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#1B3A57" }}>{n}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <section style={panel}>
      <div style={panelH}>{title}</div>
      {children}
    </section>
  );
}
function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  if (!data.length) return <p style={{ color: "var(--ink-soft)", margin: 0 }}>No data yet.</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {data.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "180px 1fr 40px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{k}</span>
          <span style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(v / max) * 100}%`, background: "#2E7D8A", borderRadius: 999 }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1B3A57", textAlign: "right" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
const Centered = ({ children }) => (
  <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>{children}</main>
);

const wrap = { maxWidth: 820, margin: "0 auto", padding: "0 24px" };
const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "34px 0 28px" };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 8 };
const statGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 };
const statCard = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px" };
const panel = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", marginTop: 16 };
const panelH = { fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const recentRow = { display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 10, textDecoration: "none", borderBottom: "1px solid #F0F2F4" };
