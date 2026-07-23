// Emailit transactional email (server-only).
// Verified endpoint (Emailit docs, API v2): POST https://api.emailit.com/v2/emails
// Auth: Authorization: Bearer <key>. Body: from, to, subject, html, text, reply_to.
//
// Every send is best-effort and env-gated: if EMAILIT_API_KEY is unset, we no-op
// and return { skipped: true } so a submission never fails on email.
//
// All app emails are built through renderEmail() below so every message shares
// one shell (header, card, footer) and every user-supplied value passes
// through esc(). Each send is also recorded in email_log (template + recipient
// domain only, never the address) via the service-role client, best-effort.

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
  ENNEAGRAM_TYPES,
} from "./content";

// HTML-entity escaper for anything user-supplied that lands in email HTML.
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function sendEmail({ to, subject, html, text, template }) {
  if (!EMAILIT_API_KEY) return { skipped: true };
  if (!to) return { skipped: true, reason: "no recipient" };
  let result;
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
      result = { ok: false, status: res.status, body: body.slice(0, 300) };
    } else {
      result = { ok: true };
    }
  } catch (e) {
    result = { ok: false, error: e.message };
  }
  if (!result.ok) {
    // Care alerts get a loud, greppable prefix: a silently dropped safety or
    // wellbeing alert means a person who needed a call never gets one.
    const label = template || "unknown";
    const prefix = label.startsWith("care_alert") ? "CARE_ALERT_FAILED " : "";
    console.error(
      `${prefix}email send failed [${label}]`,
      result.status ?? "",
      result.error || result.body || ""
    );
  }
  logEmailAttempt({ template, to, result });
  return result;
}

