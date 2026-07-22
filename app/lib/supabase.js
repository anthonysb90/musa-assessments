import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { createBrowserClient } from "@supabase/ssr";

export function getSupabase() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
