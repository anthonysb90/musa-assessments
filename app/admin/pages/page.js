"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

// Assessment landing pages: swap the header (hero) image per assessment.
// Paste any image URL, or upload a file. Saved instantly via a SECURITY DEFINER
// RPC — no deploy. This is the first slice of broader page editing.
export default function AdminPages() {
  const supabase = useRef(getSupabase()).current;
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading");
  const [savingSlug, setSavingSlug] = useState("");
  const [savedSlug, setSavedSlug] = useState("");

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data } = await supabase
        .from("assessments")
        .select("slug,name,category,header_image_url,is_published")
        .order("category").order("name");
      setRows((data || []).map((r) => ({ ...r, url: r.header_image_url || "" })));
      setState("ready");
    })();
  }, [supabase]);

  const edit = (slug, patch) => setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));

  function upload(slug, file) {
    if (!file) return;
    if (file.size > 3_500_000) { alert("That image is large. For best performance, use an image under ~3 MB or paste a hosted URL instead."); }
    const reader = new FileReader();
    reader.onload = () => edit(slug, { url: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function save(r) {
    setSavingSlug(r.slug); setSavedSlug("");
    await supabase.rpc("admin_set_header_image", { p_slug: r.slug, p_url: r.url || "" });
    setSavingSlug(""); setSavedSlug(r.slug);
    setTimeout(() => setSavedSlug(""), 1800);
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 860, padding: "40px 24px 80px" }}>
      <div style={eyebrow}>Content</div>
      <h1 className="serif" style={h1}>Assessment pages</h1>
      <p style={sub}>
        Change the header image on each assessment&rsquo;s landing page. Paste any image URL (from Pexels,
        Unsplash, or your own hosting) or upload a file, then Save. Changes are live immediately, no deploy.
        Leave the field empty to fall back to the built-in default.
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.slug} style={card}>
            <div style={preview}>
              {r.url
                ? <img src={r.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.opacity = ".2"; }} />
                : <span style={{ fontSize: 12, color: "#8CA0B3" }}>Default</span>}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                {r.name}{!r.is_published && <span style={draft}>unpublished</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>{r.category}</div>
              <input
                style={urlInp} type="url" placeholder="https://…image.jpg  (or upload →)"
                value={r.url} onChange={(e) => edit(r.slug, { url: e.target.value })}
              />
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <label style={uploadBtn}>
                  Upload image
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => upload(r.slug, e.target.files?.[0])} />
                </label>
                {r.url && <button onClick={() => edit(r.slug, { url: "" })} style={linkBtn}>Clear (use default)</button>}
                <a href={`/assessment/${r.slug}`} target="_blank" rel="noreferrer" style={linkBtn}>Preview page ↗</a>
                <button className="btn btn-primary" style={{ padding: "8px 18px", marginLeft: "auto" }} disabled={savingSlug === r.slug} onClick={() => save(r)}>
                  {savingSlug === r.slug ? "Saving…" : savedSlug === r.slug ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const eyebrow = { fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 640 };
const card = { display: "flex", gap: 16, alignItems: "flex-start", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 16 };
const preview = { flex: "0 0 auto", width: 128, height: 84, borderRadius: 10, overflow: "hidden", background: "var(--mist2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" };
const urlInp = { width: "100%", padding: "9px 12px", fontSize: 13.5, borderRadius: 8, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const uploadBtn = { fontSize: 13, fontWeight: 600, color: "var(--teal-deep)", border: "1.5px solid var(--line)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", background: "#fff" };
const linkBtn = { background: "transparent", border: "none", color: "var(--teal-deep)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" };
const draft = { fontSize: 11, fontWeight: 700, color: "#8CA0B3", marginLeft: 8, textTransform: "uppercase", letterSpacing: ".04em" };
