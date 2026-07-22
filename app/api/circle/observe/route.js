import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

// Record an observer's ratings of the subject. Loads the observer instrument
// (base_slug + role), computes per-domain averages, and stores the aggregate
// on the circle. Individual observer answers are never exposed in reports.
export async function POST(req) {
  try {
    const { circle_code, role, name, answers, honeypot } = await req.json();
    if (honeypot) return NextResponse.json({ ok: true });
    if (!circle_code || !role || !answers) return NextResponse.json({ error: "Missing data." }, { status: 400 });
    const supabase = getServerSupabase();

    const { data: circle } = await supabase
      .from("review_circles").select("base_slug").eq("circle_code", circle_code).maybeSingle();
    if (!circle) return NextResponse.json({ error: "Invalid link." }, { status: 400 });

    const slug = `${circle.base_slug}-${role}`;
    const { data: a } = await supabase.from("assessments").select("id").eq("slug", slug).maybeSingle();
    if (!a) return NextResponse.json({ error: "This role isn't set up." }, { status: 400 });
    const { data: items } = await supabase.from("items").select("id,domain,is_scored").eq("assessment_id", a.id);
    const imap = Object.fromEntries((items || []).map((it) => [it.id, it]));

    const g = {};
    for (const [itemId, value] of Object.entries(answers)) {
      const it = imap[itemId];
      if (!it || it.is_scored === false || !it.domain) continue;
      (g[it.domain] ||= []).push(Number(value));
    }
    const domains = Object.entries(g)
      .map(([domain, vals]) => ({ domain, average: +(vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) }))
      .sort((x, y) => y.average - x.average);

    const { data: rec } = await supabase.rpc("record_circle_response", {
      p_code: circle_code, p_role: role, p_name: name || null, p_json: { domains, scale_max: 5, name: name || null },
    });
    if (!rec?.ok) return NextResponse.json({ error: "Could not record your response." }, { status: 500 });
    return NextResponse.json({ ok: true, count: rec.count });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
