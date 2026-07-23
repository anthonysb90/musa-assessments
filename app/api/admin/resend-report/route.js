import { NextResponse } from "next/server";
import { getServerSupabase, getAdminSupabase } from "../../../lib/supabaseServer";
import { buildResultEmail, sendEmail } from "../../../lib/email";

export const runtime = "nodejs";

// Admin-only: re-send a taker's result email for a given session. Rebuilds the
// same email the submit flow sends. Reads with the service-role client (it must
// reach an arbitrary taker's session/result), but only after verifying the
// caller is a Mission USA admin.
export async function POST(req) {
  try {
    const gate = getServerSupabase();
    const { data: isAdmin } = await gate.rpc("is_admin");
    if (!isAdmin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ error: "Missing session." }, { status: 400 });

    const admin = getAdminSupabase();
    if (!admin) return NextResponse.json({ error: "Email is not fully configured." }, { status: 503 });

    const { data: session } = await admin
      .from("sessions")
      .select("id,result_token,assessment_id")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    const { data: result } = await admin
      .from("results").select("scored_json").eq("session_id", session_id).maybeSingle();
    if (!result) return NextResponse.json({ error: "No result to send." }, { status: 404 });

    const { data: assessment } = await admin
      .from("assessments")
      .select("id,slug,name,category,sensitivity,email_link_only")
      .eq("id", session.assessment_id)
      .maybeSingle();
    if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    const to = result.scored_json?.contact?.email;
    if (!to) return NextResponse.json({ error: "No email on file for this result." }, { status: 400 });

    const { data: others } = await admin.from("assessments").select("slug,name").eq("is_published", true);
    const namesBySlug = Object.fromEntries((others || []).map((a) => [a.slug, a.name]));

    const em = buildResultEmail({
      assessment,
      scored: result.scored_json,
      resultToken: session.result_token,
      namesBySlug,
      sensitive: assessment.sensitivity === "sensitive",
      linkOnly: assessment.email_link_only === true,
    });
    const sent = await sendEmail({ to, subject: em.subject, html: em.html, template: "result_resend" });
    if (!sent?.ok) {
      console.error("resend-report failed:", sent?.status, sent?.error);
      return NextResponse.json({ error: "Could not send the email." }, { status: 502 });
    }
    await admin.from("results").update({ delivered_at: new Date().toISOString() }).eq("session_id", session_id);
    await gate.rpc("admin_log", {
      p_action: "report_resent", p_target_type: "session", p_target_id: session_id,
      p_detail: { to_domain: to.split("@")[1] || null, assessment: assessment.slug },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
