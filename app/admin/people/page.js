import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../../lib/supabaseServer";
import PeopleTable from "./PeopleTable";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  if (!udata?.user) redirect("/login?next=/admin/people");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <h1 className="serif" style={{ color: "var(--ink)" }}>Not authorized</h1>
          <a className="btn btn-ghost" href="/dashboard">My dashboard</a>
        </div>
      </main>
    );
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,result_token,completed_at,status,mode,source_tag,church_id,duration_seconds,assessments(name,slug)")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5000);

  const ids = (sessions || []).map((s) => s.id);
  let results = [];
  if (ids.length) {
    const { data } = await supabase.from("results").select("session_id,scored_json,delivered_at").in("session_id", ids);
    results = data || [];
  }
  const scoredBy = Object.fromEntries(results.map((r) => [r.session_id, r]));

  const { data: churches } = await supabase.from("churches").select("id,name");
  const churchName = Object.fromEntries((churches || []).map((c) => [c.id, c.name]));

  // Build one row per completed session, with a short result summary.
  const rows = (sessions || []).map((s) => {
    const sc = scoredBy[s.id]?.scored_json || {};
    const c = sc.contact || {};
    return {
      token: s.result_token,
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—",
      email: c.email || "",
      phone: c.phone || "",
      assessment: s.assessments?.name || "—",
      slug: s.assessments?.slug || "",
      date: s.completed_at,
      duration: s.duration_seconds || null,
      role: c.ministry_role || "",
      age: c.age_band || "",
      chc: c.is_chc === true ? "CHC" : c.is_chc === false ? "Non-CHC" : "",
      church: s.church_id ? churchName[s.church_id] || "" : "",
      mode: s.mode || "",
      source: s.source_tag || "",
      summary: summarize(sc),
      delivered: !!scoredBy[s.id]?.delivered_at,
    };
  });

  const assessmentNames = Array.from(new Set(rows.map((r) => r.assessment))).sort();

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "34px 24px 70px" }}>
        <Link href="/admin" style={{ color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>← Admin</Link>
        <h1 className="serif" style={{ fontSize: 30, margin: "12px 0 4px", color: "var(--ink)" }}>People</h1>
        <p style={{ color: "var(--ink-soft)", margin: "0 0 22px" }}>
          Everyone who has completed an assessment. Search, filter, open any report, and export the whole list.
        </p>
        <PeopleTable rows={rows} assessments={assessmentNames} />
      </div>
    </main>
  );
}

// Short, human result summary per scoring type for the CRM row.
function summarize(sc) {
  const t = sc.type;
  if (!t) return "";
  if (t === "gift-rank") return `Top gift: ${sc.ranked?.[0]?.letter || ""}`.trim();
  if (t === "ranked-sum") return `Primary: ${sc.ranked?.[0]?.key || ""}`.trim();
  if (t === "domain-bands") return sc.domains?.[0] ? `Strongest: ${sc.domains[0].domain}` : "";
  if (t === "type-pick") return `Type ${sc.primary || ""}`;
  if (t === "planter") return sc.tier_label || "";
  if (t === "disc-blend") return `Blend: ${sc.blend || ""}`;
  if (t === "level-matrix") return `Level ${sc.winnerLevel || ""}`;
  if (t === "pillar") return sc.domains?.[0] ? `Top: ${sc.domains[0].domain}` : "";
  return "";
}
