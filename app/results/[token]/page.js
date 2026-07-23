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
  DOMAIN_BANDS,
  ROOTED_BANDS,
  EFMI_BANDS,
} from "../../lib/content";
import {
  BIG5_TRAITS,
  BIG5_TRAIT_META,
  BIG5_TRAIT_ORDER,
  BIG5_FACETS,
  big5Boundary,
} from "../../lib/bigfive";
import { big5Interactions, giftConstellation, enneagramDynamics, discDimensions } from "../../lib/interactions";
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
import { buildSynthesis } from "../../lib/synthesis";
import { headlineFor } from "../../lib/headline";
import {
  TYPE, SP, COLOR, NEUTRAL, ACCENT, SCORE_STATE, NUM, CHART,
  FONT_SERIF, FONT_SANS, typeStyle, scoreState,
} from "../../lib/reportTokens";

export default function ResultsPage() {
  const { token } = useParams();
  const [scored, setScored] = useState(null);
  const [meta, setMeta] = useState(null);
  const [wb, setWb] = useState(null);
  const [state, setState] = useState("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [brand, setBrand] = useState(null); // { name, logo_url, withhold }
  const [blocked, setBlocked] = useState(false); // withheld from this viewer
  const [synth, setSynth] = useState(null); // cross-assessment synthesis, or { empty: true }

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      // One SECURITY DEFINER RPC (migration_33) resolves the whole report by
      // token: session + result + assessment + church branding. Direct anon
      // reads of sessions/results were removed (they allowed enumeration),
      // and the church "withhold from taker" gate is now enforced
      // server-side — a withheld report never sends scored_json at all.
      const { data, error } = await supabase.rpc("result_by_token", { p_token: token });
      if (error || !data) { setState("notfound"); return; }

      const b = data.church || null;

      // Signed-in / admin detection drives the report nav. The withhold
      // override (admin / church leader) is computed by the RPC itself.
      const { data: udata } = await supabase.auth.getUser();
      if (udata?.user) setSignedIn(true);
      setIsAdmin(data.is_admin === true);

      // Withheld results: the taker cannot see their own report; only Mission USA
      // admins or a leader of that church can. Others see a "held for you" note.
      if (data.withheld) {
        setBrand(b); setBlocked(true); setState("ready");
        return;
      }

      // Wellbeing (owner or Mission USA care/admin only, by RLS). Returns
      // nothing for anyone else, so the card simply doesn't render for them.
      const { data: wbRow } = await supabase
        .from("wellbeing_results")
        .select("total,max_total,band,elevated")
        .eq("session_id", data.session?.id)
        .maybeSingle();

      setScored(data.scored_json);
      setMeta({ ...data.assessment, created_at: data.created_at });
      setWb(wbRow || null);
      setBrand(b);
      setState("ready");
    })();
  }, [token]);

  // Cross-assessment synthesis: once the report is loaded and visible (never for
  // a withheld/blocked report, which never sets `scored`), ask the SECURITY
  // DEFINER RPC for this person's OTHER completed assessments and weave them
  // together. Empty result -> a subtle teaser instead of a full section.
  useEffect(() => {
    if (!scored || !token || blocked) return;
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("synthesis_for_token", { p_token: token });
      if (cancelled) return;
      if (error || !data || !data.ok || !data.others?.length) {
        setSynth({ empty: true });
        return;
      }
      const current = {
        slug: meta?.slug,
        name: meta?.name,
        result_type: scored.type,
        headline: headlineFor(scored),
      };
      setSynth({ result: buildSynthesis(current, data.others), others: data.others });
    })();
    return () => { cancelled = true; };
  }, [scored, token, blocked, meta]);

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
  return (
    <ReportView
      scored={scored}
      meta={meta}
      contact={contact}
      brand={brand}
      wb={wb}
      synth={synth}
      isAdmin={isAdmin}
      token={token}
      preview={false}
    />
  );
}

/* ---------------- ReportView (shared report presentation) ----------------
   The complete report — cover, Save PDF / Print actions, the scored.type
   renderer switch, wellbeing card, Ministry Profile, CircleInvite, footer, and
   the injected PRINT_CSS. Extracted from the page so the admin preview harness
   renders the EXACT same components users see. Self-contained: owns reportRef,
   the Save-PDF `dl` state, and downloadPdf, so the toolbar works anywhere it is
   mounted. When `preview` is true the CircleInvite (which needs a real token)
   is omitted; every other output is identical to the live report. */
