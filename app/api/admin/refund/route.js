import { NextResponse } from "next/server";
import { getServerSupabase, getAdminSupabase } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

// Admin-only: refund a purchase in Stripe and revoke its access grant in one
// step. Refunding in the Stripe dashboard alone leaves the access code live;
// this closes both. Records the refund in payments and the audit log.
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export async function POST(req) {
  try {
    const gate = getServerSupabase();
    const { data: isAdmin } = await gate.rpc("is_admin");
    if (!isAdmin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    if (!STRIPE_SECRET) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Missing grant code." }, { status: 400 });

    const admin = getAdminSupabase();
    if (!admin) return NextResponse.json({ error: "Not fully configured." }, { status: 503 });

    const { data: grant } = await admin
      .from("access_grants")
      .select("id,code,stripe_payment_intent,refunded_at,seats_used,email")
      .eq("code", code)
      .maybeSingle();
    if (!grant) return NextResponse.json({ error: "Grant not found." }, { status: 404 });
    if (grant.refunded_at) return NextResponse.json({ error: "Already refunded." }, { status: 409 });
    if (!grant.stripe_payment_intent) {
      return NextResponse.json({ error: "This grant has no payment to refund (comp/manual grant). Delete it instead." }, { status: 400 });
    }

    // Create the refund in Stripe (full refund of the PaymentIntent).
    const form = new URLSearchParams();
    form.append("payment_intent", grant.stripe_payment_intent);
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const refund = await res.json();
    if (!res.ok) return NextResponse.json({ error: refund?.error?.message || "Stripe refund failed." }, { status: 400 });

    const amount = Number(refund.amount) || null;
    // Revoke access: mark refunded/revoked and zero out remaining seats so the
    // code can no longer be redeemed.
    await admin
      .from("access_grants")
      .update({ refunded_at: new Date().toISOString(), revoked_at: new Date().toISOString(), refund_amount_cents: amount, seats_total: grant.seats_used })
      .eq("id", grant.id);

    // Record the refund in the payments ledger (negative amount) and audit log.
    await admin.from("payments").insert({
      stripe_payment_intent: `${grant.stripe_payment_intent}:refund`,
      kind: "purchase", amount_cents: amount ? -amount : 0, status: "refunded",
      email: grant.email, metadata: { refund_id: refund.id, grant_code: grant.code },
    }).then(() => {}, () => {});
    await gate.rpc("admin_log", {
      p_action: "grant_refunded", p_target_type: "grant", p_target_id: grant.code,
      p_detail: { amount_cents: amount, refund_id: refund.id },
    });

    return NextResponse.json({ ok: true, amount_cents: amount });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
