"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { scaleOptions } from "../../lib/content";
import { TURNSTILE_SITE_KEY, CONSENT_VERSION } from "../../lib/config";

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
  const [honeypot, setHoneypot] = useState("");
  const [tsToken, setTsToken] = useState("");

  const [answers, setAnswers] = useState({}); // item_id -> value
  const [page, setPage] = useState(0);
  const startedAt = useRef(null);

  const assignmentToken = params.get("a") || null;
  const sourceTag = params.get("source") || null;
  const cohort = params.get("cohort") || null;

  useEffect(() => {
    (async () => {
      const { data: a, error: ae } = await supabase
        .from("assessments").select("*").eq("slug", slug).eq("is_published", true).single();
      if (ae || !a) { setErr("This assessment isn't available."); setPhase("error"); return; }

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
        .from("items").select("id,text,item_order").eq("assessment_id", a.id).order("item_order");
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

  // Turnstile widget (only when a site key is configured)
  useEffect(() => {
    if (phase !== "intro" || !TURNSTILE_SITE_KEY) return;
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

  const perPage = assessment?.questions_per_page || 25;
  const pageCount = Math.ceil(items.length / perPage);
  const pageItems = items.slice(page * perPage, page * perPage + perPage);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === items.length;
  const pageComplete = pageItems.every((it) => answers[it.id] !== undefined);
  const options = scaleOptions(assessment);

  function startQuestions() {
    startedAt.current = Date.now();
    setPhase("questions");
    window.scrollTo(0, 0);
  }

  const canStart =
    form.first_name && form.last_name && emailOk(form.email) && form.phone &&
    form.age_band && (!form.church_id || churchAck) &&
    (!TURNSTILE_SITE_KEY || tsToken);

  async function submit() {
    setPhase("submitting");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          profile: {
            ...form,
            is_chc: form.is_chc === "yes" ? true : form.is_chc === "no" ? false : null,
            church_id: form.church_id || null,
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
          <a className="btn btn-primary" href={`/login?next=/assessment/${slug}`} style={{ marginTop: 12 }}>
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
            <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>
              {items.length} short statements, about {assessment.estimated_minutes} minutes.
              Answer honestly, there's no score to pass or fail. Enter your details below
              and your personal results will be ready at the end.
            </p>

            <Field label="First name" v={form.first_name} on={(v) => setForm({ ...form, first_name: v })} />
            <Field label="Last name" v={form.last_name} on={(v) => setForm({ ...form, last_name: v })} />
            <Field label="Email" type="email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
            <Field label="Phone" type="tel" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />

            <Select label="Age range" v={form.age_band} on={(v) => setForm({ ...form, age_band: v })} opts={AGE_BANDS} />
            <Select label="Your role (optional)" v={form.ministry_role} on={(v) => setForm({ ...form, ministry_role: v })} opts={ROLES} optional />
            <Select label="Are you part of the CHC? (optional)" v={form.is_chc} on={(v) => setForm({ ...form, is_chc: v })} opts={[["yes", "Yes"], ["no", "No"]]} optional />

            {churches.length > 0 && (
              <Select
                label="Taking this through a church? (optional)"
                v={form.church_id}
                on={(v) => { setForm({ ...form, church_id: v }); setChurchAck(false); }}
                opts={churches.map((c) => [c.id, c.name])}
                optional
                disabled={!!assignmentToken}
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
              By providing your email and continuing, you agree to receive messages from
              Mission USA. We don't spam you, and we will never sell or give your data away.
            </p>

            <button className="btn btn-primary" disabled={!canStart} onClick={startQuestions}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              Start the assessment
            </button>
          </div>
        </>
      )}

      {phase === "questions" && (
        <>
          <div style={progressWrap}>
            <div style={{ ...progressBar, width: `${(answeredCount / items.length) * 100}%` }} />
          </div>
          <p style={progressLabel}>
            Page {page + 1} of {pageCount} · {answeredCount} of {items.length} answered
          </p>

          {pageItems.map((it, i) => (
            <div key={it.id} style={qBlock}>
              <div style={qText}>
                <span style={qNum}>{page * perPage + i + 1}.</span> {it.text}
              </div>
              <div style={scaleRow}>
                {options.map(([val, lbl]) => {
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
          ))}

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
              <button className="btn btn-primary" disabled={!allAnswered} onClick={submit}>
                See my results →
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
const navRow = { display: "flex", alignItems: "center", gap: 12, marginTop: 24 };
