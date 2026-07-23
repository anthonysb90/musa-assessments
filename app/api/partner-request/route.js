import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";
import { sendEmail } from "../../lib/email";
import { ASSESSOR_EMAIL, APP_URL } from "../../lib/config";

export const runtime = "nodejs";

// Public church partnership request. Records a pending church (via a
// SECURITY DEFINER function, so anon can submit) and notifies Mission USA.
export async function POST(req) {
  try {
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

    // Notify Mission USA (best-effort).
    try {
      const slugs = (b.slugs || []).join(", ") || "none selected";
      await sendEmail({
        to: ASSESSOR_EMAIL,
        subject: `New church partnership request — ${b.name}`,
        html: `<p><strong>${b.name}</strong> has requested a partnership.</p>
          <ul>
            <li>District: ${b.district || "—"}</li>
            <li>Email: ${b.email}</li>
            <li>Phone: ${b.phone || "—"}</li>
            <li>Extra admin email: ${b.admin_email || "—"}</li>
            <li>Assessments requested: ${slugs}</li>
            <li>Reveal results in person: ${b.gate ? "Yes" : "No"}</li>
            <li>Logo provided: ${b.logo_color || b.logo_white ? "Yes" : "No"}</li>
          </ul>
          <p>Review and approve it under the Churches tab in the admin: <a href="${APP_URL}/admin/churches">${APP_URL}/admin/churches</a></p>`,
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
