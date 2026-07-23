"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../lib/supabase";
import { GROUPS, CARD } from "../lib/cards";

// The all-assessments megamenu for the assessment-landing header — the same
// dropdown as the homepage, plus a clear way back to Home / All assessments.
// Fetches the published catalog client-side so it always reflects what's live.
export default function AssessmentMenu({ signedIn }) {
  const [open, setOpen] = useState(false);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,is_published")
        .eq("is_published", true);
      setAssessments(data || []);
    })();
  }, []);

  return (
    <nav className="am-nav" onMouseLeave={() => setOpen(false)}>
      <Link href="/" className="am-link">← Home</Link>
      <div className={`am-has${open ? " open" : ""}`} onMouseEnter={() => setOpen(true)}>
        <button className="am-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          All assessments <span className="am-caret">▾</span>
        </button>
        {open && (
          <div className="am-mega" role="menu">
            <div className="am-mega-top">
              <span className="am-mega-title">Browse all assessments</span>
              <Link href="/#assessments" className="am-mega-all" onClick={() => setOpen(false)}>See the full list →</Link>
            </div>
            {GROUPS.map((g) => {
              const items = assessments.filter((x) => x.category === g.cat);
              if (!items.length) return null;
              return (
                <div className="am-col" key={g.cat}>
                  <div className="am-col-h">{g.label}</div>
                  {items.map((x) => {
                    const c = CARD[x.slug] || {};
                    return (
                      <Link key={x.slug} href={`/assessment/${x.slug}`} className="am-item" onClick={() => setOpen(false)}>
                        <span className="am-ico" dangerouslySetInnerHTML={{ __html: c.plate || "" }} />
                        <span className="am-txt">
                          <span className="am-name">{x.name}</span>
                          {c.tag && <span className="am-desc">{c.tag}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Link href="/partner" className="am-link">For churches</Link>
      {signedIn
        ? <Link href="/welcome" className="am-cta am-cta-in">● My results →</Link>
        : <Link href="/welcome" className="am-cta">Sign in / My results →</Link>}

      <style>{`
        .am-nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:flex-end;}
        .am-link{color:rgba(255,255,255,.85);font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;}
        .am-link:hover{color:#fff;}
        .am-has{position:relative;}
        .am-trigger{background:none;border:none;color:rgba(255,255,255,.85);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0;white-space:nowrap;}
        .am-trigger:hover{color:#fff;}
        .am-caret{font-size:10px;transition:transform .2s;opacity:.85;}
        .am-has.open .am-caret{transform:rotate(180deg);}
        .am-has::after{content:"";position:absolute;left:0;right:0;top:100%;height:16px;}
        .am-mega{position:absolute;top:calc(100% + 14px);right:0;z-index:70;width:min(760px,92vw);background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 34px 80px rgba(16,32,52,.3);padding:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px 18px;}
        .am-mega-top{grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:4px;}
        .am-mega-title{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);}
        .am-mega-all{font-size:13px;font-weight:600;color:var(--teal-deep);text-decoration:none;}
        .am-col-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8CA0B3;margin:6px 0 4px;}
        .am-item{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:10px;text-decoration:none;}
        .am-item:hover{background:var(--mist,#F6F8FA);}
        .am-ico{flex:0 0 auto;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;}
        .am-ico svg{width:26px;height:26px;}
        .am-txt{display:flex;flex-direction:column;}
        .am-name{font-size:13.5px;font-weight:700;color:var(--ink);line-height:1.2;}
        .am-desc{font-size:11.5px;color:var(--ink-soft);margin-top:2px;line-height:1.3;}
        .am-cta{background:var(--gold);color:#3a2a08;padding:9px 15px;border-radius:9px;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;}
        .am-cta:hover{filter:brightness(1.05);}
        .am-cta-in{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.22);}
        @media (max-width:820px){ .am-mega{grid-template-columns:1fr;width:min(340px,92vw);} .am-link{display:none;} }
      `}</style>
    </nav>
  );
}
