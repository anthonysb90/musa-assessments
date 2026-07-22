import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import { headlineFor } from "../lib/headline";
import { APP_URL } from "../lib/config";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

export default async function ChurchDashboard() {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  const user = udata?.user;
  if (!user) redirect("/login?next=/church");

  // Which active churches does this user lead?
  const { data: memberships } = await supabase
    .from("church_users")
    .select("church_id,status,churches(id,name,results_visibility)")
    .eq("status", "active");

  const churches = (memberships || []).map((m) => m.churches).filter(Boolean);
  if (churches.length === 0) {
    return (
      <Centered>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <h1 className="serif" style={{ color: "var(--ink)" }}>No church dashboard yet</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            This account isn't set up as a church leader. If your church should have a dashboard,
            ask your Mission USA contact to invite you.
          </p>
          <a className="btn btn-ghost" href="/dashboard">My dashboard</a>
        </div>
      </Centered>
    );
  }

  const church = churches[0];

  // Assigned assessments (scopes what the dashboard shows) + assignment links.
  const { data: assigned } = await supabase
    .from("church_assessments")
    .select("assignment_token,is_required,assessments(name,slug)")
    .eq("church_id", church.id);
  const assignedIds = new Set((assigned || []).map((a) => a.assessments?.slug));

  // Sessions for this church (RLS enforces church-admin + named visibility).
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,result_token,completed_at,status,assessments(name,slug)")
    .eq("church_id", church.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const ids = (sessions || []).map((s) => s.id);
  let scoredBy = {};
  if (ids.length) {
    const { data: results } = await supabase.from("results").select("session_id,scored_json").in("session_id", ids);
    scoredBy = Object.fromEntries((results || []).map((r) => [r.session_id, r.scored_json]));
  }
  // Only show results for assessments assigned to this church.
  const visible = (sessions || []).filter((s) => assignedIds.has(s.assessments?.slug));

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={wrap}>
          <div style={kicker}>Church dashboard</div>
          <h1 className="serif" style={{ fontSize: 32, margin: 0 }}>{church.name}</h1>
        </div>
      </header>
      <div style={{ ...wrap, padding: "26px 24px 70px" }}>
        <section style={panel}>
          <div style={panelH}>Assignment links</div>
          {(assigned || []).length === 0 && (
            <p style={{ color: "var(--ink-soft)", margin: 0 }}>
              No assessments assigned yet. Ask your Mission USA contact to assign assessments to your church.
            </p>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            {(assigned || []).map((a) => (
              <div key={a.assignment_token} style={linkRow}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{a.assessments?.name}</span>
                <code style={code}>{`${APP_URL}/assessment/${a.assessments?.slug}?a=${a.assignment_token}`}</code>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <div style={panelH}>Members' results ({visible.length})</div>
          <div style={{ display: "grid", gap: 8 }}>
            {visible.map((s) => {
              const c = scoredBy[s.id]?.contact || {};
              return (
                <Link key={s.id} href={`/results/${s.result_token}`} style={memberRow}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {c.first_name} {c.last_name}
                  </span>
                  <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{s.assessments?.name}</span>
                  <span style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>{headlineFor(scoredBy[s.id])}</span>
                  <span style={{ color: "var(--teal-deep)", fontWeight: 600, fontSize: 13, textAlign: "right" }}>View →</span>
                </Link>
              );
            })}
            {visible.length === 0 && <p style={{ color: "var(--ink-soft)", margin: 0 }}>No completed results yet.</p>}
          </div>
        </section>

        <section style={panel}>
          <div style={panelH}>Invite another leader</div>
          <InviteForm churchId={church.id} />
        </section>
      </div>
    </main>
  );
}

const Centered = ({ children }) => (
  <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>{children}</main>
);
const wrap = { maxWidth: 820, margin: "0 auto", padding: "0 24px" };
const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "34px 0 28px" };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 8 };
const panel = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", marginTop: 16 };
const panelH = { fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const linkRow = { display: "grid", gap: 4, padding: "10px 0", borderBottom: "1px solid #F0F2F4" };
const code = { fontSize: 12, color: "#4A5B6D", wordBreak: "break-all", background: "#F6F8FA", padding: "6px 8px", borderRadius: 8 };
const memberRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 10, textDecoration: "none", borderBottom: "1px solid #F0F2F4" };
