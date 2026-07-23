import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { buildChurchInviteEmail, sendEmail } from "../../../lib/email";

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
    const em = buildChurchInviteEmail({ churchName: church?.name, invitedBy: "Mission USA", next: "/church" });
    await sendEmail({ to: email, subject: em.subject, html: em.html, template: "church_invite" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
