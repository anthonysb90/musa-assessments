import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";
import { buildPartnerRequestEmail, sendEmail } from "../../lib/email";
import { ASSESSOR_EMAIL } from "../../lib/config";
import { rateLimit, requestIp } from "../../lib/ratelimit";

export const runtime = "nodejs";

// Public church partnership request. Records a pending church (via a
// SECURITY DEFINER function, so anon can submit) and notifies Mission USA.
export async function POST(req) {
  try {
    const rl = await rateLimit(`partner:${requestIp(req)}`, 3, 3600);
    if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

    const b = await req.json();
    if (!b?.name?.trim() || !b?.email?.trim()) {
      return NextResponse.json({ error: "Church name and email are required." }, { status: 400 });
    }
    const supabase = getServerSupabase();
    const { error } = await supabase.rpc("request_church_partnership", {
      p_name: b.name, p_district: b.district || "", p_email: b.email, p_phone: b.phone || "",
      p_logo_color: b.logo_color || "", p_logo_white: b.logo_white || "",
      p_slugs: Array.isArray(b.slugs) ? b.slugs : [], p_gate: !!b.gate, p_admin_email: b.admin_email || "",
    });
    if (error) return NextResponse.json({ error: error.message || "Could not submit your request." }, { status: 400 });

    // Notify Mission USA (best-effort). All fields escaped in the builder.
    try {
      const em = buildPartnerRequestEmail({
        name: b.name,
        district: b.district,
        email: b.email,
        phone: b.phone,
        slugs: b.slugs,
        gate: !!b.gate,
        adminEmail: b.admin_email,
        logoProvided: !!(b.logo_color || b.logo_white),
      });
      await sendEmail({ to: ASSESSOR_EMAIL, subject: em.subject, html: em.html, template: "partner_request" });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
