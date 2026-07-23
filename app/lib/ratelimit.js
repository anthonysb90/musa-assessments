// Simple fixed-window rate limiting for API routes.
//
// Backend: Upstash Redis over REST when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set (shared across all serverless instances).
// Fallback: an in-process Map. The fallback is per-instance only, so on
// Vercel it is a soft limit, not a hard one. Set the Upstash env vars in
// production to make limits real. Limits fail open on backend errors so an
// outage never blocks real users; abuse protection degrades, availability
// does not.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const memory = new Map(); // key -> { count, resetAt }

function memoryLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (memory.size > 5000) {
      // Cheap sweep so the map cannot grow without bound.
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { ok: true, remaining: limit - 1 };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

async function upstashLimit(key, limit, windowSeconds) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
    ]),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = await res.json();
  const count = Number(out?.[0]?.result) || 0;
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

// rateLimit("invite:1.2.3.4", 5, 3600) -> { ok, remaining }
export async function rateLimit(key, limit, windowSeconds) {
  try {
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      return await upstashLimit(`rl:${key}`, limit, windowSeconds);
    }
    return memoryLimit(key, limit, windowSeconds);
  } catch (e) {
    console.error("ratelimit backend error:", e.message);
    return { ok: true, remaining: 0, degraded: true };
  }
}

// Convenience: pull the caller IP off a Next.js request.
export function requestIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
