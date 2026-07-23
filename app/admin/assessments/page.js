"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { APP_URL } from "../../lib/config";
import RefundButton from "../RefundButton";

// Unified assessment hub: one place to manage every assessment end to end —
// publish, price + seat tiers, header image, church eligibility, featured +
// order, share link + embed codes, and gifting — plus global commerce
// (platform fee + coupons). Consolidates the old Pricing / Pages / Homepage /
// Gifts tabs so there is a single, robust control surface.
export default function AdminAssessments() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading");
  const [rows, setRows] = useState([]);
  const [openSlug, setOpenSlug] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [showCommerce, setShowCommerce] = useState(false);
  const [dragSlug, setDragSlug] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("assessments")
      .select("slug,name,category,is_published,is_paid,price_cents,seat_tiers,allows_church_mode,is_featured,sort_order,header_image_url")
      .order("sort_order").order("name");
    setRows((data || []).map((r) => ({
      ...r,
      dollars: (r.price_cents / 100).toFixed(2),
      url: r.header_image_url || "",
      tiers: (Array.isArray(r.seat_tiers) ? r.seat_tiers : []).map((t) => ({ qty: String(t.qty), dollars: (Number(t.price_cents) / 100).toFixed(2) })),
    })));
  }

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      await load();
      setState("ready");
    })();
  }, [supabase]);

  const patch = (slug, p) => setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...p } : r)));
  // Drag to reorder — only within the same category (categories match the homepage).
  const reorder = (targetSlug) => {
    setRows((rs) => {
      const from = rs.findIndex((r) => r.slug === dragSlug);
      const to = rs.findIndex((r) => r.slug === targetSlug);
      if (from < 0 || to < 0 || from === to) return rs;
      if (rs[from].category !== rs[to].category) return rs; // keep categories intact
      const n = [...rs];
      const [moved] = n.splice(from, 1);
      n.splice(n.findIndex((r) => r.slug === targetSlug), 0, moved);
      return n;
    });
  };

  async function saveOrder() {
    setSavingOrder(true); setOrderSaved(false);
    for (let i = 0; i < rows.length; i++) await supabase.rpc("admin_set_card_order", { p_slug: rows[i].slug, p_sort: (i + 1) * 10, p_featured: null });
    setSavingOrder(false); setOrderSaved(true); setTimeout(() => setOrderSaved(false), 1800);
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 900, padding: "38px 24px 100px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>Manage</div>
      <h1 className="serif" style={h1}>Assessments</h1>
      <p style={sub}>Everything for each assessment in one place: publish, price, header, sharing, gifting, order, and featured. Changes are live immediately, no deploy.</p>

      <button onClick={() => setShowCommerce((v) => !v)} style={commerceToggle}>
        {showCommerce ? "▾" : "▸"} Global commerce — platform fee &amp; coupon codes
      </button>
      {showCommerce && <Commerce supabase={supabase} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 12px", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "#8CA0B3", fontWeight: 600 }}>Drag the ⠿ handle to reorder within each category (the order shown on the homepage). Then Save.</div>
        <button className="btn btn-primary" style={{ padding: "8px 16px" }} disabled={savingOrder} onClick={saveOrder}>
          {savingOrder ? "Saving…" : orderSaved ? "Saved ✓" : "Save order"}
        </button>
      </div>

      {GROUPS.map((grp) => {
        const items = rows.filter((r) => r.category === grp.cat);
        if (!items.length) return null;
        return (
          <div key={grp.cat} style={{ marginBottom: 26 }}>
            <div style={groupHead}>{grp.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((r) => (
                <Row key={r.slug} r={r} open={openSlug === r.slug}
                  onOpen={() => setOpenSlug(openSlug === r.slug ? null : r.slug)}
                  dragging={dragSlug === r.slug}
                  onDragStart={() => setDragSlug(r.slug)}
                  onDragEnd={() => setDragSlug(null)}
                  onDragOver={(e) => { e.preventDefault(); if (dragSlug && dragSlug !== r.slug) reorder(r.slug); }}
                  patch={patch} supabase={supabase} reload={load} />
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}

const GROUPS = [
  { cat: "personal", label: "Personal Growth & Calling" },
  { cat: "ministry", label: "Marriage & Ministry Readiness" },
  { cat: "church", label: "Church & Leadership Health" },
];

function Row({ r, open, onOpen, dragging, onDragStart, onDragEnd, onDragOver, patch, supabase, reload }) {
  const [tab, setTab] = useState("status");
  const price = r.is_paid && r.price_cents > 0 ? `$${r.dollars}` : "Free";
  const link = `${APP_URL}/assessment/${r.slug}`;

  const call = (fn, args) => supabase.rpc(fn, args);
  const toggle = async (key, fn, argKey) => { const v = !r[key]; patch(r.slug, { [key]: v }); await call(fn, { p_slug: r.slug, [argKey]: v }); };

  async function savePricing() {
    await call("admin_set_pricing", { p_slug: r.slug, p_is_paid: !!r.is_paid, p_price: Math.round(Number(r.dollars || 0) * 100) });
    const tiers = (r.tiers || []).filter((t) => Number(t.qty) > 1 && Number(t.dollars) > 0)
      .map((t) => ({ qty: Number(t.qty), price_cents: Math.round(Number(t.dollars) * 100) })).sort((a, b) => a.qty - b.qty);
    await call("admin_set_tiers", { p_slug: r.slug, p_tiers: tiers });
    patch(r.slug, { _pSaved: true }); setTimeout(() => patch(r.slug, { _pSaved: false }), 1500);
  }
  async function saveHeader() { await call("admin_set_header_image", { p_slug: r.slug, p_url: r.url || "" }); patch(r.slug, { _hSaved: true }); setTimeout(() => patch(r.slug, { _hSaved: false }), 1500); }
  function onUpload(file) {
    if (!file) return; const reader = new FileReader();
    reader.onload = async () => { patch(r.slug, { url: reader.result }); await call("admin_set_header_image", { p_slug: r.slug, p_url: reader.result }); patch(r.slug, { _hSaved: true }); setTimeout(() => patch(r.slug, { _hSaved: false }), 1500); };
    reader.readAsDataURL(file);
  }
  const addTier = () => patch(r.slug, { tiers: [...(r.tiers || []), { qty: "", dollars: "" }] });
  const editTier = (idx, p) => patch(r.slug, { tiers: r.tiers.map((t, j) => (j === idx ? { ...t, ...p } : t)) });
  const removeTier = (idx) => patch(r.slug, { tiers: r.tiers.filter((_, j) => j !== idx) });

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", opacity: dragging ? 0.4 : 1, outline: dragging ? "2px dashed #2E7D8A" : "none" }}
      onDragOver={onDragOver}>
      <div style={rowHead}>
        <span draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
          title="Drag to reorder" style={dragHandle} aria-label="Drag to reorder">⠿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>
            {r.is_featured && <span style={{ color: "#C4923E", marginRight: 6 }}>★</span>}{r.name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
            <Chip on={r.is_published} yes="Published" no="Draft" />
            <Chip on={r.is_paid && r.price_cents > 0} yes={price} no="Free" gold />
            {r.allows_church_mode ? <span style={chipMuted}>🏛 Church</span> : <span style={chipMuted}>🔒 No church</span>}
            {r.is_featured && <span style={{ ...chipMuted, color: "#B07C2E" }}>★ Featured</span>}
          </div>
        </div>
        <button onClick={onOpen} className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 13.5 }}>{open ? "Close" : "Manage"}</button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "4px 18px 18px" }}>
          <div style={tabRow}>
            {[["status", "Status"], ["pricing", "Pricing"], ["header", "Header image"], ["share", "Share & embed"], ["gift", "Gift"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ ...tabBtn, ...(tab === k ? tabOn : {}) }}>{l}</button>
            ))}
          </div>

          {tab === "status" && (
            <div style={pane}>
              <Toggle label="Published" desc="Visible on the site and in the menu." on={r.is_published} onClick={() => toggle("is_published", "admin_set_published", "p_published")} />
              <Toggle label="Featured" desc="Shown in the Featured section and at the top of the menu." on={r.is_featured} onClick={() => toggle("is_featured", "admin_set_card_order", "p_featured")} />
              <Toggle label="Church-eligible" desc="Churches can include it in a partnership and see members' results." on={r.allows_church_mode} onClick={() => toggle("allows_church_mode", "admin_set_church_mode", "p_enabled")} />
            </div>
          )}

          {tab === "pricing" && (
            <div style={pane}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox" checked={!!r.is_paid} onChange={(e) => patch(r.slug, { is_paid: e.target.checked })} /> Paid (premium)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0" }}>
                <span style={{ color: "var(--ink-soft)" }}>$</span>
                <input style={inp} type="number" min="0" step="0.01" disabled={!r.is_paid} value={r.dollars} onChange={(e) => patch(r.slug, { dollars: e.target.value })} />
              </div>
              {r.is_paid && (
                <div style={{ marginBottom: 10 }}>
                  <div style={miniH}>Volume seat tiers (optional)</div>
                  {(r.tiers || []).map((t, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <input style={{ ...inp, width: 70 }} type="number" min="2" placeholder="Qty" value={t.qty} onChange={(e) => editTier(idx, { qty: e.target.value })} />
                      <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>seats for $</span>
                      <input style={{ ...inp, width: 90 }} type="number" min="0" step="0.01" placeholder="Total" value={t.dollars} onChange={(e) => editTier(idx, { dollars: e.target.value })} />
                      <button onClick={() => removeTier(idx)} style={linkBtn}>Remove</button>
                    </div>
                  ))}
                  <button onClick={addTier} style={linkBtn}>+ Add a tier</button>
                </div>
              )}
              <button className="btn btn-primary" style={{ padding: "8px 16px" }} onClick={savePricing}>{r._pSaved ? "Saved ✓" : "Save pricing"}</button>
            </div>
          )}

          {tab === "header" && (
            <div style={pane}>
              {r.url ? <img src={r.url} alt="" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} /> : <div style={{ ...noImg }}>No custom header — the built-in image is used.</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ ...inp, flex: 1, minWidth: 220 }} type="url" placeholder="https://…image.jpg" value={r.url} onChange={(e) => patch(r.slug, { url: e.target.value })} />
                <label style={uploadBtn}>Upload<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0])} /></label>
                <button className="btn btn-primary" style={{ padding: "8px 16px" }} onClick={saveHeader}>{r._hSaved ? "Saved ✓" : "Save"}</button>
                {r.url && <button onClick={() => { patch(r.slug, { url: "" }); supabase.rpc("admin_set_header_image", { p_slug: r.slug, p_url: "" }); }} style={linkBtn}>Clear</button>}
              </div>
              <div style={{ fontSize: 12, color: "#8CA0B3", marginTop: 6 }}>Paste an Unsplash/Pexels or hosted URL, or upload. Landscape works best.</div>
            </div>
          )}

          {tab === "share" && <Share slug={r.slug} name={r.name} link={link} />}

          {tab === "gift" && <Gift slug={r.slug} supabase={supabase} />}
        </div>
      )}
    </div>
  );
}

