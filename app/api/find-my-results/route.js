import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../lib/supabaseServer";
import { buildResultEmail, sendEmail } from "../../lib/email";
import { verifyTurnstile } from "../../lib/turnstile";
import { rateLimit, requestIp } from "../../lib/ratelimit";

export const runtime = "nodejs";

// Public self-serve recovery: a taker enters the email they used and we re-send
// links to any results matching it. Always responds with the same generic
// message so it can't be used to test whether an email exists (no enumeration).
export async function POST(req) {
  try {
    const { email, turnstileToken } = await req.json();
    const generic = NextResponse.json({
      ok: true,
      message: "If we found results for that email, we've sent the links. Check your inbox.",
    });

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return generic;

    const ip = requestIp(req);
    const [byIp, byEmail] = await Promise.all([
      rateLimit(`findresults:ip:${ip}`, 5, 3600),
      rateLimit(`findresults:email:${String(email).toLowerCase()}`, 3, 3600),
    ]);
    if (!byIp.ok || !byEmail.ok) return generic; // stay generic even when limited

    const ts = await verifyTurnstile(turnstileToken, ip);
    if (!ts.ok) return generic;

    const admin = getAdminSupabase();
    if (!admin) return generic;

    // Find results whose stored contact email matches (case-insensitive).
    const { data: results } = await admin
      .from("results")
      .select("session_id,scored_json")
      .filter("scored_json->contact->>email", "ilike", String(email))
      .limit(25);
    if (!results?.length) return generic;

    const sessionIds = results.map((r) => r.session_id);
    const { data: sessions } = await admin
      .from("sessions").select("id,result_token,assessment_id").in("id", sessionIds);
    const sessById = Object.fromEntries((sessions || []).map((s) => [s.id, s]));

    const { data: assessments } = await admin
      .from("assessments").select("id,slug,name,category,sensitivity,email_link_only,is_published");
    const aById = Object.fromEntries((assessments || []).map((a) => [a.id, a]));
    const namesBySlug = Object.fromEntries((assessments || []).filter((a) => a.is_published).map((a) => [a.slug, a.name]));

    let sentAny = false;
    for (const r of results) {
      const s = sessById[r.session_id];
      const a = s && aById[s.assessment_id];
      if (!s || !a || !s.result_token) continue;
      // Don't re-expose withheld or sensitive reports via self-serve; those
      // require the proper gated flow.
      if (a.sensitivity === "sensitive") continue;
      const em = buildResultEmail({
        assessment: a, scored: r.scored_json, resultToken: s.result_token,
        namesBySlug, sensitive: false, linkOnly: a.email_link_only === true,
      });
      const out = await sendEmail({ to: String(email), subject: em.subject, html: em.html, template: "result_recovery" });
      if (out?.ok) sentAny = true;
    }
    if (sentAny) {
      await admin.from("email_log").insert({
        template: "result_recovery_batch", to_domain: String(email).split("@")[1] || null, ok: true, status: 200,
      }).then(() => {}, () => {});
    }
    return generic;
  } catch {
    return NextResponse.json({
      ok: true,
      message: "If we found results for that email, we've sent the links. Check your inbox.",
    });
  }
}
