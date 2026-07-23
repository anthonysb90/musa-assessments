"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import { APP_URL } from "../../../lib/config";
import InviteSender from "../../../components/InviteSender";

export default function TeamSetup() {
  const { slug } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [assessment, setAssessment] = useState(null);
  const [state, setState] = useState("loading"); // loading | form | done | error | notmulti
  const [church, setChurch] = useState("");
  const [target, setTarget] = useState("");
  const [group, setGroup] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("assessments").select("id,name,subtitle,is_multi_rater")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!a) { setState("error"); return; }
      if (!a.is_multi_rater) { setAssessment(a); setState("notmulti"); return; }
      setAssessment(a);
      setState("form");
    })();
  }, [slug, supabase]);

  async function create(e) {
    e.preventDefault();
    setState("loading");
    try {
      // Code-generating RPC (rater_groups has no anon INSERT policy): the
      // server creates the row and returns only the secret team code.
      const { data, error } = await supabase.rpc("create_rater_group", {
        p_assessment_id: assessment.id, p_church_name: church,
        p_target_count: target ? Number(target) : null,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Could not create the team.");
      setGroup({ team_code: data.team_code, church_name: data.church_name, min_raters: data.min_raters });
      setState("done");
    } catch (e2) {
      setErr(e2.message || "Could not create the team.");
      setState("error");
    }
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "error") return <Center>{err || "This assessment isn't available."}<div style={{ marginTop: 14 }}><Link href="/" style={link}>← All assessments</Link></div></Center>;
  if (state === "notmulti")
    return <Center>This assessment is taken individually. <Link href={`/assessment/${slug}/start`} style={link}>Start it →</Link></Center>;

  const raterLink = group ? `${APP_URL}/assessment/${slug}/start?team=${group.team_code}` : "";
  const resultsLink = group ? `${APP_URL}/team/${group.team_code}` : "";

  return (
    <main className="wrap" style={{ maxWidth: 640, padding: "48px 24px 80px" }}>
      <Link href={`/assessment/${slug}`} style={link}>← {assessment.name}</Link>
      {state === "form" && (
        <>
          <h1 className="serif" style={h1}>Start a leadership team review</h1>
          <p style={sub}>
            You'll get one link to share with your leaders. Each person answers privately, and once at
            least 3 have finished, the combined report unlocks. Individual answers are never shown to
            anyone, including you.
          </p>
          <form onSubmit={create} style={card}>
            <label style={fw}><span style={fl}>Church name</span>
              <input style={inp} required value={church} onChange={(e) => setChurch(e.target.value)} placeholder="The Jefferson Church" />
            </label>
            <label style={fw}><span style={fl}>How many leaders will take it? (optional)</span>
              <input style={inp} type="number" min="3" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 8" />
            </label>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
              Create the team link
            </button>
          </form>
        </>
      )}

      {state === "done" && group && (
        <>
          <h1 className="serif" style={h1}>Your team is ready</h1>
          <p style={sub}>Share this link with your leadership team. Bookmark the results link for yourself.</p>
          <div style={card}>
            <Copyable label="Share with your team" value={raterLink} />
            <div style={{ marginBottom: 16 }}>
              <div style={fl}>Or text/email each leader their link</div>
              <InviteSender kind="team" code={group?.team_code} />
            </div>
            <Copyable label="Team code" value={group.team_code} />
            <Copyable label="Your results page (bookmark this)" value={resultsLink} />
            <div style={note}>
              The combined report unlocks once {group.min_raters || 3} leaders have completed it. Until
              then, the results page shows how many have responded, never who or what they answered.
            </div>
            <Link className="btn btn-ghost" href={`/team/${group.team_code}`} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              Go to results page →
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
