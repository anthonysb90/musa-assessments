import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../../lib/supabaseServer";
import { rateLimit, requestIp } from "../../../lib/ratelimit";

export const runtime = "nodejs";

// Coupon preview for the checkout form. The validate_coupon RPC is
// service-role-only since migration_32, so the client goes through this
// route, which also rate limits coupon guessing. The authoritative check
// still happens server-side in /api/checkout at purchase time.
export async function POST(req) {
  try {
    const rl = await rateLimit(`coupon:${requestIp(req)}`, 20, 3600);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

    const { coupon, slug, kind, subtotal_cents } = await req.json();
    if (!coupon || !String(coupon).trim()) return NextResponse.json({ ok: false });

    const admin = getAdminSupabase();
    if (!admin) return NextResponse.json({ ok: false });

    const { data, error } = await admin.rpc("validate_coupon", {
      p_code: String(coupon).trim(),
      p_slug: slug || null,
      p_bundle: kind === "bundle" ? slug : null,
      p_subtotal_cents: Number(subtotal_cents) || 0,
    });
    if (error || !data?.ok) return NextResponse.json({ ok: false });
    return NextResponse.json({
      ok: true,
      discount_cents: Number(data.discount_cents) || 0,
      label: data.label || "Discount",
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