// Fire-and-forget audit row in email_log. Records the template name and the
// recipient's DOMAIN only (never the full address), plus outcome. Uses the
// service-role client (email_log has no client write policy). This must never
// throw and never delay the send path; email.js is server-only (imported only
// from route handlers), and the dynamic import keeps supabaseServer out of any
// possible client bundle graph.
function logEmailAttempt({ template, to, result }) {
  try {
    const to_domain = String(to).split("@")[1]?.toLowerCase() || null;
    import("./supabaseServer")
      .then(({ getAdminSupabase }) => {
        const admin = getAdminSupabase();
        if (!admin) return;
        return admin.from("email_log").insert({
          template: template || null,
          to_domain,
          ok: result.ok === true,
          status: result.status ?? (result.ok ? 200 : null),
          error: result.error || result.body || null,
        });
      })
      .then((r) => {
        if (r?.error) console.error("email_log insert failed:", r.error.message);
      })
      .catch(() => { /* logging must never break sending */ });
  } catch { /* logging must never break sending */ }
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const NAVY = "#1B3A57";
const GOLD = "#C4923E";
const TEAL = "#2E7D8A";
const INK = "#1C2B3A";
const MUTED = "#4A5B6D";
// Warm parchment tones for the designed "results card".
const PAPER = "#FCFAF5";
const CARD_BORDER = "#EBE4D6";
const TRACK = "#EAE3D5";
// Bar accents, cycled so a stack of dimensions reads as one designed set.
const BAR_COLORS = [NAVY, TEAL, GOLD];
// Standard body-paragraph style, shared by every builder.
const P = "font-size:15px;line-height:1.6;color:#4A5B6D;";

function shell(inner, preheaderHtml = "") {
  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Mission USA</title>
  </head><body style="margin:0;background:#F6F8FA;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:24px 0;">
   <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E9EC;border-radius:14px;overflow:hidden;">
      <tr><td align="center" style="background:${NAVY};padding:20px 28px;">
        <img src="${APP_URL}/musa-logo-white.png" alt="Mission USA" height="52" style="height:52px;width:auto;display:inline-block;border:0;" />
      </td></tr>
      <tr><td style="padding:28px;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #EEF1F4;color:#7C8A9C;font-size:12px;line-height:1.7;">
        A ministry resource of Mission USA · gomissionusa.com<br>
        Questions? Reply to this email.
        <!-- TODO: add ministry mailing address here for CAN-SPAM -->
      </td></tr>
    </table>
   </td></tr>
  </table></body></html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:10px;font-size:15px;">${label}</a>`;
}

// One shell for every email the app sends.
//   preheader: hidden inbox-preview text (plain text; escaped here).
//   heading:   card <h1> HTML (callers escape their own interpolations).
//   bodyHtml:  card body HTML (callers escape their own interpolations).
//   cta:       { href, label } -> button + visible "paste this link" fallback.
//   footNote:  HTML rendered after the CTA (promo blocks, fine print).
export function renderEmail({ preheader, heading, bodyHtml, cta, footNote }) {
  const pre = preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>`
    : "";
  const ctaHtml = cta?.href
    ? `<p style="margin:22px 0;">${button(esc(cta.href), esc(cta.label))}</p>
    <p style="font-size:13px;color:#7C8A9C;">Or paste this link into your browser:<br><span style="color:${NAVY};word-break:break-all;">${esc(cta.href)}</span></p>`
    : "";
  const inner = `${heading ? `<h1 style="font-size:22px;margin:0 0 12px;color:${INK};">${heading}</h1>` : ""}
    ${bodyHtml || ""}
    ${ctaHtml}
    ${footNote || ""}`;
  return shell(inner, pre);
}

// Secondary "what to take next" block. Deliberately quiet: muted eyebrow,
// smaller type, a light divider — it supports the report link, never competes.
function promoBlock(slug, names) {
  const picks = (CROSS_PROMO[slug] || []).filter((s) => names[s]);
  if (!picks.length) return "";
  const rows = picks
    .map(
      (s) =>
        `<tr><td style="padding:11px 0;border-top:1px solid #EEF1F4;">
          <a href="${APP_URL}/assessment/${s}" style="color:${NAVY};font-weight:bold;text-decoration:none;font-size:14px;">${esc(names[s])}</a>
          <div style="color:#8CA0B3;font-size:12.5px;line-height:1.5;margin-top:2px;">${esc(PROMO_HOOK[s] || "")}</div>
        </td></tr>`
    )
    .join("");
  return `<div style="margin-top:28px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9AA7B5;font-weight:bold;margin-bottom:2px;">Continue your journey</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}

// ---- Email-safe building blocks for the designed results card ----

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// Bulletproof progress bar: a grey "track" table cell with a colored inner
// cell sized to a percentage width. No CSS widths on divs, no images — this
// renders identically in Gmail, Apple Mail, and Outlook's Word engine.
function pctBar(pct, color = NAVY) {
  const w = clampPct(pct);
  const fill =
    w > 0
      ? `<table role="presentation" width="${w}%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="height:8px;line-height:8px;font-size:0;background:${color};border-radius:6px;">&nbsp;</td></tr></table>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr><td style="height:8px;line-height:8px;font-size:0;background:${TRACK};border-radius:6px;padding:0;">${fill}</td></tr></table>`;
}

// One dimension: bold label + right-aligned value, then a bar underneath.
function metricRow(label, value, pct, color = NAVY) {
  return `<tr><td style="padding:12px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:14px;color:${INK};font-weight:bold;padding:0 8px 6px 0;">${esc(label)}</td>
      <td align="right" style="font-size:13px;color:${TEAL};font-weight:bold;padding:0 0 6px;white-space:nowrap;">${esc(value)}</td>
    </tr></table>
    ${pctBar(pct, color)}
  </td></tr>`;
}

// A categorical dimension: label + value, no bar (for letter/band codes).
function labelRow(label, value) {
  return `<tr><td style="padding:10px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:14px;color:${INK};font-weight:bold;padding-right:8px;">${esc(label)}</td>
      <td align="right" style="font-size:13px;color:${TEAL};font-weight:bold;white-space:nowrap;">${esc(value)}</td>
    </tr></table></td></tr>`;
}

// A headline result + optional supporting line, for non-numeric outcomes.
function statBlock(headline, sub) {
  return `<div style="font-size:19px;line-height:1.3;font-weight:bold;color:${NAVY};margin:0 0 4px;">${esc(headline)}</div>
    ${sub ? `<div style="font-size:14px;line-height:1.5;color:${MUTED};">${esc(sub)}</div>` : ""}`;
}

// The branded parchment card: thin gold rule on top, uppercase gold eyebrow,
// then whatever inner content the scoring type produced.
function resultsCard(eyebrow, inner) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:20px 0;background:${PAPER};border:1px solid ${CARD_BORDER};border-radius:14px;overflow:hidden;">
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${GOLD};padding:0;">&nbsp;</td></tr>
    <tr><td style="padding:18px 22px 22px;">
      <div style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:${GOLD};font-weight:bold;margin:0 0 10px;">${esc(eyebrow)}</div>
      ${inner}
    </td></tr></table>`;
}

const metricTable = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

// Build the designed, email-safe "results card" for a given scoring type.
// Numbers are read straight from `scored` — nothing here invents a value.
// Percentage bars only appear where a true denominator exists (max_per,
// scale_max, or a 0–100 pct); categorical outcomes get a headline + labels.
function inlineSummary(scored, assessment) {
  const type = scored.type;

  if (type === "gift-rank" || type === "ranked-sum") {
    const max = scored.max_per || 0;
    const rows = (scored.ranked || []).slice(0, 3);
    const body = rows
      .map((r, i) =>
        metricRow(
          r.letter || r.key,
          `${r.score} / ${scored.max_per}`,
          max ? (r.score / max) * 100 : 0,
          BAR_COLORS[i % BAR_COLORS.length]
        )
      )
      .join("");
    return resultsCard("Your top strengths", metricTable(body));
  }

  if (type === "domain-bands") {
    const smax = scored.scale_max || 0;
    const top = (scored.domains || []).slice(0, 3);
    const body = top
      .map((d, i) =>
        metricRow(
          d.domain,
          d.band,
          smax ? (d.average / smax) * 100 : 0,
          BAR_COLORS[i % BAR_COLORS.length]
        )
      )
      .join("");
    return resultsCard("Where you stand", metricTable(body));
  }

  if (type === "level-matrix") {
    const lvl = GROWTH_LEVELS[scored.winnerLevel] || {};
    return resultsCard("Your church's stage", statBlock(lvl.name || "", lvl.message || ""));
  }

  if (type === "disc-blend") {
    const b = DISC_BLENDS[scored.blend] || {};
    const head = b.figure ? `${b.figure} · ${b.title}` : scored.blend;
    const sub = `${scored.blend} — ${DISC_DIMS[scored.primary] || ""} with ${DISC_DIMS[scored.secondary] || ""}`;
    return resultsCard("Your leadership wiring", statBlock(head, sub));
  }

  if (type === "type-pick") {
    const t = ENNEAGRAM_TYPES[scored.primary] || {};
    return resultsCard(
      "Your core type",
      statBlock(`Type ${scored.primary} · ${t.name || ""}`, t.tagline || "")
    );
  }

  if (type === "planter") {
    const smax = scored.scale_max || 5;
    const bar = metricTable(
      metricRow(
        "Weighted readiness",
        `${scored.composite ?? ""} / ${smax}`,
        (Number(scored.composite) / smax) * 100,
        NAVY
      )
    );
    return resultsCard("Your readiness", statBlock(scored.tier_label || "Readiness", "") + bar);
  }

  if (type === "big-five") {
    const NAMES = { O: "Openness", C: "Conscientiousness", E: "Extraversion", A: "Agreeableness", ES: "Emotional Stability" };
    const rows = [...(scored.traits || [])].sort((a, b) => b.pct - a.pct).slice(0, 3);
    const body = rows
      .map((t, i) => metricRow(NAMES[t.key] || t.key, `${t.pct}`, t.pct, BAR_COLORS[i % BAR_COLORS.length]))
      .join("");
    return resultsCard("Your strongest traits", metricTable(body));
  }

  if (type === "kingdom-design") {
    const rows = (scored.scales || [])
      .map((s) => labelRow(s.key.split("").join(" / "), `${s.letter} · ${(s.clarity || "").replace("-", " ")}`))
      .join("");
    return resultsCard(
      "Your design code",
      statBlock(scored.code || "", "Your Kingdom Design profile") + metricTable(rows)
    );
  }

  if (type === "leadership-stool") {
    const LNAME = { SP: "Spirituality", CH: "Chemistry", ST: "Strategy" };
    const legs = scored.legs || {};
    const rows = (scored.ranked || [])
      .map((k, i) => metricRow(LNAME[k] || k, `${legs[k]?.pct ?? ""}`, legs[k]?.pct ?? 0, BAR_COLORS[i % BAR_COLORS.length]))
      .join("");
    return resultsCard(
      "Your leadership style",
      statBlock(scored.style_name || "", scored.style_code || "") + metricTable(rows)
    );
  }

  return "";
}

// Branded one-tap sign-in email.
export function buildMagicLinkEmail({ link }) {
  const html = renderEmail({
    heading: "Your sign-in link",
    bodyHtml: `<p style="${P}">Tap the button below to sign in to Mission USA Ministry Assessments. No password needed. This link is for you, so please don't forward it.</p>`,
    cta: { href: link, label: "Sign in" },
    footNote: `<p style="font-size:12.5px;color:#8CA0B3;margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>`,
  });
  return { subject: "Your Mission USA sign-in link", html };
}

