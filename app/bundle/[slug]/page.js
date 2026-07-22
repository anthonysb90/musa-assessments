"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import Checkout from "../../components/Checkout";

export default function BundlePage() {
  const { slug } = useParams();
  const router = useRouter();
  const supabase = useRef(getSupabase()).current;
  const [bundle, setBundle] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase
        .from("bundles").select("slug,name,description,price_cents,assessment_slugs,is_active").eq("slug", slug).maybeSingle();
      if (!b || !b.is_active) { setState("error"); return; }
      const { data: as } = await supabase
        .from("assessments").select("slug,name,subtitle,price_cents,is_paid").in("slug", b.assessment_slugs?.length ? b.assessment_slugs : ["_none_"]);
      setBundle(b); setItems(as || []); setState("ready");
    })();
  }, [slug, supabase]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "error") return <Center>That bundle isn't available. <Link href="/" style={link}>← All assessments</Link></Center>;

  const listPrice = items.reduce((t, a) => t + (a.is_paid ? a.price_cents : 0), 0);
  const saves = listPrice - bundle.price_cents;

  return (
    <main className="wrap" style={{ maxWidth: 640, padding: "48px 24px 80px" }}>
      <Link href="/" style={link}>← All assessments</Link>
      <h1 className="serif" style={h1}>{bundle.name}</h1>
      {bundle.description && <p style={sub}>{bundle.description}</p>}

      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#2E7D8A", fontWeight: 700, marginBottom: 12 }}>What's included</div>
        {items.map((a) => (
          <div key={a.slug} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 14.5 }}>
            <span style={{ color: "var(--ink)" }}>{a.name}</span>
            <span style={{ color: "var(--ink-soft)" }}>{a.is_paid ? `$${(a.price_cents / 100).toFixed(2)}` : "free"}</span>
          </div>
        ))}
        {saves > 0 && (
          <div style={{ marginTop: 12, fontSize: 14, color: "#2E7D8A", fontWeight: 700 }}>
            Bundle price ${(bundle.price_cents / 100).toFixed(2)} · you save ${(saves / 100).toFixed(2)}
          </div>
        )}
      </div>

      <Checkout
        kind="bundle"
        slug={slug}
        name={bundle.name}
        priceCents={bundle.price_cents}
        onDone={(code) => router.push(`/access/${code}`)}
      />
    </main>
  );
}

const Center = ({ children }) => (
  <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--ink-soft)" }}><div>{children}</div></main>
);
const link = { color: "var(--teal-deep)", fontSize: 14, fontWeight: 600, textDecoration: "none" };
const h1 = { fontWeight: 500, fontSize: "clamp(28px,4vw,38px)", margin: "16px 0 6px", color: "var(--ink)" };
const sub = { color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6, margin: "0 0 22px" };
const card = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 22px" };
