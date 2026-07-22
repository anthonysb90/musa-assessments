import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";

export const runtime = "nodejs";

// Create a Stripe PaymentIntent for a paid assessment or bundle. Prices are
// read from the database, never trusted from the client. Env-gated by
// STRIPE_SECRET_KEY. Card data never touches this server; the client confirms
// with the on-screen Payment Element.
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export async function POST(req) {
  if (!STRIPE_SECRET) return NextResponse.json({ error: "Checkout is not configured yet." }, { status: 503 });
  try {
    const { kind, slug, email, name, seats, tier_qty } = await req.json();
    let nSeats = Math.max(1, Math.min(1000, Number(seats) || 1));
    const supabase = getServerSupabase();

    let amount = 0, slugs = [], desc = "", bundle = "";
    if (kind === "bundle") {
      const { data: b } = await supabase
        .from("bundles").select("slug,name,price_cents,assessment_slugs,is_active").eq("slug", slug).maybeSingle();
      if (!b || !b.is_active) return NextResponse.json({ error: "That bundle isn't available." }, { status: 404 });
      slugs = b.assessment_slugs || []; desc = `Bundle: ${b.name}`; bundle = b.slug;
      amount = b.price_cents * nSeats;
    } else {
      const { data: a } = await supabase
        .from("assessments").select("slug,name,is_paid,price_cents,seat_tiers").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!a || !a.is_paid || a.price_cents <= 0) return NextResponse.json({ error: "This assessment isn't for sale." }, { status: 400 });
      slugs = [a.slug]; desc = a.name;
      // Volume tier: price is read from the assessment's stored tiers, never the client.
      const tiers = Array.isArray(a.seat_tiers) ? a.seat_tiers : [];
      const tier = tier_qty ? tiers.find((t) => Number(t.qty) === Number(tier_qty)) : null;
      if (tier) { nSeats = Number(tier.qty); amount = Number(tier.price_cents); }
      else { amount = a.price_cents * nSeats; }
    }

    if (amount < 50) return NextResponse.json({ error: "Amount too low." }, { status: 400 });

    const form = new URLSearchParams();
    form.append("amount", String(amount));
    form.append("currency", "usd");
    form.append("description", `${desc}${nSeats > 1 ? ` (${nSeats} seats)` : ""}`);
    form.append("automatic_payment_methods[enabled]", "true");
    if (email) form.append("receipt_email", email);
    form.append("metadata[kind]", kind || "assessment");
    form.append("metadata[slug]", slug);
    form.append("metadata[bundle]", bundle);
    form.append("metadata[slugs]", slugs.join(","));
    form.append("metadata[seats]", String(nSeats));
    form.append("metadata[email]", email || "");
    form.append("metadata[name]", name || "");

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const pi = await res.json();
    if (!res.ok) return NextResponse.json({ error: pi?.error?.message || "Stripe error" }, { status: 400 });
    return NextResponse.json({ client_secret: pi.client_secret, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
