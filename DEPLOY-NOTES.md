# Deploy notes — what changed and how to go live

This build adds four new live assessments, email delivery, accounts, church
mode, admin analytics, spam protection, and the donation feature. Read this
before deploying.

## 1. What's in the database already (done, live)

The Supabase project is already seeded and migrated. You do NOT need to run any
SQL to deploy — it's all applied:

- **Published-ready:** Spiritual Gifts (live now), plus Church Growth, Rooted,
  Fivefold Calling, Wired to Lead — all item banks seeded and scored.
- **Seeded but unpublished** (need their dedicated multi-party flows, next build):
  Called Together, Church Health, Leadership Health, Church Planter.
- **Not seeded yet:** Pastor Profile (its confidential wellbeing module needs a
  private-visibility data scope before it touches the shared items table — see §6).
- Migrations added to `supabase/` for version control: `10` (accounts + church
  RLS + admin bootstrap), `11` (Group A/B item banks), `13` (Church Planter).

**IMPORTANT — the four new assessments are currently set `is_published = false`**
so the old deployed frontend doesn't show them half-working. **After you deploy
the new code**, run this to turn them on:

```sql
update assessments set is_published = true
where slug in ('church-growth','rooted','fivefold-calling','wired-to-lead');
```

## 2. Deploy the code

The Vercel connector dropped mid-build, so this deploy is manual. Two options:

**A. Link the repo to Vercel (recommended, gives auto-deploy going forward).**
In the Vercel dashboard → project `musa-assessments` → Settings → Git → connect
`anthonysb90/musa-assessments`. Push from GitHub Desktop; Vercel builds on push.

**B. One-off CLI deploy from your machine:**
```
npm install
npm run build   # confirm it's clean
vercel --prod
```

## 3. Environment variables to set in Vercel

The app runs with sensible fallbacks, but these unlock features. Set them in
Vercel → Settings → Environment Variables:

| Variable | Purpose | Needed for |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://assessments.chchurch.com` | correct email + magic-link URLs |
| `EMAILIT_API_KEY` | Emailit API key | sending report emails |
| `EMAILIT_FROM` | e.g. `Mission USA <assessments@chchurch.com>` | email from-address |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | spam protection on intake |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` | Stripe | the donation card |
| `CARE_CONTACT_EMAIL` | designated care contact | future safety/wellbeing routing |

Without a key, that feature stays dormant and nothing breaks (email is skipped,
Turnstile is skipped, the donation card is hidden).

## 4. Supabase Auth settings (for magic-link login)

In Supabase → Authentication → URL Configuration:
- Site URL: `https://assessments.chchurch.com`
- Redirect URLs: add `https://assessments.chchurch.com/auth/callback` (and your
  Vercel preview URL's `/auth/callback` if you want previews to log in).

## 5. Admin + church access

- **Admin:** sign in at `/login` with `asbaumann90@gmail.com` or
  `anthony@chchurch.com`. A signup trigger auto-promotes those two emails to
  admin; then `/admin` works. To add more admins later, insert their email into
  `admin_users` after they've signed in once.
- **Church mode:** create a church row and assign assessments (admin/SQL for
  now), then invite a leader by email from the church's `/church` dashboard.
  Church leaders see only their church's results for their assigned assessments,
  and only when the church's `results_visibility` is `individual_named`.

## 6. What's intentionally NOT live yet (next build)

- **Called Together** (two-spouse flow + Safety Check crisis routing/quarantine),
  **Church Health** and **Leadership Health** (multi-rater, 3-rater anonymity
  floor). Item banks are seeded; the dedicated flows are the next build.
- **Church Planter** (spouse + assessor + validity weighting + readiness tiers).
  Self item bank seeded with reverse/paraphrase/candor flags.
- **Pastor Profile.** Not seeded yet on purpose: its confidential wellbeing module
  (0–3 scale, 988 routing, quarantined from all sharing) must have its own
  pastor-only visibility scope in the data model before any of its items enter
  the shared table. Content is in hand and ready to build against.
- **Server-generated PDF.** Reports currently use the browser's print-to-PDF (the
  Print / Download button). A fixed-layout server PDF is the remaining Phase 6 item.
- **Stripe webhooks + receipts + CRM logging** for donations (the on-page
  Payment Element and PaymentIntent route are built; recording gifts server-side
  is the follow-up).

## 7. Scale-value fix (why a redeploy matters)

The old code stored 1–5 answers as 0–4 (an index bug that only affected the
never-live 1–5 assessments). The new intake stores the true scale value per
assessment, so Rooted and Wired to Lead score correctly. This is why the four
new assessments must not go live until this code is deployed.
