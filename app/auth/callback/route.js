import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/config";

export const runtime = "nodejs";

// Magic-link callback. Handles both flows:
//  - token_hash + type  → verifyOtp (our branded admin-generated links)
//  - code               → exchangeCodeForSession (Supabase's own PKCE email)
// Session cookies are written onto the redirect response so they actually persist.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "magiclink";
  const next = url.searchParams.get("next") || "/dashboard";

  const res = NextResponse.redirect(new URL(next, url.origin));
  const store = cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(list) { list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
    },
  });

  let ok = false;
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
  }
  return res;
}
