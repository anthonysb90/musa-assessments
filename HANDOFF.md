# Handoff: start here

This repo is the Mission USA Ministry Assessments v1 app. It was built and
verified in a previous chat. Use this file to pick up where that left off.

## Current state

- The app is complete and builds cleanly (`npm install` then `npm run build`).
- It is the full take-score-report loop for the Spiritual Gifts assessment,
  wired to a live Supabase database.
- The database is already provisioned and seeded. No migrations needed to run.
- The app is NOT yet pushed to GitHub and NOT yet deployed. Those are the two
  open tasks.

## The two open tasks

### 1. Push to GitHub

Repo: https://github.com/anthonysb90/musa-assessments (owner: anthonysb90)

The repo exists with an initial README commit on `main`. A previous attempt to
push through a connector failed with `403 Resource not accessible by
integration`, which means that connector had read access but not write access.

Two ways to get the code up:

Local push from your machine (simplest, runs as you):
```
git init
git add .
git commit -m "MUSA Assessments v1"
git branch -M main
git remote add origin https://github.com/anthonysb90/musa-assessments.git
git pull origin main --allow-unrelated-histories
git push -u origin main
```

Or, if a GitHub connector with write access is available in the new chat, push
through it. Grant the connector read and write on repository contents for this
repo first.

### 2. Deploy to Vercel

The app has the Supabase URL and key baked in as fallbacks, so it deploys with
no extra config.

```
npm i -g vercel
vercel --prod
```

Or import the GitHub repo in the Vercel dashboard once it is pushed. Framework
auto-detects as Next.js. Then point `assessments.chchurch.com` at the deployment.

A previous attempt to deploy through a Vercel connector stopped at an approval
gate that never completed. If you use the connector, watch for and approve that
prompt. The CLI path above avoids it.

## Live service references

- Supabase project ref: `rtcahxypgqtbkomuwwci`
- Supabase URL: `https://rtcahxypgqtbkomuwwci.supabase.co`
- Publishable (anon) key: `sb_publishable_VzlhtfaX5xYjp7EcoHQFqg_L8ClzvWd`
  This key is public and browser-safe. Row-Level Security protects the data.

## What to build next

See BUILD-PHASES.md for the full plan. The near-term order:

1. Push and deploy Phase 1 (this app), let people use it.
2. Add the "Group A" assessments (Rooted, Wired to Lead, Church Growth). These
   need no code, only seeded items and `is_published = true`.
3. Build Phase 2 email delivery (verify the Emailit API endpoint first).
4. Add Fivefold Calling (point the ranked scorer at it).
5. Build Phase 3 accounts, which also unlocks the sensitive assessments
   (Called Together, Pastor Profile).

## Read next

- README.md for setup, structure, and deploy detail
- BUILD-PHASES.md for the phase plan and the rules on adding each assessment
- docs/DATABASE.md for the schema and security model
