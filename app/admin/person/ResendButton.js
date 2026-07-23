"use client";
import { useState } from "react";

// Small admin action that re-sends a result's report email for one session.
// Understated to match the surrounding link styling on the person drill-down.
export default function ResendButton({ sessionId }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");

  async function resend() {
    if (state === "sending") return;
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/admin/resend-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out?.error) throw new Error(out?.error || "Couldn't resend");
      setState("sent");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setErr(e.message || "Couldn't resend");
      setState("error");
    }
  }

  if (state === "error")
    return (
      <button onClick={resend} style={{ ...btn, color: "#B4443A" }}>
        {err} — retry
      </button>
    );

  return (
    <button onClick={resend} disabled={state === "sending"} style={btn}>
      {state === "sending" ? "Sending…" : state === "sent" ? "Sent ✓" : "Resend report email"}
    </button>
  );
}

const btn = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  color: "var(--teal-deep)",
  fontSize: 13,
  fontWeight: 600,
};
