import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "../../../lib/supabaseServer";
import { buildAssessorEmail, sendEmail } from "../../../lib/email";
import { APP_URL, ASSESSOR_EMAIL } from "../../../lib/config";

export const runtime = "nodejs";

// Create (or fetch) a co-rater circle for a completed self-assessment. Stores
// the subject's own scored result so the circle report can compare self vs
// observers. Idempotent per result token.
export async function POST(req) {
  try {
    const { result_token } = await req.json();
    if (!result_token) return NextResponse.json({ error: "Missing result." }, { status: 400 });
    // Service-role client: review_circles no longer has an anon SELECT policy
    // (migration_34), so the direct reads below need to bypass RLS. Falls back
    // to the anon server client in dev when the service key is unset.
    const supabase = getAdminSupabase() || getServerSupabase();

    const { data: session } = await supabase
      .from("sessions").select("id,assessments(slug)").eq("result_token", result_token).maybeSingle();
    if (!session) return NextResponse.json({ error: "Result not found." }, { status: 404 });
    const { data: result } = await supabase
      .from("results").select("scored_json").eq("session_id", session.id).maybeSingle();
    if (!result) return NextResponse.json({ error: "Result not found." }, { status: 404 });

    const sc = result.scored_json || {};
    const c = sc.contact || {};
    const slug = session.assessments?.slug;

    // Was a circle already created for this result? If so this is a revisit and
    // we must not re-notify the assessor.
    const { data: existing } = await supabase
      .from("review_circles").select("circle_code").eq("result_token", result_token).maybeSingle();

    const candidateName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || null;
    const { data: code } = await supabase.rpc("create_circle", {
      p_base_slug: slug,
      p_subject_name: candidateName,
      p_subject_email: c.email || null,
      p_self: sc,
      p_token: result_token,
    });

    // Church Planter: Mission USA always provides the assessor. On first
    // creation, notify the assessor with their rating link. Best-effort.
    if (!existing && slug === "church-planter" && code && ASSESSOR_EMAIL) {
      const link = `${APP_URL}/observe/${code}?role=assessor`;
      const em = buildAssessorEmail({ candidateName, circleCode: code, assessorLink: link });
      try {
        await sendEmail({ to: ASSESSOR_EMAIL, subject: em.subject, html: em.html, template: "assessor_review" });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ code });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
