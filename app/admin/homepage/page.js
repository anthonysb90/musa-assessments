"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

// Admin: control the homepage card order and mark assessments as Featured.
// Featured cards appear in a Featured section at the top of the homepage and
// rise to the top of the megamenu; everything else follows the order set here.
export default function AdminHomepage() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading"); // loading | ready | denied
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,is_published,is_featured,sort_order")
        .eq("is_published", true)
        .order("sort_order").order("name");
      setRows(data || []);
      setState("ready");
    })();
  }, [supabase]);

  const move = (i, dir) => {
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const toggleFeatured = async (slug) => {
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, is_featured: !r.is_featured } : r)));
    const row = rows.find((r) => r.slug === slug);
    await supabase.rpc("admin_set_card_order", { p_slug: slug, p_sort: null, p_featured: !row.is_featured });
  };

  async function saveOrder() {
    setSaving(true); setSaved(false);
    // Persist a clean sequential order (10, 20, 30…) in the current arrangement.
    for (let i = 0; i < rows.length; i++) {
      await supabase.rpc("admin_set_card_order", { p_slug: rows[i].slug, p_sort: (i + 1) * 10, p_featured: null });
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  const CAT = { personal: "Personal", ministry: "Ministry", church: "Church" };

  return (
    <main className="wrap" style={{ maxWidth: 760, padding: "40px 24px 90px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>Homepage</div>
      <h1 className="serif" style={h1}>Card order &amp; Featured</h1>
      <p style={sub}>Use the arrows to set the order cards appear on the homepage, then Save. Star an assessment to feature it: featured cards get their own section at the top of the homepage and rise to the top of the menu.</p>

      <div style={card}>
        {rows.map((r, i) => (
          <div key={r.slug} style={row}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={arrow(i === 0)} aria-label="Move up">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} style={arrow(i === rows.length - 1)} aria-label="Move down">▼</button>
            </div>
            <div style={{ width: 26, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#8CA0B3" }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                {r.is_featured && <span style={{ color: "#C4923E", marginRight: 6 }}>★</span>}{r.name}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{CAT[r.category] || r.category}</div>
            </div>
            <button onClick={() => toggleFeatured(r.slug)} style={{ ...featBtn, color: r.is_featured ? "#B07C2E" : "var(--teal-deep)" }}>
              {r.is_featured ? "★ Featured" : "☆ Feature"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 18 }}>
        <button className="btn btn-primary" disabled={saving} onClick={saveOrder}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save order"}
        </button>
        <span style={{ fontSize: 13, color: "#8CA0B3" }}>Featured stars save instantly; the arrow order saves when you press Save.</span>
      </div>
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 640 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "6px 18px" };
const row = { display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--line)" };
const arrow = (dis) => ({ background: "transparent", border: "none", color: dis ? "#D3DAE1" : "var(--teal-deep)", cursor: dis ? "default" : "pointer", fontSize: 11, lineHeight: 1, padding: "1px 4px" });
const featBtn = { background: "transparent", border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
