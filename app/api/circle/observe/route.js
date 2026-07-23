import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "../../../lib/supabaseServer";
import { buildCircleCompleteEmail, sendEmail } from "../../../lib/email";
import { rateLimit, requestIp } from "../../../lib/ratelimit";

export const runtime = "nodejs";

// Minimum responses before a circle report is considered "complete". The
// schema (migration_20) stores no per-circle minimum and record_circle_response
// returns only the running count, so we use the app's 3-rater floor (the same
// constant rater_groups defaults to, and the number quoted in the report copy).
const CIRCLE_MIN_RESPONSES = 3;

// Record an observer's ratings of the subject. Loads the observer instrument
// (base_slug + role), computes per-domain averages, and stores the aggregate
// on the circle. Individual observer answers are never exposed in reports.
export async function POST(req) {
  try {
    const { circle_code, role, name, answers, honeypot } = await req.json();
    if (honeypot) return NextResponse.json({ ok: true });
    if (!circle_code || !role || !answers) return NextResponse.json({ error: "Missing data." }, { status: 400 });

    // Rate limit: observer ratings feed the aggregate a pastor will act on, so
    // scripted ballot-stuffing must at least be throttled.
    const rl = await rateLimit(`observe:${requestIp(req)}`, 10, 3600);
    if (!rl.ok) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    // Service-role client: review_circles no longer has an anon SELECT policy
    // (migration_34), so the direct read below needs to bypass RLS. Falls back
    // to the anon server client in dev when the service key is unset.
    const supabase = getAdminSupabase() || getServerSupabase();

    const { data: circle } = await supabase
      .from("review_circles").select("base_slug").eq("circle_code", circle_code).maybeSingle();
    if (!circle) return NextResponse.json({ error: "Invalid link." }, { status: 400 });

    const slug = `${circle.base_slug}-${role}`;
    const { data: a } = await supabase.from("assessments").select("id").eq("slug", slug).maybeSingle();
    if (!a) return NextResponse.json({ error: "This role isn't set up." }, { status: 400 });
    const { data: items } = await supabase.from("items").select("id,domain,is_scored").eq("assessment_id", a.id);
    const imap = Object.fromEntries((items || []).map((it) => [it.id, it]));

    const g = {};
    for (const [itemId, value] of Object.entries(answers)) {
      const it = imap[itemId];
      if (!it || it.is_scored === false || !it.domain) continue;
      (g[it.domain] ||= []).push(Number(value));
    }
    const domains = Object.entries(g)
      .map(([domain, vals]) => ({ domain, average: +(vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) }))
      .sort((x, y) => y.average - x.average);

    const { data: rec } = await supabase.rpc("record_circle_response", {
      p_code: circle_code, p_role: role, p_name: name || null, p_json: { domains, scale_max: 5, name: name || null },
    });
    if (!rec?.ok) return NextResponse.json({ error: "Could not record your response." }, { status: 500 });

    // When this response is the one that reaches the minimum, tell the subject
    // their circle report is ready. Strictly equals — never on later responses,
    // so the notice cannot be resent. Best-effort, never blocks the observer.
    if (rec.count === CIRCLE_MIN_RESPONSES) {
      try {
        const { data: circ } = await supabase
          .from("review_circles")
          .select("subject_name,subject_email")
          .eq("circle_code", circle_code)
          .maybeSingle();
        if (circ?.subject_email) {
          const em = buildCircleCompleteEmail({
            subjectName: circ.subject_name,
            circleCode: circle_code,
          });
          await sendEmail({ to: circ.subject_email, subject: em.subject, html: em.html, template: "circle_complete" });
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ok: true, count: rec.count });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
