import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { sendEmail } from "../../../lib/email";
import { APP_URL } from "../../../lib/config";

export const runtime = "nodejs";

// Admin invites a church-dashboard user. The RPC is guarded by is_admin();
// this route also sends the leader their sign-in email.
export async function POST(req) {
  try {
    const { church_id, email } = await req.json();
    if (!church_id || !email) return NextResponse.json({ error: "Missing church or email." }, { status: 400 });
    const supabase = getServerSupabase();
    const { data: udata } = await supabase.auth.getUser();
    if (!udata?.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const { error } = await supabase.rpc("admin_invite_church_user", { p_church_id: church_id, p_email: email.toLowerCase() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data: church } = await supabase.from("churches").select("name").eq("id", church_id).maybeSingle();
    await sendEmail({
      to: email,
      subject: `You've been given access to ${church?.name || "your church"}'s assessment dashboard`,
      html: `<p>Mission USA has set you up with access to <strong>${church?.name || "your church"}</strong>'s assessment dashboard.</p>
        <p>There you can see the assessments your members have taken. Sign in with a one-tap magic link, using this same email address:</p>
        <p><a href="${APP_URL}/login?next=/church">${APP_URL}/login</a></p>`,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
