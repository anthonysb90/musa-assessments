"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import Checkout from "../../../components/Checkout";
import { ASSESSMENT_LANDING } from "../../../lib/content";

export default function BuyPage() {
  const { slug } = useParams();
  const router = useRouter();
  const supabase = useRef(getSupabase()).current;
  const [a, setA] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assessments").select("slug,name,subtitle,is_paid,price_cents,estimated_minutes")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!data) { setState("error"); return; }
      if (!data.is_paid || data.price_cents <= 0) { router.replace(`/assessment/${slug}/start`); return; }
      setA(data); setState("ready");
    })();
  }, [slug, supabase, router]);

  if (state === "loading") return <Center>Loading…</Center>;
  if (state === "error") return <Center>This assessment isn't available. <Link href="/" style={link}>← All assessments</Link></Center>;

  const land = ASSESSMENT_LANDING[slug] || {};

  return (
    <main className="wrap" style={{ maxWidth: 620, padding: "48px 24px 80px" }}>
      <Link href={`/assessment/${slug}`} style={link}>← {a.name}</Link>
      <h1 className="serif" style={h1}>Unlock {a.name}</h1>
      <p style={sub}>{land.tagline || a.subtitle}</p>
      <div style={{ background: "var(--blush)", border: "1px solid #EADFC9", borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
        A one-time purchase unlocks the full assessment and your complete report. Buying for your church? Add
        seats below and share one code with your people.
      </div>
      <Checkout
        kind="assessment"
        slug={slug}
        name={a.name}
        priceCents={a.price_cents}
        onDone={(code, seats) => {
          if (seats > 1) router.push(`/access/${code}`);
          else if (slug === "called-together") router.push(`/assessment/${slug}/couple?code=${code}`);
          else if (slug === "church-health") router.push(`/assessment/${slug}/team?code=${code}`);
          else router.push(`/assessment/${slug}/start?code=${code}`);
        }}
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
