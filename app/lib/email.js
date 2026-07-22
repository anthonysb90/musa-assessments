// Emailit transactional email (server-only).
// Verified endpoint (Emailit docs, API v2): POST https://api.emailit.com/v2/emails
// Auth: Authorization: Bearer <key>. Body: from, to, subject, html, text, reply_to.
//
// Every send is best-effort and env-gated: if EMAILIT_API_KEY is unset, we no-op
// and return { skipped: true } so a submission never fails on email.

import {
  EMAILIT_API_KEY,
  EMAILIT_ENDPOINT,
  EMAILIT_FROM,
  EMAILIT_REPLY_TO,
  APP_URL,
} from "./config";
import {
  SCORING_TYPE,
  GROWTH_LEVELS,
  DISC_BLENDS,
  DISC_DIMS,
  CROSS_PROMO,
  PROMO_HOOK,
} from "./content";

export async function sendEmail({ to, subject, html, text }) {
  if (!EMAILIT_API_KEY) return { skipped: true };
  if (!to) return { skipped: true, reason: "no recipient" };
  try {
    const res = await fetch(EMAILIT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMAILIT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAILIT_FROM,
        to,
        subject,
        html,
        text: text || stripHtml(html),
        ...(EMAILIT_REPLY_TO ? { reply_to: EMAILIT_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: body.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const NAVY = "#1B3A57";
const GOLD = "#C4923E";
const INK = "#1C2B3A";

function shell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#F6F8FA;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:24px 0;">
   <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E9EC;border-radius:14px;overflow:hidden;">
      <tr><td style="background:${NAVY};padding:22px 28px;">
        <span style="color:#E4CE8C;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:bold;">Mission USA · Ministry Assessments</span>
      </td></tr>
      <tr><td style="padding:28px;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #EEF1F4;color:#7C8A9C;font-size:12px;">
        A ministry resource of Mission USA · gomissionusa.com
      </td></tr>
    </table>
   </td></tr>
  </table></body></html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:10px;font-size:15px;">${label}</a>`;
}

function promoBlock(slug, names) {
  const picks = (CROSS_PROMO[slug] || []).filter((s) => names[s]);
  if (!picks.length) return "";
  const rows = picks
    .map(
      (s) =>
        `<tr><td style="padding:10px 0;border-top:1px solid #EEF1F4;">
          <a href="${APP_URL}/assessment/${s}" style="color:${NAVY};font-weight:bold;text-decoration:none;font-size:15px;">${names[s]}</a>
          <div style="color:#4A5B6D;font-size:13px;">${PROMO_HOOK[s] || ""}</div>
        </td></tr>`
    )
    .join("");
  return `<div style="margin-top:26px;">
    <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${GOLD};font-weight:bold;margin-bottom:6px;">What to take next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}

// Build a short, email-safe results summary per scoring type.
function inlineSummary(scored, assessment) {
  const type = scored.type;
  const li = (a, b) =>
    `<tr><td style="padding:6px 0;color:${INK};font-size:15px;">${a}</td><td align="right" style="padding:6px 0;color:${NAVY};font-weight:bold;">${b}</td></tr>`;
  if (type === "gift-rank" || type === "ranked-sum") {
    const rows = scored.ranked.slice(0, 3);
    const label = (r) => r.letter || r.key;
    const body = rows.map((r) => li(label(r), `${r.score} / ${scored.max_per}`)).join("");
    return `<table role="presentation" width="100%">${body}</table>`;
  }
  if (type === "domain-bands") {
    const top = scored.domains.slice(0, 2);
    const body = top.map((d) => li(d.domain, `${d.average} · ${d.band}`)).join("");
    return `<table role="presentation" width="100%">${body}</table>`;
  }
  if (type === "level-matrix") {
    const lvl = GROWTH_LEVELS[scored.winnerLevel];
    return `<p style="font-size:16px;margin:0;color:${INK};"><strong>${lvl.name}</strong> — ${lvl.message}</p>`;
  }
  if (type === "disc-blend") {
    const b = DISC_BLENDS[scored.blend];
    const label = b ? `${scored.blend} · ${b.figure}, ${b.title}` : scored.blend;
    return `<p style="font-size:16px;margin:0;color:${INK};"><strong>${label}</strong> (${DISC_DIMS[scored.primary]} + ${DISC_DIMS[scored.secondary]})</p>`;
  }
  return "";
}

// resultToken: the tokenized link; namesBySlug: { slug: name } for cross-promo.
export function buildResultEmail({ assessment, scored, resultToken, namesBySlug = {}, sensitive }) {
  const first = scored.contact?.first_name || "there";
  const link = `${APP_URL}/results/${resultToken}`;
  const loginLink = `${APP_URL}/login`;

  if (sensitive) {
    const inner = `<h1 style="font-size:22px;margin:0 0 12px;color:${INK};">Your ${assessment.name} results are ready</h1>
      <p style="font-size:15px;line-height:1.6;color:#4A5B6D;">Hi ${first}, your results are saved securely. Because this assessment includes sensitive, personal content, results aren't included in email. Sign in with a one-tap magic link to view them privately.</p>
      <p style="margin:22px 0;">${button(loginLink, "Sign in to view results")}</p>
      ${promoBlock(assessment.slug, namesBySlug)}`;
    return {
      subject: `Your ${assessment.name} results are ready`,
      html: shell(inner),
    };
  }

  const inner = `<h1 style="font-size:22px;margin:0 0 12px;color:${INK};">Your ${assessment.name} results are ready</h1>
    <p style="font-size:15px;line-height:1.6;color:#4A5B6D;">Hi ${first}, here's a quick look. Open the full interactive report for the complete breakdown, Scripture, and next steps.</p>
    <div style="background:#F6F8FA;border:1px solid #E7E9EC;border-radius:12px;padding:16px 18px;margin:16px 0;">${inlineSummary(scored, assessment)}</div>
    <p style="margin:22px 0;">${button(link, "Open my full report")}</p>
    <p style="font-size:13px;color:#7C8A9C;">Or paste this link into your browser:<br><span style="color:${NAVY};">${link}</span></p>
    ${promoBlock(assessment.slug, namesBySlug)}`;
  return {
    subject: `Your ${assessment.name} results are ready`,
    html: shell(inner),
  };
}
