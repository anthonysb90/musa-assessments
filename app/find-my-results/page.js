"use client";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "../lib/config";

// Public self-serve recovery: someone who lost the email with their report
// link enters the email they used and we re-send it. The server always
// returns a generic success, so we never reveal whether anything matched.
export default function FindMyResultsPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");
  const [tsToken, setTsToken] = useState("");

  // Turnstile widget — mounted only when a site key is configured. Mirrors the
  // assessment start page's explicit-render lifecycle. With no site key we
  // submit without a token and the server treats the missing token as a skip.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let widgetId;
    function render() {
      if (!window.turnstile) return false;
      const el = document.getElementById("ts-widget");
      if (!el || el.dataset.rendered) return true;
      el.dataset.rendered = "1";
      widgetId = window.turnstile.render("#ts-widget", {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t) => setTsToken(t),
        "error-callback": () => setTsToken(""),
        "expired-callback": () => setTsToken(""),
      });
      return true;
    }
    if (!render()) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.onload = render;
      document.body.appendChild(s);
    }
    return () => {
      try { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); } catch {}
    };
  }, []);

  async function send(e) {
    e.preventDefault();
    setState("sending");
    setMsg("");
    try {
      const r = await fetch("/api/find-my-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: tsToken }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || out?.error) throw new Error(out?.error || "Something went wrong. Please try again.");
      setMsg(out.message || "If we found results for that email, we've re-sent your report link.");
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err.message || "Something went wrong. Please try again.");
    }
  }

  const canSubmit = email && state !== "sending" && (!TURNSTILE_SITE_KEY || tsToken);

  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={card}>
        <h1 className="serif" style={{ fontSize: 30, margin: "0 0 6px", color: "var(--ink)" }}>Find my results</h1>
        {state === "sent" ? (
          <>
            <div style={sentBox}>{msg}</div>
            <div style={{ marginTop: 18 }}>
              <a href="/" style={backLink}>← Back to assessments</a>
            </div>
          </>
        ) : (
          <>
            <p style={muted}>
              Lost the email with your report link? Enter the email address you used when you took the
              assessment and we'll re-send it.
            </p>
            <form onSubmit={send} style={{ marginTop: 18 }}>
              <input
                type="email" required placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} style={input}
              />
              {TURNSTILE_SITE_KEY && <div id="ts-widget" style={{ marginTop: 14 }} />}
              {state === "error" && msg && (
                <p style={{ color: "#B4443A", fontSize: 13.5, margin: "10px 0 0" }}>{msg}</p>
              )}
              <button className="btn btn-primary" disabled={!canSubmit} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
                {state === "sending" ? "Sending…" : "Re-send my report link"}
              </button>
            </form>
            <div style={{ marginTop: 18 }}>
              <a href="/" style={backLink}>← Back to assessments</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const card = { width: "100%", maxWidth: 420, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 30 };
const muted = { color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: 0 };
const input = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const sentBox = { marginTop: 18, background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 12, padding: "16px 18px", fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.55 };
const backLink = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
