"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "../lib/supabase";
import { APP_URL } from "../lib/config";

export default function LoginPage() {
  return (
    <Suspense fallback={<Shell><p style={muted}>Loading…</p></Shell>}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");

  async function send(e) {
    e.preventDefault();
    setState("sending");
    setMsg("");
    try {
      const supabase = getSupabase();
      const redirect = `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <Shell>
      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 6px", color: "var(--ink)" }}>Sign in</h1>
      <p style={muted}>
        No passwords. Enter your email and we'll send a one-tap magic link to sign you in.
      </p>
      {state === "sent" ? (
        <div style={sentBox}>
          <strong>Check your inbox.</strong> We sent a sign-in link to {email}. Open it on this device
          to continue.
        </div>
      ) : (
        <form onSubmit={send} style={{ marginTop: 18 }}>
          <input
            type="email" required placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} style={input}
          />
          {msg && <p style={{ color: "#B4443A", fontSize: 13.5, margin: "10px 0 0" }}>{msg}</p>}
          <button className="btn btn-primary" disabled={state === "sending"} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
            {state === "sending" ? "Sending…" : "Send my magic link"}
          </button>
        </form>
      )}
      <div style={{ marginTop: 18 }}>
        <a href="/" style={{ color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          ← Back to assessments
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 30 }}>
        {children}
      </div>
    </main>
  );
}
const muted = { color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: 0 };
const input = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const sentBox = { marginTop: 18, background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 12, padding: "16px 18px", fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.55 };
