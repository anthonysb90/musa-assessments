import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";
import { buildAccessEmail, sendEmail } from "../../../lib/email";

export const runtime = "nodejs";

// Verify a PaymentIntent server-side, then issue an access grant (a shareable
// code with a seat count). Idempotent: re-finalizing the same payment returns
// the same code. This is the trust boundary — access is only granted after
// Stripe confirms the charge succeeded.
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export async function POST(req) {
  if (!STRIPE_SECRET) return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
  try {
    const { payment_intent } = await req.json();
    if (!payment_intent) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });

    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
    });
    const pi = await res.json();
    if (!res.ok) return NextResponse.json({ error: pi?.error?.message || "Stripe error" }, { status: 400 });
    if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment isn't complete yet." }, { status: 402 });

    const m = pi.metadata || {};
    const slugs = (m.slugs || "").split(",").filter(Boolean);
    const seats = Number(m.seats) || 1;
    const email = m.email || pi.receipt_email || null;
    const supabase = getServerSupabase();

    const { data: code, error } = await supabase.rpc("finalize_purchase", {
      p_pi: pi.id, p_email: email, p_name: m.name || null,
      p_slugs: slugs, p_seats: seats, p_kind: m.kind || "assessment",
      p_bundle: m.bundle || null, p_church: null,
    });
    if (error) return NextResponse.json({ error: "Could not record your purchase." }, { status: 500 });

    // Count the coupon redemption, if one was used (best-effort).
    if (m.coupon) { try { await supabase.rpc("redeem_coupon", { p_code: m.coupon }); } catch { /* non-blocking */ } }

    // Email the buyer their access code (best-effort).
    try {
      if (email) {
        const em = buildAccessEmail({ code, seats, slugs, isBundle: m.kind === "bundle", name: m.name });
        await sendEmail({ to: email, subject: em.subject, html: em.html });
      }
    } catch { /* never block on email */ }

    return NextResponse.json({ code, seats });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
