import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "../lib/supabaseServer";
import { headlineFor } from "../lib/headline";
import { GIFTS } from "../lib/gifts";
import Greeting from "../components/Greeting";

export const dynamic = "force-dynamic";

const RANGES = [["30", "30 days"], ["90", "90 days"], ["365", "12 months"], ["all", "All time"]];

export default async function AdminPage({ searchParams }) {
  const supabase = getServerSupabase();
  const { data: udata } = await supabase.auth.getUser();
  if (!udata?.user) redirect("/login?next=/admin");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: adminProfile } = await supabase
    .from("profiles").select("first_name").eq("id", udata.user.id).maybeSingle();
  if (!isAdmin) {
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <h1 className="serif" style={{ color: "var(--ink)" }}>Not authorized</h1>
          <p style={{ color: "var(--ink-soft)" }}>This area is limited to Mission USA staff.</p>
          <a className="btn btn-ghost" href="/dashboard">Go to my dashboard</a>
        </div>
      </Centered>
    );
  }

  const rangeKey = RANGES.some((r) => r[0] === searchParams?.range) ? searchParams.range : "90";
  const days = rangeKey === "all" ? null : Number(rangeKey);
  const since = days ? new Date(Date.now() - days * 864e5) : null;
  const inRange = (d) => !since || (d && new Date(d) >= since);

  // ---- data ----
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,result_token,completed_at,started_at,status,mode,source_tag,church_id,duration_seconds,assessments(name,slug)")
    .order("completed_at", { ascending: false })
    .limit(5000);
  const all = sessions || [];
  const ids = all.map((s) => s.id);
  let results = [];
  if (ids.length) {
    const { data } = await supabase.from("results").select("session_id,scored_json,delivered_at").in("session_id", ids);
    results = data || [];
  }
  const scoredBy = Object.fromEntries(results.map((r) => [r.session_id, r]));
  const { data: churches } = await supabase.from("churches").select("id,name");
  const churchName = Object.fromEntries((churches || []).map((c) => [c.id, c.name]));
  const { data: grants } = await supabase
    .from("access_grants")
    .select("kind,bundle_slug,assessment_slugs,seats_total,seats_used,stripe_payment_intent,created_at");
  const { data: bundles } = await supabase.from("bundles").select("slug,price_cents");
  const { data: priced } = await supabase.from("assessments").select("slug,price_cents,is_paid");
  const bundlePrice = Object.fromEntries((bundles || []).map((b) => [b.slug, b.price_cents]));
  const asmtPrice = Object.fromEntries((priced || []).map((a) => [a.slug, a.is_paid ? a.price_cents : 0]));

  // ---- scoped sets ----
  const completedAll = all.filter((s) => s.status === "completed");
  const completed = completedAll.filter((s) => inRange(s.completed_at));
  const startedInRange = all.filter((s) => inRange(s.started_at || s.completed_at));
  const contactOf = (s) => scoredBy[s.id]?.scored_json?.contact || {};

  // ---- KPIs ----
  const completionRate = startedInRange.length ? Math.round((completed.length / startedInRange.length) * 100) : 0;
  const emailed = completed.filter((s) => scoredBy[s.id]?.delivered_at).length;
  const avgMin = completed.length
    ? Math.round((completed.reduce((a, s) => a + (s.duration_seconds || 0), 0) / completed.length) / 60 * 10) / 10 : 0;
  const uniquePeople = new Set(completed.map((s) => (contactOf(s).email || "").toLowerCase()).filter(Boolean)).size;
  const activeChurches = new Set(completed.map((s) => s.church_id).filter(Boolean)).size;
  const paidGrants = (grants || []).filter((g) => g.stripe_payment_intent && inRange(g.created_at));
  const estRevenue = paidGrants.reduce((sum, g) => {
    if (g.kind === "bundle" && g.bundle_slug) return sum + (bundlePrice[g.bundle_slug] || 0);
    const slug = (g.assessment_slugs || [])[0];
    return sum + (asmtPrice[slug] || 0);
  }, 0);
  const seatsSold = paidGrants.reduce((a, g) => a + (g.seats_total || 0), 0);

  // ---- time series (weekly) ----
  const weeks = buildWeeks(since, 12);
  for (const s of completed) {
    const wk = weekKey(s.completed_at);
    const bucket = weeks.find((w) => w.key === wk);
    if (bucket) bucket.value += 1;
  }

  // ---- breakdowns ----
  const byAssessment = tally(completed.map((s) => s.assessments?.name || "—"));
  const byRole = tally(completed.map((s) => contactOf(s).ministry_role || "Unspecified"));
  const byAge = tally(completed.map((s) => contactOf(s).age_band || "Unspecified"));
  const byChc = tally(completed.map((s) => { const v = contactOf(s).is_chc; return v === true ? "CHC" : v === false ? "Non-CHC" : "Unspecified"; }));
  const bySource = tally(completed.map((s) => s.source_tag || "public"));
  const byChurch = tally(completed.filter((s) => s.church_id).map((s) => churchName[s.church_id] || "Unknown church"));

  // ---- signal: top spiritual gifts (aggregate) ----
  const giftTally = {};
  for (const s of completed.filter((s) => s.assessments?.slug === "spiritual-gifts")) {
    const top = scoredBy[s.id]?.scored_json?.ranked?.[0]?.letter;
    if (top) giftTally[GIFTS[top]?.name || top] = (giftTally[GIFTS[top]?.name || top] || 0) + 1;
  }
  const topGifts = Object.entries(giftTally).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // ---- signal: planter readiness ----
  const planterTally = tally(
    completed.filter((s) => s.assessments?.slug === "church-planter")
      .map((s) => scoredBy[s.id]?.scored_json?.tier_label || "—")
  );

  // ---- pastor wellbeing care list ----
  const { data: wbRows } = await supabase
    .from("wellbeing_results").select("session_id,band,elevated,created_at").order("created_at", { ascending: false });
  const careList = (wbRows || [])
    .filter((w) => (w.band === "significant" || w.band === "strain") && inRange(w.created_at))
    .map((w) => ({ ...w, contact: scoredBy[w.session_id]?.scored_json?.contact || {} }))
    .sort((a, b) => (a.band === "significant" ? -1 : 1) - (b.band === "significant" ? -1 : 1));

  return (
    <main>
      <div style={{ ...wrap, padding: "28px 24px 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ ...kicker, textTransform: "none", letterSpacing: ".01em", fontSize: 14 }}>
              <Greeting name={adminProfile?.first_name || ""} />
            </div>
            <h1 className="serif" style={{ fontSize: 30, margin: "4px 0 0", color: "var(--ink)" }}>What's happening</h1>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 4 }}>
              {RANGES.map(([k, label]) => (
                <Link key={k} href={`/admin?range=${k}`} style={{ ...rangeBtn, ...(k === rangeKey ? rangeOn : {}) }}>{label}</Link>
              ))}
            </div>
            <a className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }} href="/api/admin/export?type=contacts">Export contacts</a>
            <a className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }} href="/api/admin/export?type=scores">Export scores</a>
          </div>
        </div>

        <div style={kpiGrid}>
          <Kpi n={completed.length} label="Completions" accent="#1B3A57" />
          <Kpi n={startedInRange.length} label="Started" />
          <Kpi n={`${completionRate}%`} label="Completion rate" accent="#2E7D8A" />
          <Kpi n={uniquePeople} label="Unique people" />
          <Kpi n={emailed} label="Reports emailed" />
          <Kpi n={avgMin ? `${avgMin}m` : "—"} label="Avg. time" />
          <Kpi n={activeChurches} label="Active churches" />
          <Kpi n={estRevenue ? `$${(estRevenue / 100).toLocaleString()}` : "$0"} label="Est. revenue" accent="#B4703A" sub={seatsSold ? `${seatsSold} seats sold` : ""} />
        </div>

        <Panel title={`Completions over time · ${rangeKey === "all" ? "recent weeks" : RANGES.find((r) => r[0] === rangeKey)[1]}`}>
          <AreaChart data={weeks} />
        </Panel>

        <div style={twoCol}>
          <Panel title="Funnel">
            <Funnel started={startedInRange.length} completed={completed.length} rate={completionRate} />
          </Panel>
          <Panel title="By source">
            <Bars data={bySource} />
          </Panel>
        </div>

        {careList.length > 0 && (
          <section style={{ ...panel, borderLeft: "5px solid #C4923E", background: "#FBF6EC" }}>
            <div style={{ ...panelH, color: "#B07C2E" }}>Pastor wellbeing — reach out ({careList.length})</div>
            <p style={{ fontSize: 13, color: "#4A5B6D", margin: "0 0 12px" }}>
              These pastors signaled strain on their confidential wellbeing check. Reach out personally and gently. Handle with care — pastoral support, not a record.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {careList.map((w) => (
                <div key={w.session_id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#fff", border: "1px solid #EADFC9" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {w.contact.first_name} {w.contact.last_name}
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 400 }}>{w.contact.email} {w.contact.phone ? `· ${w.contact.phone}` : ""}</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: w.band === "significant" ? "#B0442E" : "#B07C2E" }}>{w.band === "significant" ? "Heavy load" : "Some strain"}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "right" }}>{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={twoCol}>
          <Panel title="By assessment"><Bars data={byAssessment} /></Panel>
          <Panel title="By church"><Bars data={byChurch} empty="No church-linked completions in range." /></Panel>
        </div>

        <div style={twoCol}>
          <Panel title="Most common top gift"><Bars data={topGifts} color="#C4923E" empty="No Spiritual Gifts results yet." /></Panel>
          <Panel title="Church planter readiness"><Bars data={planterTally} empty="No Church Planter results yet." /></Panel>
        </div>

        <div style={twoCol}>
          <Panel title="By ministry role"><Bars data={byRole} /></Panel>
          <Panel title="By age"><Bars data={byAge} /></Panel>
        </div>

        <Panel title="CHC vs non-CHC"><Bars data={byChc} /></Panel>

        <Panel title="Recent completions">
          <div style={{ display: "grid", gap: 8 }}>
            {completed.slice(0, 15).map((s) => (
              <Link key={s.id} href={`/results/${s.result_token || ""}`} style={recentRow}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{s.assessments?.name}</span>
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{headlineFor(scoredBy[s.id]?.scored_json)}</span>
                <span style={{ color: "var(--ink-soft)", fontSize: 12.5, textAlign: "right" }}>{s.completed_at && new Date(s.completed_at).toLocaleDateString()}</span>
              </Link>
            ))}
            {completed.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No completions in this range.</p>}
          </div>
        </Panel>
      </div>
    </main>
  );
}

