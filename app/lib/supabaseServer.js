// Server-side Supabase client bound to the request cookies, so RLS sees the
// logged-in user (auth.uid()) when there is one, and runs as anonymous when
// there isn't. Used by route handlers and server components.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export function getServerSupabase() {
  const store = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component render — safe to ignore; the
          // middleware refreshes the session cookie instead.
        }
      },
    },
  });
}