// Purchase confirmation with the access code + a redeem link.
export function buildAccessEmail({ code, seats = 1, slugs = [], isBundle, name }) {
  const first = name || "there";
  const redeem = `${APP_URL}/access/${code}`;
  const seatLine = seats > 1
    ? `Your purchase includes <strong>${esc(seats)} seats</strong>. Share the code below with your people, and each person uses it once.`
    : `Use the code below to begin.`;
  const html = renderEmail({
    heading: `Thank you, ${esc(first)}. Your access is ready.`,
    bodyHtml: `<p style="${P}">${isBundle ? "Your bundle is unlocked." : "Your assessment is unlocked."} ${seatLine}</p>
    <div style="background:#F6F8FA;border:1px solid #E7E9EC;border-radius:12px;padding:16px 18px;margin:16px 0;text-align:center;">
      <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${GOLD};font-weight:bold;">Your access code</div>
      <div style="font-size:26px;font-weight:bold;letter-spacing:.08em;color:${NAVY};margin-top:6px;font-family:monospace;">${esc(code)}</div>
    </div>`,
    cta: { href: redeem, label: "Open my assessment" + (seats > 1 ? "s" : "") },
  });
  return { subject: "Your Mission USA assessment access", html };
}

// resultToken: the tokenized link; namesBySlug: { slug: name } for cross-promo.
export function buildResultEmail({ assessment, scored, resultToken, namesBySlug = {}, sensitive, linkOnly }) {
  const first = scored.contact?.first_name || "there";
  const link = `${APP_URL}/results/${resultToken}`;
  const loginLink = `${APP_URL}/login`;

  const heading = `Your ${esc(assessment.name)} results are ready`;
  const subject = `Your ${assessment.name} results are ready`;

  // A short, quiet "what's inside your report" note, shown above the promo.
  const insideReport = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0;">
    <tr><td style="border-top:1px solid #EEF1F4;padding-top:18px;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};font-weight:bold;margin-bottom:6px;">What's inside your report</div>
      <div style="font-size:14px;line-height:1.6;color:${MUTED};">The full breakdown of every dimension, what your results mean for you, supporting Scripture, and practical next steps you can act on.</div>
    </td></tr></table>`;

  // Link-only: personal assessments where the results shouldn't sit in an inbox.
  // We send only a private link, never the scores themselves. Clean single CTA.
  if (linkOnly) {
    const html = renderEmail({
      preheader: `Your ${assessment.name} reflection is complete — open it privately whenever you're ready.`,
      heading,
      bodyHtml: `<p style="${P}">Hi ${esc(first)}, your reflection is complete.</p>
      <p style="${P}">Because this one is personal, we've kept the results out of this email. Open your private report with the link below whenever you're ready.</p>`,
      cta: { href: link, label: "View my private report" },
    });
    return { subject, html };
  }

  // Sensitive: no scores in the inbox — emphasize the private, one-tap sign-in.
  if (sensitive) {
    const privateNote = `<div style="font-size:14px;line-height:1.6;color:${MUTED};">Because this assessment includes sensitive, personal content, we've kept your results out of this email. Sign in with a one-tap magic link — no password — to read them privately, whenever you're ready.</div>`;
    const html = renderEmail({
      preheader: `Your ${assessment.name} results are saved securely and ready to view privately.`,
      heading,
      bodyHtml: `<p style="${P}">Hi ${esc(first)}, your results are saved securely.</p>
      ${resultsCard("Kept private", privateNote)}`,
      cta: { href: loginLink, label: "Sign in to view results" },
      footNote: promoBlock(assessment.slug, namesBySlug),
    });
    return { subject, html };
  }

  // Full variant: warm hero → designed results card → prominent CTA →
  // "what's inside" → lighter promo footer.
  const html = renderEmail({
    preheader: `Your ${assessment.name} results are ready — here's what stood out.`,
    heading,
    bodyHtml: `<p style="${P};margin:0 0 6px;">Hi ${esc(first)}, your results are in — here's a first look at what stood out.</p>
    ${inlineSummary(scored, assessment)}`,
    cta: { href: link, label: "View your full report" },
    footNote: `${insideReport}${promoBlock(assessment.slug, namesBySlug)}`,
  });
  return { subject, html };
}

