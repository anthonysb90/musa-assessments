import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/config";
import { NextResponse } from "next/server";

// Server-side client using the anon key. RLS policies allow the inserts we make
// (anonymous sessions, responses, public event logging). Scoring reads item
// gift_letters which are public for published assessments.
function svc() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { slug, profile, answers, duration_seconds } = body;
    if (!slug || !answers || !Object.keys(answers).length) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const supabase = svc();

    // 1. Load assessment + items (public read on published assessments)
    const { data: assessment, error: ae } = await supabase
      .from("assessments").select("id,slug,name,category").eq("slug", slug).eq("is_published", true).single();
    if (ae || !assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

    const { data: items } = await supabase
      .from("items").select("id,gift_letter,domain,is_reverse_scored,is_scored")
      .eq("assessment_id", assessment.id);
    const itemMap = Object.fromEntries((items || []).map((it) => [it.id, it]));

    // 2. Create session (anonymous; profile_id null is allowed by RLS)
    const { data: session, error: se } = await supabase
      .from("sessions")
      .insert({
        assessment_id: assessment.id,
        mode: profile?.church_id ? "church" : "individual",
        church_id: profile?.church_id || null,
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: duration_seconds || null,
        source_tag: "public",
      })
      .select("id,result_token")
      .single();
    if (se || !session) return NextResponse.json({ error: "Could not start session" }, { status: 500 });

    // 3. Save responses
    const rows = Object.entries(answers).map(([item_id, value]) => ({
      session_id: session.id, item_id, value: Number(value),
    }));
    const { error: re } = await supabase.from("responses").insert(rows);
    if (re) return NextResponse.json({ error: "Could not save answers" }, { status: 500 });

    // 4. Score
    const scored = scoreAssessment(assessment, itemMap, answers, profile);

    // 5. Store results
    const { error: rse } = await supabase.from("results").insert({
      session_id: session.id,
      scored_json: scored,
    });
    if (rse) return NextResponse.json({ error: "Could not save results" }, { status: 500 });

    // 6. Log an event (public insert allowed)
    await supabase.from("events").insert({
      session_id: session.id,
      event_type: "assessment_completed",
      metadata_json: { slug, category: assessment.category },
    });

    // NOTE: contact/profile capture and Emailit delivery are handled by a
    // follow-up step (see build notes). We store contact on the session's
    // scored_json for now so admin can retrieve it without an auth user.
    return NextResponse.json({ result_token: session.result_token });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

/* ---- scoring ---- */
function scoreAssessment(assessment, itemMap, answers, profile) {
  const contact = {
    first_name: profile?.first_name, last_name: profile?.last_name,
    email: profile?.email, phone: profile?.phone,
    age_band: profile?.age_band, ministry_role: profile?.ministry_role || null,
    is_chc: profile?.is_chc ?? null, church_id: profile?.church_id || null,
    consent_statement_version: profile?.consent_statement_version,
    consent_agreed_at: new Date().toISOString(),
  };

  if (assessment.slug === "spiritual-gifts") {
    const totals = {};
    for (const [itemId, value] of Object.entries(answers)) {
      const it = itemMap[itemId];
      if (!it || !it.gift_letter) continue;
      totals[it.gift_letter] = (totals[it.gift_letter] || 0) + Number(value);
    }
    const ranked = Object.entries(totals)
      .map(([letter, score]) => ({ letter, score }))
      .sort((a, b) => b.score - a.score || a.letter.localeCompare(b.letter));
    return { type: "gift-rank", max_per: 15, ranked, contact };
  }

  // Generic domain-average fallback for other assessments
  const byDomain = {};
  for (const [itemId, value] of Object.entries(answers)) {
    const it = itemMap[itemId];
    const d = it?.domain || "General";
    (byDomain[d] ||= []).push(Number(value));
  }
  const domains = Object.entries(byDomain).map(([domain, vals]) => ({
    domain, average: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2), count: vals.length,
  })).sort((a, b) => b.average - a.average);
  return { type: "domain-average", domains, contact };
}
