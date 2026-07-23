"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

const SCALE = [[1, "Strongly Disagree"], [2, "Disagree"], [3, "Neutral"], [4, "Agree"], [5, "Strongly Agree"]];
const ROLE_COPY = {
  peer: { verb: "give your honest input on", noun: "this leader", why: "Your perspective helps them see themselves more clearly and lead better." },
  spouse: { verb: "share your honest perspective on", noun: "your spouse", why: "No one sees them like you do. Your honest view is often the truest signal in the whole process." },
  assessor: { verb: "rate", noun: "this candidate", why: "Score on concrete past examples, not opinion. 1 = little evidence, 5 = a strong, repeated track record." },
};

export default function ObservePage() {
  return (
    <Suspense fallback={<Center>Loading…</Center>}>
      <Observe />
    </Suspense>
  );
}

function Observe() {
  const { code } = useParams();
  const params = useSearchParams();
  const role = params.get("role") || "peer";
  const supabase = useRef(getSupabase()).current;
  const [phase, setPhase] = useState("loading"); // loading | intro | questions | submitting | thanks | error
  const [circle, setCircle] = useState(null);
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      // Code-gated RPC (review_circles has no anon SELECT policy): returns only
      // the instrument slug and the subject's name — never email or self scores.
      const { data: c } = await supabase.rpc("circle_by_code", { p_code: code });
      if (!c?.ok) { setErr("That invite link isn't valid."); setPhase("error"); return; }
      const slug = `${c.base_slug}-${role}`;
      const { data: a } = await supabase.from("assessments").select("id").eq("slug", slug).maybeSingle();
      if (!a) { setErr("This invite isn't set up correctly."); setPhase("error"); return; }
      const { data: its } = await supabase.from("items").select("id,text,item_order,domain").eq("assessment_id", a.id).order("item_order");
      setCircle(c); setItems(its || []); setPhase("intro");
    })();
  }, [code, role, supabase]);

  const copy = ROLE_COPY[role] || ROLE_COPY.peer;
  const subject = circle?.subject_name || copy.noun;
  const allAnswered = items.length > 0 && items.every((it) => answers[it.id] !== undefined);

  async function submit() {
    setPhase("submitting");
    try {
      const res = await fetch("/api/circle/observe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circle_code: code, role, name, answers }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Could not submit.");
      setPhase("thanks");
    } catch (e) { setErr(e.message); setPhase("error"); }
  }

  if (phase === "loading") return <Center>Loading…</Center>;
  if (phase === "error") return <Center>{err}</Center>;
  if (phase === "thanks")
    return (
      <Center>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <h1 className="serif" style={h1}>Thank you.</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
            Your input is saved privately and folded into {subject}&rsquo;s report. Your individual
            answers are never shown to anyone. Thank you for helping them grow.
          </p>
        </div>
      </Center>
    );

  return (
    <main className="wrap" style={{ maxWidth: 720, padding: "40px 24px 80px" }}>
      {phase === "intro" && (
        <>
          <h1 className="serif" style={h1}>Your perspective on {subject}</h1>
          <p style={introSub}>You&rsquo;ve been asked to {copy.verb} {circle?.subject_name ? circle.subject_name : copy.noun}. {copy.why}</p>
          <div style={card}>
            <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>
              {items.length} quick statements, about {Math.max(2, Math.round(items.length / 3))} minutes. Your answers are private,
              only the combined picture is shared. Answer honestly, from what you&rsquo;ve actually seen.
            </p>
            <label style={fw}><span style={fl}>Your first name</span>
              <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan" />
            </label>
            <button className="btn btn-primary" disabled={!name.trim()} onClick={() => { setPhase("questions"); window.scrollTo(0, 0); }}
              style={{ width: "100%", justifyContent: "center" }}>Begin</button>
          </div>
        </>
      )}

      {phase === "questions" && (
        <>
          <p style={progressLabel} aria-live="polite">{Object.keys(answers).length} of {items.length} answered</p>
          {items.map((it, i) => {
            const vals = SCALE.map(([v]) => v);
            const roving = rovingIndex(vals, answers[it.id]);
            const pick = (v) => setAnswers({ ...answers, [it.id]: v });
            return (
              <div key={it.id} style={qBlock}>
                <div style={qText} id={`q-${it.id}`}><span style={qNum}>{i + 1}.</span> {it.text}</div>
                <div style={scaleRow} role="radiogroup" aria-labelledby={`q-${it.id}`}>
                  {SCALE.map(([val, lbl], oi) => {
                    const active = answers[it.id] === val;
                    return (
                      <button key={val} type="button" role="radio" aria-checked={active}
                        tabIndex={oi === roving ? 0 : -1}
                        onKeyDown={(e) => handleRadioKeys(e, vals, pick)}
                        onClick={() => setAnswers({ ...answers, [it.id]: val })}
                        style={{ ...scaleBtn, ...(active ? scaleBtnActive : {}) }}>
                        <span aria-hidden="true" style={selMark(active)}>✓</span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{val}</span>
                        <span style={{ fontSize: 10.5, opacity: 0.8, textAlign: "center", lineHeight: 1.15 }}>{lbl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button className="btn btn-primary" disabled={!allAnswered} onClick={submit} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
            Submit my input →
          </button>
        </>
      )}
      {phase === "submitting" && <Center>Saving your input…</Center>}
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);

// ---- Accessible radio-group helpers ---------------------------------------
// Roving tabindex: the selected option (or the first, if none) is the group's
// single Tab stop. Arrows/Home/End move focus and select (matching a click);
// number keys 1-9 jump to that position. Tab is never trapped.
function rovingIndex(values, current) {
  const i = values.findIndex((v) => v === current);
  return i >= 0 ? i : 0;
}
function handleRadioKeys(e, values, select) {
  const group = e.currentTarget.parentNode;
  if (!group) return;
  const btns = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
  const count = btns.length;
  if (!count) return;
  const idx = btns.indexOf(e.currentTarget);
  const k = e.key;
  let t = -1;
  if (k === "ArrowRight" || k === "ArrowDown") t = (idx + 1) % count;
  else if (k === "ArrowLeft" || k === "ArrowUp") t = (idx - 1 + count) % count;
  else if (k === "Home") t = 0;
  else if (k === "End") t = count - 1;
  else if (/^[1-9]$/.test(k) && Number(k) <= count) t = Number(k) - 1;
  else return;
  e.preventDefault();
  select(values[t]);
  if (btns[t]) btns[t].focus();
}
// Non-color selected indicator: a checkmark that reads in grayscale / under
// magnification, kept in the layout (opacity toggled) so height doesn't shift.
const selMark = (active) => ({ fontSize: 11, lineHeight: "11px", height: 11, fontWeight: 800, opacity: active ? 1 : 0 });
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "0 0 6px", color: "var(--ink)" };
const introSub = { color: "var(--ink-soft)", fontSize: 16.5, margin: "0 0 22px", lineHeight: 1.55 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 26 };
const fw = { display: "block", margin: "16px 0" };
const fl = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const inp = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const progressLabel = { fontSize: 13, color: "var(--ink-soft)", margin: "0 0 18px" };
const qBlock = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px", marginBottom: 12 };
const qText = { fontSize: 15.5, color: "var(--ink)", marginBottom: 14, lineHeight: 1.5 };
const qNum = { color: "var(--teal-deep)", fontWeight: 700, marginRight: 4 };
const scaleRow = { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 };
const scaleBtn = { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", borderRadius: 10, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit" };
const scaleBtnActive = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
