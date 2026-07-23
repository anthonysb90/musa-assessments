"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";

// Public church partnership request. Submits a pending church that appears in
// the admin for one-click approval.
export default function PartnerRequest() {
  const supabase = useRef(getSupabase()).current;
  const [assessments, setAssessments] = useState([]);
  const [f, setF] = useState({
    name: "", district: "", email: "", phone: "", admin_email: "",
    logo_color: "", logo_white: "", slugs: [], gate: false,
  });
  const [state, setState] = useState("form"); // form | sending | done | error
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assessments").select("slug,name,category").eq("is_published", true)
        .eq("allows_church_mode", true).order("category").order("name");
      setAssessments(data || []);
    })();
  }, [supabase]);

  const toggleSlug = (slug) =>
    setF((s) => ({ ...s, slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug] }));

  function onLogo(key, e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, 360 / img.width);
        const cnv = document.createElement("canvas");
        cnv.width = Math.round(img.width * scale); cnv.height = Math.round(img.height * scale);
        cnv.getContext("2d").drawImage(img, 0, 0, cnv.width, cnv.height);
        setF((s) => ({ ...s, [key]: cnv.toDataURL("image/png") }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = f.name.trim() && emailOk(f.email);

  async function submit() {
    setState("sending"); setErr("");
    try {
      const res = await fetch("/api/partner-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Something went wrong.");
      setState("done"); window.scrollTo(0, 0);
    } catch (e) { setErr(e.message); setState("error"); }
  }

  if (state === "done") {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: "var(--mist)" }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <h1 className="serif" style={{ fontSize: 30, color: "var(--ink)", margin: "8px 0 12px" }}>Request received</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
            Thank you. Mission USA has your partnership request and will review it shortly. We'll reach out at {f.email} once your church is set up.
          </p>
          <a className="btn btn-primary" href="/" style={{ marginTop: 18 }}>Explore the assessments →</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--mist)", minHeight: "100vh" }}>
      <header style={hd}>
        <div style={wrap}>
          <img src="/musa-logo-white-h.png" alt="Mission USA" style={{ height: 30, marginBottom: 16 }} />
          <div style={kicker}>Church Partnerships</div>
          <h1 className="serif" style={{ fontSize: "clamp(28px,4vw,40px)", margin: "6px 0 8px" }}>Partner with Mission USA</h1>
          <p style={{ color: "rgba(255,255,255,.82)", fontSize: 16.5, maxWidth: 620, lineHeight: 1.6 }}>
            Use our assessments in your membership and growth classes. Your members choose your church, you get every result
            in your own private dashboard, and we hand you a link that's ready to share. Tell us about your church below.
          </p>
        </div>
      </header>

      <div style={{ ...wrap, padding: "30px 24px 80px" }}>
        <div style={card}>
          <Field label="Church name" req v={f.name} on={(v) => setF({ ...f, name: v })} />
          <div style={grid2}>
            <Field label="District" v={f.district} on={(v) => setF({ ...f, district: v })} />
            <Field label="Phone number" type="tel" v={f.phone} on={(v) => setF({ ...f, phone: v })} />
          </div>
          <Field label="Email address (where results and setup go)" req type="email" v={f.email} on={(v) => setF({ ...f, email: v })} />
          <Field label="A second email to also give dashboard access (optional)" type="email" v={f.admin_email} on={(v) => setF({ ...f, admin_email: v })} />

          <div style={sec}>Which assessments would you like to use?</div>
          <div style={privacyNote}>
            <strong>A note on privacy.</strong> A few of our most personal assessments, like the ones touching
            marriage, mental and emotional health, and private reflection, are not eligible for church
            partnership or dashboard viewing. Those results stay between the individual and God. Only the
            assessments below can be shared with a church.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {assessments.map((a) => {
              const on = f.slugs.includes(a.slug);
              return (
                <button key={a.slug} type="button" onClick={() => toggleSlug(a.slug)} style={{ ...chip, ...(on ? chipOn : {}) }}>
                  {on ? "✓ " : ""}{a.name}
                </button>
              );
            })}
          </div>

          <label style={gateBox}>
            <input type="checkbox" checked={f.gate} onChange={(e) => setF({ ...f, gate: e.target.checked })} style={{ marginTop: 3 }} />
            <span>
              <strong>Hold results for in-person review.</strong> If you check this, your members will not see their own
              results on their own. Instead, the results come to you, so a leader can sit down and go over them together.
              It keeps the moment personal. Leave it unchecked and each member sees their report right away.
            </span>
          </label>

          <div style={sec}>Your church logo (optional)</div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.55 }}>
            If you'd like your church's logo on your members' reports, upload a <strong>PNG with a transparent background</strong>,
            both a <strong>color version</strong> and a <strong>white version</strong>. This step is completely optional, your
            reports will look great either way.
          </p>
          <div style={grid2}>
            <LogoField label="Color logo (PNG, no background)" val={f.logo_color} onFile={(e) => onLogo("logo_color", e)} onClear={() => setF({ ...f, logo_color: "" })} dark={false} />
            <LogoField label="White logo (PNG, no background)" val={f.logo_white} onFile={(e) => onLogo("logo_white", e)} onClear={() => setF({ ...f, logo_white: "" })} dark />
          </div>

          {state === "error" && <div style={errBox}>{err}</div>}

          <button className="btn btn-primary" disabled={!canSubmit || state === "sending"} onClick={submit}
            style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>
            {state === "sending" ? "Sending…" : "Request a partnership"}
          </button>
          {!canSubmit && <p style={{ fontSize: 12.5, color: "#8CA0B3", textAlign: "center", marginTop: 8 }}>Church name and a valid email are required.</p>}
        </div>
      </div>
    </main>
  );
}

function Field({ label, v, on, type = "text", req }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={fieldLabel}>{label}{req && <span style={{ color: "#B4703A" }}> *</span>}</span>
      <input style={input} type={type} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
function LogoField({ label, val, onFile, onClear, dark }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={fieldLabel}>{label}</span>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {val && <span style={{ background: dark ? "#1B3A57" : "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", display: "inline-flex" }}><img src={val} alt="logo" style={{ height: 30 }} /></span>}
        <label className="btn btn-ghost" style={{ padding: "8px 14px", cursor: "pointer" }}>
          {val ? "Replace" : "Upload"}
          <input type="file" accept="image/png" onChange={onFile} style={{ display: "none" }} />
        </label>
        {val && <button type="button" onClick={onClear} style={linkBtn}>Remove</button>}
      </div>
    </div>
  );
}

const wrap = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const hd = { background: "linear-gradient(135deg,#1B3A57,#122A44)", color: "#fff", padding: "40px 0 34px" };
const kicker = { fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "28px 26px" };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const sec = { fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, margin: "18px 0 12px" };
const privacyNote = { background: "var(--blush,#F5EFE6)", border: "1px solid #EADFC9", borderRadius: 12, padding: "13px 16px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: "0 0 14px" };
const fieldLabel = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };
const input = { width: "100%", padding: "12px 14px", fontSize: 15, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
const chip = { fontSize: 13.5, fontWeight: 600, padding: "8px 13px", borderRadius: 999, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer" };
const chipOn = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const gateBox = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", background: "#F7F9FA", borderRadius: 12, padding: "14px 16px", margin: "18px 0 6px", lineHeight: 1.55 };
const errBox = { background: "#FCEEEA", border: "1px solid #F2C9BE", color: "#A23B22", borderRadius: 10, padding: "12px 14px", fontSize: 14, marginTop: 16 };
const linkBtn = { background: "transparent", border: "none", color: "#B4703A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" };
