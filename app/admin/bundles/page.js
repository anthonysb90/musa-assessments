"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

const BLANK = { slug: "", name: "", description: "", dollars: "", assessment_slugs: [], is_active: true };

export default function AdminBundles() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading");
  const [bundles, setBundles] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data: bs } = await supabase.from("bundles").select("*").order("created_at", { ascending: false });
    setBundles(bs || []);
  }

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data: as } = await supabase.from("assessments").select("slug,name,price_cents,is_paid").order("name");
      setAssessments(as || []);
      await load();
      setState("ready");
    })();
  }, [supabase]);

  const sumOfParts = form.assessment_slugs.reduce((t, s) => {
    const a = assessments.find((x) => x.slug === s);
    return t + (a?.is_paid ? a.price_cents : 0);
  }, 0);

  function toggleSlug(slug) {
    setForm((f) => ({
      ...f,
      assessment_slugs: f.assessment_slugs.includes(slug)
        ? f.assessment_slugs.filter((s) => s !== slug)
        : [...f.assessment_slugs, slug],
    }));
  }

  async function saveBundle(e) {
    e.preventDefault();
    setMsg("");
    const slug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    if (!slug || !form.name.trim() || !form.assessment_slugs.length) { setMsg("Name, slug, and at least one assessment are required."); return; }
    const { error } = await supabase.rpc("admin_upsert_bundle", {
      p_slug: slug, p_name: form.name.trim(), p_description: form.description.trim() || null,
      p_price: Math.round(Number(form.dollars || 0) * 100), p_slugs: form.assessment_slugs, p_active: !!form.is_active,
    });
    if (error) { setMsg(error.message); return; }
    setForm(BLANK); setMsg("Saved.");
    await load();
  }

  function editBundle(b) {
    setForm({ slug: b.slug, name: b.name, description: b.description || "", dollars: (b.price_cents / 100).toFixed(2), assessment_slugs: b.assessment_slugs || [], is_active: b.is_active });
    window.scrollTo(0, 0);
  }

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>Staff only. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 760, padding: "40px 24px 80px" }}>
      <Link href="/admin" style={link}>← Admin</Link>
      <h1 className="serif" style={h1}>Bundles</h1>
      <p style={sub}>Group several assessments and sell them together at a discount. Churches can buy bundle seats from the bundle page.</p>

      <form onSubmit={saveBundle} style={card}>
        <div style={two}>
          <label style={fw}><span style={fl}>Bundle name</span>
            <input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Leadership Starter" />
          </label>
          <label style={fw}><span style={fl}>Slug (URL)</span>
            <input style={inp} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="leadership-starter" />
          </label>
        </div>
        <label style={fw}><span style={fl}>Description</span>
          <input style={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Everything a new leader needs to start." />
        </label>
        <div style={fl}>Assessments in this bundle</div>
        <div style={{ display: "grid", gap: 6, margin: "6px 0 16px" }}>
          {assessments.map((a) => (
            <label key={a.slug} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--ink)" }}>
              <input type="checkbox" checked={form.assessment_slugs.includes(a.slug)} onChange={() => toggleSlug(a.slug)} />
              {a.name} {a.is_paid ? <span style={{ color: "#8CA0B3" }}>(${(a.price_cents / 100).toFixed(2)})</span> : <span style={{ color: "#8CA0B3" }}>(free)</span>}
            </label>
          ))}
        </div>
        <div style={two}>
          <label style={fw}><span style={fl}>Bundle price ($)</span>
            <input style={inp} type="number" min="0" step="0.01" value={form.dollars} onChange={(e) => setForm({ ...form, dollars: e.target.value })} />
          </label>
          <label style={{ ...fw, display: "flex", gap: 8, alignItems: "center", marginTop: 24 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
        </div>
        {sumOfParts > 0 && (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>
            Bought separately these total ${(sumOfParts / 100).toFixed(2)}. {Number(form.dollars) > 0 && Number(form.dollars) * 100 < sumOfParts && <strong style={{ color: "#2E7D8A" }}>Bundle saves ${((sumOfParts - Number(form.dollars) * 100) / 100).toFixed(2)}.</strong>}
          </p>
        )}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Save bundle</button>
        {msg && <p style={{ fontSize: 13.5, color: msg === "Saved." ? "#2E7D8A" : "#B4443A", marginTop: 10 }}>{msg}</p>}
      </form>

      <h2 style={{ ...h1, fontSize: 22, marginTop: 30 }}>Existing bundles</h2>
      {!bundles.length && <p style={sub}>None yet.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {bundles.map((b) => (
          <div key={b.slug} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{b.name} {!b.is_active && <span style={{ color: "#8CA0B3", fontSize: 12 }}>(inactive)</span>}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>${(b.price_cents / 100).toFixed(2)} · {(b.assessment_slugs || []).length} assessments · /bundle/{b.slug}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn btn-ghost" href={`/bundle/${b.slug}`} target="_blank" rel="noreferrer" style={{ padding: "8px 14px" }}>View</a>
              <button className="btn btn-ghost" style={{ padding: "8px 14px" }} onClick={() => editBundle(b)}>Edit</button>
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
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 620 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 };
const two = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const fw = { display: "block", marginBottom: 16 };
const fl = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const inp = { width: "100%", padding: "11px 13px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
