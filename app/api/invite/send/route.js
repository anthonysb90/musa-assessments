import { NextResponse } from "next/server";
import { sendSms } from "../../../lib/clearstream";
import { sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";

export const runtime = "nodejs";

// Send a personal assessment link by text (Clearstream) or email (Emailit).
// Used by the multi-person flows: team, couple, and the co-rater circles.
// Body: { method: 'sms'|'email', to, name, link, context, fromName }
export async function POST(req) {
  try {
    const { method, to, name, link, context, fromName } = await req.json();
    if (!to || !link) return NextResponse.json({ error: "Missing recipient or link." }, { status: 400 });
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

    // Email
    const html = `<!doctype html><html><body style="margin:0;background:#F6F8FA;font-family:Arial,Helvetica,sans-serif;color:#1C2B3A;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:24px 0;"><tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #E7E9EC;border-radius:14px;overflow:hidden;">
        <tr><td align="center" style="background:#1B3A57;padding:20px 28px;"><img src="${APP_URL}/musa-logo-white.png" alt="Mission USA" height="48" style="height:48px;width:auto;display:inline-block;border:0;" /></td></tr>
        <tr><td style="padding:28px;">
          <h1 style="font-size:21px;margin:0 0 12px;color:#1C2B3A;">${who ? name + ", you're" : "You're"} invited to take part</h1>
          <p style="font-size:15px;line-height:1.6;color:#4A5B6D;">You've been asked to take part in ${ctx}${by}. It takes just a few minutes, and your answers are private. Your honest perspective makes the results far richer.</p>
          <p style="margin:22px 0;"><a href="${link}" style="display:inline-block;background:#1B3A57;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;font-size:15px;">Take my part</a></p>
          <p style="font-size:13px;color:#7C8A9C;">Or paste this link into your browser:<br><span style="color:#1B3A57;word-break:break-all;">${link}</span></p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #EEF1F4;color:#7C8A9C;font-size:12px;">A ministry resource of Mission USA &middot; gomissionusa.com</td></tr>
      </table></td></tr></table></body></html>`;
    const sent = await sendEmail({ to, subject: `You're invited to take part in ${ctx}`, html });
    if (sent?.skipped) return NextResponse.json({ error: "Email isn't configured yet." }, { status: 503 });
    if (!sent?.ok) return NextResponse.json({ error: "Could not send the email." }, { status: 502 });
    return NextResponse.json({ ok: true, via: "email" });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
