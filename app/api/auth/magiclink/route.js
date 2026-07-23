import { NextResponse } from "next/server";
import { buildMagicLinkEmail, sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";
import { rateLimit, requestIp } from "../../../lib/ratelimit";

export const runtime = "nodejs";

// Branded magic-link sign-in. Instead of Supabase's default (unbranded, poor
// deliverability) email, we generate the link with the admin API and send it
// ourselves through Emailit, from our authenticated domain. Requires
// SUPABASE_SERVICE_ROLE_KEY and EMAILIT_API_KEY. If either is missing, we
// return { fallback: true } so the client uses Supabase's built-in email.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rtcahxypgqtbkomuwwci.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EMAILIT = process.env.EMAILIT_API_KEY || "";

export async function POST(req) {
  try {
    const { email, next } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!SERVICE_ROLE || !EMAILIT) return NextResponse.json({ fallback: true });

    // Abuse guards: this endpoint creates users and sends email via the
    // service-role key, so it must not be free to hammer. Per-email and
    // per-IP fixed windows.
    const ip = requestIp(req);
    const emailKey = String(email).trim().toLowerCase();
    const [byEmail, byIp] = await Promise.all([
      rateLimit(`magiclink:email:${emailKey}`, 3, 3600),
      rateLimit(`magiclink:ip:${ip}`, 10, 3600),
    ]);
    if (!byEmail.ok || !byIp.ok) {
      return NextResponse.json(
        { error: "Too many sign-in requests. Please try again in a little while." },
        { status: 429 }
      );
    }

    // Only allow same-site relative next paths (open-redirect guard).
    const safeNext =
      typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/welcome";

    const redirect_to = `${APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const headers = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" };

    // Ensure the user exists so magic-link generation works for new emails too.
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST", headers, body: JSON.stringify({ email: emailKey, email_confirm: true }),
    }).catch(() => {});

    // Generate the one-tap link.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST", headers, body: JSON.stringify({ type: "magiclink", email: emailKey, redirect_to }),
    });
    const data = await res.json().catch(() => ({}));
    const props = data?.properties || data || {};
    // Build our OWN callback link using the hashed token. This lets the server
    // callback complete the sign-in with verifyOtp (the raw action_link would
    // return the session in the URL hash, which a server route can't read, so
    // the user got bounced back to the login page).
    const hashed = props.hashed_token;
    const vtype = props.verification_type || "magiclink";
    let link;
    if (hashed) {
      link = `${APP_URL}/auth/callback?token_hash=${encodeURIComponent(hashed)}&type=${encodeURIComponent(vtype)}&next=${encodeURIComponent(safeNext)}`;
    } else {
      link = data?.action_link || props.action_link;
    }
    if (!res.ok || !link) return NextResponse.json({ fallback: true });

    const em = buildMagicLinkEmail({ link });
    const sent = await sendEmail({ to: emailKey, subject: em.subject, html: em.html, template: "magic_link" });
    if (!sent?.ok) return NextResponse.json({ fallback: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
