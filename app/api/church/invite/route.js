import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";

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
    await sendEmail({
      to: email,
      subject: `You've been invited to ${church?.name || "your church"}'s dashboard`,
      html: `<p>You've been invited to view ${church?.name || "your church"}'s assessment dashboard on Mission USA Ministry Assessments.</p>
        <p>Sign in with a one-tap magic link here: <a href="${APP_URL}/login?next=/church">${APP_URL}/login</a></p>
        <p>Use this same email address when you sign in.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