// Church dashboard invite. One builder for both invite paths (church admin
// inviting a fellow leader, and the Mission USA admin setting a church up).
export function buildChurchInviteEmail({ churchName, invitedBy, next } = {}) {
  const church = churchName || "your church";
  const nextPath =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/church";
  const href = `${APP_URL}/login?next=${encodeURIComponent(nextPath)}`;
  const opener = invitedBy
    ? `${esc(invitedBy)} has set you up with access to <strong>${esc(church)}</strong>'s assessment dashboard.`
    : `You've been invited to view <strong>${esc(church)}</strong>'s assessment dashboard on Mission USA Ministry Assessments.`;
  const html = renderEmail({
    preheader: `Sign in to see ${church}'s assessment dashboard.`,
    heading: `You're invited to ${esc(church)}'s dashboard`,
    bodyHtml: `<p style="${P}">${opener} There you can see the assessments your members have taken, all in one place.</p>
    <p style="${P}">Sign in with a one-tap magic link. Use this same email address when you sign in.</p>`,
    cta: { href, label: "Open the dashboard" },
  });
  return { subject: `You've been invited to ${church}'s assessment dashboard`, html };
}

// Per-completion notice to a church's results contact(s).
export function buildChurchCompletionEmail({ memberName, assessmentName, churchName }) {
  const who = memberName || "A member";
  const html = renderEmail({
    preheader: `${who} just finished the ${assessmentName} assessment.`,
    heading: "A new assessment just came in",
    bodyHtml: `<p style="${P}"><strong>${esc(who)}</strong> just completed the <strong>${esc(assessmentName)}</strong> assessment through ${esc(churchName)}.</p>
    <p style="${P}">You can see all of your church's results in your dashboard.</p>`,
    cta: { href: `${APP_URL}/login?next=/church`, label: "Open the church dashboard" },
    footNote: `<p style="font-size:13px;color:#7C8A9C;">Sign in with the email address Mission USA set up for your church.</p>`,
  });
  return { subject: `${assessmentName} completed — ${churchName}`, html };
}