function Share({ slug, name, link }) {
  const cardCode = `<iframe src="${APP_URL}/embed/${slug}" width="420" height="560" style="border:0;max-width:100%" title="${name} — Mission USA" loading="lazy"></iframe>`;
  const testCode = `<iframe src="${APP_URL}/assessment/${slug}/start?embed=1" width="100%" height="900" style="border:0;max-width:680px" title="${name} — Mission USA" loading="lazy"></iframe>`;
  const [mode, setMode] = useState("link");
  const value = mode === "link" ? link : mode === "card" ? cardCode : testCode;
  const [copied, setCopied] = useState(false);
  return (
    <div style={pane}>
      <div style={tabRow}>
        {[["link", "Direct link"], ["card", "Embed · card"], ["test", "Embed · full test"]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ ...tabBtn, ...(mode === k ? tabOn : {}) }}>{l}</button>
        ))}
      </div>
      <textarea readOnly value={value} onFocus={(e) => e.target.select()} style={{ width: "100%", minHeight: mode === "link" ? 44 : 70, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "monospace", fontSize: 12.5, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
        <button className="btn btn-primary" style={{ padding: "8px 16px" }} onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy"}</button>
        <a href={mode === "link" ? `/assessment/${slug}` : mode === "card" ? `/embed/${slug}` : `/assessment/${slug}/start?embed=1`} target="_blank" rel="noreferrer" style={linkBtn}>Preview →</a>
      </div>
    </div>
  );
}

