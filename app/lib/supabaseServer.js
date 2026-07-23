// Server-side Supabase client bound to the request cookies, so RLS sees the
// logged-in user (auth.uid()) when there is one, and runs as anonymous when
// there isn't. Used by route handlers and server components.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

// Privileged server-only client using the service-role key. Bypasses RLS and
// is the ONLY way the commerce RPCs (finalize_purchase, redeem_free_order,
// redeem_coupon, validate_coupon, consume_seat) can be called after
// migration_32 revoked anon/authenticated EXECUTE on them. Never import this
// from a client component, and never expose its result objects to the client
// without filtering.
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