// Internal care alerts to the designated care contact. Branded but sober:
// no promos, no preview games, the same words the routes have always sent.
// kind: 'couple_safety' (Called Together confidential safety check)
//     | 'wellbeing'     (Pastor Profile wellbeing check, heaviest band)
export function buildCareAlertEmail({ kind, details = {} }) {
  if (kind === "couple_safety") {
    const html = renderEmail({
      preheader: "A private care note. Please read soon.",
      heading: "A private safety concern",
      bodyHtml: `<p style="${P}">Someone just completed the Called Together assessment and indicated on the confidential safety question that they do <strong>not</strong> feel physically or emotionally safe in their marriage right now.</p>
      <p style="${P}">First name given: <strong>${esc(details.name || "(not given)")}</strong>. This was taken through the couple link <strong>${esc(details.coupleCode || "")}</strong>.</p>
      <p style="${P}">Individual answers are private, so this note carries only what's needed to reach out with care. Please handle it gently and confidentially, and follow your safeguarding process.</p>`,
    });
    return { subject: "Called Together — a private safety concern", html };
  }
  // wellbeing
  const html = renderEmail({
    preheader: "A confidential care prompt. Please read soon.",
    heading: "Please reach out to a pastor",
    bodyHtml: `<p style="${P}">A pastor just completed the Pastor Profile and their confidential wellbeing check came back in the heaviest range. This is a prompt to reach out personally and check on them, gently and soon.</p>
    <p style="${P}"><strong>${esc(details.firstName || "")} ${esc(details.lastName || "")}</strong><br>
    ${esc(details.email || "")}<br>
    ${esc(details.phone || "")}</p>
    <p style="${P}">Please handle this with care and confidentiality. This note is for pastoral support, not a diagnosis.</p>`,
  });
  return { subject: "Pastor Profile — please reach out to a pastor", html };
}

