"use client";
import { useEffect, useRef, useState } from "react";

// On-screen Stripe checkout using the Payment Element. Reused for single
// assessments and bundles, individual or multi-seat (church) purchases.
// Env-gated by NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. On success it calls
// onDone(code, seats) with the issued access code.

const PUBK =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "" : "";

function loadStripe(pk) {
  return new Promise((resolve, reject) => {
    if (window.Stripe) return resolve(window.Stripe(pk));
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.onload = () => resolve(window.Stripe(pk));
    s.onerror = () => reject(new Error("Could not load the payment form."));
    document.body.appendChild(s);
  });
}

export default function Checkout({ kind = "assessment", slug, name, priceCents, allowSeats = true, tiers = [], onDone }) {
  const [phase, setPhase] = useState("form"); // form | pay | working | error
  const [email, setEmail] = useState("");
  const [buyer, setBuyer] = useState("");
  const [group, setGroup] = useState(false);
  const [seats, setSeats] = useState(1);
  const [amount, setAmount] = useState(priceCents || 0);
  const [err, setErr] = useState("");
  const [feeCfg, setFeeCfg] = useState(null); // { fee_fixed_cents, fee_percent, fee_label, fee_enabled }
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);

  // Load the platform fee config (public) so we can show the fee up front.
  useEffect(() => {
    let live = true;
    fetch("/api/checkout").then((r) => r.json()).then((c) => { if (live) setFeeCfg(c); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Fee computed on the subtotal, matching the server's formula exactly.
  const feeCents = feeCfg && feeCfg.fee_enabled
    ? Math.round((amount * (Number(feeCfg.fee_percent) || 0)) / 100) + (Number(feeCfg.fee_fixed_cents) || 0)
    : 0;
  const feeLabel = feeCfg?.fee_label || "Platform fee";
  const grandTotal = amount + feeCents;

  // Volume options: "just me" (1 seat, base price) plus each admin-defined tier.
  const options = (Array.isArray(tiers) && tiers.length)
    ? [{ qty: 1, cents: priceCents || 0, label: "Just me" },
       ...tiers.map((t) => ({ qty: Number(t.qty), cents: Number(t.price_cents), label: `${t.qty} seats` }))]
    : null;
  const [tierQty, setTierQty] = useState(1);

  useEffect(() => {
    if (options) {
      const o = options.find((x) => x.qty === tierQty) || options[0];
      setAmount(o.cents);
    } else {
      setAmount((priceCents || 0) * Math.max(1, group ? Number(seats) || 1 : 1));
    }
  }, [priceCents, seats, group, tierQty, tiers]);

  // Return path for redirect-based payment methods.
  useEffect(() => {
    const pi = new URLSearchParams(window.location.search).get("payment_intent");
    if (pi) finalize(pi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toPayment(e) {
    e?.preventDefault();
    if (!PUBK) { setErr("Payments aren't set up yet. Please check back soon."); setPhase("error"); return; }
    setErr("");
    try {
      const payload = options
        ? { kind, slug, email, name: buyer, tier_qty: tierQty > 1 ? tierQty : undefined, seats: 1 }
        : { kind, slug, email, name: buyer, seats: group ? Number(seats) || 1 : 1 };
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Could not start checkout.");
      const stripe = await loadStripe(PUBK);
      stripeRef.current = stripe;
      const elements = stripe.elements({
        clientSecret: out.client_secret,
        appearance: { theme: "stripe", variables: { colorPrimary: "#1B3A57", borderRadius: "10px" } },
      });
      elementsRef.current = elements;
      setPhase("pay");
      setTimeout(() => { const pe = elements.create("payment"); pe.mount("#payment-element"); }, 60);
    } catch (e2) { setErr(e2.message); setPhase("error"); }
  }

  async function pay() {
    setPhase("working"); setErr("");
    try {
      const stripe = stripeRef.current, elements = elementsRef.current;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements, redirect: "if_required", confirmParams: { return_url: window.location.href },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent && paymentIntent.status === "succeeded") await finalize(paymentIntent.id);
      // else: a redirect method will bring the user back with ?payment_intent
    } catch (e2) { setErr(e2.message); setPhase("pay"); }
  }

  async function finalize(pi) {
    setPhase("working");
    try {
      const res = await fetch("/api/checkout/finalize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent: pi }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Could not finalize your purchase.");
      onDone?.(out.code, out.seats);
    } catch (e2) { setErr(e2.message); setPhase("error"); }
  }

  const dollars = (c) => `$${((c || 0) / 100).toFixed(2)}`;

  if (phase === "error")
    return (
      <div style={card}>
        <p style={{ color: "#B4443A", margin: "0 0 12px" }}>{err}</p>
        <button className="btn btn-ghost" onClick={() => { setErr(""); setPhase("form"); }}>Try again</button>
      </div>
    );

  return (
    <div style={card}>
      {phase === "form" && (
        <form onSubmit={toPayment}>
          <div style={priceRow}><span>{name}</span><strong>{dollars(priceCents)}{group && seats > 1 ? ` × ${seats}` : ""}</strong></div>
          <label style={fw}><span style={fl}>Your name</span>
            <input style={inp} required value={buyer} onChange={(e) => setBuyer(e.target.value)} />
          </label>
          <label style={fw}><span style={fl}>Email (for your receipt and access code)</span>
            <input style={inp} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {options ? (
            <div style={fw}>
              <div style={fl}>How many seats?</div>
              <div style={{ display: "grid", gap: 8 }}>
                {options.map((o) => {
                  const active = o.qty === tierQty;
                  const per = o.qty > 1 ? ` · $${(o.cents / o.qty / 100).toFixed(2)}/seat` : "";
                  const save = o.qty > 1 && priceCents ? o.qty * priceCents - o.cents : 0;
                  return (
                    <button key={o.qty} type="button" onClick={() => setTierQty(o.qty)}
                      style={{ ...tierBtn, ...(active ? tierBtnActive : {}) }}>
                      <span>{o.label}{o.qty > 1 ? ` (${o.qty} seats)` : ""}
                        {save > 0 && <span style={{ color: active ? "#E4CE8C" : "#2E7D8A", fontWeight: 700, marginLeft: 8, fontSize: 12 }}>save ${(save / 100).toFixed(0)}</span>}
                      </span>
                      <span style={{ fontWeight: 700 }}>{dollars(o.cents)}<span style={{ fontWeight: 400, fontSize: 11.5, opacity: 0.7 }}>{per}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : allowSeats ? (
            <>
              <label style={{ ...fw, display: "flex", gap: 9, alignItems: "center" }}>
                <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} />
                <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>Buying for a group or church (multiple seats)</span>
              </label>
              {group && (
                <label style={fw}><span style={fl}>How many seats?</span>
                  <input style={inp} type="number" min="1" max="1000" value={seats} onChange={(e) => setSeats(e.target.value)} />
                </label>
              )}
            </>
          ) : null}
          <div style={subRow}><span>Subtotal</span><span>{dollars(amount)}</span></div>
          {feeCents > 0 && (
            <div style={subRow}>
              <span>{feeLabel}</span>
              <span>{dollars(feeCents)}</span>
            </div>
          )}
          <div style={totalRow}><span>Total</span><strong>{dollars(grandTotal)}</strong></div>
          {feeCents > 0 && (
            <p style={feeNote}>
              The {feeLabel.toLowerCase()} helps cover secure payment processing and keeps most of our
              assessments free for the whole CHC family.
            </p>
          )}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            Continue to payment →
          </button>
          <p style={{ fontSize: 12, color: "#8CA0B3", marginTop: 12, textAlign: "center" }}>Secure payment by Stripe. Your card never touches our servers.</p>
        </form>
      )}
      {phase === "pay" && (
        <div>
          <div style={subRow}><span>Subtotal</span><span>{dollars(amount)}</span></div>
          {feeCents > 0 && <div style={subRow}><span>{feeLabel}</span><span>{dollars(feeCents)}</span></div>}
          <div style={totalRow}><span>Total</span><strong>{dollars(grandTotal)}</strong></div>
          <div id="payment-element" style={{ margin: "16px 0" }} />
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={pay}>
            Pay {dollars(grandTotal)}
          </button>
          {err && <p style={{ color: "#B4443A", fontSize: 13, marginTop: 8 }}>{err}</p>}
        </div>
      )}
      {phase === "working" && <p style={{ color: "var(--ink-soft)", textAlign: "center", padding: "12px 0" }}>Processing your payment…</p>}
    </div>
  );
}

const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 26 };
const priceRow = { display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--line)", fontSize: 16, color: "var(--ink)" };
const subRow = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", fontSize: 14.5, color: "var(--ink-soft)" };
const totalRow = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", fontSize: 18, color: "var(--ink)", borderTop: "1px solid var(--line)", marginTop: 6 };
const feeNote = { fontSize: 11.5, color: "#8CA0B3", margin: "2px 0 0", lineHeight: 1.5 };
const fw = { display: "block", marginBottom: 16 };
const fl = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const inp = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const tierBtn = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, textAlign: "left" };
const tierBtnActive = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
