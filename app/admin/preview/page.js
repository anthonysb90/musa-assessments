"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { scoreAssessment } from "../../lib/scoring";
import { efmiUnderstanding } from "../../lib/content";
import { ReportView } from "../../results/[token]/page";

// Admin preview harness. Renders the EXACT same <ReportView> users see, but fed
// a freshly generated random result on every click, so an admin can review each
// assessment's report on web and in print as the design evolves. No data is
// written anywhere — everything is computed in the browser and thrown away.

const FIRST_NAMES = ["Grace", "Samuel", "Ruth", "Caleb", "Hannah", "Micah", "Naomi", "Elijah", "Abigail", "Josiah", "Miriam", "Levi"];
const LAST_NAMES = ["Whitfield", "Alvarez", "Okonkwo", "Bennett", "Nakamura", "Delgado", "Foster", "Petrova", "Mensah", "Hollis", "Reyes", "Sinclair"];
const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const MINISTRY_ROLES = ["Senior Pastor", "Associate Pastor", "Youth Pastor", "Lay Leader", "Ministry Volunteer", "Church Staff", "Elder"];
// Leadership role keys (mirrors leadership.ROLES) — the leadership/planter
// renderers read profile.leadership_role_key / leadership_role.
const LEADERSHIP_ROLES = [
  ["senior-pastor", "Senior Pastor"],
  ["church-staff", "Church Staff"],
  ["youth-pastor", "Youth Pastor"],
  ["lay-leader", "Lay Leader"],
  ["org-leader", "Christian Organization Leader"],
];
const WHO_OPTIONS = ["Child", "Spouse", "Relative", "Parent", "Friend", "Employer", "Other"];
const TIME_UNITS = ["days", "weeks", "months", "years"];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Build a plausible random profile. Covers every field any renderer might read
// (marital status for the planter, leadership role for the leadership/planter
// reports), so uniform-random answers exercise every report type.
function randomProfile() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const [roleKey, roleLabel] = pick(LEADERSHIP_ROLES);
  return {
    first_name: first,
    last_name: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    phone: null,
    age_band: pick(AGE_BANDS),
    ministry_role: pick(MINISTRY_ROLES),
    is_chc: Math.random() < 0.5,
    marital_status: pick(["married", "single"]),
    leadership_role_key: roleKey,
    leadership_role: roleLabel,
    consent_statement_version: "preview",
    source_tag: "preview",
  };
}

// Uniform-random answer per item across the assessment's response scale.
// scoreAssessment reads each item's domain / gift_letter / option_b_letter, so
// random values exercise gift-rank, forced-choice, band, and Likert scorers alike.
function randomAnswers(items, scaleMin, scaleMax) {
  const answers = {};
  for (const it of items) answers[it.id] = randInt(scaleMin, scaleMax);
  return answers;
}

