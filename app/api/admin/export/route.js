import { getServerSupabase } from "../../../lib/supabaseServer";
import { headlineFor } from "../../../lib/headline";

export const runtime = "nodejs";

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export async function GET(request) {
  const supabase = getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Not authorized", { status: 403 });

  const type = new URL(request.url).searchParams.get("type") || "contacts";

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,completed_at,assessments(name,slug)")
    .eq("status", "completed")
    .limit(5000);
  const ids = (sessions || []).map((s) => s.id);
  let results = [];
  if (ids.length) {
    const { data } = await supabase.from("results").select("session_id,scored_json").in("session_id", ids);
    results = data || [];
  }
  const scoredBy = Object.fromEntries(results.map((r) => [r.session_id, r.scored_json]));

  let rows;
  if (type === "scores") {
    rows = [["assessment", "completed_at", "headline", "scored_json"]];
    for (const s of sessions || []) {
      const sc = scoredBy[s.id];
      rows.push([s.assessments?.name, s.completed_at, headlineFor(sc), JSON.stringify(sc || {})]);
    }
  } else {
    // contacts — consent-gated is a future refinement; contact captured at intake
    rows = [["first_name", "last_name", "email", "phone", "age_band", "ministry_role", "is_chc", "assessment", "completed_at"]];
    for (const s of sessions || []) {
      const c = scoredBy[s.id]?.contact || {};
      rows.push([c.first_name, c.last_name, c.email, c.phone, c.age_band, c.ministry_role, c.is_chc, s.assessments?.name, s.completed_at]);
    }
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="musa-${type}.csv"`,
    },
  });
}
