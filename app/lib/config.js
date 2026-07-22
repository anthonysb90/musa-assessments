// Public runtime config.
// The Supabase anon/publishable key is browser-safe by design; Row-Level
// Security protects the data. Everything else is read from env with safe
// fallbacks so the app deploys and runs even before secrets are set.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rtcahxypgqtbkomuwwci.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_VzlhtfaX5xYjp7EcoHQFqg_L8ClzvWd";

// Canonical site URL — used in emails and magic-link redirects.
// Set NEXT_PUBLIC_APP_URL to https://assessments.chchurch.com in production.
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://musa-assessments.vercel.app"
).replace(/\/$/, "");

// Emailit (transactional email). Server-only. When EMAILIT_API_KEY is unset,
// email sending is skipped gracefully and never blocks a submission.
export const EMAILIT_API_KEY = process.env.EMAILIT_API_KEY || "";
export const EMAILIT_ENDPOINT =
  process.env.EMAILIT_ENDPOINT || "https://api.emailit.com/v2/emails";
export const EMAILIT_FROM =
  process.env.EMAILIT_FROM || "Mission USA Assessments <assessments@chchurch.com>";
export const EMAILIT_REPLY_TO = process.env.EMAILIT_REPLY_TO || "";

// Designated care contact for quarantined safety/wellbeing routing.
export const CARE_CONTACT_EMAIL = process.env.CARE_CONTACT_EMAIL || "";

// Cloudflare Turnstile (spam prevention). When unset, verification is skipped.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";

// Donations are handled by Tithe.ly (not Stripe). The report's giving card
// links here, appending &amount=<cents> for the chosen gift. Override with
// NEXT_PUBLIC_DONATE_URL if the Tithe.ly form/location/fund ever changes.
export const DONATE_URL =
  process.env.NEXT_PUBLIC_DONATE_URL ||
  "https://give.tithe.ly/?formId=6fb88928-6864-11ee-90fc-1260ab546d11&locationId=8bb7e6ce-8846-4e95-a99b-4b2434ede92d&fundId=1bf0d77f-44e9-4f38-881b-5a177219d5d5";

// Credit line printed on every PDF / printed report.
export const REPORT_CREDIT =
  "Assessment by Mission USA of the Congregational Holiness Church. Get yours at assessments.chchurch.com.";

export const CONSENT_VERSION = "2026-07-v1";
