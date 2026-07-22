// Clearstream SMS (server-only). Verified endpoint (Clearstream API v1):
// POST https://api.getclearstream.com/v1/texts, header X-Api-Key.
// Body: { mobile_number (E.164), message_header, message_body }.
// Env-gated: if CLEARSTREAM_API_KEY is unset, we no-op and return { skipped }.

import { CLEARSTREAM_API_KEY, CLEARSTREAM_HEADER } from "./config";

// Normalize a US-style number to E.164. Leaves already-E.164 numbers alone.
export function toE164(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export async function sendSms({ to, body, header }) {
  if (!CLEARSTREAM_API_KEY) return { skipped: true };
  const number = toE164(to);
  if (!number || !body) return { skipped: true, reason: "missing number or body" };
  try {
    const res = await fetch("https://api.getclearstream.com/v1/texts", {
      method: "POST",
      headers: { "X-Api-Key": CLEARSTREAM_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mobile_number: number,
        message_header: header || CLEARSTREAM_HEADER,
        message_body: body,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: t.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
