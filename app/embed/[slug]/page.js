import Link from "next/link";
import { getServerSupabase } from "../../lib/supabaseServer";
import { assessmentImage, ASSESSMENT_LANDING } from "../../lib/content";

export const dynamic = "force-dynamic";

// Minimal, iframe-friendly assessment card. Meant to be embedded on another
// site. No global nav or footer. The CTA opens the full take flow in a new tab
// so payment, login gates, and the report all work normally.
export default async function EmbedCard({ params }) {
  const { slug } = params;
  const supabase = getServerSupabase();
  const { data: a } = await supabase
    .from("assessments")
    .select("slug,name,subtitle,estimated_minutes,is_paid,price_cents,is_multi_rater")
    .eq("slug", slug).eq("is_published", true).maybeSingle();

  if (!a) {
    return <main style={{ padding: 24, fontFamily: "Inter,system-ui,sans-serif", color: "#4A5B6D" }}>This assessment isn't available.</main>;
  }

  const land = ASSESSMENT_LANDING[slug] || {};
  const paid = a.is_paid && a.price_cents > 0;
  const price = paid ? `$${(a.price_cents / 100).toFixed(2)}` : null;
  const isCouple = slug === "called-together";
  const href = paid
    ? `/assessment/${slug}/buy`
    : a.is_multi_rater ? `/assessment/${slug}/team`
    : isCouple ? `/assessment/${slug}/couple`
    : `/assessment/${slug}/start`;
  const label = paid ? `Unlock for ${price}` : "Start the assessment";
  const image = assessmentImage(slug);

  return (
    <main style={wrap}>
      <div style={cardBox}>
        <div style={{ ...banner, backgroundImage: `linear-gradient(180deg, rgba(18,42,68,.35), rgba(18,42,68,.82)), url("${image}")` }}>
          {paid && <span style={paidTag}>Paid · {price}</span>}
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 18 }}>
            <div style={kicker}>Mission USA · Ministry Assessments</div>
            <div className="serif" style={title}>{a.name}</div>
          </div>
        </div>
        <div style={{ padding: "20px 22px 24px" }}>
          <p style={tag}>{land.tagline || a.subtitle}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 18px" }}>
            <span style={chip}>About {a.estimated_minutes} min</span>
            <span style={chip}>{paid ? "Premium" : "Free"}</span>
          </div>
          <a href={href} target="_blank" rel="noopener noreferrer" style={cta}>{label} →</a>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11.5, color: "#8CA0B3" }}>
        Powered by <Link href="/" target="_blank" style={{ color: "#2E7D8A", textDecoration: "none" }}>Mission USA Assessments</Link>
      </div>
    </main>
  );
}

const wrap = { fontFamily: "Inter,system-ui,sans-serif", background: "transparent", padding: 12, maxWidth: 420, margin: "0 auto" };
const cardBox = { background: "#fff", border: "1px solid #E7E9EC", borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 40px rgba(27,58,87,.12)" };
const banner = { position: "relative", height: 160, backgroundSize: "cover", backgroundPosition: "center" };
const paidTag = { position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#1C2B3A", background: "#F0E4CB", padding: "4px 10px", borderRadius: 999 };
const kicker = { fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E4CE8C", fontWeight: 700, marginBottom: 5 };
const title = { color: "#fff", fontSize: 24, fontWeight: 500, lineHeight: 1.1, fontFamily: "'Fraunces',Georgia,serif" };
const tag = { fontSize: 15, color: "#4A5B6D", lineHeight: 1.5, margin: 0 };
const chip = { fontSize: 12, fontWeight: 600, color: "#1B3A57", background: "#EEF3F4", padding: "5px 11px", borderRadius: 999 };
const cta = { display: "block", textAlign: "center", background: "#C4923E", color: "#fff", fontWeight: 800, fontSize: 15.5, padding: "14px 20px", borderRadius: 12, textDecoration: "none" };
