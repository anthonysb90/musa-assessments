"use client";
import { useState } from "react";

// Refund + revoke a paid access grant. POSTs to /api/admin/refund (admin-gated).
// props: { code, onDone } — onDone() is called after a successful refund so the
// caller can refresh or optimistically mark the row.
export default function RefundButton({ code, onDone }) {
  const [state, setState] = useState("idle"); // idle | working | done
  const [err, setErr] = useState("");

  async function refund() {
    if (state === "working") return;
    if (!window.confirm("Refund this purchase and revoke the access code? This cannot be undone.")) return;
    setErr("");
    setState("working");
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setErr(data?.error || `Refund failed (${res.status})`);
        setState("idle");
        return;
      }
      setState("done");
      onDone?.();
    } catch (e) {
      setErr(e?.message || "Refund failed");
      setState("idle");
    }
  }

  if (state === "done") return <span style={{ ...refundChip }}>Refunded ✓</span>;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {err && <span style={{ color: "#B4443A", fontSize: 12 }}>{err}</span>}
      <button
        onClick={refund}
        disabled={state === "working"}
        style={{ ...btn, opacity: state === "working" ? 0.6 : 1, cursor: state === "working" ? "default" : "pointer" }}
      >
        {state === "working" ? "Refunding…" : "Refund"}
      </button>
    </span>
  );
}

const btn = {
  background: "transparent",
  border: "none",
  color: "#B4443A",
  fontSize: 13,
  fontWeight: 600,
  padding: 0,
  textDecoration: "underline",
  fontFamily: "inherit",
};
const refundChip = { fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: "#F3E6E4", color: "#B4443A", flexShrink: 0 };
