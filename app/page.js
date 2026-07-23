"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "./lib/supabase";

const GROUPS = [
  { cat: "personal", label: "Personal Growth & Calling", sub: "for anyone wanting to know themselves better" },
  { cat: "ministry", label: "Marriage & Ministry Readiness", sub: "for candidates, couples, and current pastors" },
  { cat: "church", label: "Church & Leadership Health", sub: "for pastors, boards, and leadership teams" },
];

const FILTERS = [
  ["all", "All Assessments"],
  ["personal", "Personal Growth & Calling"],
  ["ministry", "Marriage & Ministry"],
  ["church", "Church & Leadership"],
];

// Branded logo plates + catalog copy per assessment (matches the Mission USA design).
const CARD = {
  "spiritual-gifts": { tag: "Discover how God has gifted you", desc: "Every believer is gifted for a purpose. In about 20 minutes, uncover your strongest spiritual gifts from Scripture's full list, and see exactly where you're built to serve.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M24 8c3.4 3.8 5.6 7 5.6 10.8a5.6 5.6 0 0 1-11.2 0C18.4 15 20.6 11.8 24 8z" fill="#C4923E"/><path d="M24 12.5c1.7 2.2 2.8 3.9 2.8 5.9a2.8 2.8 0 0 1-5.6 0c0-2 1.1-3.7 2.8-5.9z" fill="#F0E4CB"/><path d="M13 27c1.8 0 2.6 1.4 4.2 2.3 1.9 1.1 3.2-.3 6.8-.3s4.9 1.4 6.8.3c1.6-.9 2.4-2.3 4.2-2.3" stroke="#1F5E68" stroke-width="2" stroke-linecap="round"/><path d="M12 33c2.4 0 3.4 1.8 5.6 3 2.5 1.4 4.2-.4 6.4-.4s3.9 1.8 6.4.4c2.2-1.2 3.2-3 5.6-3" stroke="#2E7D8A" stroke-width="2" stroke-linecap="round"/></svg>` },
  rooted: { tag: "A spiritual maturity assessment", desc: "Growth isn't about looking mature, it's about being rooted so you don't move when the wind comes. See where you're deeply planted, and where your roots still need to go down.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="16" r="9" fill="#3E7C63"/><circle cx="16.5" cy="19" r="5.5" fill="#3E7C63" opacity=".8"/><circle cx="31.5" cy="19" r="5.5" fill="#3E7C63" opacity=".8"/><path d="M24 21v13" stroke="#1F5E68" stroke-width="2.4" stroke-linecap="round"/><path d="M24 34c-1.5 2-4 2.5-5.5 5M24 34c1.5 2 4 2.5 5.5 5M24 30c-1.2 1.5-3 1.8-4.5 3.5M24 30c1.2 1.5 3 1.8 4.5 3.5" stroke="#C4923E" stroke-width="1.8" stroke-linecap="round"/></svg>` },
  "fivefold-calling": { tag: "Find your ministry lane", desc: "Apostle, prophet, evangelist, shepherd, teacher. Ephesians 4 names five ways God equips His church. Discover your primary calling, and the one right behind it.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="4.4" fill="#2E7D8A"/><g stroke="#1F5E68" stroke-width="2.2" stroke-linecap="round"><path d="M24 19.6V9"/><path d="M28.2 22.4l8.4-6.1"/><path d="M27.6 28l6.8 8"/><path d="M20.4 28l-6.8 8"/><path d="M19.8 22.4l-8.4-6.1"/></g><g fill="#C4923E"><circle cx="24" cy="8" r="2.2"/><circle cx="37.5" cy="15.5" r="2.2"/><circle cx="35" cy="37" r="2.2"/><circle cx="13" cy="37" r="2.2"/><circle cx="10.5" cy="15.5" r="2.2"/></g></svg>` },
  "wired-to-lead": { tag: "How God wired you to lead", desc: "Every leader moves differently through people, pressure, and decisions. Discover your leadership wiring, paired with a biblical leader whose story matches your blend.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M24 10l3.6 8.8L36 22l-8.4 3.2L24 34l-3.6-8.8L12 22l8.4-3.2z" fill="#6B4E7A" opacity=".9"/><circle cx="24" cy="22" r="3.4" fill="#F5EFE6"/><g stroke="#C4923E" stroke-width="1.8" stroke-linecap="round"><path d="M24 34v4"/><path d="M12 22H8"/><path d="M40 22h-4"/></g><circle cx="24" cy="39" r="1.8" fill="#C4923E"/><circle cx="7" cy="22" r="1.8" fill="#C4923E"/><circle cx="41" cy="22" r="1.8" fill="#C4923E"/></svg>` },
  "called-together": { tag: "A marriage & ministry assessment", desc: "Ministry puts a weight on a marriage most never carry. Take it together and get an honest read on how your marriage is really holding up, and where it needs attention next.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="19" cy="24" r="10" stroke="#C4923E" stroke-width="2.4"/><circle cx="29" cy="24" r="10" stroke="#1F5E68" stroke-width="2.4"/><path d="M24 15.5a10 10 0 0 1 0 17" stroke="#6B4E7A" stroke-width="2.4" stroke-linecap="round"/></svg>` },
  "church-planter": { tag: "Are you ready to plant?", desc: "Most struggling plants show warning signs beforehand. Get an honest, research-backed read on your calling, character, and capacity to launch, spouse included.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M10 34h28" stroke="#1F5E68" stroke-width="2.2" stroke-linecap="round"/><path d="M24 34V18" stroke="#3E7C63" stroke-width="2.4" stroke-linecap="round"/><path d="M24 22c-1.5-3-4.5-4-8-4 0 4.5 3 6.5 8 6z" fill="#3E7C63"/><path d="M24 19c1.3-2.6 4-3.6 7-3.6 0 4-2.6 5.8-7 5.4z" fill="#C4923E"/><path d="M24 8l2.4 3.4h-4.8z" fill="#C4923E"/></svg>` },
  "pastor-profile": { tag: "Character. Competence. Contribution.", desc: "Whether you're discerning a call to pastor or already leading, see where you're strong and where to grow across the three pillars every effective pastor needs.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M24 8l12 4v9c0 8-5.4 13-12 15.5C17.4 34 12 29 12 21v-9z" stroke="#1B3A57" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 30V19c0-2.6-1.9-4.4-4.2-4.4S15.6 16.4 15.6 19" stroke="#C4923E" stroke-width="2.2" stroke-linecap="round"/></svg>` },
  "church-growth": { tag: "Where is your church headed?", desc: "Not where you hope, where the evidence says. Find out which of five growth stages your church is really in, from decline to multiplication, and what comes next.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M9 36h6v-6h6v-6h6v-6h6V12" stroke="#1B3A57" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M30 12h9v9" stroke="#C4923E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M39 12l-9 9" stroke="#C4923E" stroke-width="2.2" stroke-linecap="round"/></svg>` },
  "church-health": { tag: "A leadership team assessment", desc: "How healthy is your church, really? Gather your whole leadership team's honest read across eight vital areas, including where you agree, and where you don't.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M24 37C14 31 8 25.5 8 18.5 8 13.8 11.6 10 16.4 10c3 0 5.5 1.6 7.6 4 2.1-2.4 4.6-4 7.6-4C36.4 10 40 13.8 40 18.5" stroke="#1B3A57" stroke-width="2.2" stroke-linecap="round"/><path d="M9 24h6l3-6 4 12 3-8 2 2h11" stroke="#C4923E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  "leadership-health": { tag: "A self & team assessment", desc: "Self-awareness is where strong leadership starts. Read yourself across eight essential areas, then invite trusted voices to show you what you can't see about yourself.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="15" stroke="#1B3A57" stroke-width="2.2"/><path d="M30 18l-4.5 8.5L17 30l4.5-8.5z" fill="#C4923E"/><circle cx="24" cy="24" r="2" fill="#1B3A57"/></svg>` },
  "spiritual-growth": { tag: "How is your walk, honestly?", desc: "Six disciplines every follower of Christ grows in, from abiding in Christ to ministering to others. Reflect on each, then see your walk drawn as a Discipleship Wheel, with your strengths and next steps.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="15" stroke="#1F5E68" stroke-width="2.2"/><circle cx="24" cy="24" r="9" stroke="#2E7D8A" stroke-width="1.4" opacity=".55"/><g stroke="#1F5E68" stroke-width="1.7" stroke-linecap="round"><path d="M24 9v30"/><path d="M11 16.5l26 15"/><path d="M11 31.5l26-15"/></g><path d="M24 24l15 0A15 15 0 0 1 31.5 37z" fill="#C4923E" opacity=".85"/><circle cx="24" cy="24" r="2.6" fill="#1B3A57"/></svg>` },
  enneagram: { tag: "Discover what drives you", desc: "Nine core motivations, narrowed to your type through 36 quick either-or choices. This one goes beneath behavior to the why underneath, then turns it toward Christ: your gift, your blind spot, and a Scripture and devotion for your type.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="15" stroke="#1F5E68" stroke-width="2.2"/><path d="M24 9L37 31.5H11z" stroke="#1B3A57" stroke-width="1.7" stroke-linejoin="round"/><path d="M33.6 12.5L29.1 38.1L38.8 21.4L14.4 12.5L18.9 38.1L9.2 21.4z" stroke="#2E7D8A" stroke-width="1.3" opacity=".5" stroke-linejoin="round"/><g fill="#C4923E"><circle cx="24" cy="9" r="2"/><circle cx="33.6" cy="12.5" r="1.7"/><circle cx="38.8" cy="21.4" r="1.7"/><circle cx="37" cy="31.5" r="1.7"/><circle cx="29.1" cy="38.1" r="1.7"/><circle cx="18.9" cy="38.1" r="1.7"/><circle cx="11" cy="31.5" r="1.7"/><circle cx="9.2" cy="21.4" r="1.7"/><circle cx="14.4" cy="12.5" r="1.7"/></g></svg>` },
  "big-five": { tag: "The most researched map of your personality", desc: "The Big Five is the gold standard of personality science. In about fifteen minutes, see yourself across five core traits and six expanded facets, with a full report on how each one shapes the way you lead, relate, and serve.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><polygon points="24,8 38,18.5 32.5,35 15.5,35 10,18.5" stroke="#1F5E68" stroke-width="2" fill="none" stroke-linejoin="round"/><polygon points="24,15 31,20.2 28.3,28.5 19.7,28.5 17,20.2" fill="#2E7D8A" opacity=".18"/><polygon points="24,15 31,20.2 28.3,28.5 19.7,28.5 17,20.2" stroke="#2E7D8A" stroke-width="1.4" fill="none" stroke-linejoin="round"/><g fill="#C4923E"><circle cx="24" cy="8" r="2.2"/><circle cx="38" cy="18.5" r="2"/><circle cx="32.5" cy="35" r="2"/><circle cx="15.5" cy="35" r="2"/><circle cx="10" cy="18.5" r="2"/></g><circle cx="24" cy="23" r="1.8" fill="#1B3A57"/></svg>` },
  "forgiveness-profile": { tag: "What moves you to forgive", desc: "Forgiveness is hard, and freeing. Bring to mind someone who hurt you, then discover which of ten motivations draw your heart toward forgiveness, from your own peace to your faith. A gentle, private reflection built on established forgiveness research.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M8 32c8 3 17 1 23-6 2.4-2.8 5.6-4 9-3.4-1 6-6 12-14 13-6.6.8-13-.6-18-3.6z" fill="#2E7D8A"/><path d="M31 22.6c1.4-3.6 4.6-6 9-6.2-.6 3.6-3.2 6.2-6.6 6.6z" fill="#C4923E"/><circle cx="37.8" cy="17.2" r="1.3" fill="#1B3A57"/><path d="M14 33c-2 2.6-2.2 5.4-.4 8" stroke="#1F5E68" stroke-width="2.2" stroke-linecap="round"/><path d="M20 34c-1.6 2.4-1.8 4.8-.4 7.2" stroke="#3E7C63" stroke-width="2" stroke-linecap="round"/></svg>` },
};

// Guided finder. Roles set the tone; goals map to the assessments that fit,
// listed best-first. New assessments join by adding their slug to a goal.
const FINDER_ROLES = [
  ["anyone", "a believer"],
  ["pastor", "a pastor or minister"],
  ["planter", "a church planter"],
  ["layleader", "a lay leader"],
  ["spouse", "a ministry spouse"],
  ["student", "a student or young adult"],
  ["team", "on a leadership team"],
];
const FINDER_GOALS = [
  { key: "gifts", label: "discover how God has gifted me", slugs: ["spiritual-gifts", "fivefold-calling"] },
  { key: "calling", label: "find my ministry calling", slugs: ["fivefold-calling", "spiritual-gifts"] },
  { key: "personality", label: "understand my personality", slugs: ["big-five", "enneagram"] },
  { key: "motivation", label: "understand what really drives me", slugs: ["enneagram", "big-five"] },
  { key: "lead", label: "understand my leadership style", slugs: ["wired-to-lead", "leadership-health"] },
  { key: "growLead", label: "grow as a leader", slugs: ["leadership-health", "pastor-profile"] },
  { key: "walk", label: "grow in my walk with God", slugs: ["spiritual-growth", "rooted"] },
  { key: "mature", label: "see how deep my roots go", slugs: ["rooted", "spiritual-growth"] },
  { key: "plant", label: "know if I'm ready to plant a church", slugs: ["church-planter"] },
  { key: "pastorlife", label: "take an honest look at my life and ministry", slugs: ["pastor-profile"] },
  { key: "marriage", label: "strengthen my marriage and ministry", slugs: ["called-together"] },
  { key: "church", label: "see how healthy my church really is", slugs: ["church-health", "church-growth"] },
  { key: "churchdir", label: "understand where my church is headed", slugs: ["church-growth", "church-health"] },
  { key: "forgive", label: "work toward forgiving someone", slugs: ["forgiveness-profile"] },
];
// Light role affinity: nudge a slug up when it fits the chosen role.
const ROLE_AFFINITY = {
  pastor: ["pastor-profile", "leadership-health", "spiritual-growth"],
  planter: ["church-planter", "wired-to-lead"],
  layleader: ["spiritual-gifts", "fivefold-calling", "leadership-health"],
  spouse: ["called-together"],
  student: ["big-five", "enneagram", "spiritual-gifts"],
  team: ["church-health", "leadership-health", "church-growth"],
};

export default function Home() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cost, setCost] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,subtitle,category,estimated_minutes,is_published,is_paid,price_cents")
        .eq("is_published", true);
      setAssessments(data || []);
      setLoading(false);
    })();
  }, []);

  const isPaid = (a) => a.is_paid && a.price_cents > 0;
  const anyPaid = assessments.some(isPaid);
  const costOk = (a) => cost === "all" || (cost === "paid" ? isPaid(a) : !isPaid(a));

  const visibleGroups = GROUPS
    .filter((g) => filter === "all" || filter === g.cat)
    .map((g) => ({ ...g, items: assessments.filter((a) => a.category === g.cat && costOk(a)) }))
    .filter((g) => g.items.length);

  return (
    <main>
      <style>{CSS}</style>

      <header className="topbar">
        <div className="hwrap topbar-in">
          <a href="#assessments" className="brand-lockup">
            <img src="/musa-logo-white-h.png" alt="Mission USA" className="brand-logo" />
            <span className="brand-txt">Assessments</span>
          </a>
          <nav className="topnav">
            <div
              className={`hasmega${menuOpen ? " open" : ""}`}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button type="button" className="topbar-link megatrigger" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                Assessments <span className="caret">▾</span>
              </button>
              {menuOpen && (
                <div className="mega" role="menu">
                  <div className="mega-in">
                    {GROUPS.map((g) => {
                      const items = assessments.filter((a) => a.category === g.cat);
                      if (!items.length) return null;
                      return (
                        <div className="mega-col" key={g.cat}>
                          <div className="mega-h">{g.label}</div>
                          {items.map((a) => {
                            const c = CARD[a.slug] || {};
                            return (
                              <Link key={a.slug} href={`/assessment/${a.slug}`} className="mega-item" onClick={() => setMenuOpen(false)}>
                                <span className="mega-ico" dangerouslySetInnerHTML={{ __html: c.plate || "" }} />
                                <span className="mega-txt">
                                  <span className="mega-name">{a.name}{a.slug === "wired-to-lead" ? " (DISC)" : ""}</span>
                                  <span className="mega-desc">{c.tag || a.subtitle}</span>
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Link href="/partner" className="topbar-link">For churches</Link>
            <Link href="/welcome" className="topbar-link nav-cta">Sign in / My results →</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-tag">A Ministry Resource of Mission USA</span>
            <h1>Know where you stand.<br /><span className="accent">Grow where it counts.</span></h1>
            <p>Honest, Scripture-grounded assessments for pastors, leaders, spouses, and everyday believers across the CHC family. Each one hands you a clear picture and a real next step.</p>
            <div className="hero-actions">
              <a href="#assessments" className="btn btn-primary">Browse assessments <span className="btn-arrow">→</span></a>
              <a href="#how" className="btn btn-ghost">How it works</a>
            </div>
          </div>
          <div className="hero-media">
            <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1100&q=70&auto=format&fit=crop" alt="People together in community" onError={(e) => (e.currentTarget.style.display = "none")} />
            <div className="float-card">
              <div className="fig-ico">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5.5c0 4.6-3.1 7.5-7 8.5-3.9-1-7-3.9-7-8.5V6l7-3z" stroke="#1F5E68" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2 2 4-4.2" stroke="#C4923E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="lbl">Assessments for calling, marriage, leadership, and church health — with more added over time.</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="trust">
        <div className="hwrap">
          <div className="trust-grid">
            <TrustItem title="Private & secure" body="Your answers stay yours. Results are sent only to you." />
            <TrustItem title="10–20 minutes" body="Short, honest, and built to respect your time." />
            <TrustItem title="Pastoral, not clinical" body="Made to encourage and develop, never to grade or gate." />
            <TrustItem title="For the whole family" body="Something here for leaders, couples, and lay people alike." />
          </div>
        </div>
      </section>

      {/* GUIDED FINDER */}
      <Finder assessments={assessments} />

      {/* CATALOG */}
      <section className="catalog" id="assessments">
        <div className="hwrap">
          <div className="section-head">
            <p className="eyebrow">The collection</p>
            <h2>Find your starting point</h2>
            <p>Browse them all, or filter by who they're for.</p>
          </div>

          <div className="filter-bar" role="tablist">
            {FILTERS.map(([key, label]) => (
              <button key={key} className={`filter-btn${filter === key ? " is-active" : ""}`} onClick={() => setFilter(key)} role="tab" aria-selected={filter === key}>
                {label}
              </button>
            ))}
          </div>

          {anyPaid && (
            <>
              <div className="filter-bar filter-cost" role="tablist">
                {[["all", "All"], ["free", "Free"], ["paid", "Premium"]].map(([key, label]) => (
                  <button key={key} className={`filter-btn${cost === key ? " is-active" : ""}`} onClick={() => setCost(key)} role="tab" aria-selected={cost === key}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="premium-note">
                <strong>Premium</strong> assessments go deeper: a longer, more detailed report with extra analysis. They cost
                more to build and run, and lean on heavier research. Everything else stays free.
              </p>
            </>
          )}

          {loading && <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>Loading assessments…</p>}

          {visibleGroups.map((g) => (
            <div className={`group g-${g.cat}`} key={g.cat}>
              <div className="group-head">
                <h3>{g.label}</h3>
                <span className="gh-sub">{g.sub}</span>
                <span className="gh-line" />
              </div>
              <div className="cards">
                {g.items.map((a) => {
                  const c = CARD[a.slug] || { tag: a.subtitle, desc: a.subtitle, plate: "" };
                  return (
                    <Link href={`/assessment/${a.slug}`} className="card in" key={a.slug}>
                      <div className="card-top">
                        <div className="logo-plate" dangerouslySetInnerHTML={{ __html: c.plate }} />
                      </div>
                      <div className="card-body">
                        {isPaid(a) && <span className="paid-badge">Premium · ${(a.price_cents / 100).toFixed(2)}</span>}
                        <h4>{a.name}{a.slug === "wired-to-lead" ? " (DISC Assessment)" : ""}</h4>
                        <p className="tag">{c.tag}</p>
                        <p className="desc">{c.desc}</p>
                      </div>
                      <div className="card-foot">
                        <span className="foot-min">{a.estimated_minutes} min</span>
                        <span className="link-go">{isPaid(a) ? "Unlock →" : "Take it →"}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="hwrap">
          <div className="how-head">
            <p className="eyebrow">Simple by design</p>
            <h2>Three steps to a clearer picture</h2>
            <p>No guesswork and no jargon. Choose, answer honestly, and unlock a report made for where you actually are.</p>
          </div>
          <div className="how-rail">
            <HowCard step="Step one" title="Choose your assessment" body="Instruments across calling, marriage, leadership, and church health. Start wherever fits your season." />
            <HowCard step="Step two" title="Answer honestly" body="Ten to twenty private minutes. There's no score to pass or fail here, only an honest mirror." />
            <HowCard step="Step three" title="Unlock your report" body="Add your details at the end and your full personal report comes straight to you, strengths, growth areas, and a next step." />
          </div>
        </div>
      </section>

      {/* VERSE BAND */}
      <section className="verse-band">
        <img src="https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=1400&q=70&auto=format&fit=crop" alt="Open hands lifted" onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="verse-inner">
          <div className="mark">“</div>
          <blockquote>Anyone who listens to the word but does not do what it says is like a person who looks at his face in a mirror and, after looking at himself, goes away and forgets what he looks like.</blockquote>
          <cite>James 1:23–24</cite>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="hwrap">
          <p className="eyebrow" style={{ color: "var(--teal)" }}>Mission USA</p>
          <h2>A free gift to the whole CHC family</h2>
          <p>These assessments exist so every pastor, leader, spouse, and layperson in our movement has a clear, honest tool for growth. At no cost, always.</p>
          <a href="#assessments" className="btn btn-primary">Browse assessments <span className="btn-arrow">→</span></a>
          <p className="foot-meta">Ministry Assessments · A Free Resource of Mission USA · Congregational Holiness Church</p>
        </div>
      </section>
    </main>
  );
}

function TrustItem({ title, body }) {
  return (
    <div className="trust-item">
      <div className="ti-ico">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5.5c0 4.6-3.1 7.5-7 8.5-3.9-1-7-3.9-7-8.5V6l7-3z" stroke="#2E7D8A" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2 2 4-4.2" stroke="#2E7D8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div><h4>{title}</h4><p>{body}</p></div>
    </div>
  );
}
function HowCard({ step, title, body }) {
  return (
    <div className="how-card">
      <div className="step-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2E7D8A" strokeWidth="1.7" /><path d="M8 12l2.5 2.5L16 9" stroke="#C4923E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
      <p className="kicker">{step}</p>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function Finder({ assessments }) {
  const [role, setRole] = useState("anyone");
  const [goal, setGoal] = useState("");
  const bySlug = Object.fromEntries(assessments.map((a) => [a.slug, a]));
  const g = FINDER_GOALS.find((x) => x.key === goal);
  let recs = [];
  if (g) {
    const aff = ROLE_AFFINITY[role] || [];
    recs = g.slugs
      .map((s) => bySlug[s])
      .filter(Boolean)
      .sort((a, b) => (aff.includes(b.slug) ? 1 : 0) - (aff.includes(a.slug) ? 1 : 0));
  }
  return (
    <section className="finder" id="finder">
      <div className="hwrap">
        <div className="finder-card">
          <div className="finder-eyebrow">Not sure where to start?</div>
          <div className="finder-sentence">
            <span>I&rsquo;m</span>
            <span className="fsel">
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Who you are">
                {FINDER_ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </span>
            <span>and I want to</span>
            <span className="fsel wide">
              <select value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="What you want">
                <option value="">…pick a goal</option>
                {FINDER_GOALS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
            </span>
          </div>
          {recs.length > 0 && (
            <div className="finder-results">
              <div className="finder-rlabel">{recs.length > 1 ? "Start with one of these" : "Here's your match"}</div>
              <div className="finder-cards">
                {recs.map((a) => {
                  const c = CARD[a.slug] || {};
                  return (
                    <Link key={a.slug} href={`/assessment/${a.slug}`} className="finder-rc">
                      <span className="finder-rc-ico" dangerouslySetInnerHTML={{ __html: c.plate || "" }} />
                      <span className="finder-rc-body">
                        <span className="finder-rc-name">{a.name}{a.slug === "wired-to-lead" ? " (DISC)" : ""}</span>
                        <span className="finder-rc-desc">{c.tag || a.subtitle}</span>
                      </span>
                      <span className="finder-rc-go">Start →</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CSS = `
.hwrap{max-width:1200px;margin:0 auto;padding:0 28px;}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);margin:0 0 16px;}
.topbar{background:#122A44;border-bottom:1px solid rgba(255,255,255,.08);}
.topbar-in{display:flex;justify-content:space-between;align-items:center;padding-top:14px;padding-bottom:14px;}
.brand{color:#fff;font-weight:700;font-size:14px;}
.topbar-links{display:flex;align-items:center;gap:20px;}
.topbar-link{color:rgba(255,255,255,.82);font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;}
.topbar-link:hover{color:#fff;}
.topbar-in{gap:20px;}
.topnav{display:flex;align-items:center;gap:26px;}
.megatrigger{background:none;border:none;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px;padding:0;}
.megatrigger .caret{font-size:10px;transition:transform .2s;opacity:.8;}
.hasmega{position:relative;}
.hasmega.open .caret{transform:rotate(180deg);}
.hasmega::after{content:"";position:absolute;left:0;right:0;top:100%;height:18px;}
.nav-cta{background:var(--gold);color:#3a2a08 !important;padding:9px 16px;border-radius:9px;}
.nav-cta:hover{filter:brightness(1.05);color:#3a2a08 !important;}
.mega{position:absolute;top:calc(100% + 16px);right:0;z-index:60;width:min(820px,92vw);background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 34px 80px rgba(16,32,52,.30);padding:24px;}
.mega::before{content:"";position:absolute;top:-8px;right:120px;width:16px;height:16px;background:#fff;border-left:1px solid var(--line);border-top:1px solid var(--line);transform:rotate(45deg);}
.mega-in{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
.mega-h{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal-deep);margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid var(--line);}
.mega-item{display:flex;gap:11px;align-items:flex-start;padding:8px;border-radius:10px;text-decoration:none;transition:background .15s;}
.mega-item:hover{background:var(--mist);}
.mega-ico{flex:0 0 auto;width:36px;height:36px;border-radius:9px;background:var(--mist2);display:flex;align-items:center;justify-content:center;}
.mega-ico svg{width:26px;height:26px;}
.mega-txt{display:flex;flex-direction:column;}
.mega-name{font-size:14px;font-weight:700;color:var(--ink);line-height:1.2;}
.mega-desc{font-size:12px;color:var(--ink-soft);margin-top:2px;line-height:1.3;}
.hero-tag{display:inline-flex;align-self:flex-start;color:var(--teal-deep);font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;}
.finder{background:linear-gradient(135deg,#12314e,#0E2036);padding:46px 0;}
.finder-card{max-width:920px;margin:0 auto;text-align:center;}
.finder-eyebrow{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-soft);margin-bottom:18px;}
.finder-sentence{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 12px;font-family:var(--display,'Fraunces');font-size:clamp(20px,2.5vw,28px);color:#fff;line-height:1.5;}
.fsel select{font-family:var(--display,'Fraunces');font-size:inherit;color:#0E2036;background:#fff;border:none;border-radius:10px;padding:6px 40px 8px 16px;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%230E2036' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 14px center;box-shadow:0 8px 22px rgba(0,0,0,.24);max-width:min(90vw,560px);}
.fsel select:focus{outline:2px solid var(--gold);}
.finder-results{margin-top:28px;}
.finder-rlabel{font-size:13px;color:rgba(255,255,255,.72);margin-bottom:14px;letter-spacing:.02em;}
.finder-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;max-width:820px;margin:0 auto;}
.finder-rc{display:flex;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:16px 18px;text-decoration:none;text-align:left;transition:transform .18s ease, box-shadow .18s ease;}
.finder-rc:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(0,0,0,.32);}
.finder-rc-ico{flex:0 0 auto;width:48px;height:48px;border-radius:12px;background:var(--mist2);display:flex;align-items:center;justify-content:center;}
.finder-rc-body{flex:1;min-width:0;}
.finder-rc-name{display:block;font-family:var(--display,'Fraunces');font-size:17px;font-weight:600;color:var(--ink);}
.finder-rc-desc{display:block;font-size:12.5px;color:var(--ink-soft);margin-top:2px;}
.finder-rc-go{font-size:13.5px;font-weight:700;color:var(--teal-deep);white-space:nowrap;}
.premium-note{max-width:640px;margin:-12px auto 26px;text-align:center;font-size:13.5px;line-height:1.55;color:var(--ink-soft);background:var(--gold-soft);border:1px solid #EADFC9;border-radius:12px;padding:12px 18px;}
.premium-note strong{color:#8A6420;}
@media (max-width:820px){.mega{display:none;}}
.btn{font-family:var(--sans,'Inter');font-weight:600;font-size:15px;border-radius:10px;padding:15px 28px;text-decoration:none;display:inline-flex;align-items:center;gap:9px;cursor:pointer;border:1.5px solid transparent;transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;}
.btn-primary{background:var(--navy);color:#fff;box-shadow:0 6px 18px rgba(27,58,87,.18);}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(27,58,87,.26);}
.btn-ghost{color:var(--navy);border-color:var(--line);background:#fff;}
.btn-ghost:hover{border-color:var(--navy);transform:translateY(-2px);}
.btn-arrow{transition:transform .16s ease;}
.btn-primary:hover .btn-arrow{transform:translateX(3px);}
.hero{position:relative;background:#fff;overflow:hidden;}
.hero-inner{display:grid;grid-template-columns:1.05fr .95fr;align-items:stretch;min-height:460px;}
.hero-copy{padding:56px 64px 56px 28px;display:flex;flex-direction:column;justify-content:center;max-width:640px;margin-left:auto;}
.hero-free{display:inline-flex;align-items:center;gap:9px;align-self:flex-start;background:var(--gold-soft);color:#8A6420;font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:8px 15px;border-radius:999px;margin-bottom:28px;}
.hero-free .spark{width:7px;height:7px;border-radius:50%;background:var(--gold);}
.hero h1{font-family:var(--display,'Fraunces');font-weight:400;font-size:clamp(40px,5vw,60px);line-height:1.04;letter-spacing:-.5px;margin:0 0 22px;color:var(--ink);}
.hero h1 .accent{font-style:italic;color:var(--teal-deep);}
.hero p{font-size:19px;color:var(--ink-soft);margin:0 0 34px;max-width:480px;}
.hero-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;}
.hero-media{position:relative;background:linear-gradient(135deg,var(--mist2),var(--blush));overflow:hidden;}
.hero-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.hero-media::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(27,58,87,.16),transparent 55%);}
.float-card{position:absolute;left:-34px;bottom:52px;z-index:3;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 24px;box-shadow:0 20px 50px rgba(27,58,87,.16);display:flex;align-items:center;gap:16px;max-width:300px;}
.float-card .fig-ico{flex:0 0 auto;width:46px;height:46px;border-radius:12px;background:var(--mist2);display:flex;align-items:center;justify-content:center;}
.float-card .lbl{font-size:13.5px;color:var(--ink-soft);line-height:1.4;}
.trust{background:var(--mist);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.trust-grid{display:grid;grid-template-columns:repeat(4,1fr);}
.trust-item{padding:20px 24px;display:flex;gap:14px;align-items:flex-start;border-right:1px solid var(--line);}
.trust-item:last-child{border-right:none;}
.trust-item .ti-ico{flex:0 0 auto;width:38px;height:38px;border-radius:10px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;}
.trust-item h4{margin:0 0 3px;font-size:15px;font-weight:700;color:var(--ink);}
.trust-item p{margin:0;font-size:13.5px;color:var(--ink-soft);line-height:1.4;}
.how{padding:56px 0 64px;}
.how-head{max-width:620px;margin-bottom:34px;}
.how h2,.section-head h2,.final h2{font-family:var(--display,'Fraunces');font-weight:400;font-size:clamp(30px,3.6vw,42px);line-height:1.1;letter-spacing:-.5px;color:var(--ink);margin:0 0 14px;}
.how-head p{font-size:17px;color:var(--ink-soft);margin:0;}
.how-rail{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;}
.how-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px 28px;transition:transform .2s ease, box-shadow .2s ease;}
.how-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(27,58,87,.09);}
.how-card .step-ico{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:var(--mist2);}
.how-card:nth-child(2) .step-ico{background:var(--blush);}
.how-card:nth-child(3) .step-ico{background:var(--gold-soft);}
.how-card .kicker{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin:0 0 8px;}
.how-card h3{font-family:var(--display,'Fraunces');font-weight:500;font-size:21px;color:var(--ink);margin:0 0 8px;}
.how-card p{font-size:14.5px;color:var(--ink-soft);margin:0;}
.catalog{padding:44px 0 64px;}
.section-head{max-width:640px;margin:0 auto 30px;text-align:center;}
.section-head p{font-size:17px;color:var(--ink-soft);margin:0;}
.filter-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:0 auto 36px;max-width:820px;}
.filter-btn{font-family:var(--sans,'Inter');font-size:14px;font-weight:600;color:var(--ink-soft);background:#fff;border:1.5px solid var(--line);border-radius:999px;padding:10px 20px;cursor:pointer;transition:color .18s, background .18s, border-color .18s, transform .12s;}
.filter-btn:hover{border-color:var(--teal);color:var(--teal-deep);transform:translateY(-1px);}
.filter-btn.is-active{background:var(--navy);border-color:var(--navy);color:#fff;}
.group{margin-bottom:48px;}
.group-head{display:flex;align-items:center;gap:18px;margin-bottom:30px;}
.group-head .gh-line{height:1px;background:var(--line);flex:1;}
.group-head h3{font-family:var(--display,'Fraunces');font-weight:500;font-size:24px;color:var(--ink);margin:0;white-space:nowrap;}
.group-head .gh-sub{font-size:14px;color:var(--ink-soft);font-style:italic;white-space:nowrap;}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:24px;}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;transition:box-shadow .25s ease, border-color .25s ease, transform .25s ease;}
.card:hover{box-shadow:0 22px 50px rgba(27,58,87,.12);border-color:transparent;transform:translateY(-5px);}
.card-top{padding:28px 26px 0;display:flex;align-items:flex-start;}
.logo-plate{width:76px;height:76px;border-radius:18px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);}
.card-body{padding:20px 26px 8px;flex-grow:1;}
.card h4{font-family:var(--display,'Fraunces');font-weight:500;font-size:23px;color:var(--ink);margin:0 0 6px;letter-spacing:-.3px;}
.card .tag{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin:0 0 16px;}
.card p.desc{font-size:14.5px;color:var(--ink-soft);margin:0;}
.brand-lockup{display:flex;align-items:center;gap:11px;}
.brand-logo{height:36px;width:auto;display:block;}
.brand-txt{color:#fff;font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.92;}
.paid-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#B07C2E;background:#F5EFE6;border:1px solid #EADFC9;padding:3px 9px;border-radius:999px;margin-bottom:10px;}
.filter-cost{margin-top:-10px;margin-bottom:10px;}
.filter-cost .filter-btn{font-size:13px;padding:7px 16px;}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:20px 26px 24px;margin-top:14px;border-top:1px solid var(--line);}
.foot-min{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);}
.link-go{font-size:14px;font-weight:700;color:var(--teal-deep);display:inline-flex;align-items:center;gap:6px;}
.g-personal .tag{color:var(--teal-deep);}
.g-personal .logo-plate{background:#EAF3F4;}
.g-ministry .tag{color:var(--gold);}
.g-ministry .logo-plate{background:var(--blush);}
.g-church .tag{color:var(--navy);}
.g-church .logo-plate{background:var(--mist2);}
.verse-band{position:relative;overflow:hidden;background:var(--navy);color:#fff;}
.verse-band img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28;}
.verse-band::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,58,87,.65),rgba(20,42,63,.9));}
.verse-inner{position:relative;z-index:2;text-align:center;padding:88px 28px;max-width:760px;margin:0 auto;}
.verse-inner .mark{font-family:var(--display,'Fraunces');font-size:60px;line-height:0;color:var(--gold);opacity:.7;}
.verse-inner blockquote{font-family:var(--display,'Fraunces');font-weight:400;font-style:italic;font-size:clamp(24px,3vw,34px);line-height:1.3;margin:18px 0 20px;color:#fff;letter-spacing:-.3px;}
.verse-inner cite{font-style:normal;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-soft);}
.final{padding:90px 0;text-align:center;background:var(--mist);}
.final p{font-size:17px;color:var(--ink-soft);max-width:540px;margin:0 auto 32px;}
.final .foot-meta{margin-top:40px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#93A0AD;}
@media (max-width:960px){
.hero-inner{grid-template-columns:1fr;}
.hero-copy{padding:64px 28px 52px;max-width:none;margin:0;}
.hero-media{min-height:320px;}
.float-card{left:20px;bottom:20px;}
.trust-grid{grid-template-columns:1fr 1fr;}
.trust-item:nth-child(2){border-right:none;}
.trust-item{border-bottom:1px solid var(--line);}
.how-rail{grid-template-columns:1fr;}
}
@media (max-width:560px){.trust-grid{grid-template-columns:1fr;}.trust-item{border-right:none;}.group-head .gh-sub{display:none;}}
`;
