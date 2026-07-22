"use client";
import { useState } from "react";
import { DONATE_URL } from "../lib/config";

// Post-report donation invite. Donations are handled by Tithe.ly. Each amount
// deep-links to the Tithe.ly form with the gift pre-filled via &amount=<cents>.
// No on-site payment. Paid assessments use Stripe separately. Suppressed for
// MIP/church-class contexts, and hidden from print/PDF.

const TIERS = [
  [10, "Cover your report"],
  [25, "Bless a few others"],
  [50, "Help us keep going"],
  [100, "A month of hosting"],
];

// Tithe.ly reads the amount in cents (10000 = $100).
function giveUrl(dollars) {
  const cents = Math.max(1, Math.round(Number(dollars) || 0)) * 100;
  const sep = DONATE_URL.includes("?") ? "&" : "?";
  return `${DONATE_URL}${sep}amount=${cents}`;
}

export default function DonationCard({ suppressed }) {
  const [dismissed, setDismissed] = useState(false);
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  if (suppressed || dismissed) return null;

  const effective = custom ? Math.max(1, Math.round(Number(custom) || 0)) : amount;

  return (
    <div style={wrap} className="no-print no-pdf">
      <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, color: "#1C2B3A", marginBottom: 6 }}>
        This one's on us. If it helped, help us keep it going.
      </div>
      <p style={{ fontSize: 14, color: "#4A5B6D", marginTop: 0 }}>
        Mission USA offers these assessments free so anyone can use them. If your report was worth
        something to you, a gift of any size helps us keep it free for the next person.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
        {TIERS.map(([amt, label]) => (
          <button key={amt} onClick={() => { setAmount(amt); setCustom(""); }}
            style={{ ...tier, ...(amount === amt && !custom ? tierActive : {}) }}>
            <span style={{ fontWeight: 700 }}>${amt}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="number" min="1" placeholder="Custom amount" value={custom}
          onChange={(e) => setCustom(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E7E9EC", width: 150 }} />
      </div>
      <p style={{ fontSize: 12, color: "#8CA0B3", margin: "10px 0 0" }}>
        Reports like this often cost $10 or more elsewhere. Yours is free.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <a className="btn btn-primary" href={giveUrl(effective)} target="_blank" rel="noopener noreferrer">
          Give ${effective} →
        </a>
        <button onClick={() => setDismissed(true)} style={dismiss}>No thanks, maybe later</button>
      </div>
      <p style={{ fontSize: 12, color: "#8CA0B3", margin: "12px 0 0" }}>
        Giving is securely handled by Tithe.ly.
      </p>
    </div>
  );
}

const wrap = { background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 16, padding: "24px 26px", marginTop: 28 };
const tier = { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E7E9EC", background: "#fff", color: "#1C2B3A", cursor: "pointer", minWidth: 92 };
const tierActive = { background: "#1B3A57", borderColor: "#1B3A57", color: "#fff" };
const dismiss = { background: "transparent", border: "none", color: "#7C8A9C", fontSize: 13.5, cursor: "pointer", textDecoration: "underline" };
