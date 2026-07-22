import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";
import { scoreAssessment } from "../../lib/scoring";
import { buildResultEmail, sendEmail } from "../../lib/email";
import { verifyTurnstile } from "../../lib/turnstile";
import { CONSENT_VERSION } from "../../lib/config";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { slug, profile, answers, duration_seconds, turnstileToken, honeypot } = body;

    // Honeypot: a hidden field only bots fill. Pretend success, do nothing.
    if (honeypot) return NextResponse.json({ ok: true });

    if (!slug || !answers || !Object.keys(answers).length) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ts = await verifyTurnstile(turnstileToken, ip);
    if (!ts.ok) {
      return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;

    // 1. Load assessment + items (public read on published assessments)
    const { data: assessment, error: ae } = await supabase
      .from("assessments")
      .select("id,slug,name,category,scale_min,scale_max,sensitivity")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    if (ae || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Sensitive assessments require login (results are gated to the account).
    if (assessment.sensitivity === "sensitive" && !user) {
      return NextResponse.json({ error: "Please sign in to take this assessment." }, { status: 401 });
    }

    const { data: items } = await supabase
      .from("items")
      .select("id,gift_letter,domain,is_reverse_scored,is_scored")
      .eq("assessment_id", assessment.id);
    const itemMap = Object.fromEntries((items || []).map((it) => [it.id, it]));

    // If logged in, ensure a profile row exists and stamp this session to it.
    if (user) {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          email: profile?.email || user.email || null,
          phone: profile?.phone || null,
          age_band: profile?.age_band || null,
          ministry_role: profile?.ministry_role || null,
          is_chc: profile?.is_chc ?? null,
          church_id: profile?.church_id || null,
          consent_statement_version: profile?.consent_statement_version || CONSENT_VERSION,
          consent_agreed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // 2. Create session
    const { data: session, error: se } = await supabase
      .from("sessions")
      .insert({
        assessment_id: assessment.id,
        profile_id: user ? user.id : null,
        mode: profile?.church_id ? "church" : "individual",
        church_id: profile?.church_id || null,
        assignment_token: profile?.assignment_token || null,
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: duration_seconds || null,
        source_tag: profile?.source_tag || "public",
        cohort: profile?.cohort || null,
      })
      .select("id,result_token")
      .single();
    if (se || !session) {
      return NextResponse.json({ error: "Could not start session" }, { status: 500 });
    }

    // 3. Save responses
    const rows = Object.entries(answers).map(([item_id, value]) => ({
      session_id: session.id,
      item_id,
      value: Number(value),
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

    // 6. Log completion event
    await supabase.from("events").insert({
      profile_id: user ? user.id : null,
      session_id: session.id,
      event_type: "assessment_completed",
      metadata_json: { slug, category: assessment.category },
    });

    // 7. Email delivery (best-effort, env-gated). Never blocks the response.
    try {
      const to = profile?.email || user?.email;
      if (to) {
        const { data: others } = await supabase
          .from("assessments")
          .select("slug,name")
          .eq("is_published", true);
        const namesBySlug = Object.fromEntries((others || []).map((a) => [a.slug, a.name]));
        const email = buildResultEmail({
          assessment,
          scored,
          resultToken: session.result_token,
          namesBySlug,
          sensitive: assessment.sensitivity === "sensitive",
        });
        const sent = await sendEmail({ to, subject: email.subject, html: email.html });
        if (sent?.ok) {
          await supabase
            .from("results")
            .update({ delivered_at: new Date().toISOString() })
            .eq("session_id", session.id);
        }
      }
    } catch {
      // swallow — email failure must not fail a completed assessment
    }

    return NextResponse.json({ result_token: session.result_token });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