function Gift({ slug, supabase }) {
  const [g, setG] = useState({ email: "", name: "", seats: 1 });
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false);
  async function issue() {
    setBusy(true); setCode("");
    const { data, error } = await supabase.rpc("admin_issue_grant", { p_email: g.email || null, p_name: g.name || null, p_slugs: [slug], p_seats: Math.max(1, Number(g.seats) || 1), p_kind: "assessment", p_church: null });
    setBusy(false); setCode(error ? "ERROR: " + error.message : data);
  }
  return (
    <div style={pane}>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>Issue a free access code for this assessment (a gift, or your own testing).</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "center" }}>
        <input style={inp} placeholder="Recipient name (optional)" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
        <input style={inp} type="email" placeholder="Email (optional)" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} />
        <input style={{ ...inp, width: 70 }} type="number" min="1" value={g.seats} onChange={(e) => setG({ ...g, seats: e.target.value })} />
        <button className="btn btn-primary" style={{ padding: "8px 16px" }} disabled={busy} onClick={issue}>{busy ? "…" : "Gift"}</button>
      </div>
      {code && (code.startsWith("ERROR") ? <div style={{ color: "#B4443A", marginTop: 8, fontSize: 13 }}>{code}</div> : (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "1.5px", color: "#1C2B3A" }}>{code}</span>
          <span style={{ fontSize: 13, color: "#2E7D8A", marginLeft: 12 }}>/access/{code}</span>
        </div>
      ))}
    </div>
  );
}

