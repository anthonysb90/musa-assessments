"use client";
import { useState } from "react";

export default function InviteForm({ churchId }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");

  async function invite(e) {
    e.preventDefault();
    setState("working");
    setMsg("");
    try {
      const res = await fetch("/api/church/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ church_id: churchId, email }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Could not send the invite.");
      setState("done");
      setMsg(`Invited ${email}. They can sign in with a magic link to reach this dashboard.`);
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={invite} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input
        type="email" required placeholder="leader@church.org" value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ flex: "1 1 240px", padding: "11px 13px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 14.5 }}
      />
      <button className="btn btn-primary" disabled={state === "working"}>
        {state === "working" ? "Inviting…" : "Send invite"}
      </button>
      {msg && (
        <p style={{ width: "100%", margin: "4px 0 0", fontSize: 13.5, color: state === "error" ? "#B4443A" : "var(--teal-deep)" }}>
          {msg}
        </p>
      )}
    </form>
  );
}