export default function AdminPreviewPage() {
  const [assessments, setAssessments] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null); // { slug, name }
  const [report, setReport] = useState(null); // { scored, meta, contact }
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("assessments")
          .select("id,slug,name,subtitle,category,scale_min,scale_max,sensitivity,is_paid,price_cents")
          .eq("is_published", true);
        if (error) throw error;
        setAssessments(data || []);
        setLoadState("ready");
      } catch (e) {
        setLoadError(e?.message || "Could not load assessments.");
        setLoadState("error");
      }
    })();
  }, []);

  // Build a brand-new random report for one assessment. Fully guarded: any
  // failure surfaces inline instead of blanking the harness.
  async function generate(a) {
    setSelected({ slug: a.slug, name: a.name });
    setReport(null);
    setGenError(null);
    try {
      const supabase = getSupabase();
      const { data: items, error } = await supabase
        .from("items")
        .select("id,text,gift_letter,option_b_letter,option_b_text,domain,is_reverse_scored,is_scored,item_order")
        .eq("assessment_id", a.id);
      if (error) throw error;
      if (!items || !items.length) throw new Error("This assessment has no items.");

      const itemMap = Object.fromEntries(items.map((it) => [it.id, it]));
      const scaleMin = a.scale_min ?? 1;
      const scaleMax = a.scale_max ?? 5;
      const answers = randomAnswers(items, scaleMin, scaleMax);
      const profile = randomProfile();

      const scored = scoreAssessment(a, itemMap, answers, profile);

      // Forgiveness Profile carries a non-Likert reflection block (see
      // app/api/submit/route.js). Reproduce its shape with random values.
      if (a.slug === "forgiveness-profile") {
        const defIdx = randInt(0, 7);
        scored.reflection = {
          hurt_level: randInt(1, 5),
          who: pick(WHO_OPTIONS),
          who_other: null,
          living: pick(["living", "deceased"]),
          time_amount: String(randInt(1, 24)),
          time_unit: pick(TIME_UNITS),
          description: "A recalled situation, generated for preview.",
          have_forgiven: pick(["yes", "no"]),
          degree: randInt(1, 5),
          definition_index: defIdx,
          understanding: efmiUnderstanding(defIdx),
        };
      }

      const meta = {
        name: a.name,
        subtitle: a.subtitle,
        category: a.category,
        slug: a.slug,
        is_paid: a.is_paid,
        price_cents: a.price_cents,
        created_at: new Date().toISOString(),
      };
      const contact = scored?.contact || {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        ministry_role: profile.ministry_role,
      };

      setReport({ scored, meta, contact });
    } catch (e) {
      setGenError(e?.message || "Could not generate a report for this assessment.");
    }
  }

  // ---- Selected: show the toolbar (no-print) + the live report ----
  if (selected) {
    return (
      <div>
        <div className="no-print no-pdf" style={toolbar}>
          <button style={backBtn} onClick={() => { setSelected(null); setReport(null); setGenError(null); }}>
            ← Back to all assessments
          </button>
          <span style={toolbarName}>{selected.name}</span>
          <button style={regenBtn} onClick={() => {
            const a = assessments.find((x) => x.slug === selected.slug);
            if (a) generate(a);
          }}>
            ↻ Regenerate
          </button>
        </div>

        {genError ? (
          <div style={errorBox}>
            <strong>Could not preview {selected.name}.</strong>
            <div style={{ marginTop: 6, fontSize: 13.5 }}>{genError}</div>
          </div>
        ) : !report ? (
          <div style={{ padding: "60px 24px", textAlign: "center", color: "#7C8A9C" }}>Building a random report…</div>
        ) : (
          <ReportView
            scored={report.scored}
            meta={report.meta}
            contact={report.contact}
            brand={null}
            wb={null}
            synth={null}
            isAdmin={true}
            token={"preview"}
            preview={true}
          />
        )}
      </div>
    );
  }

  // ---- List of assessments ----
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 22px 60px" }}>
      <h1 className="serif" style={{ fontSize: 28, color: "var(--ink,#1C2B3A)", margin: "0 0 6px" }}>Report preview</h1>
      <p style={{ color: "#5A6A78", fontSize: 14.5, margin: "0 0 4px", lineHeight: 1.55 }}>
        Generate a full report for any assessment using the exact components users see, then review it on web and in print.
      </p>
      <p style={{ color: "#8CA0B3", fontSize: 13, margin: "0 0 22px" }}>
        Each click builds a brand-new random result — nothing is saved.
      </p>

      {loadState === "loading" && <div style={{ color: "#7C8A9C", padding: "20px 0" }}>Loading assessments…</div>}
      {loadState === "error" && (
        <div style={errorBox}>
          <strong>Could not load assessments.</strong>
          <div style={{ marginTop: 6, fontSize: 13.5 }}>{loadError}</div>
        </div>
      )}

      {loadState === "ready" && (
        <div style={grid}>
          {assessments.map((a) => (
            <div key={a.slug} style={card}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#9AA7B3", fontWeight: 700, marginBottom: 4 }}>
                  {a.category || "Assessment"}
                </div>
                <div className="serif" style={{ fontSize: 18, color: "#1C2B3A", lineHeight: 1.2 }}>{a.name}</div>
                {a.subtitle && <div style={{ fontSize: 13, color: "#7C8A9C", marginTop: 4, lineHeight: 1.45 }}>{a.subtitle}</div>}
              </div>
              <button style={genBtn} onClick={() => generate(a)}>Generate random report</button>
            </div>
          ))}
          {!assessments.length && <div style={{ color: "#7C8A9C" }}>No published assessments found.</div>}
        </div>
      )}
    </main>
  );
}

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 };
const card = { display: "flex", flexDirection: "column", gap: 14, background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 18px 16px", boxShadow: "0 6px 20px rgba(27,58,87,.05)" };
const genBtn = { alignSelf: "flex-start", background: "linear-gradient(90deg,#1B3A57,#1F5E68)", color: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

const toolbar = { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#fff", borderBottom: "1px solid #E7E9EC", padding: "12px 22px", position: "sticky", top: 54, zIndex: 30 };
const toolbarName = { flex: 1, fontSize: 14, fontWeight: 600, color: "#1C2B3A" };
const backBtn = { background: "#F4F7F8", border: "1px solid #DCE6E8", color: "#1F5E68", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const regenBtn = { background: "linear-gradient(90deg,#1B3A57,#1F5E68)", color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

const errorBox = { margin: "24px 22px", background: "#FDF2F2", border: "1px solid #F3C9C9", color: "#9B2C2C", borderRadius: 12, padding: "16px 18px", lineHeight: 1.5 };