export function ReportView({ scored, meta, contact, brand, wb, synth, isAdmin, token, preview = false }) {
  const reportRef = useRef(null);
  const [dl, setDl] = useState(false);
  const cc = contact || {};

  // Save as PDF: capture the report region and auto-download. Loads html2pdf
  // from CDN on demand (no npm dependency). Colors are captured as rendered.
  async function downloadPdf() {
    if (!reportRef.current) return;
    setDl(true);
    try {
      const lib = await loadHtml2pdf();
      const who = `${cc.first_name || ""}-${cc.last_name || ""}`.trim().replace(/\s+/g, "-") || "report";
      const what = (meta?.name || "assessment").replace(/[^\w]+/g, "-");
      await lib()
        .set({
          margin: [8, 8, 12, 8],
          filename: `${who}-${what}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", ignoreElements: (el) => el.classList?.contains?.("no-pdf") },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
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

  // Don't ask for a donation on a premium report — they already paid.
  const isPaidReport = !!(meta?.is_paid && meta?.price_cents > 0);
  const suppressDonation = isPaidReport || ["mip", "church-class"].includes(cc.source_tag);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="print-foot" aria-hidden="true">
        {cc.first_name} {cc.last_name} · {meta?.name} · Mission USA
      </div>
      <div ref={reportRef} id="report-capture">
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 60px" }}>
          <ReportCover meta={meta} contact={cc} brand={brand} scored={scored} />

          <div className="no-print no-pdf" style={actions}>
            <button className="btn btn-primary" onClick={downloadPdf} disabled={dl}>
              {dl ? "Preparing PDF…" : "Save PDF"}
            </button>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              Print
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
            <strong>Save PDF</strong> downloads a ready-made copy. <strong>Print</strong> opens your browser's dialog — where choosing
            {" "}<strong>Save as PDF</strong> as the destination gives the sharpest, text-selectable result.
          </div>

          <div className="no-print no-pdf" style={savedNote}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span>
              This report is saved to your profile. You can come back to it anytime with the link we
              emailed to {cc.email || "you"}.
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

          <MinistryProfile synth={synth} />

          {!preview && (scored.slug === "leadership-health" || scored.type === "planter") && (
            <CircleInvite token={token} kind={scored.type === "planter" ? "planter" : "leader"} />
          )}

          <DonationCard suppressed={suppressDonation} />
          <footer className="no-print no-pdf" style={ft}>A ministry resource of Mission USA · gomissionusa.com</footer>
        </div>
      </div>
    </main>
  );
}

/* ---------------- Your Ministry Profile (cross-assessment synthesis) ----------------
   Renders at the very bottom of the report. Full card when the person has other
   completed assessments; a subtle teaser when they don't. Never renders for a
   withheld report (no `scored` -> no synthesis fetch -> `synth` stays null). */
function MinistryProfile({ synth }) {
  if (!synth) return null;

  if (synth.empty) {
    return (
      <section className="avoid-break no-print no-pdf" style={{ breakInside: "avoid", marginTop: 8 }}>
        <div style={mpTeaser}>
          <div style={{ ...kicker, color: "#C4923E", marginBottom: 6 }}>Your Ministry Profile</div>
          <p style={{ fontSize: 14.5, color: "#4A5B6D", lineHeight: 1.6, margin: 0 }}>
            Take another assessment and we&rsquo;ll show you how your results fit together.{" "}
            <a href="/" style={{ color: "var(--teal-deep,#1F5E68)", fontWeight: 600, textDecoration: "none" }}>
              Browse assessments &rarr;
            </a>
          </p>
        </div>
      </section>
    );
  }

  const { result, others } = synth;
  return (
    // Screen-only: the Ministry Profile links out to other reports, which has no
    // meaning in a printed/PDF copy, so it is excluded from print and PDF.
    <section className="avoid-break no-print no-pdf" style={{ breakInside: "avoid", marginTop: 8 }}>
      <div style={mpCard}>
        <div style={{ ...kicker, color: "#C4923E", marginBottom: 6 }}>Bringing it together</div>
        <h2 className="serif" style={{ fontSize: 26, color: "#1B3A57", margin: "0 0 16px", fontWeight: 500 }}>
          Your Ministry Profile
        </h2>
        <p style={{ fontSize: 15, color: "#2B3A4A", lineHeight: 1.7, margin: "0 0 22px" }}>{result.narrative}</p>

        <div style={{ ...sectionLabel, marginBottom: 10 }}>Where you might fit</div>
        <ul style={{ margin: "0 0 22px", paddingLeft: 18 }}>
          {result.fits.map((f, i) => (
            <li key={i} style={{ fontSize: 14.5, color: "#2B3A4A", lineHeight: 1.55, marginBottom: 6 }}>{f}</li>
          ))}
        </ul>

        <div style={{ ...sectionLabel, marginBottom: 8 }}>An invitation to grow</div>
        <p style={{ fontSize: 14, color: "#4A5B6D", lineHeight: 1.6, margin: "0 0 22px" }}>{result.growthEdge}</p>

        <div style={{ ...sectionLabel, marginBottom: 10 }}>Your other results</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {others.map((o, i) => (
            <a key={o.result_token || i} href={`/results/${o.result_token}`} style={mpLink}>
              View your {o.name} &rarr;
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
const mpCard = { background: "#fff", border: "1px solid #E7E9EC", borderTop: "3px solid #C4923E", borderRadius: 16, padding: "26px 26px 24px", boxShadow: "0 10px 30px rgba(27,58,87,.06)", breakInside: "avoid" };
const mpTeaser = { background: "#F7F5EF", border: "1px dashed #E0D3B4", borderRadius: 14, padding: "18px 20px", breakInside: "avoid" };
const mpLink = { display: "inline-flex", alignItems: "center", background: "#F4F7F8", border: "1px solid #DCE6E8", color: "#1F5E68", fontSize: 13.5, fontWeight: 600, padding: "8px 14px", borderRadius: 999, textDecoration: "none" };

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
  // Per-gift denominator: each gift's own max (its item count times the max
  // score per item) so bars are comparable even when gifts have different
  // numbers of items. Falls back to the shared `per` whenever count/smax
  // aren't available yet (older scoring), so nothing crashes.
  const smax = scored.smax;
  const counts = ranked.map((g) => g.count).filter((c) => typeof c === "number");
  const maxCount = counts.length ? Math.max(...counts) : undefined;
  const denomFor = (g) => {
    const c = g.count ?? maxCount;
    return (typeof c === "number" && typeof smax === "number") ? c * smax : per;
  };
  // Tie disclosure for the top of the ladder (ranks 1-4): equal scores are
  // equal strengths, so we say so rather than implying a strict order.
  const tiePairs = [];
  for (let i = 0; i < Math.min(3, ranked.length - 1); i++) {
    if (ranked[i] && ranked[i + 1] && ranked[i].score === ranked[i + 1].score) {
      tiePairs.push([i + 1, i + 2]);
    }
  }
  const tieClauses = tiePairs.map(([a, b]) => `${ordinal(a)} and ${ordinal(b)}`);
  const tieNote = tieClauses.length
    ? `Your ${tieClauses.join(", and your ")} gifts scored the same, so hold them as equal strengths rather than a strict order.`
    : null;

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
                <span style={{ fontSize: 13, color: "#A9895A", fontWeight: 600 }}>/ {denomFor(g)}</span>
              </div>
              <p style={gfPanelDef}>{g.def}</p>
              <div style={gfVerse}>{firstRef(g.refs)}</div>
            </div>
          ))}
        </div>
        {tieNote && (
          <div style={transitionBox}>{tieNote}</div>
        )}
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
                    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (g.score / denomFor(g)) * 100)}%`, background: color, borderRadius: 999 }} />
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

      {/* Your gift constellation — what the top gifts form together */}
      {(() => {
        const c = giftConstellation(ranked.map((r) => r.letter));
        return (
          <section style={{ padding: "20px 0 4px" }} className="avoid-break">
            <div style={{ ...sectionLabel, color: "#B07C2E" }}>Your gift constellation</div>
            <div style={{ background: PARCH, border: "1px solid #E7D6B4", borderRadius: 16, padding: "22px 22px 20px", breakInside: "avoid" }}>
              <div className="serif" style={{ fontSize: 23, color: "#3A2E18", lineHeight: 1.15 }}>{c.name}</div>
              <p style={{ fontSize: 14.5, color: "#6B5B3E", lineHeight: 1.6, margin: "10px 0 14px" }}>{c.body}</p>
              <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, marginBottom: 6 }}>Where this fits</div>
              <ul style={{ margin: "0 0 14px", paddingLeft: 18 }}>
                {c.fits.map((f, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: "#6B5B3E", lineHeight: 1.5, marginBottom: 4 }}>{f}</li>
                ))}
              </ul>
              <p style={{ fontSize: 13.5, color: "#6B5B3E", lineHeight: 1.55, margin: "0 0 12px" }}>
                <strong style={{ color: "#8A6D3B" }}>Watch for:</strong> {c.watch}
              </p>
              <div style={{ fontSize: 11.5, color: "#8A6D3B", fontWeight: 600, fontStyle: "italic", borderTop: "1px solid #E7D6B4", paddingTop: 10 }}>{c.verse}</div>
            </div>
          </section>
        );
      })()}

      {/* Your top gift, up close — a richer deep dive on the #1 gift only */}
      {(() => {
        const topLetter = scored.top_letter || scored.ranked[0]?.letter;
        const g = GIFTS[topLetter];
        if (!g) return null;
        const items = scored.playback?.top_items || [];
        const devSteps = String(g.develop || "")
          .split(". ")
          .map((s) => s.replace(/\.$/, "").trim())
          .filter(Boolean);
        const weeks = [
          {
            label: "Week 1 · Notice",
            body: `Watch for the places your gift of ${g.name} is already quietly at work, and thank God for each one. Sit with the passages above and ask Him to show you what this gift is for.`,
          },
          {
            label: "Week 2 · Learn",
            body: `${devSteps[0] ? devSteps[0] + "." : "Study how this gift shows up in Scripture."} Give it real, unhurried time this week rather than a passing thought.`,
          },
          {
            label: "Week 3 · Practice",
            body: `${devSteps[1] ? devSteps[1] + "." : "Take one small, low-risk step to use this gift with someone you trust."} Start small and let it be genuine rather than polished.`,
          },
          {
            label: "Week 4 · Serve",
            body: `${devSteps[2] || devSteps[1] ? (devSteps[2] || devSteps[1]) + "." : "Offer this gift in one concrete act of service."} Then ask a mature believer for honest feedback, and plan how you will keep serving from ${g.name.toLowerCase()} beyond these four weeks.`,
          },
        ];
        const goldLabel = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#B07C2E", fontWeight: 700, marginBottom: 6, marginTop: 16 };
        return (
          <section style={{ padding: "20px 0 4px" }} className="avoid-break">
            <div style={{ ...sectionLabel, color: "#B07C2E" }}>Your top gift, up close</div>
            <div style={{ background: "#fff", border: "1px solid #E7D6B4", borderRadius: 16, padding: "24px 24px 22px", boxShadow: "0 10px 30px rgba(176,124,46,.10)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={gfRankTag}>#1</span>
                <div className="serif" style={{ fontSize: 26, color: "#3A2E18", lineHeight: 1.1 }}>{g.name}</div>
              </div>
              <p style={{ fontSize: 14.5, color: "#6B5B3E", lineHeight: 1.6, margin: "12px 0 4px" }}>{g.def}</p>

              <div style={{ ...goldLabel, marginTop: 18 }}>Where it shows up</div>
              <p style={{ fontSize: 13.5, color: "#6B5B3E", lineHeight: 1.55, margin: 0 }}>{g.roles}</p>

              {items.length > 0 && (
                <>
                  <div style={goldLabel}>What your answers show</div>
                  <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 6px" }}>The statements you scored highest on for this gift.</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {items.slice(0, 6).map((it, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "#6B5B3E", lineHeight: 1.5, marginBottom: 5 }}>{it.text}</li>
                    ))}
                  </ul>
                </>
              )}

              <div style={goldLabel}>Your next four weeks</div>
              <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 8px" }}>A simple, gentle way to keep growing in {g.name}.</p>
              <div style={{ borderTop: "1px solid #EFE6CF" }}>
                {weeks.map((w) => (
                  <div key={w.label} style={{ padding: "12px 0", borderBottom: "1px solid #EFE6CF" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#B07C2E", textTransform: "uppercase", letterSpacing: ".05em" }}>{w.label}</div>
                    <div style={{ fontSize: 14, color: "#4A3F2A", lineHeight: 1.5, marginTop: 3 }}>{w.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <p style={helper}>
              This deep dive is for your single strongest gift. It does not outrank the others, but it is the
              clearest place to begin serving on purpose this season.
            </p>
          </section>
        );
      })()}
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
const gfScore = { fontSize: 30, fontWeight: 700, color: "#C4923E", lineHeight: 1, fontFamily: "'Inter',sans-serif", fontVariantNumeric: NUM };
const gfPanelDef = { fontSize: 13, color: "#6B5B3E", lineHeight: 1.5, margin: "0 0 12px" };
const gfVerse = { fontSize: 11.5, color: "#8A6D3B", fontWeight: 600, borderTop: "1px solid #E7D6B4", paddingTop: 10, fontStyle: "italic" };
const gfScale = { display: "flex", alignItems: "center", gap: 14, padding: "8px 16px 2px" };
const gfScaleName = { width: 172 };
const gfRow = { display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" };
const gfRank = { width: 22, fontSize: 13, fontWeight: 700, textAlign: "center", flexShrink: 0, fontVariantNumeric: "tabular-nums" };
const gfRowName = { width: 150, fontSize: 14.5, fontWeight: 600, color: "#1C2B3A", flexShrink: 0 };
const gfTrack = { position: "relative", flex: 1, height: 12, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" };
const gfRowScore = { width: 34, textAlign: "right", fontSize: 14, fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" };
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
          {(() => {
            // Rank by score tie-group, not array index, so co-primaries (equal
            // score) share the same rank number and colour instead of being
            // split into gold #1 / teal #2. Falls back to index if a score is
            // missing.
            const uniqueScores = [...new Set(ranked.map((r) => r.score))].sort((a, b) => b - a);
            return ranked.map((r, i) => {
            const rk = uniqueScores.indexOf(r.score);
            const rank = rk < 0 ? i : rk;
            const color = rank === 0 ? "#C4923E" : rank === 1 ? "#2E7D8A" : "#8CA0B3";
            const m = FIVEFOLD[r.key] || {};
            return (
              <div key={r.key} style={{ borderBottom: "1px solid #F0F2F4", padding: "6px 4px" }}>
                <div style={barBtn}>
                  <span style={rRank}>{rank + 1}</span>
                  <span style={rName}>{r.key}</span>
                  <BarTrack frac={r.score / per} color={color} refs={[1 / 3, 2 / 3]} />
                  <span style={{ ...rScore, color, display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                    <span aria-hidden="true" style={{ fontSize: 9, color }}>{glyphFor(color)}</span>{r.score}
                  </span>
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
            });
          })()}
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
  const bandRefs = cutoffFracs(scored.slug === "rooted" ? ROOTED_BANDS : DOMAIN_BANDS, per);
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
              <ScoreBar key={d.domain} label={d.domain} frac={d.average / per} band={band}
                refs={bandRefs} scoreMinWidth={128}
                valueText={`${d.average.toFixed(1)} · ${band.label}`} />
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
                <BandMark color={bandFn(d.average).color} label={bandFn(d.average).label} style={{ fontSize: 13 }} />
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
                <BandMark color={bandFn(d.average).color} label={`${d.average.toFixed(1)} · ${bandFn(d.average).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
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

  // Discipleship Wheel — shared RadarChart with ring value labels, a dashed
  // Strength reference ring, and band-colored SCORE_STATE vertex shapes.
  const wheelAxes = order.map((name) => {
    const d = byName[name];
    const avg = d?.average || 0;
    const total = d ? Math.round(avg * (d.count || 10)) : 0;
    const maxTotal = (d?.count || 10) * per;
    const band = domainBand(avg);
    return { label: shortDisc(name), sub: `${total}/${maxTotal}`, subColor: COLOR.teal, value: avg, color: band.color, shape: shapeForColor(band.color) };
  });

  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your Discipleship Wheel</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", justifyContent: "center" }}>
          <RadarChart axes={wheelAxes} max={per} cx={170} cy={168} radius={108}
            viewBox="0 0 340 336" maxWidth={420} reference={4} referenceLabel="Strength"
            fill="rgba(46,125,138,.22)" stroke={COLOR.teal} ariaLabel="Discipleship Wheel" />
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
              <ScoreBar key={d.domain} label={d.domain} frac={d.average / per} band={band}
                refs={cutoffFracs(DOMAIN_BANDS, per)} scoreMinWidth={150}
                valueText={`${total}/${(d.count || 10) * per} · ${band.label}`} />
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
                <BandMark color={domainBand(d.average).color} label={`/ ${(d.count || 10) * per} · ${domainBand(d.average).label}`} style={{ fontSize: 13, fontVariantNumeric: NUM }} />
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
                <BandMark color={domainBand(d.average).color} label={`${Math.round(d.average * (d.count || 10))}/${(d.count || 10) * per} · ${domainBand(d.average).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
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
// Display name for a playback item's trait key. Items are keyed by O/C/E/A/N;
// Neuroticism (N) is reported to the reader as Emotional Stability.
function b5TraitName(k) {
  if (k === "N") return BIG5_TRAIT_META.ES.name;
  return BIG5_TRAIT_META[k]?.name || k;
}

function BigFiveReport({ scored }) {
  const [planDone, setPlanDone] = useState({}); // growth-plan checkbox state (in-memory)
  const traits = scored.traits || [];
  const facets = scored.facets || [];
  const playback = scored.playback || { high: [], low: [] };
  const planTargets = scored.plan_targets || [];
  const byKey = Object.fromEntries(traits.map((t) => [t.key, t]));
  const order = BIG5_TRAIT_ORDER.filter((k) => byKey[k]); // O, C, E, A, ES

  // Radar (0-100) via the shared RadarChart: ring value labels, a dashed
  // midpoint reference ring, trait-colored vertices carrying SCORE_STATE shapes.
  const b5Axes = order.map((k) => {
    const t = byKey[k];
    return { label: B5_SHORT[k], sub: t.pct, subColor: BIG5_TRAIT_META[k].color, value: t.pct, color: BIG5_TRAIT_META[k].color, shape: shapeForColor(B5_BAND_COLOR[t.band]) };
  });

  const sigStrengths = facets.filter((f) => f.pct >= 70);
  const lowPref = facets.filter((f) => f.pct <= 39);
  const highest = [...traits].sort((a, b) => b.pct - a.pct)[0];

  return (
    <>
      {/* Trait profile radar */}
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your trait profile</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", justifyContent: "center" }}>
          <RadarChart axes={b5Axes} max={100} cx={170} cy={168} radius={108}
            viewBox="-44 0 428 336" maxWidth={480} reference={50} referenceLabel="mid"
            fill="rgba(31,94,104,.16)" stroke={COLOR.tealDeep} ariaLabel="Big Five trait profile" />
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
                  <div style={{ fontSize: 30, fontWeight: 700, color: bc, lineHeight: 1, fontVariantNumeric: NUM }}>{t.pct}</div>
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

      {/* How your traits work together */}
      {(() => {
        const pairs = big5Interactions(traits);
        if (pairs.length === 0) return null;
        return (
          <section style={{ padding: "20px 0 4px" }} className="avoid-break">
            <div style={sectionLabel}>How your traits work together</div>
            {pairs.map((p) => (
              <div key={p.pairName} style={{ ...growCard, breakInside: "avoid" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{p.title}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#8CA0B3", marginTop: 2 }}>{p.aName} + {p.bName}</div>
                <p style={{ ...detailP, margin: "10px 0 0" }}>{p.body}</p>
              </div>
            ))}
            <p style={helper}>
              No single trait tells the whole story. These are the places two of your traits combine and shape
              each other, for better and for watching. Read them as a mirror for growth, never a verdict.
            </p>
          </section>
        );
      })()}

      {/* Facets */}
      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>Six expanded facets</div>
        <div style={chart}>
          {facets.map((f) => {
            const meta = BIG5_FACETS[f.key];
            return (
              <ScoreBar key={f.key} label={meta.name} frac={f.pct / 100}
                fillColor={meta.color} color={B5_BAND_COLOR[f.band]} refs={[0.4, 0.7]} scoreMinWidth={120}
                valueText={`${f.pct} · ${B5_BAND_LABEL[f.band]}`} />
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

      {/* What your answers show — plain playback of the reader's own responses */}
      {(playback.high.length > 0 || playback.low.length > 0) && (
        <section style={{ padding: "20px 0 4px" }}>
          <div style={sectionLabel}>What your answers show</div>
          <p style={{ ...helper, marginTop: 0, marginBottom: 16 }}>
            These are simply the statements you answered most decidedly, played back to you. They are not a
            verdict, just a mirror of your own words, and they show where your personality speaks most clearly.
          </p>
          <div style={ldGrid2}>
            <div style={{ ...growCard, borderTop: "3px solid #2E7D8A" }}>
              <div style={{ ...ldBlockH, color: "#2E7D8A" }}>Where you agreed most strongly</div>
              <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 8px" }}>The statements that sound the most like you.</p>
              <ul style={ldUl}>{playback.high.slice(0, 5).map((p, i) => (
                <li key={i} style={ldLi}>{p.text} <span style={{ color: "#8CA0B3", fontWeight: 600 }}>&middot; {b5TraitName(p.trait)}</span></li>
              ))}</ul>
            </div>
            <div style={{ ...growCard, borderTop: "3px solid #C4923E" }}>
              <div style={{ ...ldBlockH, color: "#B07C2E" }}>Where you disagreed most strongly</div>
              <p style={{ fontSize: 13, color: "#8CA0B3", margin: "0 0 8px" }}>The statements that sound the least like you.</p>
              <ul style={ldUl}>{playback.low.slice(0, 5).map((p, i) => (
                <li key={i} style={ldLi}>{p.text} <span style={{ color: "#8CA0B3", fontWeight: 600 }}>&middot; {b5TraitName(p.trait)}</span></li>
              ))}</ul>
            </div>
          </div>
        </section>
      )}

      {/* Your growth plan — targets the two most extreme traits, reusing bigfive.js content */}
      {planTargets.length > 0 && (
        <section style={{ padding: "20px 0 4px" }}>
          <div style={sectionLabel}>Your growth plan</div>
          <p style={{ ...helper, marginTop: 0, marginBottom: 16 }}>
            These two traits sit farthest from the middle, so they shape how you lead more than any others.
            Here are a few concrete steps for each, drawn straight from your trait report above. Pick one or
            two to carry this season, not all at once.
          </p>
          {planTargets.map((pt) => {
            const t = byKey[pt.key];
            if (!t) return null;
            const meta = BIG5_TRAIT_META[pt.key];
            const reportBand = pt.key === "ES" ? t.n_band : t.band;
            const rd = (pt.key === "ES" ? BIG5_TRAITS.N : BIG5_TRAITS[pt.key])[reportBand];
            if (!rd) return null;
            return (
              <div key={pt.key} style={{ ...growCard, borderLeft: `4px solid ${meta.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{meta.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B5_BAND_COLOR[t.band] }}>{pt.pct} &middot; {B5_BAND_LABEL[t.band]}</div>
                </div>
                <p style={{ fontSize: 13, color: "#8CA0B3", margin: "4px 0 10px" }}>Your growth edge in {meta.name.toLowerCase()}.</p>
                <div>
                  {rd.growth.slice(0, 3).map((step, i) => {
                    const id = `${pt.key}-${i}`;
                    return (
                      <label key={id} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid #F0F2F4", cursor: "pointer", alignItems: "flex-start" }}>
                        <input type="checkbox" checked={!!planDone[id]} onChange={(e) => setPlanDone({ ...planDone, [id]: e.target.checked })} style={{ marginTop: 3 }} />
                        <span style={{ fontSize: 14, color: "#3A4A58", lineHeight: 1.5, textDecoration: planDone[id] ? "line-through" : "none", opacity: planDone[id] ? 0.55 : 1 }}>{step}</span>
                      </label>
                    );
                  })}
                </div>
                <Block h="In practice" t={rd.application} />
              </div>
            );
          })}
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
  // A "slight" clarity means a near 50/50 lean that could flip the whole
  // 4-letter type. Name each slight preference and the type it would read as
  // if that one letter went the other way.
  const slightNotes = (scored.scales || [])
    .filter((s) => s && s.clarity === "slight")
    .map((s) => {
      const p = KDP_PAIRS.find((pp) => pp.key === s.key);
      if (!p) return null;
      const cur = s.letter;
      const alt = cur === p.a ? p.b : p.a;
      const flippedCode = String(code).split("").map((ch) => (ch === cur ? alt : ch)).join("");
      const curName = cur === p.a ? p.a_name : p.b_name;
      const altName = alt === p.a ? p.a_name : p.b_name;
      const altType = KDP_NAMES[flippedCode] || KDP_TYPES[flippedCode]?.name || flippedCode;
      return { label: p.label, curName, altName, flippedCode, altType };
    })
    .filter(Boolean);
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
        {slightNotes.length > 0 && (
          <div style={transitionBox}>
            {slightNotes.length === 1 ? (
              <>Your <strong>{slightNotes[0].label}</strong> preference is a slight lean, so your type could
              read differently there. You leaned {slightNotes[0].curName}, but {slightNotes[0].altName} is
              almost as strong, which would read as <strong>{slightNotes[0].flippedCode}</strong>{" "}
              ({slightNotes[0].altType}). Hold both.</>
            ) : (
              <>A few of your preferences are slight leans, so your type could read differently on them:{" "}
              {slightNotes.map((sn, i) => (
                <span key={sn.label}>{i > 0 ? "; " : ""}<strong>{sn.label}</strong> could flip to {sn.altName}{" "}
                ({sn.flippedCode}, {sn.altType})</span>
              ))}. Hold each lightly.</>
            )}
          </div>
        )}
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
  const ranked = Array.isArray(scored.ranked) ? scored.ranked : []; // [{type, score}] sorted desc
  const total = scored.total || 36;
  const per = scored.max_per ?? 8; // each type appears in this many pairs
  const top3 = ranked.slice(0, 3);
  // Adjacent equal scores in the top three are ties, not distinct ordinals.
  const tiedAt = (idx) => {
    const s = top3[idx]?.score;
    return (top3[idx - 1] && top3[idx - 1].score === s) || (top3[idx + 1] && top3[idx + 1].score === s);
  };
  const coreKey = String(scored.primary);
  const primaryType = ENNEAGRAM_TYPES[coreKey] || {};
  const close = ranked[1] && ranked[0] && ranked[0].score - ranked[1].score <= 1;

  // ---- Enneagram map geometry, all derived from live data ----
  // Fixed node coordinates on the circle (matches the reference template).
  const ENNEA_POS = {
    "1": [296.4, 85.1], "2": [347.7, 173.9], "3": [329.9, 275], "4": [251.3, 340.9],
    "5": [148.7, 340.9], "6": [70.1, 275], "7": [52.3, 173.9], "8": [103.6, 85.1], "9": [200, 50],
  };
  const nameOf = (k) => ENNEAGRAM_TYPES[String(k)]?.name || `Type ${k}`;
  const dyn = enneagramDynamics(coreKey); // may be null — guard every access
  const cNum = parseInt(coreKey, 10) || 0;
  // Wings are the two nodes adjacent to the core on the circle (core ±1, wrapping 1..9).
  const wrap = (n) => ((((n - 1) % 9) + 9) % 9) + 1;
  const wingKeys = cNum ? [String(wrap(cNum - 1)), String(wrap(cNum + 1))] : [];
  // Arrow targets come straight from the dynamics table (never assumed).
  const growthKey = dyn?.arrows?.growth?.toward != null ? String(dyn.arrows.growth.toward) : null;
  const stressKey = dyn?.arrows?.stress?.toward != null ? String(dyn.arrows.stress.toward) : null;

  const ROLE_STYLE = {
    core:   { r: 24, fill: "#C4923E", stroke: "#fff", sw: 3, tc: "#fff", fs: 19 },
    wing:   { r: 17, fill: "#E7F0F1", stroke: "#2E7D8A", sw: 2, tc: "#1F5E68", fs: 14 },
    growth: { r: 16, fill: "#EAF1EC", stroke: "#3E7C63", sw: 2, tc: "#3E7C63", fs: 14 },
    stress: { r: 14, fill: "#fff", stroke: "#B4703A", sw: 2, tc: "#B4703A", fs: 14 },
    plain:  { r: 14, fill: "#fff", stroke: "#CBD4DC", sw: 1.6, tc: "#5E7183", fs: 14 },
  };
  // Precedence protects against odd data: core > growth > stress > wing > plain.
  const roleOf = (k) =>
    k === coreKey ? "core" : k === growthKey ? "growth" : k === stressKey ? "stress"
      : wingKeys.includes(k) ? "wing" : "plain";
  // Draw the core node last so it sits on top of everything.
  const nodeKeys = Object.keys(ENNEA_POS).sort((a, b) => (a === coreKey ? 1 : 0) - (b === coreKey ? 1 : 0));
  // A dashed arrow from the core node toward a target, trimmed at both ends so
  // the arrowhead clears the target circle and the tail clears the core circle.
  const arrow = (targetKey) => {
    if (!targetKey || !ENNEA_POS[targetKey] || !ENNEA_POS[coreKey]) return null;
    const a = ENNEA_POS[coreKey], b = ENNEA_POS[targetKey];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const startPad = ROLE_STYLE.core.r + 5;
    const endPad = (ROLE_STYLE[roleOf(targetKey)]?.r || 14) + 12;
    return {
      x1: (a[0] + ux * startPad).toFixed(1), y1: (a[1] + uy * startPad).toFixed(1),
      x2: (b[0] - ux * endPad).toFixed(1), y2: (b[1] - uy * endPad).toFixed(1),
    };
  };
  const growthArrow = arrow(growthKey);
  const stressArrow = arrow(stressKey);

  const legend = [
    { sw: { background: "#C4923E" }, t: `Core · ${nameOf(coreKey)}`, s: `Type ${coreKey} — your home base` },
    {
      sw: { background: "#E7F0F1", border: "2px solid #2E7D8A" },
      t: wingKeys.length ? `Wings · ${wingKeys[0]} & ${wingKeys[1]}` : "Wings",
      s: wingKeys.length ? `${nameOf(wingKeys[0])} & ${nameOf(wingKeys[1])}` : "The two types beside your core",
    },
    ...(growthKey ? [{ sw: { background: "#EAF1EC", border: "2px solid #3E7C63" }, t: `In growth → ${nameOf(growthKey)}`, s: `Type ${growthKey} — where health takes you` }] : []),
    ...(stressKey ? [{ sw: { border: "2px solid #B4703A" }, t: `Under stress → ${nameOf(stressKey)}`, s: `Type ${stressKey} — where strain takes you` }] : []),
  ];

  // Ranking band mark: core = gold circle; then teal circle / gold diamond /
  // grey square by score fraction (mirrors the template's stateOf thresholds).
  const bandOf = (r) => {
    if (r.type === coreKey) return { color: "#C4923E", shape: "circle" };
    const f = per ? r.score / per : 0;
    if (f >= 0.6) return { color: "#2E7D8A", shape: "circle" };
    if (f >= 0.375) return { color: "#C4923E", shape: "diamond" };
    return { color: "#8CA0B3", shape: "square" };
  };
  const rankMark = (shape, color) => {
    const base = { width: 9, height: 9, background: color, display: "inline-block", flex: "none" };
    if (shape === "diamond") return <span style={{ ...base, transform: "rotate(45deg)" }} />;
    if (shape === "square") return <span style={base} />;
    return <span style={{ ...base, borderRadius: "50%" }} />;
  };

  return (
    <>
      {/* CORE TYPE — gold left-border card */}
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your core type</div>
        <div style={{ ...topCard, borderLeft: "4px solid var(--gold)", breakInside: "avoid" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 12.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep-text)", marginBottom: 6 }}>
            Type {coreKey} · {primaryType.tagline}
          </div>
          <h2 className="serif" style={{ fontSize: 32, margin: "0 0 12px", color: COLOR.navy, fontWeight: 500, letterSpacing: "-.01em" }}>
            {primaryType.name}
          </h2>
          <p style={{ ...topDef, fontSize: 16, margin: 0, lineHeight: 1.55 }}>{primaryType.essence}</p>
        </div>
        {close && (
          <div style={transitionBox}>
            Your top scores are close, so read your top two or three profiles below. The Enneagram is a tool
            for reflection, not a box. The type that rings truest as you read is usually yours.
          </div>
        )}
      </section>

      {/* THE ENNEAGRAM MAP — signature visual, static & print-safe */}
      <section style={{ padding: "22px 0 4px", breakInside: "avoid" }} className="avoid-break">
        <div style={sectionLabel}>Where you sit on the map</div>
        <h2 className="serif" style={{ ...discH2, margin: "0 0 4px" }}>The shape of your type</h2>
        <p style={{ ...topDef, fontSize: 14.5, maxWidth: 540, marginBottom: 14 }}>
          Your core is <strong style={{ color: COLOR.navy }}>Type {coreKey}, {primaryType.name}</strong>.
          {wingKeys.length > 0 && <> The two points beside it — Types {wingKeys[0]} and {wingKeys[1]} — are your <em>wings</em>.</>}
          {(growthKey || stressKey) && <> The arrows show where you move:{growthKey && <> toward <strong style={{ color: "#3E7C63" }}>{nameOf(growthKey)}</strong> when you grow</>}{growthKey && stressKey ? "," : ""}{stressKey && <> toward <strong style={{ color: "#B4703A" }}>{nameOf(stressKey)}</strong> under stress</>}.</>}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 28, alignItems: "center" }}>
          <svg viewBox="0 0 400 400" style={{ width: "100%", height: "auto" }} role="img" aria-label={`Enneagram map with Type ${coreKey} highlighted`}>
            <circle cx="200" cy="200" r="150" fill="none" stroke="var(--line)" strokeWidth="2" />
            <path d="M200 50 L329.9 275 L70.1 275 Z" fill="none" stroke="#CBD4DC" strokeWidth="1.4" />
            <path d="M296.4 85.1 L251.3 340.9 L347.7 173.9 L103.6 85.1 L148.7 340.9 L52.3 173.9 Z" fill="none" stroke="#CBD4DC" strokeWidth="1.4" />
            <defs>
              <marker id="ennea-grow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#3E7C63" /></marker>
              <marker id="ennea-stress" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#B4703A" /></marker>
            </defs>
            {growthArrow && (
              <line x1={growthArrow.x1} y1={growthArrow.y1} x2={growthArrow.x2} y2={growthArrow.y2}
                stroke="#3E7C63" strokeWidth="2.4" strokeDasharray="1 7" strokeLinecap="round" markerEnd="url(#ennea-grow)" />
            )}
            {stressArrow && (
              <line x1={stressArrow.x1} y1={stressArrow.y1} x2={stressArrow.x2} y2={stressArrow.y2}
                stroke="#B4703A" strokeWidth="2.4" strokeDasharray="1 7" strokeLinecap="round" markerEnd="url(#ennea-stress)" />
            )}
            {nodeKeys.map((k) => {
              const s = ROLE_STYLE[roleOf(k)];
              const [x, y] = ENNEA_POS[k];
              return (
                <g key={k}>
                  <circle cx={x} cy={y} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} />
                  <text x={x} y={y + s.fs * 0.34} fill={s.tc} fontSize={s.fs} fontWeight="700" textAnchor="middle" fontFamily={FONT_SANS}>{k}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {legend.map((L, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span style={{ flex: "none", width: 15, height: 15, borderRadius: "50%", marginTop: 2, ...L.sw }} />
                <div>
                  <div style={{ fontWeight: 700, color: COLOR.ink, fontSize: 13.5 }}>{L.t}</div>
                  <div style={{ fontSize: 12.5, color: COLOR.inkSoft }}>{L.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOP THREE — colored top-border cards */}
      <section style={{ padding: "24px 0 4px", breakInside: "avoid" }} className="avoid-break">
        <div style={sectionLabel}>Your top three</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {top3.map((r, i) => {
            const t = ENNEAGRAM_TYPES[r.type] || {};
            const isCore = r.type === coreKey;
            const accent = isCore ? COLOR.gold : COLOR.teal;
            const rankLabel = i === 0 ? "Core" : tiedAt(i) ? "Tied" : ordinal(i + 1);
            return (
              <div key={r.type} style={{ border: `1px solid ${COLOR.line}`, borderTop: `3px solid ${accent}`, borderRadius: 14, padding: "20px 18px", background: COLOR.paper }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: isCore ? "var(--gold-deep-text)" : COLOR.tealDeep }}>{rankLabel}</div>
                <div className="serif" style={{ fontSize: 19, color: COLOR.navy, margin: "8px 0 2px", fontWeight: 500 }}>{r.type} · {t.name}</div>
                <div style={{ fontSize: 34, fontWeight: 700, color: accent, fontVariantNumeric: NUM, lineHeight: 1 }}>
                  {r.score}<span style={{ fontSize: 15, color: COLOR.inkMute, fontWeight: 600 }}> / {per}</span>
                </div>
                <div style={{ fontSize: 12.5, color: COLOR.inkSoft, marginTop: 8 }}>{t.tagline}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ALL NINE TYPES — ranked bars, click to expand full profiles */}
      <section style={{ padding: "24px 0 8px" }}>
        <div style={sectionLabel}>All nine types</div>
        <h2 className="serif" style={{ ...discH2, margin: "0 0 16px" }}>Your full ranking</h2>
        <div style={chart}>
          {ranked.map((r, idx) => {
            const t = ENNEAGRAM_TYPES[r.type] || {};
            const band = bandOf(r);
            const isOpen = open === r.type;
            return (
              <div key={r.type} style={{ borderTop: idx === 0 ? "none" : "1px solid #F0F2F4" }}>
                <button onClick={() => setOpen(isOpen ? null : r.type)} className="bar"
                  style={{ width: "100%", display: "grid", gridTemplateColumns: "26px minmax(140px,1.15fr) 2.2fr 46px 16px", alignItems: "center", gap: 14, padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={rRank}>{r.type}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    {rankMark(band.shape, band.color)}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: COLOR.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: COLOR.inkMute }}>{t.tagline}</span>
                    </span>
                  </span>
                  <BarTrack frac={per ? r.score / per : 0} color={band.color} />
                  <span style={{ ...rScore, color: band.color, display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                    <span aria-hidden="true" style={{ fontSize: 9, color: band.color }}>{glyphFor(band.color)}</span>{r.score}
                  </span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                <div className={`ennea-study${isOpen ? " is-open" : ""}`} style={detail}>
                  <p style={detailP}>{t.essence}</p>
                  <Block h="Your gift to the body" t={t.gift} />
                  <Block h="Watch for" t={t.watch} />
                  <Block h="Where you grow" t={t.grows} />
                  <div style={devotionBox}>
                    <div style={{ ...blockH, color: "#B07C2E", marginBottom: 6 }}>A devotion · {t.verse}</div>
                    <p style={{ fontSize: 14, color: "#3A4A5A", lineHeight: 1.65, margin: 0 }}>{t.devotion}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={helper}>
          A type is a starting point for growth, not a label to live inside. The Enneagram is a mirror to help
          you see yourself and grow toward Christ, never the final word on who you are. In Him your truest
          identity is settled: loved, chosen, and being made new. Based on {total} choices.
        </p>
      </section>

      {/* DEEP DIVE — gift / watch / grow, from the core type */}
      <section style={{ padding: "24px 0 8px", breakInside: "avoid" }} className="avoid-break break-before">
        <div style={sectionLabel}>A closer look</div>
        <h2 className="serif" style={{ ...discH2, margin: "0 0 18px" }}>Inside {primaryType.name || "your type"}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: `1px solid ${COLOR.line}`, borderRadius: 14, padding: "22px 24px", background: COLOR.paper, breakInside: "avoid" }}>
            <div style={{ ...blockH, color: COLOR.tealDeep }}>Your gift to the body</div>
            <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{primaryType.gift}</p>
          </div>
          <div style={{ border: `1px solid ${COLOR.line}`, borderRadius: 14, padding: "22px 24px", background: COLOR.paper, breakInside: "avoid" }}>
            <div style={{ ...blockH, color: "var(--gold-deep-text)" }}>Watch for</div>
            <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{primaryType.watch}</p>
          </div>
        </div>
        <div style={{ border: `1px solid ${COLOR.line}`, borderRadius: 14, padding: "22px 24px", background: COLOR.mist, marginTop: 16, breakInside: "avoid" }}>
          <div style={{ ...blockH, color: COLOR.tealDeep }}>Where you grow</div>
          <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{primaryType.grows}</p>
        </div>
      </section>

      {/* DEVOTION — blush card */}
      {(primaryType.devotion || primaryType.verse) && (
        <div style={{ marginTop: 26, breakInside: "avoid", background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 20, padding: "34px 38px" }} className="avoid-break">
          <div aria-hidden="true" style={{ fontFamily: FONT_SERIF, fontSize: 52, lineHeight: 0.4, color: COLOR.gold, opacity: 0.55 }}>&ldquo;</div>
          <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 21, lineHeight: 1.4, color: COLOR.ink, margin: "6px 0 16px" }}>{primaryType.devotion}</div>
          <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--clay-text)", fontWeight: 700 }}>A Devotion · {primaryType.verse}</div>
        </div>
      )}

      {/* WINGS & GROWTH — wing cards + colored-left-border arrow cards */}
      {dyn && (
        <section style={{ padding: "24px 0 8px" }} className="avoid-break">
          <div style={sectionLabel}>Wings &amp; growth</div>
          <h2 className="serif" style={{ ...discH2, margin: "0 0 6px" }}>The colors around your core</h2>
          <p style={{ ...topDef, fontSize: 14.5, maxWidth: 560, marginBottom: 16 }}>
            Your wings are the two types beside yours that color how your core shows up. The arrows show where
            you tend to move when you are growing and when you are under strain, so you can lean into one and
            watch for the other.
          </p>
          {Object.values(dyn.wings || {}).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {Object.values(dyn.wings).map((w) => (
                <div key={w.label} style={{ border: `1px solid ${COLOR.line}`, borderRadius: 14, padding: "22px 24px", background: COLOR.paper, breakInside: "avoid" }}>
                  <div className="serif" style={{ fontSize: 18, color: COLOR.navy, fontWeight: 600 }}>{w.label}</div>
                  <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{w.body}</p>
                </div>
              ))}
            </div>
          )}
          {(dyn.arrows?.growth || dyn.arrows?.stress) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              {dyn.arrows?.growth && (
                <div style={{ border: `1px solid ${COLOR.line}`, borderLeft: "4px solid #3E7C63", borderRadius: 14, padding: "22px 24px", background: COLOR.paper, breakInside: "avoid" }}>
                  <div style={{ ...blockH, color: "#3E7C63" }}>In growth → toward {nameOf(dyn.arrows.growth.toward)}</div>
                  <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{dyn.arrows.growth.body}</p>
                </div>
              )}
              {dyn.arrows?.stress && (
                <div style={{ border: `1px solid ${COLOR.line}`, borderLeft: "4px solid #B4703A", borderRadius: 14, padding: "22px 24px", background: COLOR.paper, breakInside: "avoid" }}>
                  <div style={{ ...blockH, color: "#B07C2E" }}>Under stress → toward {nameOf(dyn.arrows.stress.toward)}</div>
                  <p style={{ ...topDef, margin: "10px 0 0", fontSize: 14.5 }}>{dyn.arrows.stress.body}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}
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
                <BandMark color={band.color} label={`${s.score}/${per} · ${band.label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
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
                  <BarTrack frac={s.score / per} color={band.color} refs={cutoffFracs(EFMI_BANDS, per)} />
                  <span style={{ ...rScore, color: band.color, display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                    <span aria-hidden="true" style={{ fontSize: 9, color: band.color }}>{glyphFor(band.color)}</span>{s.score}
                  </span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                <div className={`ennea-study${isOpen ? " is-open" : ""}`} style={detail}>
                  <p style={detailP}>{m.short}</p>
                  <p style={{ ...detailP, margin: 0 }}>{m.body}</p>
                  {m.verse && <div style={refLine}>{m.verse}</div>}
                </div>
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
  // Derive every count from the data. A single (unmarried) candidate drops
  // "Spousal Cooperation", so the totals shift; never hardcode them.
  const totalCount = order.length;
  const primaryCount = domains.filter((d) => d.primary).length
    || order.filter((n) => PLANTER_PRIMARY.includes(n)).length;
  // Near-tie among the top-3 "excel" characteristics: equal averages aren't a rank.
  const excelTie = top3.some((d, i) => i > 0 && top3[i - 1] && d.average === top3[i - 1].average);

  // Readiness radar — shared RadarChart with a numbered legend (names are too
  // long for the tips). Gold vertices mark the five primary characteristics;
  // vertex shape encodes the band (grayscale-safe). Dashed Strength reference.
  const planterAxes = order.map((n) => {
    const avg = byName[n]?.average || 0;
    const isP = PLANTER_PRIMARY.includes(n);
    return { value: avg, primary: isP, color: isP ? COLOR.gold : COLOR.tealDeep, shape: shapeForColor(domainBand(avg).color), numColor: isP ? "#B07C2E" : "#5E7183" };
  });

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
            <span style={{ color: "#8CA0B3" }}> · the {primaryCount} primary characteristics count double.</span>
          </div>
        </div>
      </section>

      <section style={{ padding: "20px 0 4px" }}>
        <div style={sectionLabel}>All {totalCount} characteristics</div>
        <div style={{ ...chart, padding: "18px 12px", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 24 }}>
          <RadarChart axes={planterAxes} max={per} cx={175} cy={172} radius={108}
            viewBox="0 0 350 344" maxWidth={380} numbered reference={4} referenceLabel="Strength"
            fill="rgba(46,125,138,.20)" stroke={COLOR.teal} ariaLabel="Readiness radar" />
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "1fr", gap: 5, minWidth: 190 }}>
            {order.map((n, i) => {
              const isP = PLANTER_PRIMARY.includes(n);
              return (
                <li key={`leg-${n}`} style={{ display: "flex", gap: 9, alignItems: "baseline", fontSize: 11.5, color: "#4A5B6D", lineHeight: 1.35 }}>
                  <span style={{ flexShrink: 0, width: 17, height: 17, borderRadius: 999, background: isP ? "#F0E4CB" : "#EEF1F4", color: isP ? "#B07C2E" : "#5E7183", fontWeight: 700, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                  <span>{n}{isP && <span style={{ color: "#C4923E" }}> ★</span>}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div style={chart}>
          {domains.map((d) => {
            const band = domainBand(d.average);
            return (
              <ScoreBar key={d.domain} frac={d.average / per} band={band}
                refs={cutoffFracs(DOMAIN_BANDS, per)} scoreMinWidth={128}
                label={<>{d.domain}{d.primary && <span style={primaryTag}>Primary</span>}</>}
                valueText={`${d.average.toFixed(1)} · ${band.label}`} />
            );
          })}
        </div>
        <p style={helper}>
          The {primaryCount} gold points are the primary characteristics that carry the readiness decision. A strong
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
                <BandMark color={domainBand(d.average).color} label={`${d.average.toFixed(1)} · ${domainBand(d.average).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
              </div>
              <p style={{ ...detailP, margin: "8px 0 0" }}>{m.blurb}</p>
              <Block h="Lean into it" t={m.leanIn} />
            </div>
          );
        })}
        {excelTie && (
          <p style={helper}>Some of these scored the same, so treat them as equally strong rather than a strict order.</p>
        )}
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
                <BandMark color={domainBand(d.average).color} label={`${d.average.toFixed(1)} · ${domainBand(d.average).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
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
  // When the scorer flags a close level (near 50/50), present the verdict
  // honestly as "between two levels" rather than one confident answer. Falls
  // back to the existing transition box when the new field is absent.
  const altLevel = scored.alt_level != null ? GROWTH_LEVELS[scored.alt_level] : null;
  const showClose = scored.level_close === true && !!altLevel;
  const marginText = typeof scored.margin === "number"
    ? ` (only ${scored.margin} point${scored.margin === 1 ? "" : "s"} apart)`
    : "";
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
        {showClose && (
          <div style={transitionBox}>
            This reading is close. Your church sits between {winner.name} and {altLevel.name}
            {marginText}, so both descriptions apply. Read them together and talk it through with your
            leadership team rather than settling on one.
          </div>
        )}
        {t && !showClose && (
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
              <ScoreBar key={l.level} frac={l.score / per} color={color} refs={[0.5]}
                nameStyle={{ fontWeight: isWin ? 700 : 600 }}
                label={g.name}
                valueText={<>{l.score}<span style={{ color: "#B4BEC9", fontWeight: 400 }}>/{per}</span></>} />
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
const discTag = (c) => ({
  fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase",
  color: c, background: `${c}1A`, border: `1px solid ${c}55`, borderRadius: 999, padding: "2px 8px",
});
// Each DISC dimension's signature color (matches the hand-designed template).
const DISC_DIM_COLOR = { D: "#B4703A", I: "#C4923E", S: "#2E7D8A", C: "#5E7183" };
// Which corner of the 2x2 quadrant map each dimension anchors (plot coords).
// Horizontal: task (D/C, left) ↔ people (I/S, right).
// Vertical: outgoing (D/I, top) ↔ reserved (S/C, bottom).
const DISC_QUAD_CORNER = { D: [100, 100], I: [240, 100], S: [240, 240], C: [100, 240] };

function DiscReport({ scored }) {
  const b = DISC_BLENDS[scored?.blend] || {};
  const per = scored?.max_per || 35;
  const pct = (s) => Math.round(((s || 0) / per) * 100);
  const dims = Array.isArray(scored?.dims) ? scored.dims : [];
  // Rank the four dimensions by score, highest first, so the blend reads
  // top-down. Percentages make intensity clearer than a raw /35 sum.
  const byScore = [...dims].sort((a, b2) => (b2.score || 0) - (a.score || 0));
  const scoreOf = (k) => dims.find((d) => d.key === k)?.score ?? 0;
  const pctOf = (k) => pct(scoreOf(k));
  const gapPct = (i, j) => (byScore[i] && byScore[j] ? pct(byScore[i].score) - pct(byScore[j].score) : 0);

  // How clear is each part of the blend?
  const primaryGap = gapPct(0, 1);      // #1 vs #2
  const secondaryGap = gapPct(1, 2);    // #2 vs #3 — this is what makes the
                                        // SECONDARY letter ambiguous (the real
                                        // story when a blend "doesn't feel obvious").
  const primaryClear = primaryGap >= 12;
  const secondaryAmbiguous = secondaryGap <= 8;

  const primaryName = DISC_DIMS[scored?.primary] || "";
  const secondaryName = DISC_DIMS[scored?.secondary] || "";
  const altSecondaryKey = secondaryAmbiguous && byScore[2] ? byScore[2].key : null;
  const altBlendKey = altSecondaryKey ? scored.primary + altSecondaryKey : null;
  const altBlend = altBlendKey ? DISC_BLENDS[altBlendKey] : null;

  // "You" dot on the quadrant map: a weighted centroid of the four corner
  // anchors (weighted by each dimension's percentage), with the displacement
  // from center amplified so a clear lead dimension reads out into its corner
  // while a balanced profile stays central. Purely data-driven, then clamped.
  const wSum = ["D", "I", "S", "C"].reduce((a, k) => a + pctOf(k), 0) || 1;
  let dotX = ["D", "I", "S", "C"].reduce((a, k) => a + pctOf(k) * DISC_QUAD_CORNER[k][0], 0) / wSum;
  let dotY = ["D", "I", "S", "C"].reduce((a, k) => a + pctOf(k) * DISC_QUAD_CORNER[k][1], 0) / wSum;
  const AMP = 1.7;
  dotX = Math.max(62, Math.min(278, 170 + (dotX - 170) * AMP));
  dotY = Math.max(62, Math.min(272, 170 + (dotY - 170) * AMP));
  const dotColor = DISC_DIM_COLOR[scored?.primary] || "#C4923E";
  const outgoing = ["D", "I"].includes(scored?.primary);
  const peopleFacing = ["I", "S"].includes(scored?.primary);
  const quadCaption = `${outgoing ? "Outgoing" : "Reserved"} and ${peopleFacing ? "people-facing" : "task-focused"}, leaning ${primaryName || "your lead dimension"}${secondaryName ? `, with ${secondaryName} close behind` : ""}.`;

  // Radar axes in the template's clock order: Drive (top), Influence (right),
  // Steadiness (bottom), Conscientiousness (left).
  const radarAxes = ["D", "I", "S", "C"].map((k) => {
    const p = pctOf(k);
    return { label: DISC_DIMS[k], sub: p, subColor: DISC_DIM_COLOR[k], value: p, color: DISC_DIM_COLOR[k], shape: shapeForColor(DISC_DIM_COLOR[k]) };
  });

  const rows = discDimensions(dims.map((d) => ({ key: d.key, pct: pct(d.score) })));
  const LEVEL = { high: "High", moderate: "Moderate", low: "Low" };
  const levelBadge = (level) =>
    level === "high" ? { color: "#1F5E68", background: "#EEF3F6" }
      : level === "moderate" ? { color: "#8A6420", background: "#F0E4CB" }
        : { color: "#5E7183", background: "#EEF1F4" };

  return (
    <>
      {/* YOUR BLEND — gold tile + figure/title + plain-language lead sentence */}
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your blend</div>
        <div style={discBlendCard}>
          <div style={discBlendTile} className="serif">{scored?.blend}</div>
          <div style={{ minWidth: 0 }}>
            <div style={discBlendRank}>{primaryName}{secondaryName ? ` · ${secondaryName}` : ""}</div>
            <h2 className="serif" style={{ fontSize: 28, margin: "0 0 10px", color: "#1B3A57", fontWeight: 500, letterSpacing: "-.01em" }}>
              {b.figure}{b.figure && b.title ? ", " : ""}{b.title}
            </h2>
            <p style={{ ...detailP, margin: 0, fontSize: 15.5 }}>
              Your <strong style={{ color: "#1B3A57" }}>{primaryName}</strong> ({pctOf(scored?.primary)}%) leads the way
              {primaryClear ? ", clearly out front," : secondaryName ? `, with ${secondaryName} close behind,` : ","}{" "}
              {secondaryName && <>and <strong style={{ color: "#1B3A57" }}>{secondaryName}</strong> ({pctOf(scored?.secondary)}%) backs it up. </>}
              That combination is what shapes the {b.title || "your"} blend.
            </p>
          </div>
        </div>
      </section>

      {/* HOW YOU'RE WIRED — quadrant map + four-dimension radar */}
      <section style={{ padding: "18px 0 8px", breakInside: "avoid" }} className="avoid-break">
        <div style={sectionLabel}>How you're wired</div>
        <h2 className="serif" style={discH2}>Your position at a glance</h2>
        <div style={discChartRow}>
          {/* DISC quadrant map */}
          <div style={discChartCard}>
            <div style={discChartTitle}>DISC quadrant map</div>
            <svg viewBox="0 0 340 340" style={{ width: "100%", height: "auto" }} role="img" aria-label="DISC quadrant map showing your position">
              <rect x="30" y="30" width="280" height="280" rx="16" fill="#F6F8FA" stroke="#E7E9EC" />
              <line x1="170" y1="30" x2="170" y2="310" stroke="#E7E9EC" />
              <line x1="30" y1="170" x2="310" y2="170" stroke="#E7E9EC" />
              <g fontFamily={FONT_SANS} textAnchor="middle">
                <text x="100" y="60" fontSize="20" fontWeight="800" fill="#B4703A">D</text>
                <text x="100" y="78" fontSize="10.5" fill="#8CA0B3">Drive</text>
                <text x="240" y="60" fontSize="20" fontWeight="800" fill="#C4923E">I</text>
                <text x="240" y="78" fontSize="10.5" fill="#8CA0B3">Influence</text>
                <text x="100" y="290" fontSize="20" fontWeight="800" fill="#5E7183">C</text>
                <text x="100" y="272" fontSize="10.5" fill="#8CA0B3">Conscientious</text>
                <text x="240" y="290" fontSize="20" fontWeight="800" fill="#2E7D8A">S</text>
                <text x="240" y="272" fontSize="10.5" fill="#8CA0B3">Steadiness</text>
              </g>
              <g fontFamily={FONT_SANS} fontSize="9" fill="#8CA0B3" textAnchor="middle">
                <text x="170" y="22">Outgoing</text>
                <text x="170" y="326">Reserved</text>
              </g>
              <circle cx={dotX.toFixed(1)} cy={dotY.toFixed(1)} r="26" fill={dotColor} opacity="0.14" />
              <circle cx={dotX.toFixed(1)} cy={dotY.toFixed(1)} r="10" fill={dotColor} stroke="#fff" strokeWidth="3" />
              <text x={dotX.toFixed(1)} y={(dotY + 40).toFixed(1)} fontFamily={FONT_SANS} fontSize="10.5" fontWeight="700" fill="#1B3A57" textAnchor="middle">You</text>
            </svg>
            <p style={discChartCaption}>{quadCaption}</p>
          </div>
          {/* Four-dimension radar */}
          <div style={discChartCard}>
            <div style={discChartTitle}>Four-dimension profile</div>
            <RadarChart axes={radarAxes} max={100} reference={50} ringLabels={false} maxWidth={320}
              fill="rgba(46,125,138,.16)" stroke="#2E7D8A" ariaLabel="Your four DISC dimensions" />
            <p style={discChartCaption}>Each dimension is scored against itself, 0 to 100, never against other people.</p>
          </div>
        </div>
      </section>

      {/* RANKED DIMENSION BARS */}
      <section style={{ padding: "18px 0", breakInside: "avoid" }} className="avoid-break">
        <div style={sectionLabel}>Your four dimensions</div>
        <h2 className="serif" style={discH2}>Ranked strongest to weakest</h2>
        <div style={{ ...chart, marginTop: 4 }}>
          {byScore.map((d) => {
            const isPrimary = d.key === scored?.primary;
            const isSecondary = d.key === scored?.secondary;
            const isTop = isPrimary || isSecondary;
            const color = isPrimary ? "#C4923E" : isSecondary ? "#2E7D8A" : "#8CA0B3";
            const p = pct(d.score);
            return (
              <ScoreBar key={d.key} frac={(d.score || 0) / per} color={color} refs={[0.5]} opacity={isTop ? 1 : 0.72}
                nameStyle={{ fontWeight: isTop ? 800 : 600, display: "flex", alignItems: "center", gap: 8 }}
                label={<>{DISC_DIMS[d.key]}{isPrimary && <span style={discTag("#C4923E")}>Primary</span>}{isSecondary && <span style={discTag("#2E7D8A")}>Secondary</span>}</>}
                valueText={<>{p}<span style={{ color: "#B4BEC9", fontWeight: 400, fontSize: 12 }}>%</span></>} />
            );
          })}
        </div>
      </section>

      {/* ONE HONEST NOTE — secondary-tie callout on a blush card */}
      {secondaryAmbiguous && altBlend && (
        <div style={discHonestNote} className="avoid-break">
          <div style={{ ...sectionLabel, color: "#B07C2E", marginBottom: 10 }}>One honest note</div>
          <p style={{ margin: 0, fontSize: 14.5, color: "#1C2B3A", lineHeight: 1.6 }}>
            Your <strong>{secondaryName}</strong> and <strong>{DISC_DIMS[altSecondaryKey]}</strong>{" "}
            scored almost the same ({pct(byScore[1].score)}% and {pct(byScore[2].score)}%), so your secondary
            style is close to a tie. {primaryName} is clearly your lead, but the trait riding alongside it could
            read as either. You may also recognize yourself in the <strong>{altBlendKey} blend ({altBlend.figure}, {altBlend.title})</strong> — read both and keep what fits.
          </p>
        </div>
      )}
      {!secondaryAmbiguous && primaryGap <= 6 && (
        <div style={discHonestNote} className="avoid-break">
          <div style={{ ...sectionLabel, color: "#B07C2E", marginBottom: 10 }}>One honest note</div>
          <p style={{ margin: 0, fontSize: 14.5, color: "#1C2B3A", lineHeight: 1.6 }}>
            Your top two dimensions came out very close, so which one leads was a near call. Both{" "}
            {primaryName} and {secondaryName} strongly shape how you are wired.
          </p>
        </div>
      )}

      {/* DIMENSION BY DIMENSION — colored left-border detail cards */}
      <section style={{ padding: "18px 0 8px", breakBefore: "page" }} className="break-before">
        <div style={sectionLabel}>Dimension by dimension</div>
        <h2 className="serif" style={discH2}>What each one means for you</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ border: "1px solid #E7E9EC", borderLeft: `4px solid ${DISC_DIM_COLOR[r.key]}`, borderRadius: 14, padding: "22px 26px", background: "#fff", breakInside: "avoid" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div className="serif" style={{ fontSize: 19, color: "#1B3A57", fontWeight: 600 }}>{r.name}{r.title ? ` · ${r.title}` : ""}</div>
                <span style={{ ...discLevelBadge, ...levelBadge(r.level) }}>{LEVEL[r.level]}</span>
              </div>
              <p style={{ ...detailP, margin: "12px 0 0" }}>{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* IN PRACTICE — 2x2 strengths grid */}
      <section style={{ padding: "18px 0 8px", breakInside: "avoid" }} className="avoid-break">
        <div style={sectionLabel}>In practice</div>
        <h2 className="serif" style={discH2}>Leading from your design</h2>
        <div style={discGrid}>
          <DiscGridCard eyebrow="Strengths" ec="#1F5E68" t={b.strengths} />
          <DiscGridCard eyebrow="Watch-outs" ec="#8A6420" t={b.watchouts} />
          <DiscGridCard eyebrow="Best used for" ec="#1F5E68" t={b.bestFor} />
          <DiscGridCard eyebrow="Growth challenge" ec="#1F5E68" t={b.growth} bg="#F6F8FA" />
        </div>
        <p style={{ ...helper, maxWidth: 600 }}>
          A blend is a description of how you're wired, not a limit on how God can use you. Lead from
          your actual design.
        </p>
      </section>
    </>
  );
}
// A single cell in the DISC "In practice" 2x2 grid.
function DiscGridCard({ eyebrow, ec, t, bg = "#fff" }) {
  if (!t) return null;
  return (
    <div style={{ border: "1px solid #E7E9EC", borderRadius: 14, padding: "22px 24px", background: bg, breakInside: "avoid" }}>
      <div style={{ ...sectionLabel, color: ec, marginBottom: 10 }}>{eyebrow}</div>
      <p style={{ margin: 0, fontSize: 14, color: "#4A5B6D", lineHeight: 1.55 }}>{t}</p>
    </div>
  );
}
const discBlendCard = { border: "1px solid #E7E9EC", borderLeft: "4px solid #C4923E", borderRadius: 16, padding: "26px 30px", background: "#fff", display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap", breakInside: "avoid" };
const discBlendTile = { flex: "none", width: 88, height: 88, borderRadius: 20, background: "linear-gradient(135deg,#C4923E,#A87A2E)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 34, color: "#fff", boxShadow: "var(--shadow-gold,0 8px 24px rgba(168,122,46,.28))", fontVariantNumeric: NUM };
const discBlendRank = { fontFamily: FONT_SERIF, fontSize: 12.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#8A6420", marginBottom: 4 };
const discH2 = { fontSize: 23, margin: "12px 0 16px", color: "#1B3A57", fontWeight: 500, letterSpacing: "-.01em" };
const discChartRow = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };
const discChartCard = { border: "1px solid #E7E9EC", borderRadius: 16, padding: "22px 22px 18px", background: "#fff", breakInside: "avoid" };
const discChartTitle = { fontSize: 13, fontWeight: 700, color: "#1B3A57", marginBottom: 10 };
const discChartCaption = { fontSize: 12.5, margin: "8px 0 0", color: "#4A5B6D", lineHeight: 1.5 };
const discHonestNote = { marginTop: 8, marginBottom: 8, background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 16, padding: "24px 28px", breakInside: "avoid" };
const discLevelBadge = { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap" };
const discGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 4 };

/* ---------------- Pastor Profile (3 pillars, 14 domains) ---------------- */
function PastorReport({ scored }) {
  const per = scored.scale_max || 5;
  const domains = scored.domains;
  const top2 = domains.slice(0, 2);
  const bottom2 = [...domains].slice(-2).reverse();
  // The 2nd pick (strong or focus) is only a real pick when it clears the next
  // domain by a margin. Within ~0.2 on the 1-5 scale, say it was close.
  const n = domains.length;
  const strongClose = domains[1] && domains[2] && Math.abs(domains[1].average - domains[2].average) <= 0.2;
  const focusClose = domains[n - 2] && domains[n - 3] && Math.abs(domains[n - 2].average - domains[n - 3].average) <= 0.2;
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
                  <BandMark color={band.color} label={band.label} style={{ fontSize: 13 }} />
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
                    <ScoreBar key={d.domain} label={d.domain} frac={d.average / per} band={band}
                      refs={cutoffFracs(DOMAIN_BANDS, per)} scoreMinWidth={128}
                      valueText={`${d.average.toFixed(1)} · ${band.label}`} />
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
                <BandMark color={domainBand(d.average).color} label={domainBand(d.average).label} style={{ fontSize: 13 }} />
              </div>
            </div>
          ))}
        </div>
        {strongClose && (
          <p style={helper}>The next domain scored nearly as high, so this second pick was close.</p>
        )}
      </section>

      <section style={{ padding: "20px 0 8px" }}>
        <div style={sectionLabel}>Where to focus</div>
        {bottom2.map((d) => {
          const m = PASTOR_DOMAINS[d.domain] || {};
          return (
            <div key={d.domain} style={growCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 19, color: "#1C2B3A" }}>{d.domain}</div>
                <BandMark color={domainBand(d.average).color} label={`${d.average.toFixed(1)} · ${domainBand(d.average).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
              </div>
              <Block h="A next step" t={m.step} />
            </div>
          );
        })}
        {focusClose && (
          <p style={helper}>The next domain scored nearly as low, so this second pick was close.</p>
        )}
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
            <ScoreBar key={d.domain} label={d.domain} frac={d.average / per} band={band}
              refs={cutoffFracs(DOMAIN_BANDS, per)} valueText={`${d.average}`} />
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

/* ---------------- Shared report cover ----------------
   The navy gradient cover that opens every report, matching the hand-designed
   print templates: white Mission USA logo top-left, a faint gold line-art motif
   top-right, then a gold kicker + serif name + a generic one-line result summary
   (headlineFor), with date / email / a muted secondary line on the right. Church
   co-branding rides as a white chip beside the logo. Data-driven and defensive:
   every field guards against a missing meta / contact / scored. Prints as a
   lightened card (white ground, navy ink, gold top rule) — see PRINT_CSS. */
function ReportCover({ meta, contact, brand, scored }) {
  const c = contact || {};
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Your results";
  const sub = typeof meta?.subtitle === "string" ? meta.subtitle : "";
  const kickerText = `${meta?.name || "Assessment"}${sub && sub.length <= 16 ? ` · ${sub}` : ""}`;
  let summary = "";
  try { summary = headlineFor(scored) || ""; } catch { summary = ""; }
  const dateStr = meta?.created_at
    ? new Date(meta.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";
  const secondary = sub && sub.length > 16 ? sub : "Mission USA Assessments";
  return (
    <header className="report-cover" style={coverCard}>
      {/* Faint gold line-art motif in the top-right corner (opacity ~.12). */}
      <svg className="cover-motif" viewBox="0 0 300 300" width="300" height="300" aria-hidden="true"
        style={{ position: "absolute", right: -40, top: -20, opacity: 0.12, pointerEvents: "none" }}>
        <g fill="none" stroke="#E4CE8C" strokeWidth="1.5">
          <rect x="40" y="40" width="220" height="220" rx="18" />
          <line x1="150" y1="40" x2="150" y2="260" />
          <line x1="40" y1="150" x2="260" y2="150" />
          <circle cx="150" cy="150" r="70" />
        </g>
      </svg>
      <div style={{ position: "relative" }}>
        <div className="cover-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 34, gap: 16 }}>
          <img className="cover-logo" src="/musa-logo-white-h.png" alt="Mission USA Assessments"
            style={{ height: 36, width: "auto", display: "block" }} />
          {/* Print-only navy wordmark: the white PNG logo would vanish on the
              lightened print cover, so we swap in ink text for print. */}
          <div className="cover-print-mark serif" aria-hidden="true" style={{ fontSize: 20, fontWeight: 600, color: COLOR.navy, letterSpacing: ".01em" }}>
            MISSION USA <span style={{ color: COLOR.gold }}>— Assessments</span>
          </div>
          {brand?.logo_url && (
            <span className="brand-chip" style={{ background: "#fff", borderRadius: 8, padding: "6px 10px", display: "inline-flex" }}>
              <img src={brand.logo_url} alt={brand.name || ""} style={{ height: 32, width: "auto", display: "block" }} />
            </span>
          )}
        </div>
        <div className="cover-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="cover-kicker" style={coverKicker}>{kickerText}</div>
            <h1 className="serif cover-name" style={coverName}>{name}</h1>
            {summary && <div className="cover-summary" style={coverSummary}>{summary}</div>}
          </div>
          <div className="cover-meta" style={coverMeta}>
            {dateStr && <div style={{ color: "#C7D3DF" }}>{dateStr}</div>}
            {c.email && <div>{c.email}</div>}
            <div style={{ marginTop: 8, color: "#6E8298" }}>{secondary}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
const coverCard = { position: "relative", overflow: "hidden", background: "linear-gradient(155deg,#1B3A57 0%,#122A44 100%)", borderRadius: 26, padding: "44px 46px 40px", color: "#fff", margin: "26px 0 0" };
const coverKicker = { fontSize: 12, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", marginBottom: 18 };
const coverName = { fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 44, lineHeight: 1.02, letterSpacing: "-.015em", margin: 0 };
const coverSummary = { marginTop: 14, fontSize: 15, color: "#C7D3DF", lineHeight: 1.5 };
const coverMeta = { textAlign: "right", fontSize: 12.5, color: "#93A7BC", lineHeight: 1.7, fontVariantNumeric: NUM };

// Shared style constants. Colors reference the reportTokens palette (COLOR.*)
// and chart contract (CHART.*) so the report has a single source of truth for
// its ink/teal/gold/navy/line values instead of repeated raw hexes.
const hd = { background: `linear-gradient(135deg,${COLOR.navy},${COLOR.navyDeep})`, color: COLOR.paper, padding: "40px 0 34px" };
const hdRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 600, marginBottom: 10 };
const hName = { fontWeight: 500, fontSize: 38, margin: 0 };
const hMeta = { fontSize: 13.5, textAlign: "right", lineHeight: 1.5 };
const actions = { display: "flex", gap: 12, padding: "24px 0 6px", flexWrap: "wrap" };
const savedNote = { display: "flex", gap: 10, alignItems: "center", background: "#EAF3F4", border: "1px solid #CFE3E5", color: COLOR.tealDeep, borderRadius: 12, padding: "12px 16px", fontSize: 14, lineHeight: 1.5, margin: "6px 0 22px" };
const sectionLabel = { fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: COLOR.teal, fontWeight: 700, marginBottom: 18 };
const topGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const topCard = { background: COLOR.paper, border: `1px solid ${COLOR.line}`, borderRadius: 16, padding: "22px 22px 24px" };
const topRank = { fontFamily: FONT_SERIF, fontSize: 14, color: COLOR.gold, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" };
const topName = { fontWeight: 500, fontSize: 23, marginTop: 4 };
const scoreRow = { display: "flex", alignItems: "baseline", gap: 5, margin: "6px 0 12px" };
const topScore = { fontSize: 34, fontWeight: 700, color: COLOR.navy, lineHeight: 1, fontVariantNumeric: NUM };
const topDef = { fontSize: 13.5, color: COLOR.inkSoft, margin: 0, lineHeight: 1.5 };
const helper = { fontSize: 13.5, color: COLOR.inkSoft, marginTop: 20, lineHeight: 1.55, maxWidth: 640 };
const chart = { background: COLOR.paper, border: `1px solid ${COLOR.line}`, borderRadius: 16, padding: "6px 10px", overflow: "hidden" };
const barBtn = { width: "100%", display: "grid", gridTemplateColumns: "26px 150px 1fr 46px 16px", alignItems: "center", gap: 12, padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" };
const rowGrid = { display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid #F0F2F4" };
const rRank = { fontSize: 13, color: COLOR.inkMute, fontWeight: 600, fontVariantNumeric: NUM };
const rName = { fontSize: 14.5, fontWeight: 600, color: COLOR.ink };
const track = { height: 10, background: CHART.trackBg, borderRadius: 999, overflow: "hidden", width: "100%" };
const rScore = { fontSize: 15, fontWeight: 700, textAlign: "right", fontVariantNumeric: NUM };
const detail = { padding: "4px 16px 22px 52px" };
const detailP = { fontSize: 14.5, color: "#2B3A4A", margin: "0 0 14px", lineHeight: 1.55 };
const blockH = { fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: COLOR.teal, fontWeight: 700, marginBottom: 5 };
const refLine = { fontSize: 12, color: "#8CA0B3", fontStyle: "italic", marginTop: 12 };
const devotionBox = { background: "#FBF6EC", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", marginTop: 8 };
const primaryTag = { fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#B07C2E", background: "#F5EFE6", border: "1px solid #EADFC9", padding: "2px 7px", borderRadius: 999, marginLeft: 8, verticalAlign: "middle" };
const growCard = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const transitionBox = { background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 12, padding: "14px 16px", marginTop: 14, fontSize: 14, color: "#4A5B6D", lineHeight: 1.55 };
const ft = { textAlign: "center", padding: "34px 0 0", fontSize: 12.5, color: "#7C8A9C" };

/* ============================================================================
   SHARED CHART PRIMITIVES (reportTokens design system)
   One ScoreBar, one BarTrack, one RadarChart used by every report so bars and
   radars read as one master-designed system: banded fills, tabular value
   labels, faint band-cutoff reference lines, and a grayscale-safe SCORE_STATE
   shape mark (●◆■) paired with every band color.
   ============================================================================ */

// SCORE_STATE shape -> printable glyph. Pairing color with a mark keeps meaning
// alive in grayscale / for color-blind readers (never color-only).
const SHAPE_GLYPH = { circle: "●", diamond: "◆", square: "■" };
// Map any band color used across the reports to a SCORE_STATE shape. High/teal
// families -> circle, moderate/gold -> diamond, low/clay/grey -> square.
function shapeForColor(color) {
  const c = String(color || "").toUpperCase();
  if (/(2E7D8A|1F5E68|1F7A4D|4E8C93|3E7C63|2E7D8A)/.test(c)) return "circle";
  if (/(C4923E|C08E38|B07C2E|A87A2E|E0B25A|D9A96A|E4CE8C)/.test(c)) return "diamond";
  return "square"; // 8CA0B3, B4653A, 9AA7B3, B4BEC9, 8A6D3B, etc.
}
const glyphFor = (color) => SHAPE_GLYPH[shapeForColor(color)];
// Turn a bands array ([{min},...]) into reference fractions on a 0..max scale,
// dropping the 0 floor (it isn't a meaningful cutoff line).
const cutoffFracs = (bands, max) =>
  (bands || []).map((b) => b.min).filter((m) => m > 0 && m < max).map((m) => m / max);

// The shared track atom: unfilled track + banded fill + faint reference ticks.
// Used inside ScoreBar and inside the interactive expand-rows (RankedSum,
// Enneagram, Forgiveness, Gift ladder) so every bar is drawn one way.
function BarTrack({ frac, color, refs = [], height = 10 }) {
  return (
    <span style={{ position: "relative", display: "block", width: "100%", height, background: CHART.trackBg, borderRadius: 999 }}>
      <span style={fill(frac, color)} />
      {refs.map((r, i) =>
        r > 0 && r < 1 ? (
          <span key={i} aria-hidden="true"
            style={{ position: "absolute", left: `${r * 100}%`, top: -2, bottom: -2, width: 1, background: CHART.anchor, opacity: 0.55 }} />
        ) : null
      )}
    </span>
  );
}

// The shared horizontal score bar: label · banded track w/ reference lines ·
// direct tabular value label with a SCORE_STATE shape mark. `band` may be a
// band object {color,label}; `valueText` overrides the trailing display.
function ScoreBar({ label, value, max = 1, frac, color, fillColor, band, valueText, refs = [], scoreMinWidth, nameStyle, rowStyle, opacity, showShape = true }) {
  const barColor = color || band?.color || CHART.dataInk;
  const f = frac != null ? frac : value / (max || 1);
  const text = valueText != null ? valueText : (band ? `${value} · ${band.label}` : `${value}`);
  const shape = showShape ? shapeForColor(barColor) : null;
  return (
    <div style={{ ...rowGrid, ...(opacity != null ? { opacity } : {}), ...rowStyle }}>
      <span style={{ ...rName, ...nameStyle }}>{label}</span>
      <BarTrack frac={f} color={fillColor || barColor} refs={refs} />
      <span style={{ ...rScore, color: barColor, minWidth: scoreMinWidth, textAlign: "right", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, fontVariantNumeric: NUM }}>
        {shape && <span aria-hidden="true" style={{ fontSize: 9, lineHeight: 1, color: barColor }}>{SHAPE_GLYPH[shape]}</span>}
        <span>{text}</span>
      </span>
    </div>
  );
}

// A grayscale-safe band chip: the band color + its SCORE_STATE shape + label.
// Use anywhere a band pill/verdict is shown (topCards, growCard headers).
function BandMark({ color, label, size = 10, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color, fontWeight: 700, ...style }}>
      <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>{glyphFor(color)}</span>
      {label != null && <span>{label}</span>}
    </span>
  );
}

// A vertex marker drawn as a real SVG shape (circle/diamond/square) so radar
// vertices survive grayscale, matching the SCORE_STATE shape vocabulary.
function VertexMark({ x, y, shape = "circle", color, r = 4 }) {
  if (shape === "square") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={color} />;
  if (shape === "diamond") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={color} transform={`rotate(45 ${x} ${y})`} />;
  return <circle cx={x} cy={y} r={r} fill={color} />;
}

// The shared radar/wheel. Draws rings WITH value labels up the top spoke,
// spokes, a dashed reference ring (band cutoff / midpoint), the data polygon,
// and SCORE_STATE-shaped vertices. `axes`: [{label,sub,subColor,value,color,
// shape,primary}]. `numbered` swaps tip labels for an index (legend beside it).
function RadarChart({
  axes, max, cx = 170, cy = 168, radius = 108, rings, reference, referenceLabel,
  fill: fillCol = "rgba(46,125,138,.18)", stroke = COLOR.tealDeep, numbered = false,
  ringLabels = true, maxWidth = 440, viewBox = "0 0 340 336", ariaLabel = "chart",
}) {
  const N = axes.length || 1;
  const ang = (i) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i, val) => [cx + (val / max) * radius * Math.cos(ang(i)), cy + (val / max) * radius * Math.sin(ang(i))];
  const ringVals = rings || (max === 100 ? [20, 40, 60, 80, 100] : Array.from({ length: Math.round(max) }, (_, k) => k + 1));
  const ringPoly = (v) => axes.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoly = axes.map((a, i) => pt(i, a.value || 0).map((n) => n.toFixed(1)).join(",")).join(" ");
  const labelPos = (i) => pt(i, max * 1.32);
  return (
    <svg viewBox={viewBox} width="100%" style={{ maxWidth }} role="img" aria-label={ariaLabel}>
      {ringVals.map((v) => <polygon key={`r${v}`} points={ringPoly(v)} fill="none" stroke={CHART.tick} strokeWidth={CHART.strokeW} />)}
      {axes.map((_, i) => { const [x, y] = pt(i, max); return <line key={`s${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={CHART.tick} strokeWidth={CHART.strokeW} />; })}
      {reference != null && reference < max && (
        <polygon points={ringPoly(reference)} fill="none" stroke={CHART.anchor} strokeWidth="1.4" strokeDasharray="4 3" />
      )}
      {ringLabels && ringVals.map((v) => { const [lx, ly] = pt(0, v); return (
        <text key={`rl${v}`} x={lx - 5} y={ly + 3} textAnchor="end" fontSize="8.5" fill={CHART.tickLabel}
          style={{ fontFamily: FONT_SANS, fontVariantNumeric: NUM }}>{v}</text>
      ); })}
      {reference != null && reference < max && referenceLabel && (() => { const [lx, ly] = pt(0, reference); return (
        <text x={lx + 6} y={ly + 3} textAnchor="start" fontSize="8" fill={CHART.anchor} style={{ fontFamily: FONT_SANS }}>{referenceLabel}</text>
      ); })()}
      <polygon points={dataPoly} fill={fillCol} stroke={stroke} strokeWidth={CHART.dataStrokeW} strokeLinejoin="round" />
      {axes.map((a, i) => { const [x, y] = pt(i, a.value || 0); return (
        <VertexMark key={`v${i}`} x={+x.toFixed(1)} y={+y.toFixed(1)} shape={a.shape || "circle"}
          color={a.color || stroke} r={a.r || (numbered ? (a.primary ? 4.5 : 3.2) : 4.2)} />
      ); })}
      {numbered && axes.map((a, i) => { const [lx, ly] = pt(i, max * 1.12); return (
        <text key={`n${i}`} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="central"
          fontSize="9.5" fontWeight="700" fill={a.numColor || (a.primary ? "#B07C2E" : "#5E7183")}
          style={{ fontFamily: FONT_SANS, fontVariantNumeric: NUM }}>{i + 1}</text>
      ); })}
      {!numbered && axes.map((a, i) => {
        const [lx, ly] = labelPos(i);
        const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
        return (
          <g key={`l${i}`}>
            <text x={lx} y={a.sub != null ? ly - 3 : ly} textAnchor={anchor} fontSize="10.5" fontWeight="700" fill={COLOR.ink} style={{ fontFamily: FONT_SANS }}>{a.label}</text>
            {a.sub != null && (
              <text x={lx} y={ly + 11} textAnchor={anchor} fontSize="11" fontWeight="700" fill={a.subColor || stroke} style={{ fontFamily: FONT_SANS, fontVariantNumeric: NUM }}>{a.sub}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

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
              style={{ fontFamily: FONT_SANS, fontVariantNumeric: NUM }}>{leg.pct}</text>
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
          fill="#6B4B18" style={{ fontFamily: FONT_SANS, fontVariantNumeric: NUM }}>the seat · {seat.pct}</text>
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

  // Style archetype near-tie disclosure (mirrors the DISC "honest note"): the
  // fixed SP>CH>ST tie-break can decide the whole style on a razor-thin gap.
  // If the top two or bottom two legs are within ~6 points, flip the tied legs
  // to name the alternate archetype that also applies.
  const legPct = (k) => (legs[k]?.pct ?? 0);
  const [r0, r1, r2] = ranked;
  const topClose = ranked.length === 3 && Math.abs(legPct(r0) - legPct(r1)) <= 6;
  const botClose = ranked.length === 3 && Math.abs(legPct(r1) - legPct(r2)) <= 6;
  let altOrder = null, tiedPair = null;
  if (topClose) { altOrder = [r1, r0, r2]; tiedPair = [r0, r1]; }
  else if (botClose) { altOrder = [r0, r2, r1]; tiedPair = [r1, r2]; }
  const altStyle = altOrder ? STYLES[altOrder.join("-")] : null;

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
          {LEG_ORDER.map((k) => <span key={k} style={{ flex: (legs[k]?.pct ?? 0) + 8, background: LEGS[k].color }} />)}
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
        {altStyle && tiedPair && LEGS[tiedPair[0]] && LEGS[tiedPair[1]] && (
          <div style={transitionBox}>
            One honest note: your <strong>{LEGS[tiedPair[0]].name}</strong> and{" "}
            <strong>{LEGS[tiedPair[1]].name}</strong> legs scored almost the same
            ({legPct(tiedPair[0])} and {legPct(tiedPair[1])}), so which style leads was a close call.
            You may also recognize yourself in <strong>{altStyle.name}</strong>. Read both and keep what fits.
          </div>
        )}
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
                  <span style={{ fontSize: 26, fontWeight: 700, color: meta.color, lineHeight: 1, fontVariantNumeric: NUM }}>{leg.pct}</span>
                  <BandMark color={b.color} label={b.label} size={9} style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em" }} />
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
                  <BandMark color={b.color} label={`${s.pct} · ${b.label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
                </div>
                <div style={ldTrack}><div style={{ ...ldFill, width: grown ? `${s.pct}%` : "0%", background: meta.color }} /></div>
              </div>
            );
          })}
          <div style={{ padding: "13px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2B3A" }}>{SEAT.name} <span style={{ fontWeight: 400, color: "#8CA0B3", fontSize: 13 }}>· the seat</span></span>
              <BandMark color={bandOf(seat.band).color} label={`${seat.pct} · ${bandOf(seat.band).label}`} style={{ fontSize: 14, fontVariantNumeric: NUM }} />
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
                  <div style={{ fontSize: 30, fontWeight: 700, color: meta.color, lineHeight: 1, fontVariantNumeric: NUM }}>{leg.pct}</div>
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
/* Enneagram type profiles & Forgiveness (EFMI) subscale detail: same technique. */
.ennea-study { display:none; }
.ennea-study.is-open { display:block; }
/* The print-only navy wordmark is hidden on screen (the white PNG logo shows there). */
.cover-print-mark { display:none; }
@media print {
  /* Print cover: lighten the navy gradient card to a white ground with navy ink
     and a gold top rule, so it prints as a clean masthead rather than a heavy
     full-bleed ink slab. The logo and name stay (logo swaps to the navy
     wordmark, since the white PNG would vanish on white). */
  .report-cover { background:#fff !important; background-image:none !important; color:#1C2B3A !important; border:1px solid #E7E9EC; border-top:3px solid #C4923E; border-radius:16px; padding:24px 28px !important; margin:0 0 8px !important; }
  .report-cover .cover-motif { display:none !important; }
  .report-cover .cover-logo { display:none !important; }
  .report-cover .cover-print-mark { display:block !important; }
  .report-cover .cover-kicker { color:#1F5E68 !important; }
  .report-cover .cover-name { color:#1C2B3A !important; }
  .report-cover .cover-summary { color:#4A5B6D !important; }
  .report-cover .cover-meta,
  .report-cover .cover-meta div { color:#5A6A78 !important; }
  .report-cover .brand-chip { border:1px solid #E7E9EC; background:#fff !important; }
  /* US Letter with the report's margin geometry (reportTokens.PRINT). */
  @page { size: letter; margin: 18mm 16mm 20mm; }

  html, body { background:#fff !important; }
  main { background:#fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  /* Screen-only chrome never prints. */
  .no-print, .no-pdf { display:none !important; }
  /* Every gift study prints, whether or not it was expanded on screen. */
  .gift-study { display:block !important; }
  /* Enneagram type profiles & Forgiveness subscale details print fully expanded. */
  .ennea-study { display:block !important; }

  /* The report fills the printable width; drop the on-screen max-width and
     padding so the page margins alone define the text block. */
  #report-capture { width:100% !important; }
  #report-capture > div { max-width:none !important; padding-left:0 !important; padding-right:0 !important; }

  /* Break control — the rules that turn a scrolling page into a document. */
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  h1, h2, h3, h4 { break-inside: avoid; }
  p { orphans: 3; widows: 3; }
  /* Only keep small units atomic. A blanket "section" rule forces whole
     chapters onto the next page and leaves large white voids (the classic
     HTML-to-PDF tell), so it is intentionally NOT here. */
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
