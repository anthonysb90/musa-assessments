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
  enneagram: { tag: "Understand how you're wired", desc: "Nine ways of seeing the world, narrowed to your core type through 36 quick either-or choices. Then a redemptive read to grow by: your gift, your blind spot, and a Scripture and devotion for your type.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="15" stroke="#1F5E68" stroke-width="2.2"/><path d="M24 9L37 31.5H11z" stroke="#1B3A57" stroke-width="1.7" stroke-linejoin="round"/><path d="M33.6 12.5L29.1 38.1L38.8 21.4L14.4 12.5L18.9 38.1L9.2 21.4z" stroke="#2E7D8A" stroke-width="1.3" opacity=".5" stroke-linejoin="round"/><g fill="#C4923E"><circle cx="24" cy="9" r="2"/><circle cx="33.6" cy="12.5" r="1.7"/><circle cx="38.8" cy="21.4" r="1.7"/><circle cx="37" cy="31.5" r="1.7"/><circle cx="29.1" cy="38.1" r="1.7"/><circle cx="18.9" cy="38.1" r="1.7"/><circle cx="11" cy="31.5" r="1.7"/><circle cx="9.2" cy="21.4" r="1.7"/><circle cx="14.4" cy="12.5" r="1.7"/></g></svg>` },
  "forgiveness-profile": { tag: "What moves you to forgive", desc: "Forgiveness is hard, and freeing. Bring to mind someone who hurt you, then discover which of ten motivations draw your heart toward forgiveness, from your own peace to your faith. A gentle, private reflection built on established forgiveness research.", plate: `<svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M8 32c8 3 17 1 23-6 2.4-2.8 5.6-4 9-3.4-1 6-6 12-14 13-6.6.8-13-.6-18-3.6z" fill="#2E7D8A"/><path d="M31 22.6c1.4-3.6 4.6-6 9-6.2-.6 3.6-3.2 6.2-6.6 6.6z" fill="#C4923E"/><circle cx="37.8" cy="17.2" r="1.3" fill="#1B3A57"/><path d="M14 33c-2 2.6-2.2 5.4-.4 8" stroke="#1F5E68" stroke-width="2.2" stroke-linecap="round"/><path d="M20 34c-1.6 2.4-1.8 4.8-.4 7.2" stroke="#3E7C63" stroke-width="2" stroke-linecap="round"/></svg>` },
};

export default function Home() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cost, setCost] = useState("all");

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
          <span className="brand-lockup">
            <img src="/musa-logo-white-h.png" alt="Mission USA" className="brand-logo" />
            <span className="brand-txt">Assessments</span>
          </span>
          <span className="topbar-links">
            <Link href="/partner" className="topbar-link">For churches</Link>
            <Link href="/dashboard" className="topbar-link">Sign in / My results →</Link>
          </span>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-free"><span className="spark" />Free — A Ministry Resource of Mission USA</span>
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

          <div className="filter-bar filter-cost" role="tablist">
            {[["all", "All"], ["free", "Free"], ["paid", "Paid"]].map(([key, label]) => (
              <button key={key} className={`filter-btn${cost === key ? " is-active" : ""}`} onClick={() => setCost(key)} role="tab" aria-selected={cost === key}>
                {label}
              </button>
            ))}
          </div>

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
                        {isPaid(a) && <span className="paid-badge">Paid · ${(a.price_cents / 100).toFixed(2)}</span>}
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

const CSS = `
.hwrap{max-width:1200px;margin:0 auto;padding:0 28px;}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);margin:0 0 16px;}
.topbar{background:#122A44;border-bottom:1px solid rgba(255,255,255,.08);}
.topbar-in{display:flex;justify-content:space-between;align-items:center;padding-top:14px;padding-bottom:14px;}
.brand{color:#fff;font-weight:700;font-size:14px;}
.topbar-links{display:flex;align-items:center;gap:20px;}
.topbar-link{color:rgba(255,255,255,.82);font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;}
.topbar-link:hover{color:#fff;}
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
.brand-logo{height:26px;width:auto;display:block;}
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
