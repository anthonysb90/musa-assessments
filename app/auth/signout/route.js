import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/config";

export const runtime = "nodejs";

// Sign out. The cleared auth cookies must be written onto the redirect
// response itself, or the session survives and the user stays signed in.
function doSignOut(request) {
  const res = NextResponse.redirect(new URL("/", new URL(request.url).origin));
  const store = cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(list) { list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
    },
  });
  return supabase.auth.signOut().then(() => res).catch(() => res);
}

export async function POST(request) { return doSignOut(request); }
export async function GET(request) { return doSignOut(request); }
