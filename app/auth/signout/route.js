import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
  const supabase = getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin));
}

export async function GET(request) {
  const supabase = getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin));
}
