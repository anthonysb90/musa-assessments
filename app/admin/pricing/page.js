"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export default function AdminPricing() {
  const supabase = useRef(getSupabase()).current;
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | denied
  const [savingSlug, setSavingSlug] = useState("");
  const [savedSlug, setSavedSlug] = useState("");

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,is_paid,price_cents,is_published")
        .order("category").order("name");
      setRows((data || []).map((r) => ({ ...r, dollars: (r.price_cents / 100).toFixed(2) })));
      setState("ready");
    })();
  }, [supabase]);

  function edit(slug, patch) {
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function save(r) {
    setSavingSlug(r.slug); setSavedSlug("");
    const cents = Math.round(Number(r.dollars || 0) * 100);
    await supabase.rpc("admin_set_pricing", { p_slug: r.slug, p_is_paid: !!r.is_paid, p_price: cents });
    setSavingSlug(""); setSavedSlug(r.slug);
    setTimeout(() => setSavedSlug(""), 1800);
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 820, padding: "40px 24px 80px" }}>
      <Link href="/admin" style={link}>← Admin</Link>
      <h1 className="serif" style={h1}>Pricing</h1>
      <p style={sub}>Mark an assessment paid and set its price. Free assessments show no badge. Changes take effect immediately, no deploy needed.</p>

      <div style={card}>
        {rows.map((r) => (
          <div key={r.slug} style={row}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name}{!r.is_published && <span style={draft}>unpublished</span>}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{r.category}</div>
            </div>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 14, color: "var(--ink)" }}>
              <input type="checkbox" checked={!!r.is_paid} onChange={(e) => edit(r.slug, { is_paid: e.target.checked })} />
              Paid
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--ink-soft)" }}>$</span>
              <input style={priceInp} type="number" min="0" step="0.01" disabled={!r.is_paid}
                value={r.dollars} onChange={(e) => edit(r.slug, { dollars: e.target.value })} />
            </div>
            <button className="btn btn-primary" style={{ padding: "8px 16px" }} disabled={savingSlug === r.slug} onClick={() => save(r)}>
              {savingSlug === r.slug ? "Saving…" : savedSlug === r.slug ? "Saved ✓" : "Save"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 620 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "6px 18px" };
const row = { display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" };
const priceInp = { width: 90, padding: "8px 10px", fontSize: 14, borderRadius: 8, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const draft = { fontSize: 11, fontWeight: 700, color: "#8CA0B3", marginLeft: 8, textTransform: "uppercase", letterSpacing: ".04em" };
