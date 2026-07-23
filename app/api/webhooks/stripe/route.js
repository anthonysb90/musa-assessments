import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminSupabase } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

// Stripe webhook — the server-side source of truth for payments.
// Records every succeeded PaymentIntent in the payments ledger and, for
// purchases, finalizes the access grant idempotently so a buyer who closes
// the tab before returning to the success page still gets their code
// (and their email, via the finalize route's send-once guard, on next visit).
//
// Setup: in the Stripe dashboard add a webhook endpoint for
//   https://assessments.chchurch.com/api/webhooks/stripe
// with the event payment_intent.succeeded, and set STRIPE_WEBHOOK_SECRET in
// Vercel to the endpoint's signing secret.
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Verify Stripe's signature header against the raw body (no SDK dependency).
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject stale events (replay protection, 5 minutes).
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req) {
  if (!WEBHOOK_SECRET) {
    // Not configured yet: acknowledge so Stripe doesn't retry forever, but
    // log loudly — the ledger is not being written.
    console.error("stripe webhook received but STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ ignored: true });
  }
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, sig, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const pi = event.data?.object || {};
  const m = pi.metadata || {};
  const isDonation = m.source === "assessment_report";
  const supabase = getAdminSupabase();
  if (!supabase) {
    console.error("stripe webhook: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  // 1. Ledger row (idempotent on the PaymentIntent id).
  try {
    await supabase.from("payments").upsert(
      {
        stripe_payment_intent: pi.id,
        kind: isDonation ? "donation" : "purchase",
        amount_cents: Number(pi.amount_received ?? pi.amount) || 0,
        currency: pi.currency || "usd",
        email: m.email || pi.receipt_email || null,
        status: pi.status || "succeeded",
        metadata: m,
      },
      { onConflict: "stripe_payment_intent" }
    );
  } catch (e) {
    console.error("stripe webhook ledger error:", e.message);
  }

  // 2. Purchases: finalize the grant idempotently (same RPC the return-page
  // flow uses; a duplicate call returns the existing code).
  if (!isDonation && m.slugs) {
    try {
      const slugs = String(m.slugs).split(",").filter(Boolean);
      if (slugs.length) {
        await supabase.rpc("finalize_purchase", {
          p_pi: pi.id,
          p_email: m.email || pi.receipt_email || null,
          p_name: m.name || null,
          p_slugs: slugs,
          p_seats: Number(m.seats) || 1,
          p_kind: m.kind || "assessment",
          p_bundle: m.bundle || null,
          p_church: null,
        });
      }
    } catch (e) {
      console.error("stripe webhook finalize error:", e.message);
    }
  }

  return NextResponse.json({ received: true });
}
