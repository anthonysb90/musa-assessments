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
} from "../../lib/content";
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
        .from("assessments").select("name,subtitle").eq("id", session.assessment_id).single();
      if (!result) { setState("notfound"); return; }
      // Wellbeing (owner or Mission USA care/admin only, by RLS). Returns
      // nothing for anyone else, so the card simply doesn't render for them.
      const { data: wbRow } = await supabase
        .from("wellbeing_results")
        .select("total,max_total,band,elevated")
        .eq("session_id", session.id)
        .maybeSingle();
      setScored(result.scored_json);
      setMeta({ ...assessment, created_at: result.created_at });
      setWb(wbRow || null);
      setState("ready");
      // Signed-in / admin detection drives the report nav. Admins get a
      // "Back to Admin" shortcut in place of the public nav links.
      const { data: udata } = await supabase.auth.getUser();
      if (udata?.user) {
        setSignedIn(true);
        const { data: adm } = await supabase.rpc("is_admin");
        setIsAdmin(adm === true);
      }
    })();
  }, [token]);

  if (state === "loading") return <Centered>Loading your results…</Centered>;
  if (state === "notfound")
    return <Centered>We couldn't find those results. The link may be incomplete.</Centered>;

  const contact = scored.contact || {};
  const suppressDonation = ["mip", "church-class"].includes(contact.source_tag);

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <style>{PRINT_CSS}</style>
      <div ref={reportRef} id="report-capture">
        <header style={hd}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
            <img src="/musa-logo-white-h.png" alt="Mission USA Assessments" style={{ height: 46, width: "auto", display: "block", marginBottom: 18 }} />
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
            <button className="btn btn-primary" onClick={downloadPdf} disabled={dl}>
              {dl ? "Preparing PDF…" : "⬇ Save as PDF"}
            </button>
            <button className="btn btn-ghost" onClick={() => window.print()}>🖨 Print</button>
            {isAdmin ? (
              <a className="btn btn-ghost" href="/admin">← Back to Admin</a>
            ) : (
              <>
                <a className="btn btn-ghost" href="/">← All assessments</a>
                <a className="btn btn-ghost" href="/dashboard">See all my results →</a>
              </>
            )}
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
            {scored.type === "planter" && <PlanterReport scored={scored} />}
            {scored.type === "level-matrix" && <GrowthReport scored={scored} />}
            {scored.type === "disc-blend" && <DiscReport scored={scored} />}
            {scored.type === "pillar" && <PastorReport scored={scored} />}
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

/* ---------------- Spiritual Gifts (ranked A–Y) ---------------- */
function GiftRank({ scored }) {
  const [open, setOpen] = useState(null);
  const ranked = useMemo(
    () =>
      scored.ranked.map((g, i) => ({
        ...g, ...GIFTS[g.letter], rank: i,
        tier: i < 3 ? "top" : i < 8 ? "mid" : "low",
      })),
    [scored]
  );
  const topThree = ranked.slice(0, 3);
  const per = scored.max_per || 15;
  return (
    <>
      <section style={{ padding: "8px 0" }}>
        <div style={sectionLabel}>Your top gifts</div>
        <div style={topGrid}>
          {topThree.map((g) => (
            <div key={g.letter} style={topCard}>
              <div style={topRank}>{ordinal(g.rank + 1)}</div>
              <div className="serif" style={topName}>{g.name}</div>
              <div style={scoreRow}>
                <span style={topScore}>{g.score}</span>
                <span style={{ fontSize: 14, color: "#8CA0B3" }}>/ {per}</span>
              </div>
              <p style={topDef}>{g.def}</p>
            </div>
          ))}
        </div>
        <p style={helper}>
          These are your strongest gifts, the places you're most clearly wired to serve. Every gift
          is ranked below so you can see your full profile.
        </p>
      </section>
      <section style={{ padding: "24px 0 8px" }}>
        <div style={sectionLabel}>All gifts, ranked</div>
        <div style={chart}>
          {ranked.map((g) => {
            const color = g.tier === "top" ? "#C4923E" : g.tier === "mid" ? "#2E7D8A" : "#8CA0B3";
            const isOpen = open === g.letter;
            return (
              <div key={g.letter} style={{ borderBottom: "1px solid #F0F2F4" }}>
                <button onClick={() => setOpen(isOpen ? null : g.letter)} style={barBtn} className="bar">
                  <span style={rRank}>{g.rank + 1}</span>
                  <span style={rName}>{g.name}</span>
                  <span style={track}><span style={fill(g.score / per, color)} /></span>
                  <span style={{ ...rScore, color }}>{g.score}</span>
                  <span className="no-print" style={chevron(isOpen)}>›</span>
                </button>
                {isOpen && (
                  <div style={detail}>
                    <p style={detailP}>{g.def}</p>
                    <Block h="Where this gift serves" t={g.roles} />
                    <Block h="Growing in this gift" t={g.develop} />
                    <div style={refLine}>{g.refs}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

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

const PRINT_CSS = `
.report-credit{ text-align:center; font-size:12px; color:#7C8A9C; margin-top:30px; padding-top:16px; border-top:1px solid #E7E9EC; line-height:1.5; }
.bar:hover { background:#F8FAFB; }
#report-capture, #report-capture * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print {
  @page { margin: 12mm; }
  .no-print, .no-pdf { display:none !important; }
  html, body { background:#fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .sheet section { break-inside: avoid; page-break-inside: avoid; }
  .report-credit{ display:block !important; }
}
`;
