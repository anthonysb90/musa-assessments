"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "./lib/supabase";
import { DONATE_URL } from "./lib/config";
import { GROUPS, CARD } from "./lib/cards";


const FILTERS = [
  ["all", "All Assessments"],
  ["personal", "Personal Growth & Calling"],
  ["ministry", "Marriage & Ministry"],
  ["church", "Church & Leadership"],
];

// Branded logo plates + catalog copy per assessment (matches the Mission USA design).

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
  { key: "personality", label: "understand my personality", slugs: ["big-five", "kingdom-design", "enneagram"] },
  { key: "type", label: "find my personality type (Myers-Briggs)", slugs: ["kingdom-design", "big-five"] },
  { key: "motivation", label: "understand what really drives me", slugs: ["enneagram", "big-five"] },
  { key: "lead", label: "understand my leadership style", slugs: ["discover-leadership-style", "wired-to-lead", "leadership-health"] },
  { key: "growLead", label: "grow as a leader", slugs: ["discover-leadership-style", "leadership-health", "pastor-profile"] },
  { key: "walk", label: "grow in my walk with God", slugs: ["spiritual-growth", "rooted"] },
  { key: "mature", label: "see how deep my roots go", slugs: ["rooted", "spiritual-growth"] },
  { key: "plant", label: "know if I'm ready to plant a church", slugs: ["church-planter"] },
  { key: "pastorlife", label: "take an honest look at my life and ministry", slugs: ["pastor-profile"] },
  { key: "marriage", label: "strengthen my marriage and ministry", slugs: ["called-together"] },
  { key: "church", label: "see how healthy my church really is", slugs: ["church-health", "church-growth"] },
  { key: "churchdir", label: "understand where my church is headed", slugs: ["church-growth", "church-health"] },
  { key: "forgive", label: "work toward forgiving someone", slugs: ["forgiveness-profile"] },
];
// Donation quick-give tiers (mirrors the end-of-report DonationCard). Each
// deep-links to Tithe.ly with the amount pre-filled in cents.
const GIVE_TIERS = [
  [10, "Cover a report"],
  [25, "Bless a few others"],
  [50, "Help us keep going"],
  [100, "A month of hosting"],
];
function giveUrl(dollars) {
  const cents = Math.max(1, Math.round(Number(dollars) || 0)) * 100;
  const sep = DONATE_URL.includes("?") ? "&" : "?";
  return `${DONATE_URL}${sep}amount=${cents}`;
}

// Light role affinity: nudge a slug up when it fits the chosen role.
const ROLE_AFFINITY = {
  pastor: ["pastor-profile", "discover-leadership-style", "leadership-health", "spiritual-growth"],
  planter: ["church-planter", "discover-leadership-style", "wired-to-lead"],
  layleader: ["spiritual-gifts", "fivefold-calling", "discover-leadership-style", "leadership-health"],
  spouse: ["called-together"],
  student: ["big-five", "enneagram", "spiritual-gifts"],
  team: ["church-health", "leadership-health", "discover-leadership-style", "church-growth"],
};

