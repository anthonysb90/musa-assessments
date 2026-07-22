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
    // Fail open on network error to avoid blocking real users.
    return { ok: true, error: e.message };
  }
}
