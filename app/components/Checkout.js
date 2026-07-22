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

export default function Checkout({ kind = "assessment", slug, name, priceCents, allowSeats = true, onDone }) {
  const [phase, setPhase] = useState("form"); // form | pay | working | error
  const [email, setEmail] = useState("");
  const [buyer, setBuyer] = useState("");
  const [group, setGroup] = useState(false);
  const [seats, setSeats] = useState(1);
  const [amount, setAmount] = useState(priceCents || 0);
  const [err, setErr] = useState("");
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);

  useEffect(() => {
    setAmount((priceCents || 0) * Math.max(1, group ? Number(seats) || 1 : 1));
  }, [priceCents, seats, group]);

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
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug, email, name: buyer, seats: group ? Number(seats) || 1 : 1 }),
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
          {allowSeats && (
            <label style={{ ...fw, display: "flex", gap: 9, alignItems: "center" }}>
              <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} />
              <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>Buying for a group or church (multiple seats)</span>
            </label>
          )}
          {group && (
            <label style={fw}><span style={fl}>How many seats?</span>
              <input style={inp} type="number" min="1" max="1000" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </label>
          )}
          <div style={totalRow}><span>Total</span><strong>{dollars(amount)}</strong></div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            Continue to payment →
          </button>
          <p style={{ fontSize: 12, color: "#8CA0B3", marginTop: 12, textAlign: "center" }}>Secure payment by Stripe. Your card never touches our servers.</p>
        </form>
      )}
      {phase === "pay" && (
        <div>
          <div style={totalRow}><span>Total</span><strong>{dollars(amount)}</strong></div>
          <div id="payment-element" style={{ margin: "16px 0" }} />
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={pay}>
            Pay {dollars(amount)}
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
const totalRow = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", fontSize: 18, color: "var(--ink)", borderTop: "1px solid var(--line)", marginTop: 6 };
const fw = { display: "block", marginBottom: 16 };
const fl = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const inp = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
