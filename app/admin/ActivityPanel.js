"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";

// Read-only recent admin activity, from the admin_audit_log RPC.
const LABELS = {
  grant_deleted: "Deleted a grant",
  grant_refunded: "Refunded a purchase",
  grant_issued: "Issued a grant",
  report_resent: "Resent a report",
  wellbeing_contacted: "Marked a pastor contacted",
};

export default function ActivityPanel() {
  const supabase = useRef(getSupabase()).current;
  const [rows, setRows] = useState(null); // null = loading

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_audit_log");
      setRows(data || []);
    })();
  }, [supabase]);

  if (rows === null) return <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 13.5 }}>Loading…</p>;
  if (!rows.length) return <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 13.5 }}>No recent admin activity.</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.slice(0, 40).map((r, i) => (
        <div key={i} style={row}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{LABELS[r.action] || r.action}</span>
          <span style={{ color: "var(--ink-soft)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.actor_email || "—"}{r.target_id ? ` · ${r.target_id}` : ""}
          </span>
          <span style={{ color: "var(--ink-soft)", fontSize: 12.5, textAlign: "right" }}>{relTime(r.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

function relTime(d) {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

const row = { display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F2F4" };
