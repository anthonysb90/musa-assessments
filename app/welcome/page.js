import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import Greeting from "../components/Greeting";

export const dynamic = "force-dynamic";

// Post-sign-in chooser. Admins (and church leaders) land here and pick where to
// go — admin, their church, or their personal results. A regular member with no
// special role is sent straight to their results.
export default async function Welcome() {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  const user = udata?.user;
  if (!user) redirect("/login?next=/welcome");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: churchRows } = await supabase
    .from("church_users").select("church_id,status,churches(name)").eq("status", "active");
  const isChurch = (churchRows || []).length > 0;

  if (!isAdmin && !isChurch) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles").select("first_name").eq("id", user.id).maybeSingle();

  const options = [];
  if (isAdmin) options.push({ title: "Admin dashboard", desc: "Analytics, people, churches, pricing, and settings.", href: "/admin", accent: "#1B3A57" });
  if (isChurch) options.push({ title: `${churchRows[0]?.churches?.name || "Your church"} dashboard`, desc: "See your church members' results.", href: "/church", accent: "#2E7D8A" });
  options.push({ title: "My results", desc: "Your own assessments and reports.", href: "/dashboard", accent: "#C4923E" });

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ ...kicker, textTransform: "none", letterSpacing: ".01em", fontSize: 14 }}><Greeting name={profile?.first_name || ""} /></div>
          <h1 className="serif" style={{ fontSize: 32, color: "var(--ink)", margin: "6px 0 6px" }}>Where would you like to go?</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 15.5 }}>You have access to more than one place. Pick one, you can switch anytime.</p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {options.map((o) => (
            <Link key={o.href} href={o.href} style={{ ...card, borderLeft: `5px solid ${o.accent}` }}>
              <div>
                <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{o.title}</div>
                <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 2 }}>{o.desc}</div>
              </div>
              <span style={{ color: o.accent, fontWeight: 700, fontSize: 20 }}>→</span>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <form action="/auth/signout" method="post">
            <button style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 13.5, cursor: "pointer", textDecoration: "underline" }}>Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}

const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 };
const card = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", textDecoration: "none", transition: "transform .15s, box-shadow .15s" };
