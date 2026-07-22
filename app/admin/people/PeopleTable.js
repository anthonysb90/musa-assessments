"use client";
import { useMemo, useState } from "react";

export default function PeopleTable({ rows, assessments }) {
  const [q, setQ] = useState("");
  const [assessment, setAssessment] = useState("all");
  const [chc, setChc] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (assessment !== "all" && r.assessment !== assessment) return false;
      if (chc !== "all" && r.chc !== chc) return false;
      if (!needle) return true;
      return [r.name, r.email, r.phone, r.assessment, r.role, r.church].join(" ").toLowerCase().includes(needle);
    });
  }, [rows, q, assessment, chc]);

  function exportCsv() {
    const cols = ["Name", "Email", "Phone", "Assessment", "Result", "Date", "Duration (s)", "Role", "Age", "CHC", "Church", "Source"];
    const lines = [cols.join(",")];
    for (const r of filtered) {
      const vals = [r.name, r.email, r.phone, r.assessment, r.summary, fmtDate(r.date), r.duration ?? "", r.role, r.age, r.chc, r.church, r.source];
      lines.push(vals.map(csv).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mission-usa-people-${filtered.length}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const uniquePeople = new Set(rows.map((r) => r.email || r.name)).size;

  return (
    <>
      <div style={statRow}>
        <Stat label="Completions" value={rows.length} />
        <Stat label="Unique people" value={uniquePeople} />
        <Stat label="Showing" value={filtered.length} />
      </div>

      <div style={controls}>
        <input style={search} placeholder="Search name, email, phone, church…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={sel} value={assessment} onChange={(e) => setAssessment(e.target.value)}>
          <option value="all">All assessments</option>
          {assessments.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={sel} value={chc} onChange={(e) => setChc(e.target.value)}>
          <option value="all">CHC & non-CHC</option>
          <option value="CHC">CHC only</option>
          <option value="Non-CHC">Non-CHC only</option>
        </select>
        <button className="btn btn-primary" onClick={exportCsv} style={{ whiteSpace: "nowrap" }}>Export CSV ({filtered.length})</button>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              {["Name", "Contact", "Assessment", "Result", "Date", "Time", "Role / CHC", "Church", ""].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 1000).map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid #F0F2F4" }}>
                <td style={td}><strong style={{ color: "#1C2B3A" }}>{r.name}</strong></td>
                <td style={td}>
                  <div>{r.email}</div>
                  {r.phone && <div style={{ color: "#8CA0B3" }}>{r.phone}</div>}
                </td>
                <td style={td}>{r.assessment}</td>
                <td style={{ ...td, color: "#2E7D8A", fontWeight: 600 }}>{r.summary}</td>
                <td style={td}>{fmtDate(r.date)}</td>
                <td style={td}>{fmtDur(r.duration)}</td>
                <td style={td}>{[r.role, r.chc].filter(Boolean).join(" · ")}</td>
                <td style={td}>{r.church}</td>
                <td style={td}>{r.token ? <a href={`/results/${r.token}`} target="_blank" rel="noreferrer" style={{ color: "var(--teal-deep)", fontWeight: 600, textDecoration: "none" }}>View →</a> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 1000 && <p style={{ padding: 14, color: "#8CA0B3", fontSize: 13 }}>Showing first 1000 of {filtered.length}. Narrow with search, or export the full filtered set.</p>}
        {!filtered.length && <p style={{ padding: 20, color: "#8CA0B3" }}>No one matches those filters yet.</p>}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#1B3A57" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "#8CA0B3", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
const fmtDur = (s) => s == null ? "" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
const csv = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const statRow = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 480, marginBottom: 18 };
const statCard = { background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px" };
const controls = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 };
const search = { flex: "1 1 260px", padding: "11px 14px", fontSize: 14.5, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" };
const sel = { padding: "11px 12px", fontSize: 14, borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit", background: "#fff" };
const tableWrap = { background: "#fff", border: "1px solid var(--line)", borderRadius: 14, overflow: "auto" };
const table = { width: "100%", borderCollapse: "collapse", fontSize: 13.5 };
const th = { textAlign: "left", padding: "12px 14px", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "#8CA0B3", fontWeight: 700, background: "#F8FAFB", position: "sticky", top: 0, whiteSpace: "nowrap" };
const td = { padding: "12px 14px", color: "#3A4A5A", verticalAlign: "top", whiteSpace: "nowrap" };
