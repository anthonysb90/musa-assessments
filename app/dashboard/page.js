import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import { headlineFor } from "../lib/headline";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  const user = udata?.user;
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles").select("first_name").eq("id", user.id).maybeSingle();

  // Is this email also a church leader? Offer the church dashboard if so.
  const { data: churchRows } = await supabase
    .from("church_users")
    .select("church_id,status,churches(name)")
    .eq("status", "active");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,result_token,status,completed_at,started_at,assessments(name,slug,subtitle)")
    .order("started_at", { ascending: false });

  const ids = (sessions || []).map((s) => s.id);
  let resultsBySession = {};
  if (ids.length) {
    const { data: results } = await supabase
      .from("results").select("session_id,scored_json").in("session_id", ids);
    resultsBySession = Object.fromEntries((results || []).map((r) => [r.session_id, r.scored_json]));
  }

  const completed = (sessions || []).filter((s) => s.status === "completed");
  const inProgress = (sessions || []).filter((s) => s.status !== "completed");

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={kicker}>Your dashboard</div>
            <h1 className="serif" style={{ fontSize: 34, margin: 0 }}>
              {profile?.first_name ? `Welcome back, ${profile.first_name}` : "Welcome back"}
            </h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost" style={{ background: "rgba(255,255,255,.1)", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>Sign out</button>
          </form>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 70px" }}>
        {(churchRows || []).length > 0 && (
          <Link href="/church" style={churchBanner}>
            You lead {churchRows[0]?.churches?.name || "a church"} on this platform — open your church dashboard →
          </Link>
        )}

        <h2 className="serif" style={h2}>My results</h2>
        {completed.length === 0 && <p style={muted}>You haven't completed an assessment yet.</p>}
        <div style={{ display: "grid", gap: 12 }}>
          {completed.map((s) => {
            const scored = resultsBySession[s.id];
            return (
              <Link key={s.id} href={`/results/${s.result_token}`} style={row}>
                <div>
                  <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{s.assessments?.name}</div>
                  <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                    {scored ? headlineFor(scored) : s.assessments?.subtitle}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, color: "var(--ink-soft)" }}>
                  {s.completed_at && new Date(s.completed_at).toLocaleDateString()}
                  <div style={{ color: "var(--teal-deep)", fontWeight: 600 }}>View →</div>
                </div>
              </Link>
            );
          })}
        </div>

        {inProgress.length > 0 && (
          <>
            <h2 className="serif" style={h2}>In progress</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {inProgress.map((s) => (
                <Link key={s.id} href={`/assessment/${s.assessments?.slug}`} style={row}>
                  <div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{s.assessments?.name}</div>
                  <div style={{ color: "var(--teal-deep)", fontWeight: 600, fontSize: 13.5 }}>Resume →</div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 30 }}>
          <Link className="btn btn-primary" href="/">Take another assessment →</Link>
        </div>
      </div>
    </main>
  );
}

const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "36px 0 30px" };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 8 };
const h2 = { fontSize: 20, color: "var(--ink)", margin: "30px 0 14px", fontWeight: 500 };
const muted = { color: "var(--ink-soft)", fontSize: 15 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px", textDecoration: "none" };
const churchBanner = { display: "block", background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 18px", color: "var(--ink)", textDecoration: "none", fontSize: 14.5, fontWeight: 600, marginBottom: 8 };