// Internal notice: a church asked to partner. All fields are user-supplied.
export function buildPartnerRequestEmail({ name, district, email, phone, slugs, gate, adminEmail, logoProvided }) {
  const list = (Array.isArray(slugs) ? slugs : []).join(", ") || "none selected";
  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#7C8A9C;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:${INK};font-size:14px;">${value}</td></tr>`;
  const html = renderEmail({
    preheader: `${name || "A church"} has requested a partnership.`,
    heading: "New church partnership request",
    bodyHtml: `<p style="${P}"><strong>${esc(name)}</strong> has requested a partnership.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
      ${row("District", esc(district || "—"))}
      ${row("Email", esc(email || "—"))}
      ${row("Phone", esc(phone || "—"))}
      ${row("Extra admin email", esc(adminEmail || "—"))}
      ${row("Assessments requested", esc(list))}
      ${row("Reveal results in person", gate ? "Yes" : "No")}
      ${row("Logo provided", logoProvided ? "Yes" : "No")}
    </table>
    <p style="${P}">Review and approve it under the Churches tab in the admin.</p>`,
    cta: { href: `${APP_URL}/admin/churches`, label: "Review in the admin" },
  });
  return { subject: `New church partnership request — ${name}`, html };
}

// To each spouse when both sides of Called Together are complete.
// Note: the couples table stores names only, no per-spouse emails, so this is
// exported for future use but not yet wired to a send.
export function buildCoupleBothDoneEmail({ coupleCode, assessmentName }) {
  const what = assessmentName || "Called Together";
  const href = `${APP_URL}/couple/${encodeURIComponent(coupleCode || "")}`;
  const html = renderEmail({
    preheader: "You've both finished. See your results side by side.",
    heading: "Your side-by-side report is ready",
    bodyHtml: `<p style="${P}">You and your spouse have both finished the ${esc(what)} assessment. Your side-by-side report is ready.</p>
    <p style="${P}">Set aside some unhurried time to walk through it together. Talk about what feels true and what surprises you. Let it open a good conversation.</p>`,
    cta: { href, label: "See our report" },
  });
  return { subject: "Your side-by-side report is ready", html };
}

// To the circle subject once enough people have responded.
export function buildCircleCompleteEmail({ subjectName, circleCode }) {
  const first = subjectName || "there";
  const href = `${APP_URL}/circle/${encodeURIComponent(circleCode || "")}`;
  const html = renderEmail({
    preheader: "Enough voices are in. Your circle report is ready.",
    heading: "Your circle report is ready",
    bodyHtml: `<p style="${P}">Hi ${esc(first)}, good news. Enough people have now added their perspective, and your circle report is ready.</p>
    <p style="${P}">You'll see how you view yourself next to how others experience you. Read it slowly and with grace. It is a tool for growth, not a verdict.</p>`,
    cta: { href, label: "Open my circle report" },
  });
  return { subject: "Your circle report is ready", html };
}

// To the Mission USA assessor when a Church Planter candidate opens a circle.
export function buildAssessorEmail({ candidateName, circleCode, assessorLink }) {
  const href = assessorLink || `${APP_URL}/observe/${encodeURIComponent(circleCode || "")}?role=assessor`;
  const html = renderEmail({
    preheader: `${candidateName || "A candidate"} is ready for your assessor rating.`,
    heading: "A candidate is ready for your assessor review",
    bodyHtml: `<p style="${P}"><strong>${esc(candidateName || "A candidate")}</strong> has completed their Church Planter self-assessment. When you're ready, complete your evidence-based assessor rating below. Your rating is folded into their report alongside their own and their spouse's.</p>`,
    cta: { href, label: "Complete assessor rating" },
  });
  return { subject: `Assessor review: ${candidateName || "new Church Planter candidate"}`, html };
}
