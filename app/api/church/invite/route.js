import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { buildChurchInviteEmail, sendEmail } from "../../../lib/email";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { church_id, email } = await req.json();
    if (!church_id || !email) {
      return NextResponse.json({ error: "Missing church or email." }, { status: 400 });
    }
    const supabase = getServerSupabase();
    const { data: udata } = await supabase.auth.getUser();
    if (!udata?.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    // RLS ("church admin invites members") enforces that the caller actually
    // leads this church; a non-leader insert is rejected by the policy.
    const { error } = await supabase.from("church_users").insert({
      church_id,
      email: email.toLowerCase(),
      role: "church_admin",
      status: "active",
      invited_by: udata.user.id,
    });
    if (error) {
      return NextResponse.json({ error: "You don't have permission to invite for this church." }, { status: 403 });
    }

    const { data: church } = await supabase.from("churches").select("name").eq("id", church_id).maybeSingle();
    const em = buildChurchInviteEmail({ churchName: church?.name, next: "/church" });
    await sendEmail({ to: email, subject: em.subject, html: em.html, template: "church_invite" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
