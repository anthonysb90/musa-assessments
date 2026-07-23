"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { APP_URL } from "../../lib/config";

// Admin church management: onboard a church, set its results-recipient email(s),
// choose which assessments it receives, hand out pre-filled assignment links,
// and invite/remove church-dashboard users.
export default function AdminChurches() {
  const supabase = useRef(getSupabase()).current;
  const [state, setState] = useState("loading"); // loading | ready | denied
  const [churches, setChurches] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [copied, setCopied] = useState("");

  async function load() {
    const { data } = await supabase.rpc("admin_churches");
    setChurches(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) { setState("denied"); return; }
      const { data: a } = await supabase
        .from("assessments").select("slug,name,is_published").order("name");
      setAssessments((a || []).filter((x) => x.is_published));
      await load();
      setState("ready");
    })();
  }, [supabase]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "denied") return <Center>This area is limited to Mission USA staff. <Link href="/dashboard" style={link}>My dashboard</Link></Center>;

  return (
    <main className="wrap" style={{ maxWidth: 940, padding: "40px 24px 90px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 }}>Partnerships</div>
      <h1 className="serif" style={h1}>Church Partnerships</h1>
      <p style={sub}>
        Onboard a church, choose which assessments they receive, and hand them a pre-filled link.
        When a member picks that church, results are shared with the church and emailed to their contact.
        Church leaders you invite get a separate dashboard scoped to their assigned assessments.
      </p>

      <NewChurch supabase={supabase} onDone={load} assessments={assessments} />

      <div style={{ marginTop: 26, display: "grid", gap: 18 }}>
        {churches.map((c) => (
          <ChurchCard key={c.id} c={c} supabase={supabase} assessments={assessments}
            onChange={load} copied={copied} setCopied={setCopied} />
        ))}
        {churches.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No churches yet. Add your first one above.</p>}
      </div>
    </main>
  );
}

function NewChurch({ supabase, onDone, assessments }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", city: "", state: "", district: "", email: "", email2: "", visibility: "individual_named" });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    await supabase.rpc("admin_upsert_church", {
      p_id: null, p_name: f.name, p_city: f.city, p_state: f.state, p_district: f.district,
      p_email: f.email, p_email2: f.email2, p_visibility: f.visibility,
    });
    setSaving(false); setOpen(false);
    setF({ name: "", city: "", state: "", district: "", email: "", email2: "", visibility: "individual_named" });
    onDone();
  }
  if (!open) return <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Onboard a church</button>;
  return (
    <div style={{ ...card, marginTop: 8 }}>
      <div style={cardH}>New church</div>
      <div style={grid2}>
        <Field label="Church name" v={f.name} on={(v) => setF({ ...f, name: v })} />
        <Field label="District (optional)" v={f.district} on={(v) => setF({ ...f, district: v })} />
        <Field label="City" v={f.city} on={(v) => setF({ ...f, city: v })} />
        <Field label="State" v={f.state} on={(v) => setF({ ...f, state: v })} />
        <Field label="Results recipient email" v={f.email} on={(v) => setF({ ...f, email: v })} />
        <Field label="Second recipient (optional)" v={f.email2} on={(v) => setF({ ...f, email2: v })} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="btn btn-primary" disabled={saving || !f.name.trim()} onClick={save}>{saving ? "Saving…" : "Create church"}</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function ChurchCard({ c, supabase, assessments, onChange, copied, setCopied }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({
    name: c.name, city: c.city || "", state: c.state || "", district: c.district || "",
    email: c.recipient_email || "", email2: c.recipient_email_2 || "", visibility: c.results_visibility,
  });
  const [assigned, setAssigned] = useState(new Set(c.assigned_slugs || []));
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState("");

  async function saveInfo() {
    setBusy("info");
    await supabase.rpc("admin_upsert_church", {
      p_id: c.id, p_name: f.name, p_city: f.city, p_state: f.state, p_district: f.district,
      p_email: f.email, p_email2: f.email2, p_visibility: f.visibility,
    });
    setBusy(""); setEdit(false); onChange();
  }
  async function toggleAssessment(slug) {
    const next = new Set(assigned);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    setAssigned(next);
    await supabase.rpc("admin_set_church_assessments", { p_church_id: c.id, p_slugs: [...next] });
    onChange();
  }
  async function inviteUser() {
    if (!invite.trim()) return;
    setBusy("invite");
    await fetch("/api/admin/church-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ church_id: c.id, email: invite.trim() }),
    });
    setInvite(""); setBusy(""); onChange();
  }
  async function removeUser(id) {
    await supabase.rpc("admin_remove_church_user", { p_id: id });
    onChange();
  }
  function copy(url, key) {
    navigator.clipboard?.writeText(url);
    setCopied(key); setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="serif" style={{ fontSize: 21, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {[c.city, c.state].filter(Boolean).join(", ")}{c.district ? ` · ${c.district}` : ""} · {c.completed_count} completed
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
            Results to: {c.recipient_email || "—"}{c.recipient_email_2 ? `, ${c.recipient_email_2}` : ""}
          </div>
        </div>
        <button className="btn btn-ghost" style={{ padding: "6px 14px" }} onClick={() => setEdit(!edit)}>{edit ? "Close" : "Edit"}</button>
      </div>

      {edit && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div style={grid2}>
            <Field label="Church name" v={f.name} on={(v) => setF({ ...f, name: v })} />
            <Field label="District" v={f.district} on={(v) => setF({ ...f, district: v })} />
            <Field label="City" v={f.city} on={(v) => setF({ ...f, city: v })} />
            <Field label="State" v={f.state} on={(v) => setF({ ...f, state: v })} />
            <Field label="Results recipient email" v={f.email} on={(v) => setF({ ...f, email: v })} />
            <Field label="Second recipient" v={f.email2} on={(v) => setF({ ...f, email2: v })} />
          </div>
          <label style={{ display: "block", fontSize: 13, color: "var(--ink-soft)", margin: "6px 0 12px" }}>
            Results sharing:&nbsp;
            <select value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })} style={{ ...inp, width: "auto", display: "inline-block" }}>
              <option value="individual_named">Named individual results</option>
              <option value="aggregate_only">Aggregate only</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy === "info"} onClick={saveInfo}>{busy === "info" ? "Saving…" : "Save church"}</button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={secH}>Assessments this church receives</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {assessments.map((a) => {
            const on = assigned.has(a.slug);
            return (
              <button key={a.slug} onClick={() => toggleAssessment(a.slug)}
                style={{ ...chip, ...(on ? chipOn : {}) }}>
                {on ? "✓ " : ""}{a.name}
              </button>
            );
          })}
        </div>
      </div>

      {(c.links || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={secH}>Pre-filled assignment links (share with the church)</div>
          <div style={{ display: "grid", gap: 6 }}>
            {c.links.map((l) => {
              const url = `${APP_URL}/assessment/${l.slug}?a=${l.token}`;
              const key = c.id + l.slug;
              return (
                <div key={l.token} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", minWidth: 150 }}>{l.name}</span>
                  <code style={code}>{url}</code>
                  <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }} onClick={() => copy(url, key)}>
                    {copied === key ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={secH}>Church dashboard users</div>
        <div style={{ display: "grid", gap: 6 }}>
          {(c.users || []).map((u) => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F7F9FA", borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ fontSize: 14, color: "var(--ink)" }}>{u.email} <span style={{ color: "#8CA0B3", fontSize: 12 }}>· {u.status}</span></span>
              <button onClick={() => removeUser(u.id)} style={linkBtn}>Remove</button>
            </div>
          ))}
          {(c.users || []).length === 0 && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>No church users yet.</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={{ ...inp, flex: 1 }} type="email" placeholder="leader@church.org" value={invite} onChange={(e) => setInvite(e.target.value)} />
          <button className="btn btn-primary" style={{ padding: "9px 16px" }} disabled={busy === "invite" || !invite.trim()} onClick={inviteUser}>
            {busy === "invite" ? "Inviting…" : "Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, v, on }) => (
  <label style={{ display: "block" }}>
    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>{label}</span>
    <input style={inp} value={v} onChange={(e) => on(e.target.value)} />
  </label>
);
const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 22px", maxWidth: 680 };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" };
const cardH = { fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const secH = { fontSize: 11.5, letterSpacing: ".08em", textTransform: "uppercase", color: "#8CA0B3", fontWeight: 700, marginBottom: 10 };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const inp = { width: "100%", padding: "9px 12px", fontSize: 14, borderRadius: 8, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
const chip = { fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, border: "1.5px solid var(--line)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer" };
const chipOn = { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" };
const code = { fontSize: 12, color: "#4A5B6D", wordBreak: "break-all", background: "#F6F8FA", padding: "6px 8px", borderRadius: 8, flex: 1 };
const linkBtn = { background: "transparent", border: "none", color: "#B4703A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" };
