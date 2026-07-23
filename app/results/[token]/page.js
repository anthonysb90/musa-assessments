"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { REPORT_CREDIT } from "../../lib/config";
import { GIFTS } from "../../lib/gifts";
import {
  ordinal,
  GROWTH_LEVELS,
  rootedBand,
  FIVEFOLD,
  DISC_BLENDS,
  DISC_DIMS,
  domainBand,
  DOMAIN_META,
  DOMAIN_REPORT_COPY,
  PASTOR_PILLARS,
  PASTOR_DOMAINS,
  WELLBEING_CARE,
  SPIRITUAL_GROWTH_DOMAINS,
  SPIRITUAL_GROWTH_ORDER,
  ENNEAGRAM_TYPES,
  PLANTER_PRIMARY,
  PLANTER_CHARACTERISTICS,
  PLANTER_TIERS,
  PLANTER_PRAY,
  PLANTER_SCRIPTURES,
  EFMI_SUBSCALES,
  efmiBand,
  EFMI_CREDIT,
  EFMI_REFERENCES,
  EFMI_HURT_OPTIONS,
  EFMI_DEGREE_OPTIONS,
} from "../../lib/content";
import {
  BIG5_TRAITS,
  BIG5_TRAIT_META,
  BIG5_TRAIT_ORDER,
  BIG5_FACETS,
  big5Boundary,
} from "../../lib/bigfive";
import {
  KDP_TYPES,
  KDP_NAMES,
  KDP_ORDER,
  KDP_TEMPERAMENTS,
  KDP_PAIRS,
  KDP_EMBLEMS,
} from "../../lib/kingdom";
import {
  LEGS, SEAT, LEG_ORDER, FOUNDATIONS, FOUNDATION_ORDER_BY_LEG,
  STYLES, STYLE_ORDER, BANDS, leadBand, BOOK, ASSETS, pairingsFor,
} from "../../lib/leadership";
import DonationCard from "../../components/DonationCard";
import CircleInvite from "../../components/CircleInvite";

