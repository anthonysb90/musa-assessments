import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";

export const runtime = "nodejs";

// Magic-link callback. Exchanges the auth code for a session cookie, then
// redirects to `next` (or the dashboard).
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const supabase = getServerSupabase();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