// ---- helpers ----
function tally(arr) {
  const m = {};
  for (const k of arr) m[k] = (m[k] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function weekKey(d) {
  const dt = new Date(d); const day = (dt.getDay() + 6) % 7; // Monday start
  dt.setDate(dt.getDate() - day); dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}
function buildWeeks(since, fallbackCount) {
  const weeks = [];
  const start = since ? new Date(since) : new Date(Date.now() - fallbackCount * 7 * 864e5);
  let cur = new Date(weekKey(start));
  const now = new Date(weekKey(new Date()));
  while (cur <= now && weeks.length < 60) {
    weeks.push({ key: cur.toISOString().slice(0, 10), label: `${cur.getMonth() + 1}/${cur.getDate()}`, value: 0 });
    cur = new Date(cur.getTime() + 7 * 864e5);
  }
  return weeks;
}

function Kpi({ n, label, accent = "#1B3A57", sub }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3 }}>{label}</div>
      {sub ? <div style={{ fontSize: 11, color: "#8CA0B3", marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}
function Panel({ title, children }) {
  return <section style={panel}><div style={panelH}>{title}</div>{children}</section>;
}
function Bars({ data, color = "#2E7D8A", empty = "No data yet." }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  if (!data.length) return <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 13.5 }}>{empty}</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {data.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "150px 1fr 40px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
          <span style={{ height: 10, background: "#EEF1F4", borderRadius: 999, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(v / max) * 100}%`, background: color, borderRadius: 999 }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1B3A57", textAlign: "right" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
function Funnel({ started, completed, rate }) {
  const w = (n) => (started ? Math.max(6, (n / started) * 100) : 6);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <FunnelRow label="Started" n={started} width={w(started)} color="#1B3A57" />
      <FunnelRow label="Completed" n={completed} width={w(completed)} color="#2E7D8A" />
      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
        <strong style={{ color: "#2E7D8A", fontSize: 16 }}>{rate}%</strong> completion rate
      </div>
    </div>
  );
}
function FunnelRow({ label, n, width, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: "#1B3A57" }}>{n}</span>
      </div>
      <div style={{ height: 26, background: "#EEF1F4", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 8 }} />
      </div>
    </div>
  );
}
function AreaChart({ data }) {
  if (!data.length) return <p style={{ color: "var(--ink-soft)", margin: 0 }}>No data yet.</p>;
  const W = 720, H = 180, pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${x(n - 1).toFixed(1)},${H - pad}`;
  const step = Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad} x2={W - pad} y1={y(max * f)} y2={y(max * f)} stroke="#EEF1F4" strokeWidth="1" />
      ))}
      <polygon points={area} fill="rgba(46,125,138,.14)" />
      <polyline points={line} fill="none" stroke="#2E7D8A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill="#1F5E68" />)}
      {data.map((d, i) => (i % step === 0 || i === n - 1) ? (
        <text key={`t${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#8CA0B3" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{d.label}</text>
      ) : null)}
      <text x={pad} y={y(max) - 4} fontSize="10" fill="#8CA0B3" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>{max}</text>
    </svg>
  );
}
const Centered = ({ children }) => (
  <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>{children}</main>
);

const wrap = { maxWidth: 1100, margin: "0 auto", padding: "0 24px" };
const kicker = { fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700 };
const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 4 };
const kpiCard = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px" };
const panel = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", marginTop: 16 };
const panelH = { fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 14 };
const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginTop: 0 };
const recentRow = { display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 10, textDecoration: "none", borderBottom: "1px solid #F0F2F4" };
const rangeBtn = { fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none", padding: "6px 11px", borderRadius: 7 };
const rangeOn = { background: "var(--navy)", color: "#fff" };
