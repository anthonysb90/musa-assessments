// Cloudflare Turnstile server verification. Env-gated: if no secret key is
// configured, verification passes (feature off) so the app works without it.

import { TURNSTILE_SECRET_KEY } from "./config";

export async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET_KEY) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: "missing token" };
  try {
    const form = new URLSearchParams();
    form.append("secret", TURNSTILE_SECRET_KEY);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await res.json();
    return { ok: !!data.success };
  } catch (e) {
    // Fail CLOSED on network error: a verification we cannot perform is a
    // failed verification. The client widget lets the user retry immediately,
    // and Cloudflare outages are rare and short. (Previously this failed open,
    // which let bots submit freely whenever the check errored.)
    console.error("turnstile verify error:", e.message);
    return { ok: false, error: e.message };
  }
}