function Commerce({ supabase }) {
  const [fee, setFee] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [grants, setGrants] = useState([]);
  const [cp, setCp] = useState({ code: "", kind: "percent", amount: 100, note: "" });
  const [msg, setMsg] = useState("");
  async function loadGrants() { const { data } = await supabase.rpc("admin_grants"); setGrants(data || []); }
  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("platform_settings").select("fee_fixed_cents,fee_percent,fee_label,fee_enabled").eq("id", 1).maybeSingle();
      setFee({ fixed: ((ps?.fee_fixed_cents ?? 30) / 100).toFixed(2), percent: String(ps?.fee_percent ?? 3.5), label: ps?.fee_label ?? "Platform fee", enabled: ps?.fee_enabled ?? true });
      const { data: c } = await supabase.rpc("admin_list_coupons"); setCoupons(c || []);
      loadGrants();
    })();
  }, [supabase]);
  async function deleteGrant(code) {
    if (!window.confirm(`Delete access code ${code}? Anyone holding it will lose access. This can't be undone.`)) return;
    await supabase.rpc("admin_delete_grant", { p_code: code });
    loadGrants();
  }
  async function saveFee() { await supabase.rpc("admin_set_platform_fee", { p_fixed_cents: Math.round(Number(fee.fixed || 0) * 100), p_percent: Number(fee.percent || 0), p_label: (fee.label || "").trim() || "Platform fee", p_enabled: !!fee.enabled }); setMsg("Fee saved."); setTimeout(() => setMsg(""), 1500); }
  async function createCoupon() {
    const { error } = await supabase.rpc("admin_create_coupon", { p_code: cp.code.trim().toUpperCase(), p_kind: cp.kind, p_amount: Number(cp.amount) || 0, p_applies_to: [], p_max: null, p_expires: null, p_note: cp.note || null });
    if (!error) { setCp({ code: "", kind: "percent", amount: 100, note: "" }); const { data } = await supabase.rpc("admin_list_coupons"); setCoupons(data || []); setMsg("Coupon saved."); setTimeout(() => setMsg(""), 1500); }
  }
  const toggleCoupon = async (code, active) => { await supabase.rpc("admin_set_coupon_active", { p_code: code, p_active: !active }); const { data } = await supabase.rpc("admin_list_coupons"); setCoupons(data || []); };
  if (!fee) return null;
  return (
    <div style={{ ...card, marginTop: 12, background: "#FAFBFC" }}>
      <div style={miniH}>Platform fee</div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18 }}>
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={fee.enabled} onChange={(e) => setFee({ ...fee, enabled: e.target.checked })} /> On</label>
        <Lbl t="Percent"><input style={{ ...inp, width: 80 }} type="number" step="0.1" value={fee.percent} onChange={(e) => setFee({ ...fee, percent: e.target.value })} /></Lbl>
        <Lbl t="Fixed $"><input style={{ ...inp, width: 80 }} type="number" step="0.01" value={fee.fixed} onChange={(e) => setFee({ ...fee, fixed: e.target.value })} /></Lbl>
        <Lbl t="Label"><input style={{ ...inp, width: 150 }} value={fee.label} onChange={(e) => setFee({ ...fee, label: e.target.value })} /></Lbl>
        <button className="btn btn-primary" style={{ padding: "8px 14px" }} onClick={saveFee}>Save fee</button>
      </div>
      <div style={miniH}>Coupon codes</div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Lbl t="Code"><input style={{ ...inp, width: 130, textTransform: "uppercase" }} value={cp.code} onChange={(e) => setCp({ ...cp, code: e.target.value })} placeholder="LAUNCH25" /></Lbl>
        <Lbl t="Type"><select style={inp} value={cp.kind} onChange={(e) => setCp({ ...cp, kind: e.target.value })}><option value="percent">% off</option><option value="fixed">$ off</option></select></Lbl>
        <Lbl t={cp.kind === "percent" ? "Percent" : "Dollars"}><input style={{ ...inp, width: 90 }} type="number" value={cp.amount} onChange={(e) => setCp({ ...cp, amount: e.target.value })} /></Lbl>
        <button className="btn btn-primary" style={{ padding: "8px 14px" }} disabled={!cp.code} onClick={createCoupon}>Create</button>
        {msg && <span style={{ fontSize: 13, color: "#1F7A4D" }}>{msg}</span>}
      </div>
      {coupons.map((c) => (
        <div key={c.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <span><strong>{c.code}</strong> · {c.kind === "percent" ? `${c.amount}% off` : `$${c.amount} off`} · used {c.redemptions}</span>
          <button onClick={() => toggleCoupon(c.code, c.active)} style={{ ...linkBtn, color: c.active ? "#B4703A" : "var(--teal-deep)" }}>{c.active ? "Turn off" : "Turn on"}</button>
        </div>
      ))}
      <p style={{ fontSize: 12, color: "#8CA0B3", marginTop: 10 }}>Tip: a 100%-off coupon lets you run the whole checkout free to test it end to end.</p>

      {grants.length > 0 && (
        <>
          <div style={{ ...miniH, marginTop: 22 }}>Access codes (gifts &amp; purchases)</div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {grants.slice(0, 100).map((g) => (
              <div key={g.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ minWidth: 0 }}>
                  <strong>{g.code}</strong>
                  <span style={{ color: "#5A6A78", marginLeft: 8 }}>
                    {(g.assessment_slugs || []).join(", ") || g.bundle_slug || "—"} · {g.seats_used}/{g.seats_total} used{g.email ? ` · ${g.email}` : ""} · {g.stripe_payment_intent ? "paid" : "gift"}
                  </span>
                </span>
                {g.stripe_payment_intent
                  ? (g.refunded_at
                      ? <span style={refundedChip}>Refunded</span>
                      : <RefundButton code={g.code} onDone={loadGrants} />)
                  : <button onClick={() => deleteGrant(g.code)} style={{ ...linkBtn, color: "#B4443A", flexShrink: 0 }}>Delete</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const Center = ({ children }) => (<main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>);
const Chip = ({ on, yes, no, gold }) => <span style={{ ...chipBase, background: on ? (gold ? "#F5EBD6" : "#E2F0F1") : "#EEF1F4", color: on ? (gold ? "#8A6420" : "#1F5E68") : "#8CA0B3" }}>{on ? yes : no}</span>;
const Toggle = ({ label, desc, on, onClick }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
    <div><div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>{label}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{desc}</div></div>
    <button onClick={onClick} style={{ ...tglBtn, ...(on ? tglOn : {}) }}>{on ? "On" : "Off"}</button>
  </div>
);
const Lbl = ({ t, children }) => <label style={{ display: "block" }}><span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{t}</span>{children}</label>;

const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "14px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 660 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px" };
const rowHead = { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" };
const dragHandle = { cursor: "grab", color: "#B4BEC9", fontSize: 20, lineHeight: 1, userSelect: "none", padding: "0 2px" };
const groupHead = { fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8CA0B3", margin: "0 0 10px", paddingBottom: 6, borderBottom: "1px solid var(--line)" };
const chipBase = { fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999 };
const chipMuted = { fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: "#EEF1F4", color: "#5A6A78" };
const refundedChip = { fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: "#EEF1F4", color: "#8CA0B3", flexShrink: 0 };
const commerceToggle = { background: "#F6F8FA", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: "pointer", width: "100%", textAlign: "left" };
const tabRow = { display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 12px" };
const tabBtn = { background: "#fff", border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit" };
const tabOn = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const pane = { paddingTop: 4 };
const miniH = { fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 };
const inp = { padding: "9px 11px", fontSize: 14, borderRadius: 9, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
const noImg = { padding: "18px", background: "#F6F8FA", borderRadius: 10, fontSize: 13, color: "#8CA0B3", textAlign: "center", marginBottom: 10 };
const uploadBtn = { fontSize: 13, fontWeight: 600, color: "var(--teal-deep)", border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 14px", cursor: "pointer", background: "#fff" };
const linkBtn = { background: "transparent", border: "none", color: "var(--teal-deep)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" };
const tglBtn = { border: "1.5px solid var(--line)", background: "#fff", borderRadius: 999, padding: "5px 16px", fontSize: 13, fontWeight: 700, color: "#8CA0B3", cursor: "pointer", fontFamily: "inherit" };
const tglOn = { background: "var(--teal-deep)", borderColor: "var(--teal-deep)", color: "#fff" };
