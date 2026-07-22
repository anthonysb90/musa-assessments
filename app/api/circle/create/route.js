import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { sendEmail } from "../../../lib/email";
import { APP_URL, ASSESSOR_EMAIL } from "../../../lib/config";

export const runtime = "nodejs";

// Create (or fetch) a co-rater circle for a completed self-assessment. Stores
// the subject's own scored result so the circle report can compare self vs
// observers. Idempotent per result token.
export async function POST(req) {
  try {
    const { result_token } = await req.json();
    if (!result_token) return NextResponse.json({ error: "Missing result." }, { status: 400 });
    const supabase = getServerSupabase();

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
      const html = `<!doctype html><html><body style="margin:0;background:#F6F8FA;font-family:Arial,Helvetica,sans-serif;color:#1C2B3A;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:24px 0;"><tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #E7E9EC;border-radius:14px;overflow:hidden;">
          <tr><td align="center" style="background:#1B3A57;padding:20px 28px;"><img src="${APP_URL}/musa-logo-white.png" alt="Mission USA" height="48" style="height:48px;width:auto;display:inline-block;border:0;" /></td></tr>
          <tr><td style="padding:28px;">
            <h1 style="font-size:21px;margin:0 0 12px;color:#1C2B3A;">A candidate is ready for your assessor review</h1>
            <p style="font-size:15px;line-height:1.6;color:#4A5B6D;"><strong>${candidateName || "A candidate"}</strong> has completed their Church Planter self-assessment. When you're ready, complete your evidence-based assessor rating below. Your rating is folded into their report alongside their own and their spouse's.</p>
            <p style="margin:22px 0;"><a href="${link}" style="display:inline-block;background:#1B3A57;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;font-size:15px;">Complete assessor rating</a></p>
            <p style="font-size:13px;color:#7C8A9C;">Or paste this link:<br><span style="color:#1B3A57;word-break:break-all;">${link}</span></p>
          </td></tr>
        </table></td></tr></table></body></html>`;
      try { await sendEmail({ to: ASSESSOR_EMAIL, subject: `Assessor review: ${candidateName || "new Church Planter candidate"}`, html }); } catch { /* non-fatal */ }
    }

    return NextResponse.json({ code });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
