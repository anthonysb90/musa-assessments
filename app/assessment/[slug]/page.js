import Link from "next/link";
import { getServerSupabase } from "../../lib/supabaseServer";
import { assessmentImage, ASSESSMENT_LANDING } from "../../lib/content";
import SampleReportButton from "../../components/SampleReport";

export const dynamic = "force-dynamic";

const CAT_LABEL = {
  personal: "Personal Growth & Calling",
  ministry: "Marriage & Ministry Readiness",
  church: "Church & Leadership Health",
};

export default async function AssessmentLanding({ params, searchParams }) {
  const { slug } = params;
  const supabase = getServerSupabase();
  const { data: a } = await supabase
    .from("assessments")
    .select("id,slug,name,subtitle,category,estimated_minutes,sensitivity,is_multi_rater")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!a) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="serif" style={{ color: "var(--ink)" }}>This assessment isn't available</h1>
          <Link className="btn btn-ghost" href="/" style={{ marginTop: 16 }}>← All assessments</Link>
        </div>
      </main>
    );
  }

  const { count } = await supabase
    .from("items").select("id", { count: "exact", head: true }).eq("assessment_id", a.id);

  const land = ASSESSMENT_LANDING[slug] || {};
  const image = assessmentImage(slug);

  // preserve assignment / campaign params into the take flow
  const qp = new URLSearchParams();
  for (const k of ["a", "source", "cohort"]) {
    const v = searchParams?.[k];
    if (v) qp.set(k, Array.isArray(v) ? v[0] : v);
  }
  const isCouple = slug === "called-together";
  const startHref = a.is_multi_rater
    ? `/assessment/${slug}/team`
    : isCouple
    ? `/assessment/${slug}/couple`
    : `/assessment/${slug}/start${qp.toString() ? `?${qp}` : ""}`;
  const startLabel = a.is_multi_rater
    ? "Start as a leadership team →"
    : isCouple
    ? "Start as a couple →"
    : "Start the assessment →";

  return (
    <main style={{ background: "var(--mist)" }}>
      <style>{`
        @keyframes ctaGlow {
          0%,100% { box-shadow: 0 8px 22px rgba(196,146,62,.38); transform: translateY(0); }
          50% { box-shadow: 0 14px 38px rgba(196,146,62,.62); transform: translateY(-3px); }
        }
        .cta-start { animation: ctaGlow 2.2s ease-in-out infinite; }
        .cta-start:hover { animation: none; transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 44px rgba(196,146,62,.6); }
        @media (prefers-reduced-motion: reduce){ .cta-start{ animation:none; } }
      `}</style>
      {/* Hero */}
      <section style={hero}>
        <div style={{ ...heroImg, backgroundImage: `url("${image}")` }} />
        <div style={heroOverlay} />
        <div style={heroInner}>
          <Link href="/" style={backLink}>← All assessments</Link>
          <div style={kicker}>{CAT_LABEL[a.category] || "Ministry Assessment"}</div>
          <h1 className="serif" style={heroTitle}>{a.name}</h1>
          <p style={heroTag}>{land.tagline || a.subtitle}</p>
          <div style={chips}>
            <span style={chip}>About {a.estimated_minutes} min</span>
            {count ? <span style={chip}>{count} questions</span> : null}
            <span style={chip}>Free</span>
            {a.sensitivity === "sensitive" && <span style={{ ...chip, ...chipGold }}>Private · sign-in required</span>}
          </div>
          <div style={{ marginTop: 26, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={startHref} className="cta-start" style={ctaStart}>{startLabel}</Link>
            <SampleReportButton slug={slug} name={a.name} variant="light" />
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 24px 72px" }}>
        {/* About */}
        <section style={{ padding: "48px 0 8px" }}>
          <div style={eyebrow}>About this assessment</div>
          <p style={aboutP}>{land.about || a.subtitle}</p>
        </section>

        {/* Measures + You'll get */}
        <section style={twoCol}>
          <div style={infoCard}>
            <div style={infoHead}>What it measures</div>
            <ul style={ul}>
              {(land.measures || []).map((m, i) => <li key={i} style={li}>{m}</li>)}
            </ul>
          </div>
          <div style={{ ...infoCard, background: "linear-gradient(180deg,#122A44,#1B3A57)", color: "#fff", border: "none" }}>
            <div style={{ ...infoHead, color: "#E4CE8C" }}>What you'll walk away with</div>
            <ul style={ul}>
              {(land.youGet || []).map((m, i) => <li key={i} style={{ ...li, color: "rgba(255,255,255,.9)", borderColor: "rgba(255,255,255,.12)" }}>{m}</li>)}
            </ul>
          </div>
        </section>

        {/* Sample report — full preview via the hero button and here */}
        <section style={{ padding: "30px 0 4px", textAlign: "center" }}>
          <div style={{ ...eyebrow, marginBottom: 14 }}>See it before you start</div>
          <SampleReportButton slug={slug} name={a.name} />
        </section>

        {/* Bottom CTA */}
        <section style={ctaBand}>
          <div>
            <div className="serif" style={{ fontSize: 24, color: "#fff", marginBottom: 4 }}>Ready when you are.</div>
            <div style={{ color: "rgba(255,255,255,.8)", fontSize: 15 }}>
              About {a.estimated_minutes} minutes. There's no score to pass or fail.
            </div>
          </div>
          <Link href={startHref} style={{ ...ctaPrimary, background: "#C4923E", boxShadow: "0 8px 22px rgba(196,146,62,.35)" }}>
            {startLabel}
          </Link>
        </section>

        <div style={{ textAlign: "center", marginTop: 26, fontSize: 12, color: "#9AA7B4" }}>
          Photography via Pexels · A ministry resource of Mission USA
        </div>
      </div>
    </main>
  );
}

/* styles */
const hero = { position: "relative", minHeight: "58vh", display: "flex", alignItems: "flex-end", overflow: "hidden" };
const heroImg = { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", transform: "scale(1.03)" };
const heroOverlay = { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,42,68,.35) 0%, rgba(18,42,68,.72) 55%, rgba(18,42,68,.92) 100%)" };
const heroInner = { position: "relative", width: "100%", maxWidth: 940, margin: "0 auto", padding: "0 24px 48px", color: "#fff" };
const backLink = { color: "rgba(255,255,255,.85)", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", marginBottom: 20 };
const kicker = { fontSize: 12.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700, marginBottom: 12 };
const heroTitle = { fontWeight: 400, fontSize: "clamp(38px,6vw,62px)", lineHeight: 1.02, margin: "0 0 12px" };
const heroTag = { fontSize: "clamp(17px,2.4vw,21px)", color: "rgba(255,255,255,.9)", maxWidth: 620, margin: 0, lineHeight: 1.4 };
const chips = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 };
const chip = { fontSize: 13, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.22)", padding: "7px 14px", borderRadius: 999 };
const chipGold = { background: "rgba(196,146,62,.2)", borderColor: "rgba(196,146,62,.5)", color: "#F0E4CB" };
const ctaPrimary = { display: "inline-flex", alignItems: "center", background: "#1B3A57", color: "#fff", fontWeight: 700, fontSize: 16, padding: "15px 30px", borderRadius: 12, textDecoration: "none", boxShadow: "0 10px 26px rgba(27,58,87,.35)" };
const ctaStart = { display: "inline-flex", alignItems: "center", background: "#C4923E", color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: ".01em", padding: "17px 36px", borderRadius: 12, textDecoration: "none" };
const eyebrow = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 };
const aboutP = { fontSize: "clamp(18px,2.2vw,22px)", lineHeight: 1.55, color: "var(--ink)", margin: "14px 0 0", fontWeight: 400 };
const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, padding: "34px 0 8px" };
const infoCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: "26px 26px 20px" };
const infoHead = { fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const ul = { listStyle: "none", padding: 0, margin: 0 };
const li = { fontSize: 15.5, lineHeight: 1.5, color: "var(--ink)", padding: "12px 0", borderTop: "1px solid var(--line)" };
const sampleTag = { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B07C2E", background: "#F5EFE6", border: "1px solid #EADFC9", padding: "3px 9px", borderRadius: 999 };
const demoWrap = { background: "#fff", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 50px rgba(18,42,68,.10)" };
const demoHead = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "24px 26px" };
const demoHeadKicker = { fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700, marginBottom: 8 };
const demoHeadTitle = { fontSize: 24, fontWeight: 500, lineHeight: 1.1 };
const demoHeadSub = { fontSize: 13.5, color: "rgba(255,255,255,.75)", marginTop: 5 };
const demoRow = { display: "grid", gridTemplateColumns: "1fr 2fr 56px", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid #F0F2F4" };
const demoLabel = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const demoTrack = { height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const demoVal = { fontSize: 15, fontWeight: 700, textAlign: "right" };
const demoFoot = { padding: "14px 20px", background: "#F6F8FA", borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--ink-soft)" };
const ctaBand = { marginTop: 40, background: "linear-gradient(135deg,#1B3A57,#122A44)", borderRadius: 20, padding: "30px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" };
