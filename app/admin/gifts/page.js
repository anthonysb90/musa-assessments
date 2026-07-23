"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

// Admin: gift a premium assessment (issue a free access code), manage coupon
// codes, and test the whole buying system end to end (a 100%-off coupon runs
// checkout for real and issues a code without charging a card).
export default function AdminGifts() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading"); // loading | ready | denied
  const [assessments, setAssessments] = useState([]);
  const [grants, setGrants] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // Gift form
  const [gift, setGift] = useState({ slug: "", email: "", name: "", seats: 1 });
  const [giftCode, setGiftCode] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);

  // Coupon form
  const [cp, setCp] = useState({ code: "", kind: "percent", amount: 100, applies_to: "", max: "", expires: "", note: "" });
  const [cpBusy, setCpBusy] = useState(false);
  const [cpMsg, setCpMsg] = useState("");

  async function loadLists() {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.rpc("admin_grants"),
      supabase.rpc("admin_list_coupons"),
    ]);
    setGrants(g || []);
    setCoupons(c || []);
  }

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data: a } = await supabase
        .from("assessments").select("slug,name,is_paid,price_cents,is_published")
        .order("name");
      setAssessments((a || []));
      await loadLists();
      setState("ready");
    })();
  }, [supabase]);

  async function issueGift(e) {
    e.preventDefault();
    setGiftBusy(true); setGiftCode("");
    const { data, error } = await supabase.rpc("admin_issue_grant", {
      p_email: gift.email || null, p_name: gift.name || null,
      p_slugs: gift.slug ? [gift.slug] : [], p_seats: Math.max(1, Number(gift.seats) || 1),
      p_kind: "assessment", p_church: null,
    });
    setGiftBusy(false);
    if (error) { setGiftCode("ERROR: " + error.message); return; }
    setGiftCode(data);
    loadLists();
  }

  async function createCoupon(e) {
    e.preventDefault();
    setCpBusy(true); setCpMsg("");
    const applies = cp.applies_to.trim() ? cp.applies_to.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { error } = await supabase.rpc("admin_create_coupon", {
      p_code: cp.code.trim().toUpperCase(), p_kind: cp.kind, p_amount: Number(cp.amount) || 0,
      p_applies_to: applies, p_max: cp.max ? Number(cp.max) : null,
      p_expires: cp.expires ? new Date(cp.expires).toISOString() : null, p_note: cp.note || null,
    });
    setCpBusy(false);
    if (error) { setCpMsg("Error: " + error.message); return; }
    setCpMsg("Saved.");
    setCp({ code: "", kind: "percent", amount: 100, applies_to: "", max: "", expires: "", note: "" });
    loadLists();
  }

  async function toggleCoupon(code, active) {
    await supabase.rpc("admin_set_coupon_active", { p_code: code, p_active: !active });
    loadLists();
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  const paid = assessments.filter((a) => a.is_paid && a.price_cents > 0);

  return (
    <main className="wrap" style={{ maxWidth: 900, padding: "40px 24px 90px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>Commerce</div>
      <h1 className="serif" style={h1}>Gifts &amp; Coupons</h1>
      <p style={sub}>Gift a premium assessment to anyone, create coupon codes, and test the whole buying flow. A 100%-off coupon lets you run a real checkout end to end without charging a card.</p>

      {/* Gift */}
      <section style={card}>
        <div style={cardH}>Gift a premium assessment</div>
        <p style={cardP}>Issues a free access code with the seats you choose. Send it to the person, or share the link. No payment required.</p>
        <form onSubmit={issueGift} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
          <label style={{ ...fw, gridColumn: "1 / -1" }}><span style={fl}>Assessment</span>
            <select style={inp} required value={gift.slug} onChange={(e) => setGift({ ...gift, slug: e.target.value })}>
              <option value="">Choose a premium assessment…</option>
              {paid.map((a) => <option key={a.slug} value={a.slug}>{a.name} (${(a.price_cents / 100).toFixed(2)})</option>)}
            </select>
          </label>
          <label style={fw}><span style={fl}>Recipient name (optional)</span>
            <input style={inp} value={gift.name} onChange={(e) => setGift({ ...gift, name: e.target.value })} />
          </label>
          <label style={fw}><span style={fl}>Recipient email (optional)</span>
            <input style={inp} type="email" value={gift.email} onChange={(e) => setGift({ ...gift, email: e.target.value })} />
          </label>
          <label style={fw}><span style={fl}>Seats</span>
            <input style={inp} type="number" min="1" max="1000" value={gift.seats} onChange={(e) => setGift({ ...gift, seats: e.target.value })} />
          </label>
          <div><button className="btn btn-primary" disabled={giftBusy || !gift.slug} style={{ padding: "11px 20px" }}>{giftBusy ? "Issuing…" : "Issue gift code"}</button></div>
        </form>
        {giftCode && (
          <div style={codeBox}>
            {giftCode.startsWith("ERROR") ? <span style={{ color: "#B4443A" }}>{giftCode}</span> : (
              <>
                <div style={{ fontSize: 12, color: "#8CA0B3", marginBottom: 4 }}>Gift code — share this or the link below</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "2px", color: "#1C2B3A" }}>{giftCode}</div>
                <div style={{ fontSize: 13, color: "#2E7D8A", marginTop: 6, wordBreak: "break-all" }}>/access/{giftCode}</div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Coupon create */}
      <section style={card}>
        <div style={cardH}>Create a coupon code</div>
        <p style={cardP}>Percent or fixed dollars off at checkout. Leave “applies to” blank for all paid assessments, or list specific slugs. Use a 100% coupon to test the buying system.</p>
        <form onSubmit={createCoupon} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end" }}>
          <label style={fw}><span style={fl}>Code</span>
            <input style={{ ...inp, textTransform: "uppercase" }} required value={cp.code} onChange={(e) => setCp({ ...cp, code: e.target.value })} placeholder="LAUNCH25" />
          </label>
          <label style={fw}><span style={fl}>Type</span>
            <select style={inp} value={cp.kind} onChange={(e) => setCp({ ...cp, kind: e.target.value })}>
              <option value="percent">Percent off</option>
              <option value="fixed">Dollars off</option>
            </select>
          </label>
          <label style={fw}><span style={fl}>{cp.kind === "percent" ? "Percent (0–100)" : "Dollars off"}</span>
            <input style={inp} type="number" min="0" step={cp.kind === "percent" ? "1" : "0.01"} value={cp.amount} onChange={(e) => setCp({ ...cp, amount: e.target.value })} />
          </label>
          <label style={fw}><span style={fl}>Applies to (slugs, optional)</span>
            <input style={inp} value={cp.applies_to} onChange={(e) => setCp({ ...cp, applies_to: e.target.value })} placeholder="big-five, kingdom-design" />
          </label>
          <label style={fw}><span style={fl}>Max uses (optional)</span>
            <input style={inp} type="number" min="1" value={cp.max} onChange={(e) => setCp({ ...cp, max: e.target.value })} />
          </label>
          <label style={fw}><span style={fl}>Expires (optional)</span>
            <input style={inp} type="date" value={cp.expires} onChange={(e) => setCp({ ...cp, expires: e.target.value })} />
          </label>
          <label style={{ ...fw, gridColumn: "1 / -1" }}><span style={fl}>Note (optional)</span>
            <input style={inp} value={cp.note} onChange={(e) => setCp({ ...cp, note: e.target.value })} />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-primary" disabled={cpBusy || !cp.code} style={{ padding: "11px 20px" }}>{cpBusy ? "Saving…" : "Create coupon"}</button>
            {cpMsg && <span style={{ fontSize: 13, color: cpMsg.startsWith("Error") ? "#B4443A" : "#1F7A4D" }}>{cpMsg}</span>}
          </div>
        </form>
      </section>

      {/* Coupon list */}
      {coupons.length > 0 && (
        <section style={card}>
          <div style={cardH}>Coupons</div>
          {coupons.map((c) => (
            <div key={c.code} style={row}>
              <div>
                <span style={{ fontWeight: 800, letterSpacing: "1px", color: "#1C2B3A" }}>{c.code}</span>
                <span style={{ fontSize: 13, color: "#5A6A78", marginLeft: 10 }}>
                  {c.kind === "percent" ? `${c.amount}% off` : `$${c.amount} off`}
                  {c.applies_to?.length ? ` · ${c.applies_to.join(", ")}` : " · all"}
                  {` · used ${c.redemptions}${c.max_redemptions ? `/${c.max_redemptions}` : ""}`}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                </span>
              </div>
              <button onClick={() => toggleCoupon(c.code, c.active)} style={{ ...linkBtn, color: c.active ? "#B4703A" : "var(--teal-deep)" }}>
                {c.active ? "Active — turn off" : "Inactive — turn on"}
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Grants list */}
      {grants.length > 0 && (
        <section style={card}>
          <div style={cardH}>Recent access codes (gifts &amp; purchases)</div>
          {grants.slice(0, 40).map((g) => (
            <div key={g.code} style={row}>
              <div>
                <span style={{ fontWeight: 800, letterSpacing: "1px", color: "#1C2B3A" }}>{g.code}</span>
                <span style={{ fontSize: 13, color: "#5A6A78", marginLeft: 10 }}>
                  {(g.assessment_slugs || []).join(", ") || g.bundle_slug || "—"}
                  {` · ${g.seats_used}/${g.seats_total} seats`}
                  {g.email ? ` · ${g.email}` : ""}
                  {g.stripe_payment_intent ? " · paid" : " · gift"}
                </span>
              </div>
              <Link href={`/access/${g.code}`} style={{ ...linkBtn, textDecoration: "none" }}>Open →</Link>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 660 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 24px", marginBottom: 20 };
const cardH = { fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 4 };
const cardP = { fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: "0 0 16px", maxWidth: 640 };
const fw = { display: "block" };
const fl = { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 5 };
const inp = { width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 9, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
const codeBox = { marginTop: 16, padding: "14px 16px", background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 12 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" };
const linkBtn = { background: "transparent", border: "none", color: "var(--teal-deep)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" };
