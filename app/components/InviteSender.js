"use client";
import { useState } from "react";

// Small text-or-email invite widget. Sends a personal link via Clearstream
// (SMS) or Emailit (email). Used by the circle, team, and couple flows.
export default function InviteSender({ link, context, fromName, roleLabel }) {
  const [method, setMethod] = useState("sms");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");

  async function send() {
    setState("sending"); setMsg("");
    try {
      const res = await fetch("/api/invite/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, to, name, link, context, fromName }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Could not send.");
      setState("sent"); setTo(""); setName("");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) { setState("error"); setMsg(e.message); }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {roleLabel && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{roleLabel}</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[["sms", "Text"], ["email", "Email"]].map(([k, l]) => (
          <button key={k} onClick={() => setMethod(k)}
            style={{ ...tab, ...(method === k ? tabActive : {}) }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1 1 100px" }} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inp, flex: "2 1 160px" }} type={method === "sms" ? "tel" : "email"}
          placeholder={method === "sms" ? "Phone number" : "Email address"} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn btn-primary" style={{ padding: "10px 16px" }} disabled={!to.trim() || state === "sending"} onClick={send}>
          {state === "sending" ? "Sending…" : state === "sent" ? "Sent ✓" : `Send ${method === "sms" ? "text" : "email"}`}
        </button>
      </div>
      {state === "error" && <p style={{ color: "#B4443A", fontSize: 13, margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}

const tab = { padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" };
const tabActive = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const inp = { padding: "10px 12px", fontSize: 14, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
