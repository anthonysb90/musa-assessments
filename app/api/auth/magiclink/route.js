import { NextResponse } from "next/server";
import { buildMagicLinkEmail, sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";

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

    const redirect_to = `${APP_URL}/auth/callback?next=${encodeURIComponent(next || "/dashboard")}`;
    const headers = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" };

    // Ensure the user exists so magic-link generation works for new emails too.
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST", headers, body: JSON.stringify({ email, email_confirm: true }),
    }).catch(() => {});

    // Generate the one-tap link.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST", headers, body: JSON.stringify({ type: "magiclink", email, redirect_to }),
    });
    const data = await res.json().catch(() => ({}));
    const link = data?.action_link || data?.properties?.action_link;
    if (!res.ok || !link) return NextResponse.json({ fallback: true });

    const em = buildMagicLinkEmail({ link });
    const sent = await sendEmail({ to: email, subject: em.subject, html: em.html });
    if (!sent?.ok) return NextResponse.json({ fallback: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
