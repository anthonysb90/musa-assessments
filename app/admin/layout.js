import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

// Server-side admin guard for the WHOLE /admin panel. Every admin page renders
// inside this, so no admin screen (including the client mutation pages) is shown
// to a non-admin. Data mutations are additionally guarded at the RPC level by
// is_admin(); this is the defense-in-depth layer the audit called for.
export default async function AdminLayout({ children }) {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  if (!udata?.user) redirect("/login?next=/admin");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--mist)", padding: 24, textAlign: "center" }}>
        <div>
          <p style={{ color: "var(--ink-soft)", marginBottom: 10 }}>You don't have access to the admin panel.</p>
          <Link href="/dashboard" style={{ color: "var(--teal-deep)", fontWeight: 600, textDecoration: "none" }}>Go to my dashboard →</Link>
        </div>
      </main>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: "var(--mist)" }}>
      <AdminNav />
      {children}
    </div>
  );
}
