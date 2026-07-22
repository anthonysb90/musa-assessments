"use client";
import { useState } from "react";

// Post-report donation card (Mission USA). Grace-filled partnership, shown
// after the report is delivered. Fully env-gated: renders only when a Stripe
// publishable key is configured, and suppressed for MIP/church-class contexts.
// When Stripe isn't configured, the component renders nothing so the report
// page stays clean.

const PUBK =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
    : "";

const TIERS = [
  [10, "Cover your report"],
  [25, "Bless a few others"],
  [50, "Help us keep going"],
  [99, "Cover a month of hosting"],
];

export default function DonationCard({ suppressed }) {
  const [dismissed, setDismissed] = useState(false);
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [state, setState] = useState("idle"); // idle | working | thanks | error
  const [msg, setMsg] = useState("");

  if (!PUBK || suppressed || dismissed) return null;
  if (state === "thanks")
    return (
      <div style={wrap} className="no-print">
        <p style={{ margin: 0, fontSize: 16, color: "#1C2B3A" }}>
          Thank you for partnering with Mission USA. A receipt is on its way to your inbox.
        </p>
      </div>
    );

  const effective = custom ? Math.max(1, Math.round(Number(custom) || 0)) : amount;

  async function give() {
    setState("working");
    setMsg("");
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effective, recurring }),
      });
      const out = await res.json();
      if (!res.ok || !out.client_secret) throw new Error(out.error || "Could not start the gift.");
      // Load Stripe.js from CDN on demand and confirm with the Payment Element.
      const stripe = await loadStripe(PUBK);
      const { error } = await stripe.confirmPayment({
        clientSecret: out.client_secret,
        confirmParams: { return_url: window.location.href },
      });
      if (error) throw new Error(error.message);
      setState("thanks");
    } catch (e) {
      setState("error");
      setMsg(e.message || "Something went wrong. You can try again.");
    }
  }

  return (
    <div style={wrap} className="no-print">
      <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, color: "#1C2B3A", marginBottom: 6 }}>
        This one's on us. If it helped, help us keep it going.
      </div>
      <p style={{ fontSize: 14, color: "#4A5B6D", marginTop: 0 }}>
        Mission USA offers these assessments free so anyone can use them. If your report was worth
        something to you, a gift of any size helps us keep it free for the next person.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
        {TIERS.map(([amt, label]) => (
          <button
            key={amt}
            onClick={() => { setAmount(amt); setCustom(""); }}
            style={{ ...tier, ...(amount === amt && !custom ? tierActive : {}) }}
          >
            <span style={{ fontWeight: 700 }}>${amt}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="number" min="1" placeholder="Custom amount"
          value={custom} onChange={(e) => setCustom(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E7E9EC", width: 150 }}
        />
        <label style={{ fontSize: 13.5, color: "#4A5B6D", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Make this monthly
        </label>
      </div>
      <p style={{ fontSize: 12, color: "#8CA0B3", margin: "10px 0 0" }}>
        Reports like this often cost $10 or more elsewhere. Yours is free.
      </p>
      {msg && <p style={{ fontSize: 13, color: "#B4443A", margin: "8px 0 0" }}>{msg}</p>}
      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
        <button className="btn btn-primary" disabled={state === "working"} onClick={give}>
          {state === "working" ? "Starting…" : `Give $${effective}${recurring ? "/mo" : ""}`}
        </button>
        <button onClick={() => setDismissed(true)} style={dismiss}>No thanks, maybe later</button>
      </div>
    </div>
  );
}

// Minimal Stripe.js loader (CDN). Avoids adding an npm dependency.
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

const wrap = {
  background: "var(--blush,#F5EFE6)",
  border: "1px solid #EADFC9",
  borderRadius: 16,
  padding: "24px 26px",
  marginTop: 28,
};
const tier = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E7E9EC",
  background: "#fff", color: "#1C2B3A", cursor: "pointer", minWidth: 92,
};
const tierActive = { background: "#1B3A57", borderColor: "#1B3A57", color: "#fff" };
const dismiss = {
  background: "transparent", border: "none", color: "#7C8A9C",
  fontSize: 13.5, cursor: "pointer", textDecoration: "underline",
};
