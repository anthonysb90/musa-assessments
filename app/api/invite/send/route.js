import { NextResponse } from "next/server";
import { sendSms } from "../../../lib/clearstream";
import { renderEmail, sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";
import { getAdminSupabase, getServerSupabase } from "../../../lib/supabaseServer";
import { rateLimit, requestIp } from "../../../lib/ratelimit";

export const runtime = "nodejs";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Send a personal assessment link by text (Clearstream) or email (Emailit).
// Used by the multi-person flows: team, couple, and the co-rater circles.
//
// SECURITY: this endpoint used to accept an arbitrary link/context/fromName,
// which made it an open, unauthenticated relay for phishing from our own
// domain. It now accepts only { method, to, name, kind, code, role } and
// builds the link, context, and sender name SERVER-SIDE from the group the
// code belongs to. An invalid code sends nothing.
// Body: { method: 'sms'|'email', to, name, kind: 'team'|'couple'|'circle', code, role? }
export async function POST(req) {
  try {
    const { method, to, name, kind, code, role } = await req.json();
    if (!to || !kind || !code) {
      return NextResponse.json({ error: "Missing recipient or invite code." }, { status: 400 });
    }

    // Rate limit: invites are person-to-person, not bulk.
    const ip = requestIp(req);
    const rl = await rateLimit(`invite:${ip}`, 8, 3600);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many invites sent. Please try again later." }, { status: 429 });
    }

    const supabase = getAdminSupabase() || getServerSupabase();
    const codeStr = String(code).trim();
    let link = "", context = "", fromName = "";

    if (kind === "team") {
      const { data: g } = await supabase
        .from("rater_groups")
        .select("team_code,church_name,assessment_id")
        .eq("team_code", codeStr)
        .maybeSingle();
      if (!g) return NextResponse.json({ error: "That team link is no longer valid." }, { status: 404 });
      const { data: a } = await supabase
        .from("assessments").select("slug,name").eq("id", g.assessment_id).maybeSingle();
      if (!a) return NextResponse.json({ error: "That team link is no longer valid." }, { status: 404 });
      link = `${APP_URL}/assessment/${a.slug}/start?team=${encodeURIComponent(g.team_code)}`;
      context = `the ${a.name} team review`;
      fromName = g.church_name || "";
    } else if (kind === "couple") {
      const { data: c } = await supabase
        .from("couples")
        .select("couple_code,assessment_id,spouse1_name")
        .eq("couple_code", codeStr)
        .maybeSingle();
      if (!c) return NextResponse.json({ error: "That couple link is no longer valid." }, { status: 404 });
      const { data: a } = await supabase
        .from("assessments").select("slug,name").eq("id", c.assessment_id).maybeSingle();
      if (!a) return NextResponse.json({ error: "That couple link is no longer valid." }, { status: 404 });
      link = `${APP_URL}/assessment/${a.slug}/start?couple=${encodeURIComponent(c.couple_code)}`;
      context = `the ${a.name} assessment`;
      fromName = c.spouse1_name || "";
    } else if (kind === "circle") {
      const { data: circ } = await supabase
        .from("review_circles")
        .select("circle_code,subject_name")
        .eq("circle_code", codeStr)
        .maybeSingle();
      if (!circ) return NextResponse.json({ error: "That review link is no longer valid." }, { status: 404 });
      const safeRole = /^[a-z0-9_-]{1,32}$/.test(String(role || "")) ? String(role) : "";
      link = `${APP_URL}/observe/${encodeURIComponent(circ.circle_code)}${safeRole ? `?role=${safeRole}` : ""}`;
      context = `a review for ${circ.subject_name || "a leader"}`;
      fromName = circ.subject_name || "";
    } else {
      return NextResponse.json({ error: "Unknown invite type." }, { status: 400 });
    }

    const who = name ? `${name}, ` : "";
    const by = fromName ? ` from ${fromName}` : "";
    const ctx = context || "an assessment";

    if (method === "sms") {
      const body = `${who}you've been asked to take part in ${ctx}${by} with Mission USA. It takes just a few minutes and your answers are private. Start here: ${link}`;
      const r = await sendSms({ to, body });
      if (r.skipped) return NextResponse.json({ error: "Texting isn't configured yet." }, { status: 503 });
      if (!r.ok) return NextResponse.json({ error: "Could not send the text." }, { status: 502 });
      return NextResponse.json({ ok: true, via: "sms" });
    }

    // Email (every dynamic value escaped; the link is server-built above).
    const whoH = name ? `${esc(name)}, you're` : "You're";
    const html = renderEmail({
      heading: `${whoH} invited to take part`,
      bodyHtml: `<p style="font-size:15px;line-height:1.6;color:#4A5B6D;">You've been asked to take part in ${esc(ctx)}${esc(by)}. It takes just a few minutes, and your answers are private. Your honest perspective makes the results far richer.</p>`,
      cta: { href: link, label: "Take my part" },
    });
    const sent = await sendEmail({ to, subject: `You're invited to take part in ${ctx}`, html, template: "invite" });
    if (sent?.skipped) return NextResponse.json({ error: "Email isn't configured yet." }, { status: 503 });
    if (!sent?.ok) return NextResponse.json({ error: "Could not send the email." }, { status: 502 });
    return NextResponse.json({ ok: true, via: "email" });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
