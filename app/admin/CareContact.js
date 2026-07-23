"use client";
import { useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";

// Compact "contacted" control for a pastor-wellbeing care row.
// props: { sessionId, contacted, note }
// Toggling the checkbox or editing the note (on blur/Enter) persists via the
// admin_set_wellbeing_contacted RPC and shows a subtle "Saved" tick.
export default function CareContact({ sessionId, contacted, note }) {
  const supabase = useRef(getSupabase()).current;
  const [checked, setChecked] = useState(!!contacted);
  const [text, setText] = useState(note || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(nextChecked, nextNote) {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_wellbeing_contacted", {
      p_session_id: sessionId,
      p_contacted: nextChecked,
      p_note: nextNote || null,
    });
    setBusy(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(e) => { const v = e.target.checked; setChecked(v); save(v, text); }}
        />
        Contacted
      </label>
      <input
        style={noteInp}
        placeholder="note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save(checked, text)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      />
      {saved && <span style={{ fontSize: 12, color: "#1F7A4D" }}>Saved ✓</span>}
    </span>
  );
}

const noteInp = {
  padding: "5px 8px",
  fontSize: 12.5,
  borderRadius: 7,
  border: "1px solid #EADFC9",
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
  width: 130,
};
