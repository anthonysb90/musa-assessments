"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../lib/supabase";
import { GROUPS, CARD } from "../lib/cards";

// The all-assessments megamenu for the assessment-landing header — the same
// dropdown as the homepage, plus a clear way back to Home / All assessments.
// Fetches the published catalog client-side so it always reflects what's live.
export default function AssessmentMenu({ signedIn }) {
  const [open, setOpen] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const burgerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,is_published,is_featured")
        .eq("is_published", true);
      setAssessments(data || []);
    })();
  }, []);

  // Mobile sheet: lock body scroll, close on Escape, move focus into the sheet.
  // SSR-guarded — only touch `document` inside the effect (client-only).
  useEffect(() => {
    if (typeof document === "undefined" || !mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  // Return focus to the hamburger when the sheet closes.
  const closeMobile = () => {
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => burgerRef.current?.focus());
    }
  };

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
              // Alphabetical within each group, but featured assessments rise to the top.
              const items = assessments
                .filter((x) => x.category === g.cat)
                .sort((a, b) => (a.is_featured === b.is_featured ? a.name.localeCompare(b.name) : a.is_featured ? -1 : 1));
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
                          <span className="am-name">{x.is_featured && <span style={{ color: "#2C6BB0", marginRight: 5 }}>★</span>}{x.name}</span>
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

      <button
        type="button"
        ref={burgerRef}
        className="am-burger"
        aria-label="Menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>

      {mobileOpen && (
        <div className="am-sheet-wrap" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="am-sheet-backdrop" onClick={closeMobile} />
          <div className="am-sheet">
            <div className="am-sheet-head">
              <span className="am-sheet-title">Menu</span>
              <button type="button" ref={closeRef} className="am-sheet-x" aria-label="Close menu" onClick={closeMobile}>×</button>
            </div>
            <div className="am-sheet-body">
              <Link href="/" className="am-sheet-link" onClick={closeMobile}>Home</Link>
              <Link href="/#assessments" className="am-sheet-link" onClick={closeMobile}>All assessments</Link>
              {GROUPS.map((g) => {
                const items = assessments
                  .filter((x) => x.category === g.cat)
                  .sort((a, b) => (a.is_featured === b.is_featured ? a.name.localeCompare(b.name) : a.is_featured ? -1 : 1));
                if (!items.length) return null;
                return (
                  <div className="am-sheet-group" key={g.cat}>
                    <div className="am-sheet-h">{g.label}</div>
                    {items.map((x) => (
                      <Link key={x.slug} href={`/assessment/${x.slug}`} className="am-sheet-item" onClick={closeMobile}>
                        {x.is_featured && <span style={{ color: "var(--gold)", marginRight: 6 }}>★</span>}{x.name}
                      </Link>
                    ))}
                  </div>
                );
              })}
              <Link href="/partner" className="am-sheet-link" onClick={closeMobile}>For churches</Link>
              <Link href="/welcome" className="am-sheet-cta" onClick={closeMobile}>
                {signedIn ? "● My results →" : "Sign in / My results →"}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
        .am-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:42px;height:38px;padding:0 9px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);border-radius:9px;cursor:pointer;}
        .am-burger span{display:block;height:2px;width:100%;background:#fff;border-radius:2px;}
        .am-sheet-wrap{position:fixed;inset:0;z-index:200;}
        .am-sheet-backdrop{position:absolute;inset:0;background:rgba(9,20,34,.55);}
        .am-sheet{position:absolute;top:0;right:0;height:100%;width:min(360px,88vw);background:#122A44;box-shadow:-24px 0 60px rgba(9,20,34,.5);display:flex;flex-direction:column;overflow-y:auto;-webkit-overflow-scrolling:touch;}
        .am-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.10);position:sticky;top:0;background:#122A44;}
        .am-sheet-title{color:#fff;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.85;}
        .am-sheet-x{background:none;border:none;color:#fff;font-size:30px;line-height:1;cursor:pointer;padding:0 4px;}
        .am-sheet-body{padding:14px 20px 32px;display:flex;flex-direction:column;gap:2px;}
        .am-sheet-link{color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 4px;border-bottom:1px solid rgba(255,255,255,.08);}
        .am-sheet-group{padding:8px 0 2px;}
        .am-sheet-h{color:var(--gold);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:10px 0 4px;}
        .am-sheet-item{display:block;color:rgba(255,255,255,.88);font-size:14.5px;font-weight:600;text-decoration:none;padding:9px 4px 9px 10px;}
        .am-sheet-item:hover,.am-sheet-link:hover{color:#fff;}
        .am-sheet-cta{margin-top:18px;background:var(--gold);color:#3a2a08;text-align:center;padding:13px 16px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;}
        @media (max-width:820px){ .am-mega{grid-template-columns:1fr;width:min(340px,92vw);} .am-link{display:none;} .am-has{display:none;} .am-cta{display:none;} .am-burger{display:flex;} }
      ` }} />
    </nav>
  );
}
