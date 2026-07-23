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
  const [fee, setFee] = useState(null); // { fixed, percent, label, enabled }
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,is_paid,price_cents,is_published,seat_tiers,allows_church_mode")
        .order("category").order("name");
      setRows((data || []).map((r) => ({
        ...r,
        dollars: (r.price_cents / 100).toFixed(2),
        tiers: (Array.isArray(r.seat_tiers) ? r.seat_tiers : []).map((t) => ({ qty: String(t.qty), dollars: (Number(t.price_cents) / 100).toFixed(2) })),
      })));
      const { data: ps } = await supabase
        .from("platform_settings")
        .select("fee_fixed_cents,fee_percent,fee_label,fee_enabled")
        .eq("id", 1).maybeSingle();
      setFee({
        fixed: ((ps?.fee_fixed_cents ?? 30) / 100).toFixed(2),
        percent: String(ps?.fee_percent ?? 3.5),
        label: ps?.fee_label ?? "Platform fee",
        enabled: ps?.fee_enabled ?? true,
      });
      setState("ready");
    })();
  }, [supabase]);

  async function saveFee() {
    if (!fee) return;
    setFeeSaving(true); setFeeSaved(false);
    await supabase.rpc("admin_set_platform_fee", {
      p_fixed_cents: Math.round(Number(fee.fixed || 0) * 100),
      p_percent: Number(fee.percent || 0),
      p_label: (fee.label || "").trim() || "Platform fee",
      p_enabled: !!fee.enabled,
    });
    setFeeSaving(false); setFeeSaved(true);
    setTimeout(() => setFeeSaved(false), 1800);
  }

  function edit(slug, patch) {
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function save(r) {
    setSavingSlug(r.slug); setSavedSlug("");
    const cents = Math.round(Number(r.dollars || 0) * 100);
    await supabase.rpc("admin_set_pricing", { p_slug: r.slug, p_is_paid: !!r.is_paid, p_price: cents });
    const tiers = (r.tiers || [])
      .filter((t) => Number(t.qty) > 1 && Number(t.dollars) > 0)
      .map((t) => ({ qty: Number(t.qty), price_cents: Math.round(Number(t.dollars) * 100) }))
      .sort((a, b) => a.qty - b.qty);
    await supabase.rpc("admin_set_tiers", { p_slug: r.slug, p_tiers: tiers });
    setSavingSlug(""); setSavedSlug(r.slug);
    setTimeout(() => setSavedSlug(""), 1800);
  }

  async function togglePublish(r) {
    const next = !r.is_published;
    edit(r.slug, { is_published: next });
    await supabase.rpc("admin_set_published", { p_slug: r.slug, p_published: next });
  }

  async function toggleChurch(r) {
    const next = !r.allows_church_mode;
    edit(r.slug, { allows_church_mode: next });
    await supabase.rpc("admin_set_church_mode", { p_slug: r.slug, p_enabled: next });
  }

  const addTier = (slug) => setRows((rs) => rs.map((r) => r.slug === slug ? { ...r, tiers: [...(r.tiers || []), { qty: "", dollars: "" }] } : r));
  const editTier = (slug, i, patch) => setRows((rs) => rs.map((r) => r.slug === slug ? { ...r, tiers: r.tiers.map((t, j) => j === i ? { ...t, ...patch } : t) } : r));
  const removeTier = (slug, i) => setRows((rs) => rs.map((r) => r.slug === slug ? { ...r, tiers: r.tiers.filter((_, j) => j !== i) } : r));

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 820, padding: "40px 24px 80px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>Commerce</div>
      <h1 className="serif" style={h1}>Pricing</h1>
      <p style={sub}>Mark an assessment paid and set its price. Free assessments show no badge. Changes take effect immediately, no deploy needed.</p>

      {fee && (
        <div style={{ ...card, padding: "20px 22px", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>Platform fee</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>Added to every paid order to cover payment processing. Shown to buyers on the checkout screen.</div>
            </div>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 14, color: "var(--ink)" }}>
              <input type="checkbox" checked={!!fee.enabled} onChange={(e) => setFee({ ...fee, enabled: e.target.checked })} />
              Charge this fee
            </label>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap", marginTop: 16, opacity: fee.enabled ? 1 : 0.5 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>Percent of order</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <input style={priceInp} type="number" min="0" max="30" step="0.1" disabled={!fee.enabled}
                  value={fee.percent} onChange={(e) => setFee({ ...fee, percent: e.target.value })} />
                <span style={{ color: "var(--ink-soft)" }}>%</span>
              </div>
            </label>
            <span style={{ color: "var(--ink-soft)", paddingBottom: 9 }}>+</span>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>Fixed amount</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--ink-soft)" }}>$</span>
                <input style={priceInp} type="number" min="0" step="0.01" disabled={!fee.enabled}
                  value={fee.fixed} onChange={(e) => setFee({ ...fee, fixed: e.target.value })} />
              </div>
            </label>
            <label style={{ display: "block", flex: "1 1 180px" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>What buyers see it called</span>
              <input style={{ ...priceInp, width: "100%" }} type="text" disabled={!fee.enabled}
                value={fee.label} onChange={(e) => setFee({ ...fee, label: e.target.value })} />
            </label>
            <button className="btn btn-primary" style={{ padding: "8px 18px" }} disabled={feeSaving} onClick={saveFee}>
              {feeSaving ? "Saving…" : feeSaved ? "Saved ✓" : "Save fee"}
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: "#8CA0B3", marginTop: 12 }}>
            Example on a $29.00 order: {fee.enabled
              ? `$${(29 * (Number(fee.percent) || 0) / 100 + (Number(fee.fixed) || 0)).toFixed(2)} fee → buyer pays $${(29 + 29 * (Number(fee.percent) || 0) / 100 + (Number(fee.fixed) || 0)).toFixed(2)}.`
              : "no fee added."}
          </div>
        </div>
      )}

      <div style={card}>
        {rows.map((r) => (
          <div key={r.slug} style={{ borderBottom: "1px solid var(--line)", padding: "14px 0" }}>
            <div style={{ ...row, borderBottom: "none", padding: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name}{!r.is_published && <span style={draft}>unpublished</span>}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{r.category}</span>
                  <span style={{ color: "#C9D2DA" }}>·</span>
                  <button onClick={() => togglePublish(r)} style={{ ...linkBtn, color: r.is_published ? "#B4703A" : "var(--teal-deep)" }}>
                    {r.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <span style={{ color: "#C9D2DA" }}>·</span>
                  <button onClick={() => toggleChurch(r)} title="Whether churches can include this in a partnership and see members' results. Turn off for personal or sensitive assessments." style={{ ...linkBtn, textDecoration: "none", color: r.allows_church_mode ? "var(--teal-deep)" : "#B07C2E" }}>
                    {r.allows_church_mode ? "🏛 Church-eligible" : "🔒 Not church-eligible"}
                  </button>
                </div>
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

            {r.is_paid && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                  Volume discounts (optional) — e.g. 5 seats for $99, 20 for $299, 100 for $999
                </div>
                {(r.tiers || []).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <input style={{ ...priceInp, width: 72 }} type="number" min="2" placeholder="Qty" value={t.qty} onChange={(e) => editTier(r.slug, i, { qty: e.target.value })} />
                    <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>seats for $</span>
                    <input style={{ ...priceInp, width: 96 }} type="number" min="0" step="0.01" placeholder="Total" value={t.dollars} onChange={(e) => editTier(r.slug, i, { dollars: e.target.value })} />
                    <button onClick={() => removeTier(r.slug, i)} style={linkBtn}>Remove</button>
                  </div>
                ))}
                <button onClick={() => addTier(r.slug)} style={linkBtn}>+ Add a tier</button>
                <span style={{ fontSize: 12, color: "#8CA0B3", marginLeft: 10 }}>Remember to Save.</span>
              </div>
            )}
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
const linkBtn = { background: "transparent", border: "none", color: "var(--teal-deep)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" };