export default function ResultsPage() {
  const { token } = useParams();
  const [scored, setScored] = useState(null);
  const [meta, setMeta] = useState(null);
  const [wb, setWb] = useState(null);
  const [state, setState] = useState("loading");
  const [dl, setDl] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [brand, setBrand] = useState(null); // { name, logo_url, withhold }
  const [blocked, setBlocked] = useState(false); // withheld from this viewer
  const reportRef = useRef(null);

  // Save as PDF: capture the report region and auto-download. Loads html2pdf
  // from CDN on demand (no npm dependency). Colors are captured as rendered.
  async function downloadPdf() {
    if (!reportRef.current) return;
    setDl(true);
    try {
      const lib = await loadHtml2pdf();
      const contact = scored?.contact || {};
      const who = `${contact.first_name || ""}-${contact.last_name || ""}`.trim().replace(/\s+/g, "-") || "report";
      const what = (meta?.name || "assessment").replace(/[^\w]+/g, "-");
      await lib()
        .set({
          margin: [8, 8, 12, 8],
          filename: `${who}-${what}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", ignoreElements: (el) => el.classList?.contains?.("no-pdf") },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css"] },
        })
        .from(reportRef.current)
        .save();
    } catch (e) {
      // Fall back to the print dialog if the PDF library can't load.
      window.print();
    } finally {
      setDl(false);
    }
  }

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase
        .from("sessions").select("id,assessment_id").eq("result_token", token).single();
      if (!session) { setState("notfound"); return; }
      const { data: result } = await supabase
        .from("results").select("scored_json,created_at").eq("session_id", session.id).single();
      const { data: assessment } = await supabase
        .from("assessments").select("name,subtitle,is_paid,price_cents").eq("id", session.assessment_id).single();
      if (!result) { setState("notfound"); return; }
      // Wellbeing (owner or Mission USA care/admin only, by RLS). Returns
      // nothing for anyone else, so the card simply doesn't render for them.
      const { data: wbRow } = await supabase
        .from("wellbeing_results")
        .select("total,max_total,band,elevated")
        .eq("session_id", session.id)
        .maybeSingle();
      // Church branding + withhold flag (if this was taken through a church).
      const { data: brandRow } = await supabase.rpc("session_church_brand", { p_session: session.id });
      const b = brandRow || null;

      // Signed-in / admin detection drives the report nav and the withhold gate.
      const { data: udata } = await supabase.auth.getUser();
      let adm = false, churchAdmin = false;
      if (udata?.user) {
        setSignedIn(true);
        const { data: a } = await supabase.rpc("is_admin");
        adm = a === true; setIsAdmin(adm);
        if (b?.church_id) {
          const { data: ca } = await supabase.rpc("is_church_admin", { target: b.church_id });
          churchAdmin = ca === true;
        }
      }

      // Withheld results: the taker cannot see their own report; only Mission USA
      // admins or a leader of that church can. Others see a "held for you" note.
      if (b?.withhold && !adm && !churchAdmin) {
        setBrand(b); setBlocked(true); setState("ready");
        return;
      }

      setScored(result.scored_json);
      setMeta({ ...assessment, created_at: result.created_at });
      setWb(wbRow || null);
      setBrand(b);
      setState("ready");
    })();
  }, [token]);

  if (state === "loading") return <Centered>Loading your results…</Centered>;
  if (state === "notfound")
    return <Centered>We couldn't find those results. The link may be incomplete.</Centered>;

  if (blocked)
    return (
      <Centered>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} style={{ maxHeight: 60, marginBottom: 18 }} />}
          <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)", marginBottom: 10 }}>Your results are ready.</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
            Thank you for completing this assessment. Your results have been sent to{" "}
            <strong>{brand?.name || "your church"}</strong>, who asked to go over them with you in person.
            Reach out to your church leader to review them together.
          </p>
          <p style={{ color: "#8CA0B3", fontSize: 13.5, marginTop: 16 }}>
            Assessment by Mission USA of the Congregational Holiness Church.
          </p>
        </div>
      </Centered>
    );

  const contact = scored.contact || {};
  // Don't ask for a donation on a premium report — they already paid.
  const isPaidReport = !!(meta?.is_paid && meta?.price_cents > 0);
  const suppressDonation = isPaidReport || ["mip", "church-class"].includes(contact.source_tag);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="print-foot" aria-hidden="true">
        {contact.first_name} {contact.last_name} · {meta?.name} · Mission USA
      </div>
      <div ref={reportRef} id="report-capture">
        <header style={hd}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 16 }}>
              <img src="/musa-logo-white-h.png" alt="Mission USA Assessments" style={{ height: 46, width: "auto", display: "block" }} />
              {brand?.logo_url && (
                <span style={{ background: "#fff", borderRadius: 8, padding: "6px 10px", display: "inline-flex" }}>
                  <img src={brand.logo_url} alt={brand.name} style={{ height: 34, width: "auto", display: "block" }} />
                </span>
              )}
            </div>
            <div style={hdRow}>
              <div>
                <div style={kicker}>{meta?.name}</div>
                <h1 className="serif" style={hName}>
                  {contact.first_name} {contact.last_name}
                </h1>
              </div>
              <div style={hMeta}>
                {meta?.created_at &&
                  new Date(meta.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                {contact.email && <div style={{ opacity: 0.75 }}>{contact.email}</div>}
              </div>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 60px" }}>
          <div className="no-print no-pdf" style={actions}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              ⬇ Save as PDF / Print
            </button>
            {isAdmin ? (
              <a className="btn btn-ghost" href="/admin">← Back to Admin</a>
            ) : (
              <>
                <a className="btn btn-ghost" href="/">← All assessments</a>
                <a className="btn btn-ghost" href="/dashboard">See all my results →</a>
              </>
            )}
          </div>
          <div className="no-print no-pdf" style={{ fontSize: 12.5, color: "#8CA0B3", margin: "-4px 0 16px", lineHeight: 1.5 }}>
            Opens your print dialog — choose <strong>Save as PDF</strong> as the destination for a crisp, shareable copy.{" "}
            <button onClick={downloadPdf} disabled={dl} style={{ background: "none", border: "none", padding: 0, color: "var(--teal-deep)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
              {dl ? "Preparing…" : "Trouble printing? Download a simple copy."}
            </button>
          </div>

          <div className="no-print no-pdf" style={savedNote}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span>
              This report is saved to your profile. You can come back to it anytime with the link we
              emailed to {contact.email || "you"}.
            </span>
          </div>

          <div className="sheet">
            {scored.type === "gift-rank" && <GiftRank scored={scored} />}
            {scored.type === "ranked-sum" && <RankedSum scored={scored} />}
            {scored.type === "domain-bands" &&
              (scored.slug === "spiritual-growth"
                ? <SpiritualGrowthReport scored={scored} />
                : <DomainBandsReport scored={scored} />)}
            {scored.type === "type-pick" && <EnneagramReport scored={scored} />}
            {scored.type === "subscale-sum" && <ForgivenessReport scored={scored} />}
            {scored.type === "big-five" && <BigFiveReport scored={scored} />}
            {scored.type === "kingdom-design" && <KingdomReport scored={scored} />}
            {scored.type === "planter" && <PlanterReport scored={scored} />}
            {scored.type === "level-matrix" && <GrowthReport scored={scored} />}
            {scored.type === "disc-blend" && <DiscReport scored={scored} />}
            {scored.type === "pillar" && <PastorReport scored={scored} />}
            {scored.type === "leadership-stool" && <LeadershipReport scored={scored} />}
            {scored.type === "domain-average" && <DomainReport scored={scored} />}

            {wb && <WellbeingCard wb={wb} />}

            <div className="report-credit">
              <img src="/musa-logo.png" alt="Mission USA" style={{ height: 34, width: "auto", display: "block", margin: "0 auto 10px" }} />
              {REPORT_CREDIT}
            </div>
          </div>

          {(scored.slug === "leadership-health" || scored.type === "planter") && (
            <CircleInvite token={token} kind={scored.type === "planter" ? "planter" : "leader"} />
          )}

          <DonationCard suppressed={suppressDonation} />
          <footer className="no-print no-pdf" style={ft}>A ministry resource of Mission USA · gomissionusa.com</footer>
        </div>
      </div>
    </main>
  );
}

// html2pdf loader (CDN, bundle includes html2canvas + jsPDF). Cached on window.
function loadHtml2pdf() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.html2pdf) return resolve(window.html2pdf);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = () => reject(new Error("Could not load the PDF library."));
    document.body.appendChild(s);
  });
}

/* ---------------- Spiritual Gifts (ranked A–Y) ----------------
   Signature: an illuminated top-3 triptych over a calibrated 25-gift ladder.
   Gold + parchment, Fraunces illuminated capitals. Per-gift Scripture, ministry
   role, and growth step. Print expands every gift study (the catalog is the point). */
const PARCH = "radial-gradient(circle at 28% 18%, #FCF7EC, #F3E9D4 72%)";
const firstRef = (refs) => String(refs || "").split("·")[0].trim();

function GiftRank({ scored }) {
  const [open, setOpen] = useState(null);
  const ranked = useMemo(
    () => scored.ranked.map((g, i) => ({ ...g, ...GIFTS[g.letter], rank: i, tier: i < 3 ? "top" : i < 8 ? "mid" : "low" })),
    [scored]
  );
  const topThree = ranked.slice(0, 3);
  const per = scored.max_per || 15;
  const ticks = [0, Math.round(per / 3), Math.round((2 * per) / 3), per];

  return (
    <>
      {/* Illuminated top-3 triptych */}
      <section style={{ padding: "6px 0 4px" }} className="avoid-break">
        <div style={{ ...sectionLabel, color: "#B07C2E" }}>Your three strongest gifts</div>
        <div style={gfTriptych}>
          {topThree.map((g) => (
            <div key={g.letter} style={gfPanel}>
              <div style={gfIllum}>
                <span className="serif" style={gfCap}>{g.name.charAt(0)}</span>
                <span style={gfRankTag}>{ordinal(g.rank + 1)}</span>
              </div>
              <div className="serif" style={gfName}>{g.name}</div>
              <div style={gfScoreRow}>
                <span style={gfScore}>{g.score}</span>
                <span style={{ fontSize: 13, color: "#A9895A", fontWeight: 600 }}>/ {per}</span>
              </div>
              <p style={gfPanelDef}>{g.def}</p>
              <div style={gfVerse}>{firstRef(g.refs)}</div>
            </div>
          ))}
        </div>
        <p style={helper}>
          These are the places you are most clearly wired to serve. Every gift you carry is ranked
          below, on a single scale, so you can see your whole profile at a glance.
        </p>
      </section>

      {/* The gift ladder — all 25, calibrated */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Your gift ladder · all 25 ranked</div>
        <div style={chart}>
          <div style={gfScale}>
            <span style={gfScaleName} />
            <span style={{ position: "relative", flex: 1, height: 14 }}>
              {ticks.map((t) => (
                <span key={t} style={{ position: "absolute", left: `${(t / per) * 100}%`, transform: "translateX(-50%)", fontSize: 10.5, color: "#B4BEC9", fontWeight: 600 }}>{t}</span>
              ))}
            </span>
            <span style={{ width: 34 }} />
          </div>
          {ranked.map((g) => {
            const color = g.tier === "top" ? "#C4923E" : g.tier === "mid" ? "#2E7D8A" : "#9AA7B3";
            const isOpen = open === g.letter;
            return (
              <div key={g.letter} style={{ borderBottom: "1px solid #F0F2F4" }} className="avoid-break">
                <button onClick={() => setOpen(isOpen ? null : g.letter)} style={gfRow} className="bar">
                  <span style={{ ...gfRank, color: g.tier === "top" ? "#B07C2E" : "#8CA0B3" }}>{g.rank + 1}</span>
                  <span style={gfRowName}>{g.name}{g.tier === "top" && <span style={{ color: "#C4923E", marginLeft: 6 }}>★</span>}</span>
                  <span style={gfTrack}>
                    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (g.score / per) * 100)}%`, background: color, borderRadius: 999 }} />
                  </span>
                  <span style={{ ...gfRowScore, color }}>{g.score}</span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                <div className={`gift-study${isOpen ? " is-open" : ""}`} style={gfStudy}>
                  <p style={{ ...detailP, marginTop: 0 }}>{g.def}</p>
                  <div style={gfVerseCallout}>
                    <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, display: "block", marginBottom: 4 }}>In Scripture</span>
                    {g.refs}
                  </div>
                  <div style={gfTwoCol}>
                    <div><div style={blockH}>Where this gift serves</div><p style={{ ...detailP, margin: 0 }}>{g.roles}</p></div>
                    <div><div style={blockH}>Growing in this gift</div><p style={{ ...detailP, margin: 0 }}>{g.develop}</p></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          Every gift is scored against itself, on the same scale, so the ladder shows your true order.
          A lower gift is not a weakness; it simply is not where you are most strongly wired. Tap any
          gift to read where it serves and how to grow in it. Your full report prints all twenty-five.
        </p>
      </section>
    </>
  );
}
const gfTriptych = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, margin: "6px 0 4px" };
const gfPanel = { background: PARCH, border: "1px solid #E7D6B4", borderRadius: 16, padding: "22px 20px 20px", textAlign: "center", position: "relative", boxShadow: "0 10px 30px rgba(176,124,46,.12)" };
const gfIllum = { position: "relative", width: 72, height: 72, margin: "0 auto 12px", borderRadius: 12, border: "1.5px solid #D8B877", background: "linear-gradient(160deg,#FBF3DF,#F0DFB4)", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 3px rgba(255,255,255,.55)" };
const gfCap = { fontSize: 46, fontWeight: 600, color: "#B07C2E", lineHeight: 1 };
const gfRankTag = { position: "absolute", top: -10, right: -10, background: "#1B3A57", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 };
const gfName = { fontSize: 21, color: "#3A2E18", lineHeight: 1.15 };
const gfScoreRow = { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, margin: "6px 0 10px" };
const gfScore = { fontSize: 30, fontWeight: 700, color: "#C4923E", lineHeight: 1, fontFamily: "'Inter',sans-serif" };
const gfPanelDef = { fontSize: 13, color: "#6B5B3E", lineHeight: 1.5, margin: "0 0 12px" };
const gfVerse = { fontSize: 11.5, color: "#8A6D3B", fontWeight: 600, borderTop: "1px solid #E7D6B4", paddingTop: 10, fontStyle: "italic" };
const gfScale = { display: "flex", alignItems: "center", gap: 14, padding: "8px 16px 2px" };
const gfScaleName = { width: 172 };
const gfRow = { display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" };
const gfRank = { width: 22, fontSize: 13, fontWeight: 700, textAlign: "center", flexShrink: 0 };
const gfRowName = { width: 150, fontSize: 14.5, fontWeight: 600, color: "#1C2B3A", flexShrink: 0 };
const gfTrack = { position: "relative", flex: 1, height: 12, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const gfRowScore = { width: 34, textAlign: "right", fontSize: 14, fontWeight: 700, flexShrink: 0 };
const gfStudy = { padding: "0 16px 16px 58px" };
const gfVerseCallout = { background: PARCH, border: "1px solid #E7D6B4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6B5B3E", lineHeight: 1.5, margin: "4px 0 12px" };
const gfTwoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 };

/* ---------------- Fivefold Calling (ranked sum) ---------------- */
function RankedSum({ scored }) {
  const per = scored.max_per || 15;
  const ranked = scored.ranked;
  const topScore = ranked[0]?.score;
  const secondScore = ranked[1]?.score;
  const primaries = ranked.filter((r) => r.score === topScore);
  const secondaries = ranked.filter((r) => r.score === secondScore && r.score !== topScore);
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your calling</div>
        <div style={topGrid}>
          {[...primaries, ...secondaries].slice(0, 2).map((r, i) => {
            const m = FIVEFOLD[r.key] || {};
            const label = primaries.length > 1 ? "Co-primary" : i === 0 ? "Primary" : "Secondary";
            return (
              <div key={r.key} style={topCard}>
                <div style={topRank}>{label}</div>
                <div className="serif" style={topName}>{r.key}</div>
                <div style={scoreRow}>
                  <span style={topScore}>{r.score}</span>
                  <span style={{ fontSize: 14, color: "#8CA0B3" }}>/ {per}</span>
                </div>
                <p style={topDef}>{m.short}</p>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          No calling outranks another. All five are shown below with what each looks like in ministry,
          and where it can go wrong if left unchecked.
        </p>
      </section>
      <section style={{ padding: "24px 0 8px" }}>
        <div style={sectionLabel}>All five callings</div>
        <div style={chart}>
          {ranked.map((r, i) => {
            const color = i === 0 ? "#C4923E" : i === 1 ? "#2E7D8A" : "#8CA0B3";
            const m = FIVEFOLD[r.key] || {};
            return (
              <div key={r.key} style={{ borderBottom: "1px solid #F0F2F4", padding: "6px 4px" }}>
                <div style={barBtn}>
                  <span style={rRank}>{i + 1}</span>
                  <span style={rName}>{r.key}</span>
                  <span style={track}><span style={fill(r.score / per, color)} /></span>
                  <span style={{ ...rScore, color }}>{r.score}</span>
                  <span />
                </div>
                <div style={{ padding: "2px 16px 14px 52px" }}>
                  <p style={detailP}>{m.short}</p>
                  <Block h="Where it can go wrong" t={m.shadow} />
                  <Block h="Ministry application" t={m.application} />
                  <div style={refLine}>{m.ref}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ---------------- Rooted / Leadership Health (domain bands) ---------------- */
function DomainBandsReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains;
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  const bandFn = scored.slug === "rooted" ? rootedBand : domainBand;
  const meta = DOMAIN_META[scored.slug] || {};
  const copy = DOMAIN_REPORT_COPY[scored.slug] || {
    snapshot: "Your results, domain by domain",
    strong: "Your strengths",
    grow: "Where to grow",
    helper: "These are simply where the next season of growth is, not a verdict.",
  };
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>{copy.snapshot}</div>
        <div style={chart}>
          {domains.map((d) => {
            const band = bandFn(d.average);
            return (
              <div key={d.domain} style={rowGrid}>
                <span style={rName}>{d.domain}</span>
                <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                <span style={{ ...rScore, color: band.color, minWidth: 128, textAlign: "right" }}>
                  {d.average.toFixed(1)} · {band.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>{copy.strong}</div>
        <div style={topGrid}>
          {top2.map((d) => (
            <div key={d.domain} style={topCard}>
              <div className="serif" style={{ ...topName, fontSize: 20 }}>{d.domain}</div>
              <div style={{ ...scoreRow, marginTop: 4 }}>
                <span style={{ ...topScore, fontSize: 26 }}>{d.average.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#8CA0B3" }}>{bandFn(d.average).label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>{copy.grow}</div>
        {bottom2.map((d) => {
          const m = meta[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: bandFn(d.average).color }}>
                  {d.average.toFixed(1)} · {bandFn(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
              {m.ref && <div style={refLine}>{m.ref}</div>}
            </div>
          );
        })}
        <p style={helper}>{copy.helper}</p>
      </section>
    </>
  );
}

/* ---------------- Spiritual Growth (Discipleship Wheel) ---------------- */
function SpiritualGrowthReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains; // sorted by average desc
  const byName = Object.fromEntries(domains.map((d) => [d.domain, d]));
  const order = SPIRITUAL_GROWTH_ORDER.filter((n) => byName[n]);
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  const meta = SPIRITUAL_GROWTH_DOMAINS;

  // Discipleship Wheel geometry
  const R = 108, cx = 170, cy = 168, N = order.length || 6;
  const ang = (i) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i, val) => [cx + (val / per) * R * Math.cos(ang(i)), cy + (val / per) * R * Math.sin(ang(i))];
  const ringPoly = (v) => order.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoly = order.map((name, i) => pt(i, byName[name]?.average || 0).map((n) => n.toFixed(1)).join(",")).join(" ");
  const labelPos = (i) => pt(i, per * 1.34);

  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your Discipleship Wheel</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", justifyContent: "center" }}>
          <svg viewBox="0 0 340 336" width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Discipleship Wheel">
            {[1, 2, 3, 4, 5].map((v) => (
              <polygon key={v} points={ringPoly(v)} fill="none" stroke="#E7E9EC" strokeWidth="1" />
            ))}
            {order.map((_, i) => {
              const [x, y] = pt(i, per);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E7E9EC" strokeWidth="1" />;
            })}
            <polygon points={dataPoly} fill="rgba(46,125,138,.22)" stroke="#2E7D8A" strokeWidth="2" strokeLinejoin="round" />
            {order.map((name, i) => {
              const d = byName[name];
              const [px, py] = pt(i, d?.average || 0);
              return <circle key={name} cx={px} cy={py} r="4" fill="#1F5E68" />;
            })}
            {order.map((name, i) => {
              const [lx, ly] = labelPos(i);
              const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
              const d = byName[name];
              const total = d ? Math.round(d.average * (d.count || 10)) : 0;
              const maxTotal = (d?.count || 10) * per;
              return (
                <g key={name}>
                  <text x={lx} y={ly - 4} textAnchor={anchor} fontSize="10.5" fontWeight="700" fill="#1C2B3A"
                    style={{ fontFamily: "Inter,system-ui,sans-serif" }}>
                    {shortDisc(name)}
                  </text>
                  <text x={lx} y={ly + 9} textAnchor={anchor} fontSize="10" fill="#2E7D8A"
                    style={{ fontFamily: "Inter,system-ui,sans-serif" }}>
                    {total}/{maxTotal}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p style={helper}>
          The more a discipline is shaded toward the edge, the stronger it is in this season. The shape of
          your wheel shows the whole picture at once, where your walk with God rolls smoothly, and where
          it's still filling in.
        </p>
      </section>

      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>Every discipline</div>
        <div style={chart}>
          {domains.map((d) => {
            const band = domainBand(d.average);
            const total = Math.round(d.average * (d.count || 10));
            return (
              <div key={d.domain} style={rowGrid}>
                <span style={rName}>{d.domain}</span>
                <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                <span style={{ ...rScore, color: band.color, minWidth: 150, textAlign: "right" }}>
                  {total}/{(d.count || 10) * per} · {band.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Where you're strongest</div>
        <div style={topGrid}>
          {top2.map((d) => (
            <div key={d.domain} style={topCard}>
              <div className="serif" style={{ ...topName, fontSize: 20 }}>{d.domain}</div>
              <div style={{ ...scoreRow, marginTop: 4 }}>
                <span style={{ ...topScore, fontSize: 26 }}>{Math.round(d.average * (d.count || 10))}</span>
                <span style={{ fontSize: 13, color: "#8CA0B3" }}>/ {(d.count || 10) * per} · {domainBand(d.average).label}</span>
              </div>
              <p style={topDef}>{meta[d.domain]?.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>Where to grow next</div>
        {bottom2.map((d) => {
          const m = meta[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(d.average).color }}>
                  {Math.round(d.average * (d.count || 10))}/{(d.count || 10) * per} · {domainBand(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
              {m.ref && <div style={refLine}>{m.ref}</div>}
            </div>
          );
        })}
        <p style={helper}>
          This is a mirror for one moment, not a grade on your walk with God. Pick one discipline to focus
          on this season. Growth comes from tending one root at a time, not all at once.
        </p>
      </section>
    </>
  );
}
function shortDisc(name) {
  return { "Fellowship with Believers": "Fellowship", "Witness to the World": "Witness", "Minister to Others": "Ministry", "Abide in Christ": "Abide", "Live in the Word": "The Word", "Pray in Faith": "Prayer" }[name] || name;
}

/* ---------------- Big Five (Five Factor Model) ---------------- */
const B5_BAND_LABEL = { high: "High", moderate: "Moderate", low: "Low" };
const B5_BAND_COLOR = { high: "#2E7D8A", moderate: "#C4923E", low: "#8CA0B3" };
const B5_SHORT = { O: "Openness", C: "Conscien.", E: "Extravert", A: "Agreeable", ES: "Stability" };

function BigFiveReport({ scored }) {
  const traits = scored.traits || [];
  const facets = scored.facets || [];
  const byKey = Object.fromEntries(traits.map((t) => [t.key, t]));
  const order = BIG5_TRAIT_ORDER.filter((k) => byKey[k]); // O, C, E, A, ES

  // Radar geometry (0-100).
  const per = 100, R = 108, cx = 170, cy = 168, N = order.length || 5;
  const ang = (i) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i, val) => [cx + (val / per) * R * Math.cos(ang(i)), cy + (val / per) * R * Math.sin(ang(i))];
  const ringPoly = (v) => order.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoly = order.map((k, i) => pt(i, byKey[k].pct).map((n) => n.toFixed(1)).join(",")).join(" ");
  const labelPos = (i) => pt(i, per * 1.32);

  const sigStrengths = facets.filter((f) => f.pct >= 70);
  const lowPref = facets.filter((f) => f.pct <= 39);
  const highest = [...traits].sort((a, b) => b.pct - a.pct)[0];

  return (
    <>
      {/* Trait profile radar */}
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your trait profile</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", justifyContent: "center" }}>
          <svg viewBox="-44 0 428 336" width="100%" style={{ maxWidth: 480 }} role="img" aria-label="Big Five trait profile">
            {[20, 40, 60, 80, 100].map((v) => (
              <polygon key={v} points={ringPoly(v)} fill="none" stroke="#E7E9EC" strokeWidth="1" />
            ))}
            {order.map((_, i) => { const [x, y] = pt(i, per); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E7E9EC" strokeWidth="1" />; })}
            <polygon points={dataPoly} fill="rgba(31,94,104,.16)" stroke="#1F5E68" strokeWidth="2.4" strokeLinejoin="round" />
            {order.map((k, i) => { const [px, py] = pt(i, byKey[k].pct); return <circle key={k} cx={px} cy={py} r="4.2" fill={BIG5_TRAIT_META[k].color} />; })}
            {order.map((k, i) => {
              const [lx, ly] = labelPos(i);
              const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
              return (
                <g key={k}>
                  <text x={lx} y={ly - 3} textAnchor={anchor} fontSize="10.5" fontWeight="700" fill="#1C2B3A" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{B5_SHORT[k]}</text>
                  <text x={lx} y={ly + 11} textAnchor={anchor} fontSize="11" fontWeight="700" fill={BIG5_TRAIT_META[k].color} style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{byKey[k].pct}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <p style={helper}>
          Every trait is scored 0 to 100 against the trait itself, never against other people. There are no good
          or bad scores; each position carries its own strengths and watch-outs. This shape is your whole
          personality at a glance.
        </p>
      </section>

      {/* Banded bars */}
      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>Your five traits</div>
        <div style={chart}>
          {order.map((k) => {
            const t = byKey[k], meta = BIG5_TRAIT_META[k];
            return (
              <div key={k} style={{ padding: "14px 14px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2B3A" }}>{meta.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: B5_BAND_COLOR[t.band] }}>{t.pct} · {B5_BAND_LABEL[t.band]}</span>
                </div>
                <div style={b5TrackWrap}>
                  <div style={{ ...b5Zone, left: "40%", width: "30%", background: "#E9EDF0" }} />
                  <div style={{ ...b5Zone, left: "70%", width: "30%", background: "#E1E7EB" }} />
                  <div style={{ ...b5FillBar, width: `${t.pct}%`, background: meta.color }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9AA7B3", marginTop: 5 }}>
                  <span>{meta.lowWord}</span><span>{meta.highWord}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={helper}>Shaded zones mark Low (0–39), Moderate (40–69), and High (70–100). Your bar shows exactly where you land.</p>
      </section>

      {/* Per-trait depth */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Your traits in depth</div>
        {order.map((k) => {
          const t = byKey[k], meta = BIG5_TRAIT_META[k];
          const reportBand = k === "ES" ? t.n_band : t.band;
          const rd = (k === "ES" ? BIG5_TRAITS.N : BIG5_TRAITS[k])[reportBand];
          const bc = B5_BAND_COLOR[t.band];
          const near = big5Boundary(t.pct);
          return (
            <div key={k} style={b5Card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div className="serif" style={{ fontSize: 22, color: "#1C2B3A" }}>{meta.name}</div>
                  <div style={{ fontSize: 13, color: "#8CA0B3", marginTop: 2 }}>{meta.tag}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: bc, lineHeight: 1 }}>{t.pct}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: bc, textTransform: "uppercase", letterSpacing: ".06em" }}>{B5_BAND_LABEL[t.band]}</div>
                </div>
              </div>
              {k === "ES" && <p style={{ ...detailP, fontStyle: "italic", color: "#5A6A78", margin: "12px 0 0" }}>{meta.note}</p>}
              <p style={{ ...detailP, marginTop: 14 }}>{rd.snapshot}</p>
              <div style={b5TwoCol}>
                <div>
                  <div style={blockH}>Strengths</div>
                  <ul style={b5List}>{rd.strengths.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul>
                </div>
                <div>
                  <div style={blockH}>Watch-outs</div>
                  <ul style={b5List}>{rd.watchouts.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul>
                </div>
              </div>
              <Block h="Ministry & leadership application" t={rd.application} />
              <div style={{ marginBottom: 12 }}>
                <div style={blockH}>Growth steps</div>
                <ol style={b5Ol}>{rd.growth.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ol>
              </div>
              <div style={devotionBox}>
                <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, marginBottom: 5 }}>Anchor Scripture</div>
                <p style={{ fontSize: 14.5, color: "#4A3F2A", margin: 0, lineHeight: 1.55, fontStyle: "italic" }}>&ldquo;{rd.scripture.text}&rdquo;</p>
                <div style={{ fontSize: 12.5, color: "#8A6D3B", marginTop: 6, fontWeight: 600 }}>{rd.scripture.ref}</div>
              </div>
              {near && <div style={transitionBox}>Your score sits near the line between two bands. Read both this report and the neighboring band; elements of each will likely apply to you.</div>}
            </div>
          );
        })}
      </section>

      {/* Facets */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Six expanded facets</div>
        <div style={chart}>
          {facets.map((f) => {
            const meta = BIG5_FACETS[f.key];
            return (
              <div key={f.key} style={rowGrid}>
                <span style={rName}>{meta.name}</span>
                <span style={track}><span style={fill(f.pct / 100, meta.color)} /></span>
                <span style={{ ...rScore, color: B5_BAND_COLOR[f.band], minWidth: 120, textAlign: "right" }}>{f.pct} · {B5_BAND_LABEL[f.band]}</span>
              </div>
            );
          })}
        </div>
        <p style={helper}>Facets add practical color to the core traits. Anything at 70+ is a signature strength; 39 or below is a low-preference area.</p>
      </section>

      {(sigStrengths.length > 0 || lowPref.length > 0) && (
        <section style={{ padding: "16px 0 4px" }}>
          {sigStrengths.length > 0 && (
            <>
              <div style={sectionLabel}>Signature strengths</div>
              {sigStrengths.map((f) => (
                <div key={f.key} style={growCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{BIG5_FACETS[f.key].name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D8A" }}>{f.pct} · High</div>
                  </div>
                  <p style={{ ...detailP, margin: "8px 0 0" }}>{BIG5_FACETS[f.key].high}</p>
                </div>
              ))}
            </>
          )}
          {lowPref.length > 0 && (
            <>
              <div style={{ ...sectionLabel, marginTop: 18 }}>Low-preference areas</div>
              {lowPref.map((f) => (
                <div key={f.key} style={growCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{BIG5_FACETS[f.key].name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#8CA0B3" }}>{f.pct} · Low</div>
                  </div>
                  <p style={{ ...detailP, margin: "8px 0 0" }}>{BIG5_FACETS[f.key].low}</p>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <section style={{ padding: "16px 0 8px" }}>
        <p style={helper}>
          How to read this: every score compares you to the trait, not to other people, so a &ldquo;low&rdquo; is
          never a failing grade. Traits describe how you naturally operate; they don&rsquo;t limit what God can do
          through you. Use this as a mirror for growth and a starting point for honest conversation, never as a verdict.
        </p>
      </section>
    </>
  );
}
const b5TrackWrap = { position: "relative", height: 16, borderRadius: 999, overflow: "hidden", background: "#EEF1F4" };
const b5Zone = { position: "absolute", top: 0, bottom: 0 };
const b5FillBar = { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999 };
const b5Card = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 20px", marginBottom: 16 };
const b5TwoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18, margin: "8px 0 14px" };
const b5List = { margin: 0, paddingLeft: 18 };
const b5Ol = { margin: 0, paddingLeft: 20 };
const b5Li = { fontSize: 13.5, color: "#4A5B6D", lineHeight: 1.5, marginBottom: 5 };

/* ---------------- Kingdom Design Profile (MBTI) ---------------- */
const KDP_CLAR_LABEL = { "very-clear": "Very Clear", clear: "Clear", moderate: "Moderate", slight: "Slight" };
const KDP_CLAR_COLOR = { "very-clear": "#1F5E68", clear: "#2E7D8A", moderate: "#C4923E", slight: "#8CA0B3" };

function KingdomReport({ scored }) {
  const code = scored.code;
  const t = KDP_TYPES[code];
  const temp = KDP_TEMPERAMENTS[scored.temperament] || {};
  const emblem = KDP_EMBLEMS[scored.temperament];
  const byKey = Object.fromEntries((scored.scales || []).map((s) => [s.key, s]));
  if (!t) return null;
  return (
    <>
      {/* Type hero */}
      <section style={{ padding: "8px 0 4px" }}>
        <div style={{ background: "linear-gradient(135deg,#1B3A57,#0E2036)", borderRadius: 20, padding: "28px 26px", color: "#fff" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 7 }}>
              {code.split("").map((l, i) => (
                <span key={i} style={kdpLetter}>{l}</span>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700 }}>Your Kingdom Design</div>
              <div className="serif" style={{ fontSize: 30, margin: "4px 0 3px", color: "#fff" }}>{t.name}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.82)" }}>Biblical mirror: {t.mirror} &middot; {temp.name}</div>
            </div>
            {emblem && <img src={emblem} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 78, height: 78, borderRadius: 15, objectFit: "cover", border: "1px solid rgba(255,255,255,.15)" }} />}
          </div>
        </div>
      </section>

      {/* Four preferences — spectrum bars */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Your four preferences</div>
        <div style={chart}>
          {KDP_PAIRS.map((p) => {
            const sc = byKey[p.key] || { a: 0, b: 0, total: 15, letter: p.a, clarity: "slight" };
            const total = sc.total || 15;
            const markerLeft = Math.round((sc.b / total) * 100);
            const col = KDP_CLAR_COLOR[sc.clarity] || "#2E7D8A";
            return (
              <div key={p.key} style={{ padding: "16px 14px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C2B3A" }}>{p.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: col }}>{sc.letter === p.a ? p.a_name : p.b_name} &middot; {KDP_CLAR_LABEL[sc.clarity]}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12 }}>
                  <span style={{ ...kdpPole, ...(sc.letter === p.a ? kdpPoleOn : {}) }}>{p.a}</span>
                  <div style={{ position: "relative", height: 12, background: "#EEF1F4", borderRadius: 999 }}>
                    <div style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 1, background: "#D3DAE1" }} />
                    <div style={{ position: "absolute", top: -3, height: 18, width: 18, borderRadius: "50%", background: col, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.22)", left: `calc(${markerLeft}% - 9px)` }} />
                  </div>
                  <span style={{ ...kdpPole, ...(sc.letter === p.b ? kdpPoleOn : {}) }}>{p.b}</span>
                </div>
                <div style={{ textAlign: "center", fontSize: 12, color: "#8CA0B3", marginTop: 7 }}>{sc.a} chose {p.a_name.toLowerCase()} &middot; {sc.b} chose {p.b_name.toLowerCase()}</div>
              </div>
            );
          })}
        </div>
        <p style={helper}>Every preference is one end of a spectrum you both use. The marker shows your natural lean, and clarity tells you how strong that lean is, never how good or spiritual it is. A Slight lean means you use both sides almost equally, so read both and keep what fits.</p>
      </section>

      {/* Preference pair meaning */}
      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>What each preference means</div>
        <div style={b5TwoCol}>
          {KDP_PAIRS.map((p) => {
            const sc = byKey[p.key] || {};
            const isA = sc.letter === p.a;
            return (
              <div key={p.key} style={{ ...b5Card, marginBottom: 0 }}>
                <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>{p.label}</div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <div style={{ ...kdpPoleRow, ...(isA ? kdpPoleRowOn : {}) }}>
                    <b>{p.a_name} ({p.a})</b><span>{p.a_desc}</span>
                  </div>
                  <div style={{ ...kdpPoleRow, ...(!isA ? kdpPoleRowOn : {}) }}>
                    <b>{p.b_name} ({p.b})</b><span>{p.b_desc}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Temperament */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Your temperament</div>
        <div style={{ ...b5Card, display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          {emblem && <img src={emblem} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 92, height: 92, borderRadius: 16, objectFit: "cover", flex: "0 0 auto" }} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="serif" style={{ fontSize: 22, color: "#1C2B3A" }}>{temp.name} <span style={{ fontSize: 15, color: "#8CA0B3" }}>({scored.temperament})</span></div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "10px 0 4px" }}>
              <div><div style={blockH}>Core drive</div><div style={kdpFact}>{temp.drive}</div></div>
              <div><div style={blockH}>Kingdom gift</div><div style={kdpFact}>{temp.contribution}</div></div>
              <div><div style={blockH}>Key risk</div><div style={kdpFact}>{temp.risk}</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* 16-type grid */}
      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>The sixteen designs</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {KDP_ORDER.map((c) => {
            const on = c === code;
            return (
              <div key={c} style={{ textAlign: "center", padding: "11px 6px", borderRadius: 10, border: `1px solid ${on ? "#C4923E" : "#E7E9EC"}`, background: on ? "#FBF6EC" : "#fff" }}>
                <div className="serif" style={{ fontWeight: 700, fontSize: 15, color: on ? "#8A6420" : "#1C2B3A" }}>{c}</div>
                <div style={{ fontSize: 10.5, color: "#8CA0B3", marginTop: 2, lineHeight: 1.2 }}>{(KDP_NAMES[c] || "").replace(/^The /, "")}</div>
              </div>
            );
          })}
        </div>
        <p style={helper}>Each row is a temperament family. Yours is highlighted. Reading the profiles of your spouse, children, and teammates will do as much for those relationships as reading your own.</p>
      </section>

      {/* Full profile */}
      <section style={{ padding: "22px 0 4px" }}>
        <div style={sectionLabel}>Your Kingdom Design Profile</div>
        <div style={b5Card}>
          <p style={{ ...detailP, fontSize: 15.5, marginTop: 0 }}>{t.snapshot}</p>
          <div style={{ marginBottom: 4 }}>
            <div style={blockH}>How God wired you</div>
            <ul style={b5List}>{t.wired.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul>
          </div>
        </div>

        <div style={{ ...b5Card, borderLeft: "5px solid #C4923E" }}>
          <div style={blockH}>Your biblical mirror: {t.mirror}</div>
          <p style={{ ...detailP, marginTop: 6 }}>{t.mirror_story}</p>
          {t.also && <div style={refLine}>Also see: {t.also}</div>}
        </div>

        <div style={b5Card}>
          <Block h="Your place in the Kingdom of God" t={t.kingdom} />
          <div style={blockH}>In your church</div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ ...detailP, margin: "4px 0 8px" }}><b>Serve best in:</b> {t.church.roles}</p>
            <p style={{ ...detailP, margin: "0 0 8px" }}><b>How you lead:</b> {t.church.lead}</p>
            <p style={{ ...detailP, margin: "0 0 8px" }}><b>Your team needs from you:</b> {t.church.team_needs}</p>
            <p style={{ ...detailP, margin: 0 }}><b>You need from your team:</b> {t.church.you_need}</p>
          </div>
          <div style={b5TwoCol}>
            <div><div style={blockH}>In your family</div><ul style={b5List}>{t.family.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul></div>
            <div><div style={blockH}>In relationships</div><ul style={b5List}>{t.relationships.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul></div>
          </div>
        </div>

        <div style={{ ...b5Card, background: "#FBFAF7" }}>
          <div style={blockH}>Watch-out areas</div>
          <ul style={b5List}>{t.watchouts.map((s, i) => <li key={i} style={b5Li}>{s}</li>)}</ul>
          {t.sanctification && <div style={{ ...transitionBox, marginTop: 12 }}><b>Sanctification focus:</b> {t.sanctification}</div>}
          <div style={{ marginTop: 14 }}><Block h="Under stress" t={t.stress} /></div>
        </div>

        <div style={b5Card}>
          <div style={b5TwoCol}>
            <div><div style={blockH}>Disciplines that come naturally</div><p style={{ ...detailP, margin: "4px 0 0" }}>{t.disc_natural}</p></div>
            <div><div style={blockH}>Disciplines that stretch you</div><p style={{ ...detailP, margin: "4px 0 0" }}>{t.disc_stretch}</p></div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={blockH}>Verses to live by</div>
            <ul style={b5List}>{t.verses.map((s, i) => <li key={i} style={{ ...b5Li, fontStyle: "italic" }}>{s}</li>)}</ul>
          </div>
        </div>

        <div style={devotionBox}>
          <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, marginBottom: 6 }}>A prayer for the {t.name.replace(/^The /, "")}</div>
          <p style={{ fontSize: 14.5, color: "#4A3F2A", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>{t.prayer}</p>
        </div>

        <div style={{ ...b5Card, marginTop: 16 }}>
          <div style={blockH}>Your next 30 days</div>
          <div style={{ display: "grid", gap: 9, marginTop: 6 }}>
            {t.next30.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ flex: "0 0 auto", width: 18, height: 18, borderRadius: 5, border: "1.5px solid #C4923E", marginTop: 1 }} />
                <span style={{ fontSize: 14, color: "#4A5B6D", lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={helper}>Your type explains you; it never excuses you. Every design is called to Christlikeness, which always includes growth in your weaker areas. Read this as a mirror for discipleship, a common language for your family and team, and a starting point, never a box or a verdict.</p>
      </section>
    </>
  );
}
const kdpLetter = { fontFamily: "'Fraunces',Georgia,serif", fontSize: 40, fontWeight: 600, background: "rgba(255,255,255,.08)", border: "1px solid rgba(228,206,140,.35)", borderRadius: 12, width: 54, height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: "#E4CE8C" };
const kdpPole = { fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: "#B4BEC9", width: 26, textAlign: "center" };
const kdpPoleOn = { color: "#1B3A57" };
const kdpPoleRow = { display: "grid", gap: 3, padding: "10px 12px", borderRadius: 10, background: "#F6F8FA", fontSize: 13, color: "#4A5B6D", lineHeight: 1.45 };
const kdpPoleRowOn = { background: "#EAF3F4", border: "1px solid #CFE3E5", color: "#1C2B3A" };
const kdpFact = { fontSize: 15, fontWeight: 600, color: "#1C2B3A" };

/* ---------------- Enneagram (forced-choice type pick) ---------------- */
function EnneagramReport({ scored }) {
  const [open, setOpen] = useState(scored.primary);
  const ranked = scored.ranked; // [{type, score}] sorted desc
  const total = scored.total || 36;
  const per = 8; // each type appears in 8 pairs
  const top3 = ranked.slice(0, 3);
  const primaryType = ENNEAGRAM_TYPES[scored.primary] || {};
  const close = ranked[1] && ranked[0] && ranked[0].score - ranked[1].score <= 1;
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your core type</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div style={topRank}>Type {scored.primary} · {primaryType.tagline}</div>
          <div className="serif" style={{ fontSize: 28, color: "#1C2B3A", marginTop: 4 }}>
            {primaryType.name}
          </div>
          <p style={{ ...topDef, fontSize: 15, marginTop: 10 }}>{primaryType.essence}</p>
        </div>
        {close && (
          <div style={transitionBox}>
            Your top scores are close, so read your top two or three profiles below. The Enneagram is a tool
            for reflection, not a box. The type that rings truest as you read is usually yours.
          </div>
        )}
      </section>

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Your top three</div>
        <div style={topGrid}>
          {top3.map((r, i) => {
            const t = ENNEAGRAM_TYPES[r.type] || {};
            return (
              <div key={r.type} style={topCard}>
                <div style={topRank}>{i === 0 ? "Core" : ordinal(i + 1)}</div>
                <div className="serif" style={{ ...topName, fontSize: 20 }}>{r.type} · {t.name}</div>
                <div style={{ ...scoreRow, marginTop: 4 }}>
                  <span style={{ ...topScore, fontSize: 26 }}>{r.score}</span>
                  <span style={{ fontSize: 13, color: "#8CA0B3" }}>/ {per}</span>
                </div>
                <p style={topDef}>{t.tagline}</p>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          A type is a starting point for growth, not a label to live inside. Every type reflects part of
          God's image and every type has a way it gets pulled off center. Tap any type below to read its
          profile, Scripture, and a short devotion.
        </p>
      </section>

      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>All nine types</div>
        <div style={chart}>
          {ranked.map((r) => {
            const t = ENNEAGRAM_TYPES[r.type] || {};
            const isTop = r.type === scored.primary;
            const color = isTop ? "#C4923E" : r.score >= (ranked[2]?.score || 0) ? "#2E7D8A" : "#8CA0B3";
            const isOpen = open === r.type;
            return (
              <div key={r.type} style={{ borderBottom: "1px solid #F0F2F4" }}>
                <button onClick={() => setOpen(isOpen ? null : r.type)} style={barBtn} className="bar">
                  <span style={rRank}>{r.type}</span>
                  <span style={rName}>{t.name}</span>
                  <span style={track}><span style={fill(r.score / per, color)} /></span>
                  <span style={{ ...rScore, color }}>{r.score}</span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                {isOpen && (
                  <div style={detail}>
                    <p style={detailP}>{t.essence}</p>
                    <Block h="Your gift to the body" t={t.gift} />
                    <Block h="Watch for" t={t.watch} />
                    <Block h="Where you grow" t={t.grows} />
                    <div style={devotionBox}>
                      <div style={{ ...blockH, color: "#B07C2E", marginBottom: 6 }}>A devotion · {t.verse}</div>
                      <p style={{ fontSize: 14, color: "#3A4A5A", lineHeight: 1.65, margin: 0 }}>{t.devotion}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={helper}>
          Based on {total} choices. The Enneagram is a mirror to help you see yourself and grow toward
          Christ, never the final word on who you are. In Him your truest identity is settled: loved,
          chosen, and being made new.
        </p>
      </section>
    </>
  );
}

/* ---------------- The Forgiveness Profile (EFMI subscale-sum) ---------------- */
function ForgivenessReport({ scored }) {
  const [open, setOpen] = useState(null);
  const per = scored.max_per || 18;
  const subs = scored.subscales || [];
  const top3 = subs.slice(0, 3);
  const bottom2 = [...subs].slice(-2).reverse();
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your motivation to forgive</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div style={scoreRow}>
            <span style={{ ...topScore, fontSize: 40 }}>{scored.total}</span>
            <span style={{ fontSize: 15, color: "#8CA0B3" }}>/ {scored.max_total || 180}</span>
          </div>
          <div className="serif" style={{ fontSize: 22, color: "#1C2B3A", marginTop: 2 }}>{scored.total_label}</div>
          <p style={{ ...topDef, fontSize: 14.5, marginTop: 10 }}>
            Forgiveness is rarely a single decision, it grows from many motivations at once. This is a picture
            of what draws your heart toward forgiveness right now, not a grade on whether you&rsquo;ve arrived.
          </p>
        </div>
      </section>

      {scored.reflection?.understanding && (() => {
        const u = scored.reflection.understanding;
        const col = u.verdict === "accurate" ? "#2E7D8A" : u.verdict === "near" ? "#C4923E" : "#8A6D3B";
        return (
          <section style={{ padding: "10px 0 4px" }}>
            <div style={sectionLabel}>Understanding of forgiveness</div>
            <div style={{ ...topCard, borderLeft: `5px solid ${col}` }}>
              <div className="serif" style={{ fontSize: 20, color: "#1C2B3A" }}>{u.label}</div>
              <p style={{ ...topDef, fontSize: 14.5, marginTop: 8 }}>{u.body}</p>
              <div style={{ marginTop: 12, fontSize: 13, color: "#5A6B7D", background: "#F7F9FA", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ fontWeight: 700, color: "#1B3A57" }}>The definition you chose: </span>&ldquo;{u.chosen}&rdquo;
                <div style={{ marginTop: 6, color: "#7C8A9C" }}>{u.why}</div>
              </div>
            </div>
          </section>
        );
      })()}

      {scored.reflection && (() => {
        const r = scored.reflection;
        const hurt = (EFMI_HURT_OPTIONS.find(([v]) => v === r.hurt_level) || [])[1];
        const degree = (EFMI_DEGREE_OPTIONS.find(([v]) => v === r.degree) || [])[1];
        const who = r.who === "Other" ? (r.who_other || "someone") : r.who;
        const bits = [];
        if (who) bits.push(`someone in the role of ${String(who).toLowerCase()}`);
        if (r.time_amount && r.time_unit) bits.push(`about ${r.time_amount} ${r.time_unit} ago`);
        return (
          <section style={{ padding: "10px 0 4px" }} className="no-pdf">
            <div style={sectionLabel}>What you brought to mind</div>
            <div style={{ ...chart, padding: "16px 20px" }}>
              <p style={{ fontSize: 13.5, color: "#4A5B6D", lineHeight: 1.6, margin: 0 }}>
                You reflected on a real hurt{bits.length ? ` — ${bits.join(", ")}` : ""}
                {hurt ? `, one you rated as "${hurt.toLowerCase()}."` : "."}
                {r.have_forgiven === "yes" ? " You said you have forgiven this person" : r.have_forgiven === "no" ? " You said you have not yet forgiven this person" : ""}
                {degree ? `, and place yourself at "${degree.toLowerCase()}" on the way there.` : "."}
              </p>
              <p style={{ fontSize: 12, color: "#8CA0B3", margin: "10px 0 0" }}>
                This reflection is private to you. It is here to anchor the motivations below in a real situation, not to be shared.
              </p>
            </div>
          </section>
        );
      })()}

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>What moves you most</div>
        {top3.map((s) => {
          const m = EFMI_SUBSCALES[s.key] || {};
          const band = efmiBand(s.score);
          return (
            <div key={s.key} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{s.key}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: band.color }}>{s.score}/{per} · {band.label}</div>
              </div>
              <p style={{ ...detailP, margin: "8px 0 0" }}>{m.body}</p>
              {m.verse && <div style={refLine}>{m.verse}</div>}
            </div>
          );
        })}
      </section>

      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>All ten motivations</div>
        <div style={chart}>
          {subs.map((s, i) => {
            const band = efmiBand(s.score);
            const isOpen = open === s.key;
            const m = EFMI_SUBSCALES[s.key] || {};
            return (
              <div key={s.key} style={{ borderBottom: "1px solid #F0F2F4" }}>
                <button onClick={() => setOpen(isOpen ? null : s.key)} style={barBtn} className="bar">
                  <span style={rRank}>{i + 1}</span>
                  <span style={rName}>{s.key}</span>
                  <span style={track}><span style={fill(s.score / per, band.color)} /></span>
                  <span style={{ ...rScore, color: band.color }}>{s.score}</span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                {isOpen && (
                  <div style={detail}>
                    <p style={detailP}>{m.short}</p>
                    <p style={{ ...detailP, margin: 0 }}>{m.body}</p>
                    {m.verse && <div style={refLine}>{m.verse}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Where forgiveness is quieter</div>
        {bottom2.map((s) => {
          const m = EFMI_SUBSCALES[s.key] || {};
          return (
            <div key={s.key} style={growCard}>
              <div className="serif" style={{ fontSize: 18, color: "#1C2B3A" }}>{s.key}</div>
              <p style={{ ...detailP, margin: "6px 0 0" }}>{m.short}</p>
            </div>
          );
        })}
        <p style={helper}>
          A quieter motivation isn&rsquo;t a failure. Some reasons to forgive simply carry more weight for you
          in this season. Forgiveness is a journey, and it&rsquo;s okay to still be on the road.
        </p>
      </section>

      <section style={{ padding: "10px 0 4px" }}>
        <div style={{ ...chart, padding: "18px 20px" }}>
          <div style={{ ...blockH, marginBottom: 8 }}>About this profile</div>
          <p style={{ fontSize: 13, color: "#4A5B6D", lineHeight: 1.55, margin: "0 0 12px" }}>{EFMI_CREDIT}</p>
          <div style={{ ...blockH, marginBottom: 8 }}>Research foundation</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {EFMI_REFERENCES.map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: "#7C8A9C", lineHeight: 1.5, marginBottom: 6 }}>{r}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/* ---------------- Church Planter (candidate self-assessment) ---------------- */
function PlanterReport({ scored }) {
  const per = scored.scale_max || 5;
  const tier = PLANTER_TIERS[scored.tier] || PLANTER_TIERS.develop;
  const domains = scored.domains; // sorted by average desc
  const byName = Object.fromEntries(domains.map((d) => [d.domain, d]));
  const order = Object.keys(PLANTER_CHARACTERISTICS).filter((n) => byName[n]);
  const top3 = domains.slice(0, 3);
  const weakPrimaries = domains.filter((d) => d.primary && d.average < 3.5);
  const watch = (weakPrimaries.length ? weakPrimaries : [...domains].slice(-3).reverse()).slice(0, 3);

  // Radar geometry (13 spokes)
  const R = 108, cx = 175, cy = 172, N = order.length || 13;
  const ang = (i) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i, v) => [cx + (v / per) * R * Math.cos(ang(i)), cy + (v / per) * R * Math.sin(ang(i))];
  const ringPoly = (v) => order.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoly = order.map((n, i) => pt(i, byName[n]?.average || 0).map((x) => x.toFixed(1)).join(",")).join(" ");

  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your readiness</div>
        <div style={{ ...topCard, borderLeft: `5px solid ${tier.color}` }}>
          <div style={{ ...topRank, color: tier.color }}>Readiness · developmental, never a verdict</div>
          <div className="serif" style={{ fontSize: 28, color: "#1C2B3A", marginTop: 4 }}>{tier.label}</div>
          <p style={{ ...topDef, fontSize: 15, marginTop: 10 }}>{tier.body}</p>
          <div style={{ marginTop: 12, fontSize: 13.5, color: "#4A5B6D" }}>
            Weighted readiness score: <strong style={{ color: "#1B3A57" }}>{scored.composite?.toFixed(1)}</strong> / {per}
            <span style={{ color: "#8CA0B3" }}> · the five primary characteristics count double.</span>
          </div>
        </div>
      </section>

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>All 13 characteristics</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", justifyContent: "center" }}>
          <svg viewBox="0 0 350 344" width="100%" style={{ maxWidth: 460 }} role="img" aria-label="Readiness radar">
            {[1, 2, 3, 4, 5].map((v) => <polygon key={v} points={ringPoly(v)} fill="none" stroke="#E7E9EC" strokeWidth="1" />)}
            {order.map((_, i) => { const [x, y] = pt(i, per); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E7E9EC" strokeWidth="1" />; })}
            <polygon points={dataPoly} fill="rgba(46,125,138,.20)" stroke="#2E7D8A" strokeWidth="2" strokeLinejoin="round" />
            {order.map((n, i) => {
              const [px, py] = pt(i, byName[n]?.average || 0);
              const isP = PLANTER_PRIMARY.includes(n);
              return <circle key={n} cx={px} cy={py} r={isP ? 4.5 : 3.2} fill={isP ? "#C4923E" : "#1F5E68"} />;
            })}
          </svg>
        </div>
        <div style={chart}>
          {domains.map((d) => {
            const band = domainBand(d.average);
            return (
              <div key={d.domain} style={rowGrid}>
                <span style={rName}>
                  {d.domain}
                  {d.primary && <span style={primaryTag}>Primary</span>}
                </span>
                <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                <span style={{ ...rScore, color: band.color, minWidth: 128, textAlign: "right" }}>
                  {d.average.toFixed(1)} · {band.label}
                </span>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          The five gold points are the primary characteristics that carry the readiness decision. A strong
          plant leans hardest on those.
        </p>
      </section>

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Where you'll excel</div>
        {top3.map((d) => {
          const m = PLANTER_CHARACTERISTICS[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(d.average).color }}>
                  {d.average.toFixed(1)} · {domainBand(d.average).label}
                </div>
              </div>
              <p style={{ ...detailP, margin: "8px 0 0" }}>{m.blurb}</p>
              <Block h="Lean into it" t={m.leanIn} />
            </div>
          );
        })}
      </section>

      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>What to watch for</div>
        {watch.map((d) => {
          const m = PLANTER_CHARACTERISTICS[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>
                  {d.domain}{d.primary && <span style={primaryTag}>Primary</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(d.average).color }}>
                  {d.average.toFixed(1)} · {domainBand(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
            </div>
          );
        })}
        <p style={helper}>These are areas to steward and grow, not marks against you. Growth here is exactly what the assessor conversation is for.</p>
      </section>

      <section style={{ padding: "16px 0 4px" }}>
        <div style={sectionLabel}>Things to think and pray on</div>
        <div style={chart}>
          {PLANTER_PRAY.map((q, i) => (
            <div key={i} style={{ padding: "13px 14px", borderBottom: i < PLANTER_PRAY.length - 1 ? "1px solid #F0F2F4" : "none", fontSize: 14.5, color: "#2B3A4A", lineHeight: 1.5 }}>
              {q}
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "16px 0 8px" }}>
        <div style={sectionLabel}>Scripture anchors</div>
        <div style={chart}>
          {PLANTER_SCRIPTURES.map(([ref, note]) => (
            <div key={ref} style={rowGrid}>
              <span style={{ ...rName, fontStyle: "italic" }}>{ref}</span>
              <span style={{ gridColumn: "span 2", fontSize: 13.5, color: "#4A5B6D" }}>{note}</span>
            </div>
          ))}
        </div>
        {scored.married ? (
          <p style={helper}>
            Your report includes the primary characteristics for a married planter. The spouse and assessor
            portions add the fullest picture. When your spouse completes their part, the marriage-alignment
            section will be added here.
          </p>
        ) : (
          <p style={helper}>
            This report reflects your self-assessment. A trained assessor conversation adds the outside
            perspective that makes this picture complete.
          </p>
        )}
      </section>
    </>
  );
}

/* ---------------- Church Growth (level matrix) ---------------- */
function GrowthReport({ scored }) {
  const winner = GROWTH_LEVELS[scored.winnerLevel];
  const per = scored.levels[0]?.max || 30;
  const t = scored.transition;
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your church's level</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div className="serif" style={{ fontSize: 28, color: "#1C2B3A" }}>{winner.name}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1B3A57", margin: "6px 0 12px", letterSpacing: ".02em" }}>
            {winner.message}
          </div>
          <p style={{ ...topDef, fontSize: 15 }}>{winner.desc}</p>
        </div>
        {t && (
          <div style={transitionBox}>
            Your church may be in transition between {GROWTH_LEVELS[t.a].name} and{" "}
            {GROWTH_LEVELS[t.b].name}. That's worth discussing with your leadership team, not a sign
            something's wrong.
          </div>
        )}
      </section>
      <section style={{ padding: "20px 0" }}>
        <div style={sectionLabel}>All five stages, side by side</div>
        <div style={chart}>
          {scored.levels.map((l) => {
            const g = GROWTH_LEVELS[l.level];
            const isWin = l.level === scored.winnerLevel;
            const color = isWin ? "#C4923E" : "#8CA0B3";
            return (
              <div key={l.level} style={rowGrid}>
                <span style={{ ...rName, fontWeight: isWin ? 700 : 600 }}>{g.name}</span>
                <span style={track}><span style={fill(l.score / per, color)} /></span>
                <span style={{ ...rScore, color }}>
                  {l.score}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{per}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "4px 0 8px" }}>
        <div style={sectionLabel}>The whole path</div>
        <div style={chart}>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div key={lvl} style={{ padding: "12px 14px", borderBottom: "1px solid #F0F2F4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="serif" style={{ fontSize: 16, color: "#1C2B3A" }}>{GROWTH_LEVELS[lvl].name}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2E7D8A" }}>{GROWTH_LEVELS[lvl].message}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: "6px 0 0", lineHeight: 1.5 }}>{GROWTH_LEVELS[lvl].desc}</p>
            </div>
          ))}
        </div>
        <p style={helper}>
          This assessment is a starting point for honest conversation, not a final verdict. Use it to
          name strengths, name gaps, and build a focused plan forward.
        </p>
      </section>
    </>
  );
}

/* ---------------- Wired to Lead (DISC blend) ---------------- */
function DiscReport({ scored }) {
  const b = DISC_BLENDS[scored.blend] || {};
  const per = scored.max_per || 35;
  const order = { D: 0, I: 1, S: 2, C: 3 };
  const dims = [...scored.dims].sort((a, b2) => order[a.key] - order[b2.key]);
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your blend</div>
        <div style={{ ...topCard, borderLeft: "5px solid #C4923E" }}>
          <div style={topRank}>{scored.blend} · {DISC_DIMS[scored.primary]} + {DISC_DIMS[scored.secondary]}</div>
          <div className="serif" style={{ fontSize: 27, color: "#1C2B3A", marginTop: 4 }}>
            {b.figure}, {b.title}
          </div>
        </div>
      </section>
      <section style={{ padding: "18px 0" }}>
        <div style={sectionLabel}>Your four dimensions</div>
        <div style={chart}>
          {dims.map((d) => {
            const isTop = d.key === scored.primary || d.key === scored.secondary;
            const color = d.key === scored.primary ? "#C4923E" : d.key === scored.secondary ? "#2E7D8A" : "#8CA0B3";
            return (
              <div key={d.key} style={rowGrid}>
                <span style={{ ...rName, fontWeight: isTop ? 700 : 600 }}>{DISC_DIMS[d.key]}</span>
                <span style={track}><span style={fill(d.score / per, color)} /></span>
                <span style={{ ...rScore, color }}>
                  {d.score}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{per}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ padding: "4px 0 8px" }}>
        <div style={chart}>
          <div style={{ padding: "18px 20px" }}>
            <Block h="Strengths" t={b.strengths} />
            <Block h="Watch-outs" t={b.watchouts} />
            <Block h="Best used for" t={b.bestFor} />
            <Block h="Growth challenge" t={b.growth} />
          </div>
        </div>
        <p style={helper}>
          A blend is a description of how you're wired, not a limit on how God can use you. Lead from
          your actual design.
        </p>
      </section>
    </>
  );
}

/* ---------------- Pastor Profile (3 pillars, 14 domains) ---------------- */
function PastorReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains;
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your three pillars</div>
        <div style={topGrid}>
          {scored.pillars.map((p) => {
            const band = domainBand(p.average);
            return (
              <div key={p.pillar} style={topCard}>
                <div className="serif" style={{ ...topName, fontSize: 19 }}>{p.pillar}</div>
                <div style={{ ...scoreRow, marginTop: 4 }}>
                  <span style={{ ...topScore, fontSize: 26 }}>{p.average.toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: band.color }}>{band.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          Character, Competence, and Contribution are meant to grow together. When one pillar runs far
          ahead of another, that gap is worth as much attention as any single low score.
        </p>
      </section>

      <section style={{ padding: "22px 0 4px" }}>
        <div style={sectionLabel}>Every domain</div>
        {PASTOR_PILLARS.map((pillar) => {
          const ds = domains.filter((d) => (PASTOR_DOMAINS[d.domain]?.pillar) === pillar);
          if (!ds.length) return null;
          return (
            <div key={pillar} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1B3A57", margin: "0 0 8px" }}>{pillar}</div>
              <div style={chart}>
                {ds.map((d) => {
                  const band = domainBand(d.average);
                  return (
                    <div key={d.domain} style={rowGrid}>
                      <span style={rName}>{d.domain}</span>
                      <span style={track}><span style={fill(d.average / per, band.color)} /></span>
                      <span style={{ ...rScore, color: band.color, minWidth: 128, textAlign: "right" }}>
                        {d.average.toFixed(1)} · {band.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section style={{ padding: "8px 0 4px" }}>
        <div style={sectionLabel}>Where you're strong</div>
        <div style={topGrid}>
          {top2.map((d) => (
            <div key={d.domain} style={topCard}>
              <div className="serif" style={{ ...topName, fontSize: 20 }}>{d.domain}</div>
              <div style={{ ...scoreRow, marginTop: 4 }}>
                <span style={{ ...topScore, fontSize: 26 }}>{d.average.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#8CA0B3" }}>{domainBand(d.average).label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>Where to focus</div>
        {bottom2.map((d) => {
          const m = PASTOR_DOMAINS[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: domainBand(d.average).color }}>
                  {d.average.toFixed(1)} · {domainBand(d.average).label}
                </div>
              </div>
              <Block h="A next step" t={m.step} />
            </div>
          );
        })}
        <p style={helper}>
          This is developmental, never a verdict on your calling. No score here confirms or denies that
          God has called you. It simply shows where the next bit of growth is.
        </p>
      </section>
    </>
  );
}

/* ---------------- Private wellbeing card (Pastor Profile) ---------------- */
function WellbeingCard({ wb }) {
  const care = WELLBEING_CARE[wb.band] || WELLBEING_CARE.ok;
  const isSignificant = wb.band === "significant";
  const border = isSignificant ? "#C4923E" : "#E7E9EC";
  return (
    <section
      style={{
        marginTop: 28,
        background: isSignificant ? "#FBF6EC" : "#fff",
        border: `1px solid ${border}`,
        borderLeft: `5px solid ${isSignificant ? "#C4923E" : "#2E7D8A"}`,
        borderRadius: 16,
        padding: "22px 24px",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 8 }}>
        Private · How you're doing
      </div>
      <div className="serif" style={{ fontSize: 21, color: "#1C2B3A", marginBottom: 8 }}>{care.title}</div>
      <p style={{ fontSize: 15, color: "#3A4A5A", lineHeight: 1.65, margin: 0 }}>{care.body}</p>
      <p style={{ fontSize: 12.5, color: "#8CA0B3", marginTop: 14, marginBottom: 0 }}>
        This section is held in confidence by the Mission USA care team and is never shown to your local
        church or in any shared report.
      </p>
    </section>
  );
}

/* ---------------- Generic domain-average fallback ---------------- */
function DomainReport({ scored }) {
  const per = scored.scale_max || 5;
  return (
    <section style={{ padding: "16px 0" }}>
      <div style={sectionLabel}>Your results</div>
      <div style={chart}>
        {scored.domains.map((d) => {
          const band = domainBand(d.average);
          return (
            <div key={d.domain} style={rowGrid}>
              <span style={rName}>{d.domain}</span>
              <span style={track}><span style={fill(d.average / per, band.color)} /></span>
              <span style={{ ...rScore, color: band.color }}>{d.average}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- shared bits ---------------- */
const Block = ({ h, t }) =>
  t ? (
    <div style={{ marginBottom: 14 }}>
      <div style={blockH}>{h}</div>
      <p style={{ fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.55 }}>{t}</p>
    </div>
  ) : null;
const Centered = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "var(--ink-soft)" }}>
    {children}
  </main>
);
const fill = (frac, color) => ({
  display: "block", height: "100%", borderRadius: 999,
  width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color,
});
const chevron = (open) => ({
  color: "#B4BEC9", fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s",
});

const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "40px 0 34px" };
const hdRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 10 };
const hName = { fontWeight: 500, fontSize: 38, margin: 0 };
const hMeta = { fontSize: 13.5, textAlign: "right", lineHeight: 1.5 };
const actions = { display: "flex", gap: 12, padding: "24px 0 6px", flexWrap: "wrap" };
const savedNote = { display: "flex", gap: 10, alignItems: "center", background: "#EAF3F4", border: "1px solid #CFE3E5", color: "#1F5E68", borderRadius: 12, padding: "12px 16px", fontSize: 14, lineHeight: 1.5, margin: "6px 0 22px" };
const sectionLabel = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 18 };
const topGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const topCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 24px" };
const topRank = { fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, color: "#C4923E", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" };
const topName = { fontWeight: 500, fontSize: 23, marginTop: 4 };
const scoreRow = { display: "flex", alignItems: "baseline", gap: 5, margin: "6px 0 12px" };
const topScore = { fontSize: 34, fontWeight: 700, color: "#1B3A57", lineHeight: 1 };
const topDef = { fontSize: 13.5, color: "#4A5B6D", margin: 0, lineHeight: 1.5 };
const helper = { fontSize: 13.5, color: "#4A5B6D", marginTop: 20, lineHeight: 1.55, maxWidth: 640 };
const chart = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "6px 10px", overflow: "hidden" };
const barBtn = { width: "100%", display: "grid", gridTemplateColumns: "26px 150px 1fr 46px 16px", alignItems: "center", gap: 12, padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" };
const rowGrid = { display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rRank = { fontSize: 13, color: "#8CA0B3", fontWeight: 600 };
const rName = { fontSize: 14.5, fontWeight: 600, color: "#1C2B3A" };
const track = { height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden", width: "100%" };
const rScore = { fontSize: 15, fontWeight: 700, textAlign: "right" };
const detail = { padding: "4px 16px 22px 52px" };
const detailP = { fontSize: 14.5, color: "#2B3A4A", margin: "0 0 14px", lineHeight: 1.55 };
const blockH = { fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 5 };
const refLine = { fontSize: 12, color: "#8CA0B3", fontStyle: "italic", marginTop: 12 };
const devotionBox = { background: "#FBF6EC", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", marginTop: 8 };
const primaryTag = { fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#B07C2E", background: "#F5EFE6", border: "1px solid #EADFC9", padding: "2px 7px", borderRadius: 999, marginLeft: 8, verticalAlign: "middle" };
const growCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const transitionBox = { background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", marginTop: 14, fontSize: 14, color: "#4A5B6D", lineHeight: 1.55 };
const ft = { textAlign: "center", padding: "34px 0 0", fontSize: 12.5, color: "#7C8A9C" };

/* ================= Discover Your Leadership Style ================= */
const LD_BAND = Object.fromEntries(BANDS.map((b) => [b.key, b]));

// The signature visual: a stool drawn to the taker's scores. Three legs fill to
// their leg score; the gold seat carries the Leadership score. Hovering (or
// focusing) a leg surfaces its detail. Animates on mount; static in print.
function LeadershipStool({ legs, seat, active, setActive, grown }) {
  // Positive rotation splays a leg's foot to the left, negative to the right —
  // so the outer legs lean OUT into a stable tripod stance.
  const TOP_Y = 116, LEN = 186, W = 24;
  const legDefs = [
    { key: "SP", ax: 132, deg: 17 },
    { key: "CH", ax: 220, deg: 0 },
    { key: "ST", ax: 308, deg: -17 },
  ];
  const rad = (d) => (d * Math.PI) / 180;
  const foot = (l) => ({ x: l.ax - LEN * Math.sin(rad(l.deg)), y: TOP_Y + LEN * Math.cos(rad(l.deg)) });
  return (
    <svg viewBox="0 0 440 350" width="100%" style={{ maxWidth: 468, display: "block", margin: "0 auto" }}
      role="img" aria-label="Your leadership stool">
      <defs>
        <linearGradient id="ld-seat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0B25A" /><stop offset="1" stopColor="#C08E38" />
        </linearGradient>
        {legDefs.map((l) => (
          <clipPath key={l.key} id={`ld-clip-${l.key}`}>
            <rect x={-W / 2} y="0" width={W} height={LEN} rx={W / 2} />
          </clipPath>
        ))}
      </defs>

      {/* ground shadow */}
      <ellipse cx="220" cy="322" rx="164" ry="14" fill="#1C2B3A" opacity="0.09" />

      {/* legs (drawn before the seat so the seat overlaps their tops) */}
      {legDefs.map((l) => {
        const leg = legs[l.key], meta = LEGS[l.key];
        const isOn = active === l.key;
        const fillH = grown ? Math.max(6, (leg.pct / 100) * LEN) : 5;
        return (
          <g key={l.key} transform={`translate(${l.ax} ${TOP_Y}) rotate(${l.deg})`}
            style={{ cursor: "pointer" }} tabIndex={0}
            onMouseEnter={() => setActive(l.key)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(l.key)} onBlur={() => setActive(null)}>
            <rect x={-W / 2} y="0" width={W} height={LEN} rx={W / 2} fill={meta.soft}
              stroke={isOn ? meta.color : "#E3E1EC"} strokeWidth={isOn ? 2.5 : 1} />
            <g clipPath={`url(#ld-clip-${l.key})`}>
              <rect x={-W / 2} width={W} y={LEN - fillH} height={fillH} fill={meta.color}
                style={{ transition: "y .9s cubic-bezier(.2,.7,.2,1), height .9s cubic-bezier(.2,.7,.2,1)" }} />
              <rect x={-W / 2 + 3} width="4" y={LEN - fillH} height={fillH} fill="#fff" opacity="0.22"
                style={{ transition: "y .9s, height .9s" }} rx="2" />
            </g>
          </g>
        );
      })}

      {/* score chips at each foot (drawn upright, always readable) */}
      {legDefs.map((l) => {
        const meta = LEGS[l.key], leg = legs[l.key], f = foot(l);
        return (
          <g key={l.key} style={{ pointerEvents: "none" }}>
            <ellipse cx={f.x} cy={f.y + 2} rx="13" ry="5" fill="#1C2B3A" opacity="0.08" />
            <rect x={f.x - 20} y={f.y - 30} width="40" height="24" rx="12" fill={meta.color} />
            <text x={f.x} y={f.y - 13} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff"
              style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{leg.pct}</text>
          </g>
        );
      })}

      {/* seat */}
      <g>
        <ellipse cx="220" cy="120" rx="140" ry="25" fill="#8A5E20" />
        <rect x="80" y="100" width="280" height="20" fill="#8A5E20" />
        <ellipse cx="220" cy="100" rx="140" ry="25" fill="url(#ld-seat)" stroke="#A87A2E" strokeWidth="1" />
        <ellipse cx="220" cy="100" rx="140" ry="25" fill="none" stroke="#F0DFB0" strokeWidth="1.2" opacity="0.6" />
        <text x="220" y="97" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="2.5"
          fill="#4A3410" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>LEADERSHIP</text>
        <text x="220" y="112" textAnchor="middle" fontSize="11" fontWeight="600"
          fill="#6B4B18" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>the seat · {seat.pct}</text>
      </g>
    </svg>
  );
}

function LeadershipReport({ scored }) {
  const [grown, setGrown] = useState(false);
  const [active, setActive] = useState(null);
  const [peek, setPeek] = useState(null); // style code being previewed
  const [done, setDone] = useState({}); // 90-day checkbox state (in-memory)
  useEffect(() => { const t = setTimeout(() => setGrown(true), 80); return () => clearTimeout(t); }, []);

  const legs = scored.legs || {};
  const seat = scored.seat || { pct: 0, band: "growth" };
  const ranked = scored.ranked || ["ST", "CH", "SP"];
  const style = STYLES[scored.style_code] || STYLES["ST-CH-SP"];
  const accent = LEGS[style.order[0]].color;
  const foundation = scored.foundation || {};
  const comps = scored.components || [];
  const patterns = scored.patterns || { low: [], high: [] };
  const roleLabelStr = scored.role?.label;
  const bandOf = (k) => LD_BAND[k] || BANDS[BANDS.length - 1];

  const strongLeg = ranked[0], midLeg = ranked[1], weakLeg = ranked[2];
  const lowF = FOUNDATIONS[scored.lowest_foundation];
  const topF = FOUNDATIONS[scored.strongest_foundation];
  const pair = pairingsFor(style.code);
  const pairName = pair[0] ? STYLES[pair[0].code].name : "a complementary leader";

  const activeLeg = active ? legs[active] : null;
  const activeMeta = active ? LEGS[active] : null;

  const snapshot = [
    { key: "ST", ...legs.ST }, { key: "CH", ...legs.CH }, { key: "SP", ...legs.SP },
  ].sort((a, b) => b.pct - a.pct);

  return (
    <>
      {/* Masthead */}
      <section style={{ padding: "4px 0 8px" }}>
        <div style={ldRibbon}>
          {LEG_ORDER.map((k) => <span key={k} style={{ flex: legs[k].pct + 8, background: LEGS[k].color }} />)}
        </div>
        <div style={{ ...sectionLabel, color: accent, marginTop: 18 }}>Your leadership style</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 className="serif" style={{ fontSize: "clamp(30px,5vw,44px)", color: "#1C2B3A", margin: "2px 0 6px", lineHeight: 1.04 }}>{style.name}</h2>
            <div style={ldCode}>{style.code.split("-").map((c, i) => (
              <span key={c}><span style={{ color: LEGS[c].color }}>{LEGS[c].name}</span>{i < 2 ? <span style={{ color: "#C9D2DA", margin: "0 7px" }}>›</span> : null}</span>
            ))}</div>
            <p className="serif" style={{ fontSize: 19, color: "#4A5B6D", fontStyle: "italic", margin: "12px 0 0", maxWidth: 460, lineHeight: 1.4 }}>{style.headline}</p>
            {roleLabelStr && <div style={{ fontSize: 13, color: "#8CA0B3", marginTop: 10 }}>Role version: {roleLabelStr}</div>}
          </div>
        </div>
      </section>

      {/* The stool */}
      <section style={{ padding: "12px 0 4px" }} className="avoid-break">
        <div style={{ ...chart, padding: "20px 16px 22px", background: "linear-gradient(180deg,#FCFAF6,#fff)" }}>
          <LeadershipStool legs={legs} seat={seat} active={active} setActive={setActive} grown={grown} />
          {/* leg legend / interactive detail */}
          <div style={ldLegRow}>
            {LEG_ORDER.map((k) => {
              const meta = LEGS[k], leg = legs[k], b = bandOf(leg.band);
              const on = active === k;
              return (
                <button key={k} type="button"
                  onMouseEnter={() => setActive(k)} onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(k)} onBlur={() => setActive(null)}
                  style={{ ...ldLegCard, borderColor: on ? meta.color : "#EAECEF", boxShadow: on ? `0 8px 22px ${meta.soft}` : "none" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, color: "#1C2B3A", fontSize: 14 }}>{meta.name}</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: meta.color, lineHeight: 1 }}>{leg.pct}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: b.color, textTransform: "uppercase", letterSpacing: ".04em" }}>{b.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ ...ldDetail, borderColor: activeMeta ? activeMeta.color : "#EAECEF" }}>
            {activeLeg ? (
              <><strong style={{ color: activeMeta.color }}>{activeMeta.name}</strong> · {activeMeta.call}. {activeMeta.def}</>
            ) : (
              <>Three legs hold your leadership up: <strong style={{ color: LEGS.SP.color }}>Spirituality</strong> (loving God),
                <strong style={{ color: LEGS.CH.color }}> Chemistry</strong> (loving people), and
                <strong style={{ color: LEGS.ST.color }}> Strategy</strong> (loving the world). The gold seat is Leadership itself.
                Hover a leg to read it. The goal isn't three identical legs; it's knowing which one carries your weight.</>
            )}
          </div>
        </div>
      </section>

      {/* Snapshot bars */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Your snapshot</div>
        <div style={chart}>
          {snapshot.map((s) => {
            const meta = LEGS[s.key], b = bandOf(s.band);
            return (
              <div key={s.key} style={{ padding: "13px 16px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2B3A" }}>{meta.name} <span style={{ fontWeight: 400, color: "#8CA0B3", fontSize: 13 }}>· {meta.call}</span></span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: b.color }}>{s.pct} · {b.label}</span>
                </div>
                <div style={ldTrack}><div style={{ ...ldFill, width: grown ? `${s.pct}%` : "0%", background: meta.color }} /></div>
              </div>
            );
          })}
          <div style={{ padding: "13px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2B3A" }}>{SEAT.name} <span style={{ fontWeight: 400, color: "#8CA0B3", fontSize: 13 }}>· the seat</span></span>
              <span style={{ fontSize: 14, fontWeight: 700, color: bandOf(seat.band).color }}>{seat.pct} · {bandOf(seat.band).label}</span>
            </div>
            <div style={ldTrack}><div style={{ ...ldFill, width: grown ? `${seat.pct}%` : "0%", background: SEAT.color }} /></div>
          </div>
        </div>
        <p style={helper}>Every score is percent-of-maximum against the leg itself, never against other people. Bands: {BANDS.map((b, i) => `${b.label} (${b.min}${b.key === "signature" ? "-100" : b.key === "growth" ? " and below" : `-${BANDS[i - 1].min - 1}`})`).join(", ")}.</p>
      </section>

      {/* Style in depth */}
      <section style={{ padding: "18px 0 4px" }} className="avoid-break">
        <div style={sectionLabel}>Your style in depth</div>
        <div style={{ ...ldFeature, borderTop: `4px solid ${accent}` }}>
          <div style={ldGrid2}>
            <div>
              <div style={ldBlockH}>The genius</div>
              <p style={ldP}>{style.genius}</p>
            </div>
            <div>
              <div style={ldBlockH}>The shadow</div>
              <p style={ldP}>{style.shadow}</p>
            </div>
          </div>
          <div style={ldBiblical}>
            <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, marginBottom: 6 }}>Biblical picture · {style.biblical.name}</div>
            <p style={{ margin: 0, fontSize: 15, color: "#4A3F2A", lineHeight: 1.55 }}><em>{style.biblical.text}</em> <span style={{ color: "#8A6D3B", fontWeight: 600 }}>({style.biblical.ref})</span></p>
          </div>
          <div style={ldGrid2}>
            <div><div style={ldBlockH}>Best-fit roles</div><p style={ldP}>{style.bestFit}</p></div>
            <div><div style={ldBlockH}>Your key pairing</div><p style={ldP}>{style.pairing}</p></div>
          </div>
        </div>
      </section>

      {/* Where you land among the six */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>The six styles</div>
        <div style={ldSixGrid}>
          {STYLE_ORDER.map((code) => {
            const s = STYLES[code], mine = code === style.code, open = peek === code;
            const ac = LEGS[s.order[0]].color;
            return (
              <button key={code} type="button" onClick={() => setPeek(open ? null : code)}
                style={{ ...ldSix, borderColor: mine ? ac : "#EAECEF", background: mine ? `${LEGS[s.order[0]].soft}` : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "inline-flex" }}>{s.order.map((lk) => <span key={lk} style={{ width: 7, height: 7, borderRadius: 2, background: LEGS[lk].color, marginRight: 2, display: "inline-block" }} />)}</span>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: "#1C2B3A" }}>{s.name}</span>
                  {mine && <span style={{ fontSize: 10, fontWeight: 800, color: ac, letterSpacing: ".06em", marginLeft: "auto" }}>YOU</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "#5A6A78", marginTop: 5, lineHeight: 1.45 }}>{s.headline}</div>
                {open && <div style={{ fontSize: 12.5, color: "#4A5B6D", marginTop: 8, lineHeight: 1.5, borderTop: "1px solid #EEF1F4", paddingTop: 8 }}>{s.genius}</div>}
              </button>
            );
          })}
        </div>
        <p style={helper}>No style is better than another. Each is a stewardship with a genius and a shadow, and the Church needs all six. Tap any style to read its genius.</p>
      </section>

      {/* Nine foundations */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Your nine foundations</div>
        <div style={chart}>
          {LEG_ORDER.map((legKey) => {
            const meta = LEGS[legKey];
            return (
              <div key={legKey} style={{ padding: "10px 16px 4px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: ".06em", margin: "4px 0 8px" }}>{meta.name}</div>
                {FOUNDATION_ORDER_BY_LEG[legKey].map((fk) => {
                  const f = foundation[fk], fm = FOUNDATIONS[fk], b = bandOf(f.band);
                  const isTop = fk === scored.strongest_foundation, isLow = fk === scored.lowest_foundation;
                  return (
                    <div key={fk} style={{ margin: "0 0 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, color: "#1C2B3A", fontWeight: 600 }}>
                          {fm.name}
                          {isTop && <span style={ldTag("#1F7A4D")}>★ strongest</span>}
                          {isLow && <span style={ldTag("#B4653A")}>↑ start here</span>}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: b.color }}>{f.pct}</span>
                      </div>
                      <div style={ldTrackSm}><div style={{ ...ldFill, width: grown ? `${f.pct}%` : "0%", background: meta.color }} /></div>
                      <div style={{ fontSize: 12, color: "#8CA0B3", marginTop: 4, lineHeight: 1.45 }}>{fm.blurb}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p style={helper}><strong style={{ color: "#1C2B3A" }}>{topF.name}</strong> is your strongest foundation — lead from it deliberately. <strong style={{ color: "#1C2B3A" }}>{lowF.name}</strong> is your single highest-leverage growth target in this report.</p>
      </section>

      {/* Leg by leg */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Leg by leg</div>
        {[["Your strongest leg", strongLeg], ["Your middle leg", midLeg], ["Your weakest leg", weakLeg]].map(([label, lk]) => {
          const meta = LEGS[lk], leg = legs[lk], b = bandOf(leg.band);
          const fs = FOUNDATION_ORDER_BY_LEG[lk].map((k) => ({ ...foundation[k], name: FOUNDATIONS[k].name }));
          const hi = [...fs].sort((a, z) => z.pct - a.pct)[0], lo = [...fs].sort((a, z) => a.pct - z.pct)[0];
          const narr = lk === strongLeg
            ? `This is where God most consistently uses you. It makes ${meta.call.toLowerCase()} your native instinct, and it is the leg others feel first. Steward it on purpose, and watch the temptation that rides with every strength: leaning on it so hard that the other two legs quietly weaken.`
            : lk === midLeg
              ? `This leg supports your strength. It is present and usable, and growth here usually comes fastest because the raw material is already there. Your highest foundation in it is ${hi.name}; your lowest is ${lo.name}.`
              : `This is the neglected leg, and left alone it is what will cost you most in five years. Name it plainly, then take heart: this leg responds to practice, partnership, and grace. Brace it with partners, but do not outsource it entirely — feed it personally, starting with ${lo.name}.`;
          return (
            <div key={lk} style={{ ...ldLegDeep, borderLeft: `4px solid ${meta.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#8CA0B3", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <div className="serif" style={{ fontSize: 24, color: "#1C2B3A", marginTop: 2 }}>{meta.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: meta.color, lineHeight: 1 }}>{leg.pct}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: b.color, textTransform: "uppercase", letterSpacing: ".05em" }}>{b.label}</div>
                </div>
              </div>
              <p style={{ ...ldP, marginTop: 12 }}>{narr}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {fs.map((f) => (
                  <span key={f.name} style={ldMini}>{f.name} <strong style={{ color: meta.color }}>{f.pct}</strong></span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* The seat */}
      <section style={{ padding: "18px 0 4px" }} className="avoid-break">
        <div style={sectionLabel}>The seat · your Leadership score ({seat.pct})</div>
        <div style={chart}>
          {comps.map((c) => {
            const fm = FOUNDATIONS[c.key];
            const words = { high: "A clear strength", medium: "Developing and reliable in parts", low: "An area to grow into" };
            const col = c.level === "high" ? "#1F7A4D" : c.level === "medium" ? "#C4923E" : "#B4653A";
            return (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: "1px solid #F0F2F4" }}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1C2B3A" }}>{fm.name.replace("Leadership ", "")}</div>
                  <div style={{ fontSize: 12, color: "#8CA0B3" }}>{fm.blurb}</div>
                </div>
                <div style={{ flex: 1 }}><div style={ldTrackSm}><div style={{ ...ldFill, width: grown ? `${c.pct}%` : "0%", background: SEAT.color }} /></div></div>
                <div style={{ minWidth: 120, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: col }}>{c.pct} · {words[c.level]}</div>
              </div>
            );
          })}
        </div>
        <p style={helper}>The seat rises as the legs strengthen. A growing walk with God, deepening relationships, and sharper strategy lift instinct, fruit, and multiplication together.</p>
      </section>

      {/* Response patterns */}
      {(patterns.high.length > 0 || patterns.low.length > 0) && (
        <section style={{ padding: "18px 0 4px" }}>
          <div style={sectionLabel}>What your answers show</div>
          <div style={ldGrid2}>
            <div style={{ ...growCard, borderTop: "3px solid #1F7A4D" }}>
              <div style={{ ...ldBlockH, color: "#1F7A4D" }}>Where grace and gifting already meet</div>
              <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 8px" }}>Your “Almost Always” answers. Thank God for these, and build your role around them.</p>
              <ul style={ldUl}>{patterns.high.slice(0, 6).map((p, i) => <li key={i} style={ldLi}>{p.text}</li>)}</ul>
            </div>
            <div style={{ ...growCard, borderTop: "3px solid #C4923E" }}>
              <div style={{ ...ldBlockH, color: "#B07C2E" }}>Invitations, not condemnation</div>
              <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 8px" }}>Your “Not Really” and “Occasionally” answers. Pick two, not ten, to address this quarter.</p>
              <ul style={ldUl}>{patterns.low.slice(0, 6).map((p, i) => <li key={i} style={ldLi}>{p.text}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      {/* 90-day plan */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Your 90-day development plan</div>
        <div style={chart}>
          {[
            ["Weeks 1–2", "Awareness", `Share this report with one trusted mentor and your supervisor or board chair. Ask: “Does this match what you see?”`],
            ["Weeks 3–6", `Weakest foundation · ${lowF.name}`, `Choose one concrete, repeatable practice that feeds ${lowF.name.toLowerCase()}. Start small and daily, not heroic and occasional, and track it like you track results.`],
            ["Weeks 3–6", `Strongest leg · ${LEGS[strongLeg].name}`, `Deploy your ${LEGS[strongLeg].name.toLowerCase()} for the body: take one assignment that puts ${topF.name.toLowerCase()} to work for people other than yourself.`],
            ["Weeks 7–10", "Partnership", `Identify a ${pairName} on your team. Set a standing rhythm with that person to cover your weakest leg.`],
            ["Weeks 11–12", "Accountability", `Establish or renew one relationship with permission to ask about ${LEGS[weakLeg].name} monthly.`],
            ["Week 13", "Review", "Retake the inventory or review your answers. Note the movement. Set the next 90 days."],
          ].map(([wk, focus, action], i) => (
            <label key={i} style={{ display: "flex", gap: 12, padding: "13px 16px", borderBottom: "1px solid #F0F2F4", cursor: "pointer", alignItems: "flex-start" }}>
              <input type="checkbox" checked={!!done[i]} onChange={(e) => setDone({ ...done, [i]: e.target.checked })} style={{ marginTop: 3 }} />
              <div>
                <div style={{ fontSize: 12, color: "#8CA0B3", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{wk} · {focus}</div>
                <div style={{ fontSize: 14, color: "#3A4A58", lineHeight: 1.5, marginTop: 3, textDecoration: done[i] ? "line-through" : "none", opacity: done[i] ? 0.55 : 1 }}>{action}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Team pairings */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Your style on a team</div>
        <div style={chart}>
          <div style={{ ...ldPairRow, background: "#FAFBFC", fontWeight: 700, color: "#8CA0B3", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>
            <span>Partner</span><span>They bring</span><span>You bring</span><span>Watch for</span>
          </div>
          {pair.map((p) => (
            <div key={p.code} style={ldPairRow}>
              <span style={{ fontWeight: 700, color: LEGS[STYLES[p.code].order[0]].color }}>{STYLES[p.code].name}</span>
              <span style={ldPairCell}>{p.they}</span>
              <span style={ldPairCell}>{p.you}</span>
              <span style={ldPairCell}>{p.watch}</span>
            </div>
          ))}
        </div>
        <p style={helper}>A healthy team covers all three legs. Map your whole team's codes on one page and look for the leg no one carries. That leg is your team's silent risk.</p>
      </section>

      {/* Ten practices */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={sectionLabel}>Ten practices for a {style.name}</div>
        <div style={chart}>
          <ol style={{ margin: 0, padding: "8px 20px 8px 40px", columns: 1 }}>
            {style.practices.map((pr, i) => (
              <li key={i} style={{ fontSize: 14, color: "#3A4A58", lineHeight: 1.5, margin: "8px 0", paddingLeft: 4 }}>{pr}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* Coaching + scripture */}
      <section style={{ padding: "18px 0 4px" }}>
        <div style={ldGrid2}>
          <div style={growCard}>
            <div style={ldBlockH}>Coaching conversation guide</div>
            <ol style={ldUl}>
              <li style={ldLi}>Where in this report did you feel most seen? Most resistant?</li>
              <li style={ldLi}>What would your ministry look like in five years if your weakest leg stayed exactly where it is?</li>
              <li style={ldLi}>Which of the ten practices for your style will you start this month?</li>
              <li style={ldLi}>Who on your team compensates for you today? Do they know it?</li>
              <li style={ldLi}>What does loving God, loving people, and loving the world look like in your calendar next week?</li>
            </ol>
          </div>
          <div style={{ ...growCard, background: "#FBF7EE", border: "1px solid #EADFC9" }}>
            <div style={{ ...ldBlockH, color: "#B07C2E" }}>Scripture for the journey</div>
            <p style={ldScrip}>“Love the Lord your God with all your heart… Love your neighbor as yourself.” <span style={ldRef}>Matthew 22:37–39</span> · “Go and make disciples.” <span style={ldRef}>Matthew 28:19</span></p>
            <p style={ldScrip}><strong>Your strongest leg:</strong> gratitude — <span style={ldRef}>1 Corinthians 4:7</span></p>
            <p style={ldScrip}><strong>Your weakest leg:</strong> grace and growth — <span style={ldRef}>Philippians 1:6; 2 Peter 1:5–8</span></p>
            <p style={ldScrip}><strong>The seat:</strong> servant leadership — <span style={ldRef}>Mark 10:42–45</span></p>
          </div>
        </div>
      </section>

      {/* Book credit + buy */}
      <section style={{ padding: "18px 0 8px" }} className="avoid-break">
        <div style={ldBook}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#8CA0B3", fontWeight: 700 }}>The framework behind this report</div>
            <div className="serif" style={{ fontSize: 21, color: "#1C2B3A", margin: "8px 0 4px", lineHeight: 1.2 }}>{BOOK.title}</div>
            <div style={{ fontSize: 14, color: "#5A6A78" }}><em>{BOOK.subtitle}</em></div>
            <div style={{ fontSize: 13.5, color: "#8CA0B3", marginTop: 6 }}>by {BOOK.author} · {BOOK.publisher}</div>
            <p style={{ fontSize: 13.5, color: "#5A6A78", lineHeight: 1.55, margin: "12px 0 0", maxWidth: 460 }}>
              This assessment is an original recreation. The three-legged Leadership Stool model — Spirituality, Chemistry, and Strategy — is drawn from David T. Olson's book. To go deeper into the framework, read the book.
            </p>
          </div>
          <a href={BOOK.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary no-print" style={{ whiteSpace: "nowrap", alignSelf: "center" }}>Get the book →</a>
        </div>
      </section>

      <section style={{ padding: "10px 0 8px" }}>
        <p style={helper}>
          Your style is not a box. It is a description of which leg carries your weight today, which supports it, and which needs bracing.
          Scores describe present practice, not permanent identity. Every leg can grow.
        </p>
      </section>
    </>
  );
}

// Leadership report styles
const ldRibbon = { display: "flex", height: 6, borderRadius: 999, overflow: "hidden", gap: 3 };
const ldCode = { display: "flex", alignItems: "center", flexWrap: "wrap", fontSize: 14, fontWeight: 700, marginTop: 2 };
const ldLegRow = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 };
const ldLegCard = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 8px", borderRadius: 12, border: "1.5px solid #EAECEF", background: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease" };
const ldDetail = { marginTop: 14, padding: "14px 16px", borderRadius: 12, border: "1px solid #EAECEF", background: "#fff", fontSize: 14, color: "#4A5B6D", lineHeight: 1.6, transition: "border-color .15s ease" };
const ldTrack = { position: "relative", height: 14, borderRadius: 999, overflow: "hidden", background: "#EEF1F4" };
const ldTrackSm = { position: "relative", height: 9, borderRadius: 999, overflow: "hidden", background: "#EEF1F4" };
const ldFill = { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, transition: "width 1s cubic-bezier(.2,.7,.2,1)" };
const ldFeature = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 8px" };
const ldGrid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 };
const ldBlockH = { fontSize: 12, fontWeight: 700, color: "#1C2B3A", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 };
const ldP = { fontSize: 14.5, color: "#4A5B6D", lineHeight: 1.6, margin: "0 0 16px" };
const ldBiblical = { background: "#FBF7EE", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", margin: "2px 0 18px" };
const ldSixGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 };
const ldSix = { textAlign: "left", padding: "14px 15px", borderRadius: 12, border: "1.5px solid #EAECEF", background: "#fff", cursor: "pointer", fontFamily: "inherit" };
const ldTag = (c) => ({ fontSize: 10.5, fontWeight: 800, color: c, marginLeft: 8, letterSpacing: ".03em" });
const ldLegDeep = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const ldMini = { fontSize: 12.5, color: "#5A6A78", background: "#F6F8FA", borderRadius: 8, padding: "5px 10px" };
const ldUl = { margin: 0, paddingLeft: 18 };
const ldLi = { fontSize: 13.5, color: "#4A5B6D", lineHeight: 1.5, marginBottom: 7 };
const ldPairRow = { display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1.3fr 1.5fr", gap: 12, padding: "12px 16px", borderBottom: "1px solid #F0F2F4", alignItems: "start", fontSize: 13 };
const ldPairCell = { fontSize: 13, color: "#4A5B6D", lineHeight: 1.45 };
const ldScrip = { fontSize: 13.5, color: "#4A3F2A", lineHeight: 1.6, margin: "0 0 10px", fontStyle: "italic" };
const ldRef = { color: "#8A6D3B", fontWeight: 600, fontStyle: "normal" };
const ldBook = { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap", background: "linear-gradient(180deg,#FCFAF6,#F6F1E7)", border: "1px solid #EADFC9", borderRadius: 16, padding: "22px 24px" };

// Print stylesheet — the primary PDF path. window.print() → the browser's
// "Save as PDF" produces a vector, text-selectable, font-embedded document
// (fonts are self-hosted; see globals.css). This sheet enforces US-Letter
// geometry, break control, and print-safe color so the on-screen report and
// the PDF are the same DOM in two presentations. The html2pdf raster path is
// retained only as a degraded fallback (see downloadPdf).
const PRINT_CSS = `
.report-credit{ text-align:center; font-size:12px; color:#7C8A9C; margin-top:30px; padding-top:16px; border-top:1px solid #E7E9EC; line-height:1.5; }
.bar:hover { background:#F8FAFB; }
#report-capture, #report-capture * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.print-foot { display:none; }
/* Spiritual Gifts per-gift study: collapsed on screen, fully expanded in print. */
.gift-study { display:none; }
.gift-study.is-open { display:block; }
@media print {
  /* US Letter with the report's margin geometry (reportTokens.PRINT). */
  @page { size: letter; margin: 18mm 16mm 20mm; }

  html, body { background:#fff !important; }
  main { background:#fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  /* Screen-only chrome never prints. */
  .no-print, .no-pdf { display:none !important; }
  /* Every gift study prints, whether or not it was expanded on screen. */
  .gift-study { display:block !important; }

  /* The report fills the printable width; drop the on-screen max-width and
     padding so the page margins alone define the text block. */
  #report-capture { width:100% !important; }
  #report-capture > div { max-width:none !important; padding-left:0 !important; padding-right:0 !important; }

  /* Break control — the rules that turn a scrolling page into a document. */
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  h1, h2, h3, h4 { break-inside: avoid; }
  p { orphans: 3; widows: 3; }
  .sheet section, section { break-inside: avoid; page-break-inside: avoid; }
  .chart, .card, figure, .avoid-break, table, li { break-inside: avoid; page-break-inside: avoid; }
  .break-before { break-before: page; page-break-before: always; }
  /* Table headers repeat on every page; rows stay with their header. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; }

  /* Flatten screen surfaces that read as heavy or blurry on paper:
     shadows off, rounded corners softened, translucent fills made solid. */
  * { box-shadow: none !important; }

  /* Animated chart reveals print in their final static state. */
  * { animation: none !important; transition: none !important; }

  /* Running footer: repeats on every printed page (position:fixed is paginated
     by Chromium). Page numbers require the headless print route and are added
     there; this gives every page an attribution mark meanwhile. */
  .print-foot {
    display:block; position:fixed; bottom:0; left:0; right:0;
    font-family:'Inter',sans-serif; font-size:8pt; color:#8CA0B3;
    text-align:center; padding-bottom:2mm;
  }

  .report-credit{ display:block !important; }
}
`;
