"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

// Redemption page: shows what an access code unlocks and lets the holder (or
// anyone they shared a seat code with) start each assessment with the code
// pre-applied. Couple/team assessments route to their own setup with the code.
const COUPLE_SLUGS = ["called-together"];
const TEAM_SLUGS = ["church-health"];

export default function AccessPage() {
  const { code } = useParams();
  const supabase = useRef(getSupabase()).current;
  const [info, setInfo] = useState(null);
  const [names, setNames] = useState({});
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("grant_info", { p_code: code });
      if (!data?.ok) { setState("notfound"); return; }
      const slugs = data.assessment_slugs || [];
      const { data: rows } = await supabase.from("assessments").select("slug,name,subtitle").in("slug", slugs.length ? slugs : ["_none_"]);
      setNames(Object.fromEntries((rows || []).map((r) => [r.slug, r])));
      setInfo(data); setState("ready");
    })();
  }, [code, supabase]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "notfound") return <Center>We couldn't find that access code.</Center>;

  const remaining = Math.max(0, info.seats_total - info.seats_used);
  const slugs = info.assessment_slugs || [];
  const linkFor = (slug) =>
    COUPLE_SLUGS.includes(slug) ? `/assessment/${slug}/couple?code=${code}`
      : TEAM_SLUGS.includes(slug) ? `/assessment/${slug}/team?code=${code}`
      : `/assessment/${slug}/start?code=${code}`;

  return (
    <main className="wrap" style={{ maxWidth: 640, padding: "48px 24px 80px" }}>
      <Link href="/" style={link}>← All assessments</Link>
      <h1 className="serif" style={h1}>{info.kind === "bundle" ? "Your bundle" : "Your access"}</h1>
      <p style={sub}>
        {info.seats_total > 1
          ? `${remaining} of ${info.seats_total} seats remaining. Share the code below so each person can use one.`
          : "Open your assessment below to begin."}
      </p>

      <div style={{ ...card, textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700 }}>Access code</div>
        <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 700, color: "var(--navy)", letterSpacing: ".06em", marginTop: 6 }}>{code}</div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {slugs.map((slug) => (
          <div key={slug} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{names[slug]?.name || slug}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{names[slug]?.subtitle}</div>
              </div>
              <Link className="btn btn-primary" href={linkFor(slug)} style={{ whiteSpace: "nowrap" }}>Start →</Link>
            </div>
          </div>
        ))}
      </div>
      {remaining === 0 && (
        <p style={{ ...sub, marginTop: 18, color: "#B4443A" }}>All seats on this code have been used.</p>
      )}
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6, margin: "0 0 22px" };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" };