export default function Home() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cost, setCost] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,subtitle,category,estimated_minutes,is_published,is_paid,price_cents,sort_order,is_featured")
        .eq("is_published", true);
      setAssessments(data || []);
      setLoading(false);
      const { data: u } = await supabase.auth.getUser();
      setSignedIn(!!u?.user);
    })();
  }, []);

  const isPaid = (a) => a.is_paid && a.price_cents > 0;
  const anyPaid = assessments.some(isPaid);
  const costOk = (a) => cost === "all" || (cost === "paid" ? isPaid(a) : !isPaid(a));

  // Homepage card order: admin-set sort_order, then name. Featured cards get an
  // extra highlight strip at the top (only in the unfiltered view) AND still
  // appear in their normal category spot below.
  const byOrder = (a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.name.localeCompare(b.name);
  const showFeatured = filter === "all";
  const featuredItems = assessments.filter((a) => a.is_featured && costOk(a)).sort(byOrder);
  const featuredGroup = showFeatured && featuredItems.length
    ? { cat: "featured", label: "Featured", sub: "hand-picked to start with", items: featuredItems }
    : null;
  const visibleGroups = GROUPS
    .filter((g) => filter === "all" || filter === g.cat)
    .map((g) => ({
      ...g,
      items: assessments
        .filter((a) => a.category === g.cat && costOk(a))
        .sort(byOrder),
    }))
    .filter((g) => g.items.length);
  const renderGroups = featuredGroup ? [featuredGroup, ...visibleGroups] : visibleGroups;

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

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
                      // Alphabetical within each group, featured assessments first.
                      const items = assessments
                        .filter((a) => a.category === g.cat)
                        .sort((a, b) => (!!a.is_featured === !!b.is_featured ? a.name.localeCompare(b.name) : a.is_featured ? -1 : 1));
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
                                  <span className="mega-name">{a.is_featured && <span className="feat-star">★</span>}{a.name}{a.slug === "wired-to-lead" ? " (DISC)" : a.slug === "kingdom-design" ? " (Myers-Briggs)" : ""}</span>
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
            <Link href="/welcome" className={`topbar-link nav-cta${signedIn ? " nav-cta-in" : ""}`}>
              {signedIn ? <><span style={{ color: "#7FD8A6" }}>●</span> My results →</> : "Sign in / My results →"}
            </Link>
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

          {renderGroups.map((g) => (
            <div className={`group g-${g.cat}`} key={g.cat}>
              <div className="group-head">
                <h3>{g.cat === "featured" ? <><span style={{ color: "#2C6BB0" }}>★</span> {g.label}</> : g.label}</h3>
                <span className="gh-sub">{g.sub}</span>
                <span className="gh-line" />
              </div>
              <div className="cards">
                {g.items.map((a) => {
                  const c = CARD[a.slug] || { tag: a.subtitle, desc: a.subtitle, plate: "" };
                  return (
                    <Link href={`/assessment/${a.slug}`} className={`card in${isPaid(a) ? " is-premium" : ""}${a.is_featured ? " is-featured" : ""}`} key={a.slug}>
                      {isPaid(a) && <span className="premium-ribbon">Premium</span>}
                      {a.is_featured && <span className="featured-badge">★ Featured</span>}
                      <div className="card-top">
                        <div className="logo-plate" dangerouslySetInnerHTML={{ __html: c.plate }} />
                      </div>
                      <div className="card-body">
                        {isPaid(a) && <span className="paid-badge">Premium · ${(a.price_cents / 100).toFixed(2)}</span>}
                        <h4>{a.name}{a.slug === "wired-to-lead" ? " (DISC Assessment)" : a.slug === "kingdom-design" ? " (Myers-Briggs)" : ""}</h4>
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

      {/* FOR CHURCHES */}
      <section className="churchband">
        <div className="hwrap">
          <div className="churchcard">
            <div className="cg" />
            <div className="cc-in">
              <div>
                <div className="eyebrow" style={{ color: "var(--gold-soft)" }}>For churches</div>
                <h2 className="cc-h">Bring these to your whole church.</h2>
                <p className="cc-p">Use the assessments in your membership and growth classes. Your members choose your church, you see every result in your own private dashboard, and we hand you a link that's ready to share.</p>
                <Link href="/partner" className="btn btn-gold cc-cta">Request a partnership <span className="btn-arrow">→</span></Link>
              </div>
              <ul className="cc-list">
                <li>Your own private church dashboard</li>
                <li>Choose the assessments your church uses</li>
                <li>Results emailed to your contact</li>
                <li>Your church's logo on the reports</li>
                <li>Reveal results in person, if you prefer</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* DONATION / MINISTRY CALLOUT */}
      <section className="giveband">
        <div className="hwrap give-in">
          <div className="give-mark">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.5 0 5 3.5 3.5 7-2.5 4.5-9.5 9-9.5 9z" stroke="#C4923E" strokeWidth="1.6" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="eyebrow" style={{ color: "var(--teal)" }}>A ministry of Mission USA</div>
            <h3 className="give-h">Free for the whole CHC family, and kept that way by giving.</h3>
            <p className="give-p">Almost every assessment here is free, and always will be. But servers, security, email, and honest research all cost real money to keep running. If one of these reports served you, a gift of any size helps us keep them free for the next pastor, leader, or believer who needs one.</p>
          </div>
          <div className="give-give">
            <div className="give-tiers">
              {GIVE_TIERS.map(([amt, label]) => (
                <a key={amt} className="give-tier" href={giveUrl(amt)} target="_blank" rel="noopener noreferrer">
                  <span className="give-amt">${amt}</span>
                  <span className="give-lbl">{label}</span>
                </a>
              ))}
            </div>
            <a className="btn btn-primary give-cta" href={DONATE_URL} target="_blank" rel="noopener noreferrer">Give another amount <span className="btn-arrow">→</span></a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="hwrap">
          <p className="eyebrow" style={{ color: "var(--teal)" }}>Grow churches. Equip leaders.</p>
          <h2>A resource for the whole CHC family</h2>
          <p>These assessments give every pastor, leader, spouse, and layperson in our movement a clear, honest tool for growth. Most are free. A few premium reports go deeper, and they help keep the rest free for everyone.</p>
          <a href="#assessments" className="btn btn-primary">Browse assessments <span className="btn-arrow">→</span></a>
        </div>
        <div className="hwrap foot-org">
          <img src="/musa-logo.png" alt="Mission USA" className="foot-logo" />
          <p className="foot-blurb">
            Mission USA is the home missions arm of the Congregational Holiness Church. We plant new churches,
            revitalize existing ones, and train and credential leaders across the United States, supplying pastors
            with practical resources for ministry. These assessments are one part of that work.
          </p>
          <p className="foot-meta">Ministry Assessments · A Resource of Mission USA · Congregational Holiness Church</p>
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
              <span className="fsel-hint">choose one</span>
            </span>
            <span>and I want to</span>
            <span className="fsel wide">
              <select value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="What you want">
                <option value="">…pick a goal</option>
                {FINDER_GOALS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
              <span className="fsel-hint">choose one</span>
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
                        <span className="finder-rc-name">{a.name}{a.slug === "wired-to-lead" ? " (DISC)" : a.slug === "kingdom-design" ? " (Myers-Briggs)" : ""}</span>
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
.nav-cta-in{background:rgba(255,255,255,.14) !important;color:#fff !important;border:1px solid rgba(255,255,255,.22);}
.nav-cta-in:hover{background:rgba(255,255,255,.2) !important;color:#fff !important;filter:none;}
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
.fsel{position:relative;display:inline-flex;flex-direction:column;align-items:center;}
.fsel select{font-family:var(--display,'Fraunces');font-style:italic;font-size:inherit;color:#F2ECDD;background:transparent;border:none;border-bottom:1.5px solid rgba(240,225,180,.45);border-radius:0;padding:2px 30px 4px 6px;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23E4CE8C' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 4px center;max-width:min(90vw,560px);transition:border-color .15s ease;text-align:center;text-align-last:center;}
.fsel select:hover{border-bottom-color:var(--gold);}
.fsel select:focus{outline:none;border-bottom-color:var(--gold);}
.fsel select option{color:#0E2036;font-style:normal;}
.fsel-hint{font-family:var(--sans,'Inter');font-style:normal;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,225,180,.6);margin-top:5px;}
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
.premium-note{max-width:640px;margin:14px auto 30px;text-align:center;font-size:13.5px;line-height:1.55;color:var(--ink-soft);background:var(--gold-soft);border:1px solid #EADFC9;border-radius:12px;padding:13px 18px;}
.premium-note strong{color:#8A6420;}
/* premium cards stand out */
.card.is-premium{position:relative;background:linear-gradient(180deg,#FCF8EF,#fff 46%);border-color:#E7D6B0;box-shadow:0 10px 30px rgba(196,146,62,.14);}
.card.is-premium:hover{box-shadow:0 24px 54px rgba(196,146,62,.24);border-color:#D9BE86;}
.card.is-premium .logo-plate{border-color:#E7D6B0;background:var(--gold-soft) !important;}
.premium-ribbon{position:absolute;top:0;right:0;z-index:2;background:linear-gradient(135deg,#C4923E,#A87A2E);color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 13px;border-radius:0 20px 0 14px;box-shadow:0 4px 12px rgba(168,122,46,.35);}
.card.is-featured{border:2px solid #2C6BB0;box-shadow:0 12px 32px rgba(44,107,176,.16);}
.card.is-featured:hover{box-shadow:0 24px 54px rgba(44,107,176,.26);border-color:#215699;}
.featured-badge{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;background:#2C6BB0;color:#fff;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:8px 12px;box-shadow:inset 0 -1px 0 rgba(0,0,0,.10);}
.card.is-featured .premium-ribbon{display:none;}
.feat-star{color:#2C6BB0;margin-right:5px;}
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
/* Featured cards are a compact highlight strip: smaller and more spaced, up to
   4 across on wide screens, responsive down to 1. */
.g-featured .cards{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:26px;}
.g-featured .card-top{padding:16px 16px 0;}
.g-featured .logo-plate{width:46px;height:46px;border-radius:12px;}
.g-featured .logo-plate svg{width:27px;height:27px;}
.g-featured .card-body{padding:12px 16px 6px;}
.g-featured .card h4{font-size:16.5px;line-height:1.25;margin-bottom:5px;}
.g-featured .tag{font-size:10.5px;}
.g-featured .desc{font-size:12px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}
.g-featured .card-foot{padding:12px 16px 14px;margin-top:8px;}
.g-featured .foot-min,.g-featured .link-go{font-size:12px;}
.g-featured .featured-badge{font-size:10px;letter-spacing:.12em;padding:7px 12px;}
.card{position:relative;background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;transition:box-shadow .25s ease, border-color .25s ease, transform .25s ease;}
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
.final{padding:90px 0 60px;text-align:center;background:var(--mist);}
.final>.hwrap p{font-size:17px;color:var(--ink-soft);max-width:560px;margin:0 auto 32px;}
.foot-org{margin-top:56px;padding-top:36px;border-top:1px solid var(--line);display:flex;flex-direction:column;align-items:center;text-align:center;}
.foot-logo{height:42px;width:auto;opacity:.9;margin-bottom:18px;}
.foot-blurb{font-size:14px;color:var(--ink-soft);line-height:1.65;max-width:600px;margin:0 auto 22px;}
.foot-meta{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#93A0AD;margin:0;}
/* For-churches band (mirrors the landing page) */
.churchband{background:var(--mist);padding:20px 0 60px;}
.churchcard{position:relative;overflow:hidden;background:linear-gradient(135deg,#1B3A57,#0E2036);border-radius:26px;padding:52px 48px;}
.churchcard .cg{position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(196,146,62,.42),transparent 70%);filter:blur(70px);right:-130px;top:-150px;}
.cc-in{position:relative;z-index:1;display:grid;grid-template-columns:1.25fr 1fr;gap:44px;align-items:center;}
.cc-h{font-family:var(--display,'Fraunces');font-weight:500;color:#fff;font-size:clamp(26px,3.4vw,38px);line-height:1.12;margin:12px 0 14px;}
.cc-p{color:rgba(255,255,255,.86);font-size:16px;line-height:1.6;margin:0;}
.btn-gold{background:var(--gold);color:#3a2a08;}
.btn-gold:hover{filter:brightness(1.05);}
.cc-cta{margin-top:24px;}
.cc-list{list-style:none;display:grid;gap:13px;margin:0;padding:0;}
.cc-list li{color:#fff;font-size:15px;padding-left:30px;position:relative;}
.cc-list li::before{content:"";position:absolute;left:0;top:5px;width:17px;height:17px;border-radius:50%;background:rgba(196,146,62,.22);border:1px solid var(--gold);}
.cc-list li::after{content:"✓";position:absolute;left:4px;top:3.5px;color:var(--gold-soft);font-size:11px;font-weight:800;}
/* Donation / ministry band */
.giveband{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:44px 0;}
.give-in{display:flex;align-items:center;gap:24px;flex-wrap:wrap;}
.give-mark{flex:0 0 auto;width:60px;height:60px;border-radius:16px;background:var(--gold-soft);display:flex;align-items:center;justify-content:center;}
.give-h{font-family:var(--display,'Fraunces');font-weight:500;color:var(--ink);font-size:clamp(20px,2.4vw,26px);line-height:1.2;margin:6px 0 8px;}
.give-p{color:var(--ink-soft);font-size:15px;line-height:1.6;margin:0;max-width:640px;}
.give-give{flex:0 0 auto;display:flex;flex-direction:column;gap:12px;align-items:stretch;min-width:230px;}
.give-tiers{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.give-tier{display:flex;flex-direction:column;align-items:center;gap:2px;padding:11px 10px;border:1.5px solid var(--line);border-radius:11px;background:#fff;text-decoration:none;transition:border-color .15s ease,transform .15s ease,box-shadow .15s ease;}
.give-tier:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:0 10px 24px rgba(196,146,62,.16);}
.give-amt{font-weight:800;color:var(--ink);font-size:17px;}
.give-lbl{font-size:11px;color:var(--ink-soft);text-align:center;}
.give-cta{flex:0 0 auto;justify-content:center;}
/* Mobile header — never overflow */
@media (max-width:820px){
  .topbar-in{flex-wrap:wrap;gap:10px 14px;}
  .hasmega{display:none;}
  .brand-txt{display:none;}
  .topnav{gap:14px;}
  .topbar-link{font-size:13px;}
  .nav-cta{padding:7px 12px;font-size:12.5px;}
  .cc-in{grid-template-columns:1fr;gap:26px;}
  .churchcard{padding:38px 28px;}
  .give-in{gap:16px;}
  .give-cta{width:100%;justify-content:center;}
}
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
