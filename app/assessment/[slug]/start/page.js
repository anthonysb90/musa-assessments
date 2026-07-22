"use client";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import { scaleOptions, WELLBEING_OPTIONS, WELLBEING_NOTICE } from "../../../lib/content";
import { TURNSTILE_SITE_KEY, CONSENT_VERSION } from "../../../lib/config";

const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const ROLES = ["Pastor", "Staff", "Lay leader", "Member", "Other"];

export default function AssessmentPage() {
  return (
    <Suspense fallback={<Centered><p style={{ color: "var(--ink-soft)" }}>Loading…</p></Centered>}>
      <AssessmentFlow />
    </Suspense>
  );
}

function AssessmentFlow() {
  const { slug } = useParams();
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useRef(getSupabase()).current;

  const [phase, setPhase] = useState("loading"); // loading | gate | intro | questions | submitting | error
  const [assessment, setAssessment] = useState(null);
  const [items, setItems] = useState([]);
  const [churches, setChurches] = useState([]);
  const [err, setErr] = useState(null);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    age_band: "", ministry_role: "", church_id: "", is_chc: "",
  });
  const [churchAck, setChurchAck] = useState(false);
  const [marital, setMarital] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [tsToken, setTsToken] = useState("");
  const [teamName, setTeamName] = useState("");

  const [answers, setAnswers] = useState({}); // item_id -> value
  const [page, setPage] = useState(0);
  const startedAt = useRef(null);

  const assignmentToken = params.get("a") || null;
  const sourceTag = params.get("source") || null;
  const cohort = params.get("cohort") || null;
  const teamCode = params.get("team") || null;
  const isRater = !!(assessment?.is_multi_rater && teamCode);

  useEffect(() => {
    (async () => {
      const { data: a, error: ae } = await supabase
        .from("assessments").select("*").eq("slug", slug).eq("is_published", true).single();
      if (ae || !a) { setErr("This assessment isn't available."); setPhase("error"); return; }

      // Multi-rater: a rater joins with a team code; a lead without one is sent
      // to team setup. Rater sessions are anonymous, no login or intake.
      if (a.is_multi_rater) {
        if (!teamCode) { setAssessment(a); setPhase("teamredirect"); return; }
        const { data: g } = await supabase
          .from("rater_groups").select("team_code,church_name").eq("team_code", teamCode).maybeSingle();
        if (!g) { setErr("That team link isn't valid. Ask your leader for the correct link."); setPhase("error"); return; }
        const { data: its } = await supabase
          .from("items").select("id,text,item_order,domain,item_type").eq("assessment_id", a.id).order("item_order");
        setAssessment(a); setItems(its || []); setTeamName(g.church_name || ""); setPhase("intro");
        return;
      }

      const { data: udata } = await supabase.auth.getUser();
      const u = udata?.user || null;
      setUser(u);

      // Sensitive assessments require login before anything else.
      if (a.sensitivity === "sensitive" && !u) {
        setAssessment(a);
        setPhase("gate");
        return;
      }

      const { data: its, error: ie } = await supabase
        .from("items").select("id,text,option_b_text,item_order,domain,item_type").eq("assessment_id", a.id).order("item_order");
      if (ie) { setErr("Couldn't load the questions."); setPhase("error"); return; }

      const { data: ch } = await supabase
        .from("churches").select("id,name").eq("is_active", true).order("name");

      // Assignment link: resolve and pre-stamp the church (never the person).
      let prefillChurch = "";
      if (assignmentToken) {
        const { data: ca } = await supabase
          .from("church_assessments")
          .select("church_id")
          .eq("assignment_token", assignmentToken)
          .maybeSingle();
        if (ca?.church_id) prefillChurch = ca.church_id;
      }

      // Prefill from the logged-in user's profile where available.
      let prefill = {};
      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("first_name,last_name,email,phone,age_band,ministry_role,church_id,is_chc")
          .eq("id", u.id).maybeSingle();
        prefill = {
          first_name: p?.first_name || "",
          last_name: p?.last_name || "",
          email: p?.email || u.email || "",
          phone: p?.phone || "",
          age_band: p?.age_band || "",
          ministry_role: p?.ministry_role || "",
          is_chc: p?.is_chc === true ? "yes" : p?.is_chc === false ? "no" : "",
        };
      }

      setForm((f) => ({ ...f, ...prefill, church_id: prefillChurch || f.church_id }));
      setAssessment(a); setItems(its || []); setChurches(ch || []); setPhase("intro");
    })();
  }, [slug, supabase, assignmentToken]);

  // Turnstile widget (only when a site key is configured) — shown on the
  // details step, since that's where the contact info is submitted.
  useEffect(() => {
    if (phase !== "details" || !TURNSTILE_SITE_KEY) return;
    let widgetId;
    function render() {
      if (!window.turnstile) return false;
      const el = document.getElementById("ts-widget");
      if (!el || el.dataset.rendered) return true;
      el.dataset.rendered = "1";
      widgetId = window.turnstile.render("#ts-widget", {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t) => setTsToken(t),
        "error-callback": () => setTsToken(""),
        "expired-callback": () => setTsToken(""),
      });
      return true;
    }
    if (!render()) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.onload = render;
      document.body.appendChild(s);
    }
    return () => {
      try { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); } catch {}
    };
  }, [phase]);

  const isPastor = slug === "pastor-profile";
  // Marriage & Family only applies to married pastors.
  const activeItems = useMemo(() => {
    if (isPastor && marital === "single")
      return items.filter((it) => it.domain !== "Marriage & Family");
    return items;
  }, [items, isPastor, marital]);

  const perPage = assessment?.questions_per_page || 25;
  const pageCount = Math.ceil(activeItems.length / perPage);
  const pageItems = activeItems.slice(page * perPage, page * perPage + perPage);
  const activeIds = new Set(activeItems.map((i) => i.id));
  const answeredCount = Object.keys(answers).filter((id) => activeIds.has(id)).length;
  const allAnswered = answeredCount === activeItems.length;
  const pageComplete = pageItems.every((it) => answers[it.id] !== undefined);
  const optsFor = (it) => (it.domain === "Wellbeing" ? WELLBEING_OPTIONS : scaleOptions(assessment));
  const isForced = slug === "enneagram";

  function startQuestions() {
    startedAt.current = Date.now();
    setPhase("questions");
    window.scrollTo(0, 0);
  }

  // After the questions: logged-in users go straight to results; everyone else
  // provides their details first (the info gate that unlocks the report).
  function proceedFromQuestions() {
    if (user || isRater) submit();
    else { setPhase("details"); window.scrollTo(0, 0); }
  }

  const canStart =
    form.first_name && form.last_name && emailOk(form.email) && form.phone &&
    form.age_band && (!form.church_id || churchAck) &&
    (!isPastor || marital) &&
    (!TURNSTILE_SITE_KEY || tsToken);

  async function submit() {
    setPhase("submitting");
    try {
      if (isRater) {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, team_code: teamCode, answers, honeypot }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || "Submission failed");
        setPhase("thanks");
        window.scrollTo(0, 0);
        return;
      }
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          profile: {
            ...form,
            is_chc: form.is_chc === "yes" ? true : form.is_chc === "no" ? false : null,
            church_id: form.church_id || null,
            marital_status: marital || null,
            assignment_token: assignmentToken,
            source_tag: sourceTag || "public",
            cohort,
            consent_statement_version: CONSENT_VERSION,
          },
          answers,
          duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
          turnstileToken: tsToken,
          honeypot,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Submission failed");
      router.push(`/results/${out.result_token}`);
    } catch (e) {
      setErr(e.message); setPhase("error");
    }
  }

  if (phase === "loading")
    return <Centered><p style={{ color: "var(--ink-soft)" }}>Loading…</p></Centered>;

  if (phase === "gate")
    return (
      <Centered>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <h1 className="serif" style={{ ...h1, marginTop: 0 }}>{assessment.name}</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
            This assessment includes personal, sensitive content, so your results are kept private to
            your account. Please sign in with a one-tap magic link to begin.
          </p>
          <a className="btn btn-primary" href={`/login?next=/assessment/${slug}/start`} style={{ marginTop: 12 }}>
            Sign in to continue
          </a>
          <div style={{ marginTop: 14 }}>
            <a href="/" style={back}>← All assessments</a>
          </div>
        </div>
      </Centered>
    );

  if (phase === "error")
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--ink-soft)" }}>{err}</p>
          <a className="btn btn-ghost" href="/" style={{ marginTop: 16 }}>Back to assessments</a>
        </div>
      </Centered>
    );

  return (
    <main className="wrap" style={{ padding: "40px 24px 80px", maxWidth: 720 }}>
      {phase === "intro" && (
        <>
          <a href="/" style={back}>← All assessments</a>
          <h1 className="serif" style={h1}>{assessment.name}</h1>
          <p style={introSub}>{assessment.subtitle}</p>
          <div style={card}>
            {isRater ? (
              <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>
                You've been invited to the {teamName || "leadership"} team review. {activeItems.length} short
                statements, about {assessment.estimated_minutes} minutes. Your answers are private and
                anonymous, no one, including your pastor, ever sees your individual responses. Only the
                combined team picture is shared, once at least three leaders have finished.
              </p>
            ) : (
              <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>
                {activeItems.length} short statements, about {assessment.estimated_minutes} minutes.
                Answer honestly, there's no score to pass or fail.
                {user
                  ? " Your results are ready the moment you finish."
                  : " When you finish, add your details and your personal results are ready right away."}
              </p>
            )}

            {isPastor && (
              <Select label="Marital status" v={marital} on={setMarital} opts={[["married", "Married"], ["single", "Single"]]} />
            )}

            {assignmentToken && form.church_id && (
              <div style={ackRow}>
                <span>
                  You're taking this through{" "}
                  {churches.find((c) => c.id === form.church_id)?.name || "a church"}. A copy of your
                  results will be shared with them, and a leader there may follow up.
                </span>
              </div>
            )}

            <button className="btn btn-primary" disabled={isPastor && !marital} onClick={startQuestions}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              {isRater ? "Begin" : "Start the assessment"}
            </button>
          </div>
        </>
      )}

      {phase === "teamredirect" && (
        <Centered>
          <div style={{ textAlign: "center", maxWidth: 460 }}>
            <h1 className="serif" style={{ ...h1, marginTop: 0 }}>{assessment.name}</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
              This one is taken as a leadership team. If your leader gave you a link, open that link to
              join. To start a new team review, set one up below.
            </p>
            <a className="btn btn-primary" href={`/assessment/${slug}/team`} style={{ marginTop: 12 }}>
              Set up a team review →
            </a>
            <div style={{ marginTop: 14 }}><a href="/" style={back}>← All assessments</a></div>
          </div>
        </Centered>
      )}

      {phase === "thanks" && (
        <Centered>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <h1 className="serif" style={{ ...h1, marginTop: 0 }}>Thank you.</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
              Your response is recorded, privately and anonymously. The combined report unlocks once at
              least three leaders have finished. Your team lead has the results link.
            </p>
            <a className="btn btn-ghost" href={`/team/${teamCode}`} style={{ marginTop: 12 }}>
              See team progress →
            </a>
          </div>
        </Centered>
      )}

      {phase === "questions" && (
        <>
          <div style={progressWrap}>
            <div style={{ ...progressBar, width: `${(answeredCount / activeItems.length) * 100}%` }} />
          </div>
          <p style={progressLabel}>
            Page {page + 1} of {pageCount} · {answeredCount} of {activeItems.length} answered
          </p>

          {isForced && (
            <p style={{ ...progressLabel, marginTop: -8 }}>
              For each pair, choose the statement that has been more true of you, most of your life. Don't overthink it, go with your first instinct.
            </p>
          )}

          {pageItems.map((it, i) => {
            const isWell = it.domain === "Wellbeing";
            const firstWell = isWell && !pageItems.slice(0, i).some((p) => p.domain === "Wellbeing");
            const num = page * perPage + i + 1;

            if (isForced) {
              const chosen = answers[it.id];
              const pair = [[0, it.text], [1, it.option_b_text]];
              return (
                <div key={it.id} style={qBlock}>
                  <div style={{ ...qNum, marginBottom: 12, display: "block" }}>{num}.</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {pair.map(([val, txt]) => {
                      const active = chosen === val;
                      return (
                        <button key={val} onClick={() => setAnswers({ ...answers, [it.id]: val })}
                          style={{ ...choiceBtn, ...(active ? choiceBtnActive : {}) }}>
                          <span style={{ ...choiceDot, ...(active ? choiceDotActive : {}) }}>
                            {active ? "✓" : ""}
                          </span>
                          <span>{txt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={it.id}>
                {firstWell && <div style={wellNotice}>{WELLBEING_NOTICE}</div>}
                <div style={qBlock}>
                  <div style={qText}>
                    <span style={qNum}>{num}.</span> {it.text}
                  </div>
                  <div style={scaleRow}>
                    {optsFor(it).map(([val, lbl]) => {
                      const active = answers[it.id] === val;
                      return (
                        <button key={val} onClick={() => setAnswers({ ...answers, [it.id]: val })}
                          style={{ ...scaleBtn, ...(active ? scaleBtnActive : {}) }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{val}</span>
                          <span style={{ fontSize: 11, opacity: 0.8, textAlign: "center" }}>{lbl}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={navRow}>
            {page > 0 && (
              <button className="btn btn-ghost" onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}>
                ← Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {page < pageCount - 1 ? (
              <button className="btn btn-primary" disabled={!pageComplete}
                onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}>
                Next page →
              </button>
            ) : (
              <button className="btn btn-primary" disabled={!allAnswered} onClick={proceedFromQuestions}>
                {isRater ? "Submit my responses →" : user ? "See my results →" : "Continue to your results →"}
              </button>
            )}
          </div>
          {!pageComplete && (
            <p style={{ ...progressLabel, textAlign: "right" }}>
              Answer every statement on this page to continue.
            </p>
          )}
        </>
      )}

      {phase === "details" && (
        <>
          <h1 className="serif" style={h1}>You're done. One last step.</h1>
          <p style={introSub}>Add your details and your personal results are ready right away.</p>
          <div style={card}>
            <Field label="First name" v={form.first_name} on={(v) => setForm({ ...form, first_name: v })} />
            <Field label="Last name" v={form.last_name} on={(v) => setForm({ ...form, last_name: v })} />
            <Field label="Email" type="email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
            <Field label="Phone" type="tel" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />

            <Select label="Age range" v={form.age_band} on={(v) => setForm({ ...form, age_band: v })} opts={AGE_BANDS} />
            <Select label="Your role (optional)" v={form.ministry_role} on={(v) => setForm({ ...form, ministry_role: v })} opts={ROLES} optional />
            <Select label="Are you part of the CHC? (optional)" v={form.is_chc} on={(v) => setForm({ ...form, is_chc: v })} opts={[["yes", "Yes"], ["no", "No"]]} optional />

            {churches.length > 0 && !assignmentToken && (
              <Select
                label="Taking this through a church? (optional)"
                v={form.church_id}
                on={(v) => { setForm({ ...form, church_id: v }); setChurchAck(false); }}
                opts={churches.map((c) => [c.id, c.name])}
                optional
              />
            )}

            {form.church_id && (
              <label style={ackRow}>
                <input type="checkbox" checked={churchAck} onChange={(e) => setChurchAck(e.target.checked)} />
                <span>
                  I understand a copy of my results will be shared with{" "}
                  {churches.find((c) => c.id === form.church_id)?.name || "this church"}, and a leader
                  there may follow up.
                </span>
              </label>
            )}

            {/* Honeypot — hidden from humans; bots that fill it are silently rejected */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
              <label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
            </div>

            {TURNSTILE_SITE_KEY && <div id="ts-widget" style={{ marginTop: 8 }} />}

            <p style={consent}>
              By providing your email and continuing, you agree to receive messages from Mission USA.
              We don't spam you, and we will never sell or give your data away.
            </p>

            <button className="btn btn-primary" disabled={!canStart} onClick={submit}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              See my results →
            </button>
          </div>
        </>
      )}

      {phase === "submitting" && (
        <Centered><p style={{ color: "var(--ink-soft)" }}>Scoring your results…</p></Centered>
      )}
    </main>
  );
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function Field({ label, v, on, type = "text" }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <input style={input} type={type} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
function Select({ label, v, on, opts, optional, disabled }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <select style={input} value={v} disabled={disabled} onChange={(e) => on(e.target.value)}>
        <option value="">{optional ? "Select (optional)" : "Select"}</option>
        {opts.map((o) => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Centered({ children }) {
  return <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>{children}</main>;
}

const back = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(30px,4vw,40px)", margin: "16px 0 4px", color: "var(--ink)" };
const introSub = { color: "var(--ink-soft)", fontSize: 17, margin: "0 0 24px" };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 28, position: "relative" };
const fieldWrap = { display: "block", marginBottom: 16 };
const fieldLabel = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const input = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
const ackRow = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink-soft)", background: "var(--blush)", padding: "12px 14px", borderRadius: 10, marginBottom: 16 };
const consent = { fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, margin: "4px 0 0" };
const progressWrap = { height: 8, background: "var(--mist2)", borderRadius: 999, overflow: "hidden", position: "sticky", top: 0 };
const progressBar = { height: "100%", background: "var(--teal)", borderRadius: 999, transition: "width .3s ease" };
const progressLabel = { fontSize: 13, color: "var(--ink-soft)", margin: "8px 0 24px" };
const qBlock = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 };
const qText = { fontSize: 15.5, color: "var(--ink)", marginBottom: 16, lineHeight: 1.5 };
const qNum = { color: "var(--teal-deep)", fontWeight: 700, marginRight: 4 };
const scaleRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(64px,1fr))", gap: 8 };
const scaleBtn = { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", borderRadius: 10, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", transition: "all .12s ease" };
const scaleBtnActive = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const choiceBtn = { display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", padding: "15px 16px", borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, lineHeight: 1.5, transition: "all .12s ease" };
const choiceBtnActive = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const choiceDot = { flexShrink: 0, width: 22, height: 22, borderRadius: 999, border: "1.5px solid var(--line)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 1 };
const choiceDotActive = { background: "var(--gold,#C4923E)", borderColor: "var(--gold,#C4923E)" };
const navRow = { display: "flex", alignItems: "center", gap: 12, marginTop: 24 };
const wellNotice = { background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 12, padding: "16px 18px", marginBottom: 14, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6 };
