"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import { APP_URL } from "../../../lib/config";
import InviteSender from "../../../components/InviteSender";

export default function CoupleSetup() {
  const { slug } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [assessment, setAssessment] = useState(null);
  const [state, setState] = useState("loading"); // loading | form | done | error
  const [name, setName] = useState("");
  const [couple, setCouple] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("assessments").select("id,name,subtitle")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!a) { setState("error"); return; }
      setAssessment(a);
      setState("form");
    })();
  }, [slug, supabase]);

  async function create(e) {
    e.preventDefault();
    setState("loading");
    try {
      // Code-generating RPC (couples has no anon INSERT policy): the server
      // creates the row and returns only the secret couple code.
      const { data, error } = await supabase.rpc("create_couple", {
        p_assessment_id: assessment.id, p_initiator_name: name,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Could not set this up.");
      setCouple({ couple_code: data.couple_code });
      setState("done");
    } catch (e2) {
      setErr(e2.message || "Could not set this up.");
      setState("error");
    }
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "error") return <Center>{err || "This assessment isn't available."}<div style={{ marginTop: 14 }}><Link href="/" style={link}>← All assessments</Link></div></Center>;

  const takeLink = couple ? `${APP_URL}/assessment/${slug}/start?couple=${couple.couple_code}` : "";
  const reportLink = couple ? `${APP_URL}/couple/${couple.couple_code}` : "";

  return (
    <main className="wrap" style={{ maxWidth: 640, padding: "48px 24px 80px" }}>
      <Link href={`/assessment/${slug}`} style={link}>← {assessment.name}</Link>
      {state === "form" && (
        <>
          <h1 className="serif" style={h1}>Take it together</h1>
          <p style={sub}>
            You'll each answer privately, then look at the combined picture side by side. Your spouse never
            sees your individual answers, only the shared report. Set it up once and you'll get a link to
            share with your spouse.
          </p>
          <form onSubmit={create} style={card}>
            <label style={fw}><span style={fl}>Your first name</span>
              <input style={inp} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anthony" />
            </label>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
              Set up our assessment
            </button>
          </form>
        </>
      )}

      {state === "done" && couple && (
        <>
          <h1 className="serif" style={h1}>You're all set</h1>
          <p style={sub}>
            Use the same link for both of you. The first to finish becomes the first column in the report;
            whoever finishes second unlocks it. Bookmark the report link.
          </p>
          <div style={card}>
            <Copyable label="Both of you take it here" value={takeLink} />
            <div style={{ marginBottom: 16 }}>
              <div style={fl}>Or send your spouse their link</div>
              <InviteSender kind="couple" code={couple?.couple_code} />
            </div>
            <Copyable label="Your couple report (bookmark this)" value={reportLink} />
            <div style={note}>
              Take your part now, then send the same link to your spouse. Your report opens the moment you
              both finish. The one private safety question is never shared with your spouse.
            </div>
            <Link className="btn btn-primary" href={`/assessment/${slug}/start?couple=${couple.couple_code}`} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              Take my part now →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

function Copyable({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={fl}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inp, fontFamily: "monospace", fontSize: 13 }} readOnly value={value} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-ghost" style={{ padding: "10px 14px", whiteSpace: "nowrap" }}
          onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}>
    <div>{children}</div>
  </main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6, margin: "0 0 22px" };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 26 };
const fw = { display: "block", marginBottom: 16 };
const fl = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const inp = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const note = { fontSize: 13, color: "var(--ink-soft)", background: "var(--mist)", borderRadius: 10, padding: "12px 14px", margin: "6px 0 14px", lineHeight: 1.55 };
