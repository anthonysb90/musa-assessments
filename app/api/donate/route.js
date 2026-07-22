import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Post-report donation. Env-gated by STRIPE_SECRET_KEY. Uses the Stripe REST
// API directly (no npm dependency). Card data never touches this server — the
// client confirms the PaymentIntent with the Stripe Payment Element. Webhooks
// (payment_intent.succeeded, invoice.paid) should record the gift; that
// endpoint needs STRIPE_WEBHOOK_SECRET and is added with the admin CRM.

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export async function POST(req) {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: "Giving is not configured yet." }, { status: 503 });
  }
  try {
    const { amount, recurring } = await req.json();
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100) {
      return NextResponse.json({ error: "Please choose an amount of at least $1." }, { status: 400 });
    }

    const form = new URLSearchParams();
    form.append("amount", String(cents));
    form.append("currency", "usd");
    form.append("description", `Mission USA gift${recurring ? " (monthly)" : ""}`);
    form.append("automatic_payment_methods[enabled]", "true");
    form.append("metadata[source]", "assessment_report");
    form.append("metadata[recurring]", recurring ? "true" : "false");

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const pi = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: pi?.error?.message || "Stripe error" }, { status: 400 });
    }
    return NextResponse.json({ client_secret: pi.client_secret });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
