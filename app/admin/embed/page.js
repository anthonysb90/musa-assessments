"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { APP_URL } from "../../lib/config";

export default function AdminEmbed() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data } = await supabase.from("assessments").select("slug,name,category").eq("is_published", true).order("category").order("name");
      setRows(data || []);
      setState("ready");
    })();
  }, [supabase]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>Staff only. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  const snippet = (slug, name) =>
    `<iframe src="${APP_URL}/embed/${slug}" width="420" height="560" style="border:0;max-width:100%" title="${name} — Mission USA" loading="lazy"></iframe>`;

  return (
    <main className="wrap" style={{ maxWidth: 780, padding: "40px 24px 80px" }}>
      <Link href="/admin" style={link}>← Admin</Link>
      <h1 className="serif" style={h1}>Embed on any site</h1>
      <p style={sub}>Paste one of these snippets into any web page (church site, blog, email footer that supports HTML). Each shows a branded card that opens the assessment in a new tab, with pricing and login handled automatically.</p>

      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((a) => (
          <Snippet key={a.slug} code={snippet(a.slug, a.name)} name={a.name} slug={a.slug} />
        ))}
      </div>
    </main>
  );
}

function Snippet({ code, name, slug }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{name}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-ghost" href={`/embed/${slug}`} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", fontSize: 13 }}>Preview</a>
          <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 13 }}
            onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? "Copied ✓" : "Copy code"}
          </button>
        </div>
      </div>
      <textarea readOnly value={code} onFocus={(e) => e.target.select()} style={ta} />
    </div>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 640 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 };
const ta = { width: "100%", height: 64, fontFamily: "monospace", fontSize: 12.5, padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--line)", resize: "vertical", color: "var(--ink)", background: "#fff" };
