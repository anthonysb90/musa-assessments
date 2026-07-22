import Link from "next/link";
import { getServerSupabase } from "../../lib/supabaseServer";
import { assessmentImage, ASSESSMENT_LANDING } from "../../lib/content";

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
    .select("id,slug,name,subtitle,category,estimated_minutes,sensitivity")
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
  const startHref = `/assessment/${slug}/start${qp.toString() ? `?${qp}` : ""}`;

  return (
    <main style={{ background: "var(--mist)" }}>
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
          <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={startHref} style={ctaPrimary}>Start the assessment →</Link>
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

        {/* Demo report */}
        {land.demo && (
          <section style={{ padding: "36px 0 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={eyebrow}>A peek at your report</div>
              <span style={sampleTag}>Sample</span>
            </div>
            <div style={demoWrap}>
              <div style={demoHead}>
                <div>
                  <div style={demoHeadKicker}>{a.name}</div>
                  <div className="serif" style={demoHeadTitle}>{land.demo.headline}</div>
                  <div style={demoHeadSub}>{land.demo.sub}</div>
                </div>
              </div>
              <div style={{ padding: "6px 20px 18px" }}>
                {land.demo.bars.map(([label, val, max], i) => {
                  const color = i === 0 ? "#C4923E" : i === 1 ? "#2E7D8A" : "#8CA0B3";
                  const isInt = Number.isInteger(val) && Number.isInteger(max) && max > 5;
                  return (
                    <div key={label} style={demoRow}>
                      <span style={demoLabel}>{label}</span>
                      <span style={demoTrack}>
                        <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(val / max) * 100}%`, background: color }} />
                      </span>
                      <span style={{ ...demoVal, color }}>{isInt ? val : val.toFixed(1)}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{max}</span></span>
                    </div>
                  );
                })}
              </div>
              <div style={demoFoot}>Your real report is fully interactive, with Scripture, next steps, and a downloadable PDF.</div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section style={ctaBand}>
          <div>
            <div className="serif" style={{ fontSize: 24, color: "#fff", marginBottom: 4 }}>Ready when you are.</div>
            <div style={{ color: "rgba(255,255,255,.8)", fontSize: 15 }}>
              About {a.estimated_minutes} minutes. There's no score to pass or fail.
            </div>
          </div>
          <Link href={startHref} style={{ ...ctaPrimary, background: "#C4923E", boxShadow: "0 8px 22px rgba(196,146,62,.35)" }}>
            Start the assessment →
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
