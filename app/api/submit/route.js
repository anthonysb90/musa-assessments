import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabaseServer";
import { scoreAssessment, scoreWellbeing } from "../../lib/scoring";
import { buildResultEmail, sendEmail } from "../../lib/email";
import { verifyTurnstile } from "../../lib/turnstile";
import { CONSENT_VERSION, CARE_CONTACT_EMAIL, APP_URL } from "../../lib/config";
import { efmiUnderstanding } from "../../lib/content";

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

    // Multi-rater (anonymous team) submission: no auth, no email, no individual
    // result row. Answers land in responses (which anon can't read back), and
    // the aggregate is recomputed by a SECURITY DEFINER function.
    if (body.team_code) {
      const supabase = getServerSupabase();
      const { data: group } = await supabase
        .from("rater_groups").select("id,assessment_id,team_code").eq("team_code", body.team_code).maybeSingle();
      if (!group) return NextResponse.json({ error: "Invalid team link." }, { status: 400 });
      const { data: session, error: se } = await supabase
        .from("sessions")
        .insert({
          assessment_id: group.assessment_id,
          mode: "rater",
          cohort: group.team_code,
          status: "completed",
          completed_at: new Date().toISOString(),
          source_tag: "team",
        })
        .select("id")
        .single();
      if (se || !session) return NextResponse.json({ error: "Could not record your response." }, { status: 500 });
      const rrows = Object.entries(answers).map(([item_id, value]) => ({
        session_id: session.id, item_id, value: Number(value),
      }));
      const { error: rre } = await supabase.from("responses").insert(rrows);
      if (rre) return NextResponse.json({ error: "Could not save answers." }, { status: 500 });
      await supabase.rpc("recompute_rater_group", { p_code: group.team_code });
      return NextResponse.json({ ok: true, team_code: group.team_code });
    }

    // Called Together (couple) submission: each spouse takes privately, no
    // login. Domain averages are stored on the couple row for a side-by-side
    // report. The confidential Safety answer is split out here, never stored on
    // the couple row, and routes a private care alert when a spouse indicates
    // they don't feel safe.
    if (body.couple_code) {
      const supabase = getServerSupabase();
      const { data: couple } = await supabase
        .from("couples").select("id,assessment_id,couple_code").eq("couple_code", body.couple_code).maybeSingle();
      if (!couple) return NextResponse.json({ error: "Invalid couple link." }, { status: 400 });

      const { data: items } = await supabase
        .from("items").select("id,domain,is_scored").eq("assessment_id", couple.assessment_id);
      const imap = Object.fromEntries((items || []).map((it) => [it.id, it]));

      // Split the confidential Safety answer out of everything scored/stored.
      let safetyVal = null;
      const scoredAnswers = {};
      for (const [itemId, value] of Object.entries(answers)) {
        if (imap[itemId]?.domain === "Safety") safetyVal = Number(value);
        else scoredAnswers[itemId] = value;
      }

      // Record a session + responses (Safety excluded), for data completeness.
      const { data: session } = await supabase
        .from("sessions")
        .insert({ assessment_id: couple.assessment_id, mode: "couple", cohort: couple.couple_code, status: "completed", completed_at: new Date().toISOString(), source_tag: "couple" })
        .select("id").single();
      if (session) {
        const rrows = Object.entries(scoredAnswers).map(([item_id, value]) => ({ session_id: session.id, item_id, value: Number(value) }));
        if (rrows.length) await supabase.from("responses").insert(rrows);
      }

      // Per-domain averages for this spouse.
      const g = {};
      for (const [itemId, value] of Object.entries(scoredAnswers)) {
        const it = imap[itemId];
        if (!it || it.is_scored === false || !it.domain) continue;
        (g[it.domain] ||= []).push(Number(value));
      }
      const domains = Object.entries(g)
        .map(([domain, vals]) => ({ domain, average: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) }))
        .sort((a, b) => b.average - a.average);
      const memberJson = { domains, scale_max: 5, name: body.name || null };

      const { data: rec } = await supabase.rpc("record_couple_member", {
        p_code: couple.couple_code, p_name: body.name || null, p_json: memberJson,
      });

      // Confidential safety alert: 1-5 agree scale, low = doesn't feel safe.
      const safetyFlag = safetyVal != null && safetyVal <= 2;
      if (safetyFlag && CARE_CONTACT_EMAIL) {
        try {
          await sendEmail({
            to: CARE_CONTACT_EMAIL,
            subject: "Called Together — a private safety concern",
            html: `<p>Someone just completed the Called Together assessment and indicated on the confidential safety question that they do <strong>not</strong> feel physically or emotionally safe in their marriage right now.</p>
              <p>First name given: <strong>${body.name || "(not given)"}</strong>. This was taken through the couple link <strong>${couple.couple_code}</strong>.</p>
              <p>Individual answers are private, so this note carries only what's needed to reach out with care. Please handle it gently and confidentially, and follow your safeguarding process.</p>`,
          });
        } catch { /* never block completion on the alert */ }
      }

      return NextResponse.json({ ok: true, couple_code: couple.couple_code, both_done: !!rec?.both_done, safety_flag: safetyFlag });
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
      .select("id,slug,name,category,scale_min,scale_max,sensitivity,email_link_only")
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
      .select("id,text,gift_letter,option_b_letter,domain,is_reverse_scored,is_scored")
      .eq("assessment_id", assessment.id);
    const itemMap = Object.fromEntries((items || []).map((it) => [it.id, it]));

    // Wellbeing answers are quarantined: split them out so they never enter the
    // shared responses/results tables. They go only to wellbeing_results (owner-only).
    const wellbeingAnswers = {};
    const scoredAnswers = {};
    for (const [itemId, value] of Object.entries(answers)) {
      if (itemMap[itemId]?.domain === "Wellbeing") wellbeingAnswers[itemId] = value;
      else scoredAnswers[itemId] = value;
    }

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

    // 3. Save responses (wellbeing answers deliberately excluded)
    const rows = Object.entries(scoredAnswers).map(([item_id, value]) => ({
      session_id: session.id,
      item_id,
      value: Number(value),
    }));
    if (rows.length) {
      const { error: re } = await supabase.from("responses").insert(rows);
      if (re) return NextResponse.json({ error: "Could not save answers" }, { status: 500 });
    }

    // 4. Score (domains only; wellbeing is never in scored_json)
    const scored = scoreAssessment(assessment, itemMap, scoredAnswers, profile);

    // 4b. Forgiveness Profile reflection (instrument pages 3-4): recall context,
    // forgiveness status, and the definition-of-forgiveness comprehension check.
    // These aren't Likert items, so they ride on the payload and are attached
    // to the result here, with the definition scored per the instrument.
    if (slug === "forgiveness-profile" && body.reflection) {
      const ref = body.reflection;
      const defIdx = ref.definition_index === "" || ref.definition_index == null ? null : Number(ref.definition_index);
      scored.reflection = {
        hurt_level: ref.hurt_level === "" ? null : Number(ref.hurt_level),
        who: ref.who || null,
        who_other: ref.who_other || null,
        living: ref.living || null,
        time_amount: ref.time_amount || null,
        time_unit: ref.time_unit || null,
        description: ref.description || null,
        have_forgiven: ref.have_forgiven || null,
        degree: ref.degree === "" ? null : Number(ref.degree),
        definition_index: defIdx,
        understanding: defIdx != null ? efmiUnderstanding(defIdx) : null,
      };
    }

    // 5. Store results
    const { error: rse } = await supabase.from("results").insert({
      session_id: session.id,
      scored_json: scored,
    });
    if (rse) return NextResponse.json({ error: "Could not save results" }, { status: 500 });

    // 5b. Wellbeing module — computed and stored apart, owner-only. Requires a
    // logged-in user (sensitive assessment). Never emailed, never in exports.
    if (user && Object.keys(wellbeingAnswers).length) {
      const wb = scoreWellbeing(itemMap, wellbeingAnswers);
      await supabase.from("wellbeing_results").insert({
        session_id: session.id,
        profile_id: user.id,
        total: wb.total,
        max_total: wb.maxTotal,
        band: wb.band,
        elevated: wb.elevated,
      });
      // Proactive care: when a pastor signals significant strain, alert the
      // designated Mission USA care contact so someone can reach out. Internal
      // only, never sent to the pastor.
      if (wb.band === "significant" && CARE_CONTACT_EMAIL) {
        const c = profile || {};
        try {
          await sendEmail({
            to: CARE_CONTACT_EMAIL,
            subject: "Pastor Profile — please reach out to a pastor",
            html: `<p>A pastor just completed the Pastor Profile and their confidential wellbeing check came back in the heaviest range. This is a prompt to reach out personally and check on them, gently and soon.</p>
              <p><strong>${c.first_name || ""} ${c.last_name || ""}</strong><br>
              ${c.email || user.email || ""}<br>
              ${c.phone || ""}</p>
              <p>Please handle this with care and confidentiality. This note is for pastoral support, not a diagnosis.</p>`,
          });
        } catch { /* never block completion on the alert */ }
      }
    }

    // 6. Log completion event
    await supabase.from("events").insert({
      profile_id: user ? user.id : null,
      session_id: session.id,
      event_type: "assessment_completed",
      metadata_json: { slug, category: assessment.category },
    });

    // 6b. Consume a seat when a paid assessment was taken with an access code.
    if (body.access_code) {
      try { await supabase.rpc("consume_seat", { p_code: body.access_code }); } catch { /* non-fatal */ }
    }

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
          linkOnly: assessment.email_link_only === true,
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

    // 7b. Church notification: when a member took this through a church, email
    // the church's results contact(s). Best-effort, never blocks completion.
    try {
      if (profile?.church_id) {
        const { data: church } = await supabase
          .from("churches")
          .select("name,recipient_email,recipient_email_2")
          .eq("id", profile.church_id)
          .maybeSingle();
        const recipients = [church?.recipient_email, church?.recipient_email_2].filter(Boolean);
        if (church && recipients.length) {
          const who = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "A member";
          for (const to of recipients) {
            await sendEmail({
              to,
              subject: `${assessment.name} completed — ${church.name}`,
              html: `<p><strong>${who}</strong> just completed the <strong>${assessment.name}</strong> assessment through ${church.name}.</p>
                <p>You can see all of your church's results in your dashboard:</p>
                <p><a href="${APP_URL}/login?next=/church">${APP_URL}/church</a></p>
                <p>Sign in with the email address Mission USA set up for your church.</p>`,
            });
          }
        }
      }
    } catch {
      // swallow — church notification must never fail a completed assessment
    }

    return NextResponse.json({ result_token: session.result_token });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
