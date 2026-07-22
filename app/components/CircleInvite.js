"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Shown on the results page for Leadership Health and Church Planter. Turns the
// self-assessment into a co-rater circle and sends the subject to invite others.
export default function CircleInvite({ token, kind }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const copy = kind === "planter"
    ? {
        title: "Get the fullest picture: invite your spouse",
        body: "Your self-assessment is a strong start. The richest read comes when your spouse adds their honest perspective, and a Mission USA assessor completes their evidence-based review. Planting is a family calling, and no one decides readiness alone.",
      }
    : {
        title: "See yourself through others' eyes",
        body: "Self-awareness is where strong leadership starts, but the people you lead see things you can't see about yourself. Invite a few honest voices, and the best results come from more than one perspective.",
      };

  async function go() {
    setLoading(true);
    try {
      const res = await fetch("/api/circle/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_token: token }),
      });
      const out = await res.json();
      if (out.code) { router.push(`/circle/${out.code}`); return; }
    } catch { /* fall through */ }
    setLoading(false);
  }

  return (
    <section className="no-print no-pdf" style={wrap}>
      <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 8 }}>
        Better together
      </div>
      <div className="serif" style={{ fontSize: 21, color: "#1C2B3A", marginBottom: 6 }}>{copy.title}</div>
      <p style={{ fontSize: 14.5, color: "#4A5B6D", lineHeight: 1.6, margin: "0 0 16px" }}>{copy.body}</p>
      <button className="btn btn-primary" onClick={go} disabled={loading}>
        {loading ? "Setting up…" : "Invite others for a fuller picture →"}
      </button>
    </section>
  );
}

const wrap = { background: "linear-gradient(135deg,#EAF3F4,#F5EFE6)", border: "1px solid #CFE3E5", borderRadius: 16, padding: "22px 24px", marginTop: 24 };
