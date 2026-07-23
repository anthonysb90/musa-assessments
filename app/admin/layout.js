"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Unified admin shell: a slim, branded top bar with active-tab nav, wrapping
// every /admin page so the whole panel feels like one professional product.
const TABS = [
  ["/admin", "Overview"],
  ["/admin/people", "People"],
  ["/admin/churches", "Churches"],
  ["/admin/pricing", "Pricing"],
  ["/admin/pages", "Pages"],
  ["/admin/bundles", "Bundles"],
  ["/admin/embed", "Embed"],
];

export default function AdminLayout({ children }) {
  const path = usePathname();
  const isActive = (href) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <div style={{ minHeight: "100vh", background: "var(--mist)" }}>
      <div style={bar}>
        <div style={barInner}>
          <Link href="/admin" style={brand}>
            <img src="/musa-logo-white-h.png" alt="Mission USA" style={{ height: 22, width: "auto" }} />
            <span style={brandTxt}>Admin</span>
          </Link>
          <nav style={nav}>
            {TABS.map(([href, label]) => (
              <Link key={href} href={href} style={{ ...tab, ...(isActive(href) ? tabOn : {}) }}>{label}</Link>
            ))}
          </nav>
          <Link href="/" style={backLink}>View site →</Link>
        </div>
      </div>
      {children}
    </div>
  );
}

const bar = { background: "linear-gradient(90deg,#122A44,#1B3A57)", borderBottom: "1px solid rgba(255,255,255,.08)", position: "sticky", top: 0, zIndex: 50 };
const barInner = { maxWidth: 1100, margin: "0 auto", padding: "0 22px", height: 54, display: "flex", alignItems: "center", gap: 22 };
const brand = { display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 };
const brandTxt = { color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.9 };
const nav = { display: "flex", gap: 4, flex: 1, flexWrap: "wrap" };
const tab = { color: "rgba(255,255,255,.72)", fontSize: 13.5, fontWeight: 600, textDecoration: "none", padding: "7px 12px", borderRadius: 8, transition: "all .12s ease" };
const tabOn = { color: "#fff", background: "rgba(255,255,255,.12)" };
const backLink = { color: "#E4CE8C", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 };
