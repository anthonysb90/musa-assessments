"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "./lib/supabase";

const CAT_LABEL = {
  personal: "Personal Growth & Calling",
  ministry: "Marriage & Ministry Readiness",
  church: "Church & Leadership Health",
};
const CAT_ORDER = ["personal", "ministry", "church"];

export default function Home() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("assessments")
        .select("slug,name,subtitle,category,estimated_minutes,is_published")
        .eq("is_published", true)
        .order("category");
      if (error) setErr(error.message);
      else setAssessments(data || []);
      setLoading(false);
    })();
  }, []);

  const grouped = CAT_ORDER.map((cat) => ({
    cat,
    label: CAT_LABEL[cat],
    items: assessments.filter((a) => a.category === cat),
  })).filter((g) => g.items.length);

  return (
    <main>
      <section style={S.hero}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <a href="/dashboard" style={{ color: "rgba(255,255,255,.85)", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>
              Sign in / My results →
            </a>
          </div>
          <span style={S.free}>Free · A Ministry Resource of Mission USA</span>
          <h1 className="serif" style={S.h1}>
            Know where you stand.<br />
            <em style={{ fontStyle: "italic", color: "var(--gold-soft)" }}>
              Grow where it counts.
            </em>
          </h1>
          <p style={S.sub}>
            Honest, Scripture-grounded assessments for pastors, leaders, spouses,
            and everyday believers. Each one hands you a clear picture and a real
            next step.
          </p>
        </div>
      </section>

      <section className="wrap" style={{ padding: "48px 24px 80px" }}>
        {loading && <p style={S.muted}>Loading assessments…</p>}
        {err && (
          <p style={S.muted}>
            We couldn't load the assessments just now. Please refresh in a moment.
          </p>
        )}
        {!loading &&
          !err &&
          grouped.map((g) => (
            <div key={g.cat} style={{ marginBottom: 44 }}>
              <h2 className="serif" style={S.groupHead}>
                {g.label}
              </h2>
              <div style={S.grid}>
                {g.items.map((a) => (
                  <Link key={a.slug} href={`/assessment/${a.slug}`} style={S.card}>
                    <h3 className="serif" style={S.cardName}>
                      {a.name}
                    </h3>
                    <p style={S.cardSub}>{a.subtitle}</p>
                    <span style={S.cardCta}>
                      Take it{" "}
                      {a.estimated_minutes ? `· ${a.estimated_minutes} min` : ""} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        {!loading && !err && grouped.length === 0 && (
          <p style={S.muted}>New assessments are on the way. Check back soon.</p>
        )}
      </section>
    </main>
  );
}

const S = {
  hero: {
    background:
      "radial-gradient(900px 400px at 15% -10%, rgba(196,146,62,.16), transparent 60%), linear-gradient(180deg,#122A44,#1B3A57)",
    color: "#fff",
    padding: "72px 0 64px",
  },
  free: {
    display: "inline-block",
    background: "rgba(196,146,62,.16)",
    border: "1px solid rgba(196,146,62,.5)",
    color: "var(--gold-soft)",
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    padding: "7px 14px",
    borderRadius: 999,
    marginBottom: 22,
  },
  h1: { fontWeight: 400, fontSize: "clamp(36px,5vw,54px)", lineHeight: 1.05, margin: "0 0 18px" },
  sub: { fontSize: 18, color: "rgba(255,255,255,.82)", maxWidth: 520, margin: 0 },
  groupHead: { fontWeight: 500, fontSize: 24, color: "var(--ink)", margin: "0 0 18px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 },
  card: {
    display: "block",
    background: "var(--paper)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: "24px 24px 20px",
    textDecoration: "none",
    transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
  },
  cardName: { fontWeight: 500, fontSize: 21, color: "var(--ink)", margin: "0 0 5px" },
  cardSub: { fontSize: 14, color: "var(--ink-soft)", margin: "0 0 16px" },
  cardCta: { fontSize: 14, fontWeight: 600, color: "var(--teal-deep)" },
  muted: { color: "var(--ink-soft)", fontSize: 16 },
};
