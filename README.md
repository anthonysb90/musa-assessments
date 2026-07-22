# Mission USA Ministry Assessments

A config-driven assessment platform for the Congregational Holiness Church.
Members take Scripture-grounded assessments, get a clear ranked report, and
receive a real next step. Built for `assessments.chchurch.com`.

This repo is the **v1 application**: the full take-score-report loop for the
Spiritual Gifts assessment, wired to a live Supabase database. It is built so
that new assessments can be added without rewriting the app. See
[BUILD-PHASES.md](./BUILD-PHASES.md) for what ships when, and for the exact
rules on adding the other nine assessments.

---

## What this app does today

- Lists every published assessment on the home page, pulled live from the database
- Runs the full take flow: intake form, paginated questions (25 per page for Spiritual Gifts), progress tracking
- Scores server-side and stores the result
- Shows a ranked report: top three gifts, a full color-coded ranking, tap-to-expand detail for every gift
- Lets the taker download or print the report as a PDF
- Delivers results through a private tokenized link, no login required for standard assessments
- Tracks completion time as an internal metric (never shown to the taker)

## What is not built yet

These are planned phases, not missing pieces. Each is described in
[BUILD-PHASES.md](./BUILD-PHASES.md).

- Email delivery of results (Emailit)
- Magic-link login, a taker dashboard, and progress over time
- Admin analytics dashboard
- Church mode: church dashboards, member invites, assignment links
- Spam prevention (Cloudflare Turnstile)
- Server-generated fixed-layout PDF (the app currently uses browser print-to-PDF)
- Multi-rater flows for the 360-style assessments

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| UI | React 18, no component library, inline design tokens |
| Fonts | Fraunces (display) and Inter (body) |
| Database | Supabase (Postgres) with Row-Level Security |
| Hosting | Vercel |

## Project structure

```
.
├── app/
│   ├── layout.js                 Root layout, fonts, metadata
│   ├── globals.css               Design tokens and base styles
│   ├── page.js                   Home page, lists published assessments
│   ├── lib/
│   │   ├── config.js             Supabase URL and key (env with safe fallbacks)
│   │   ├── supabase.js           Browser client
│   │   └── gifts.js              Gift A–Y display content (names, defs, refs)
│   ├── assessment/[slug]/
│   │   └── page.js               Intake, paginated questions, submit
│   ├── results/[token]/
│   │   └── page.js               Ranked report, print/PDF
│   └── api/submit/
│       └── route.js              Server: session, responses, scoring, result
├── docs/
│   └── DATABASE.md               Schema and RLS model
├── supabase/
│   └── migration_09_tokenized_reads.sql   Reference migration
├── .env.example                  Copy to .env.local
├── BUILD-PHASES.md               Phased plan and how to add assessments
└── README.md
```

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd musa-assessments
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

The values in `.env.example` point to the live `musa-assessments` Supabase
project. They are public keys and safe to use in the browser. If you spin up a
separate database for testing, replace them.

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`. The home page should list the Spiritual Gifts
assessment. Take it end to end to confirm the database connection works.

### 4. Build for production

```bash
npm run build
npm start
```

---

## Deploying to Vercel

The app has the Supabase URL and key baked in as fallbacks, so it deploys with
no extra configuration. Two options:

**From the CLI**

```bash
npm i -g vercel
vercel --prod
```

**From the dashboard**

1. Push this repo to GitHub
2. In Vercel, import the repo
3. Framework preset auto-detects as Next.js
4. Deploy

If you keep secrets out of the code later, set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project's environment variables.

Then point `assessments.chchurch.com` at the Vercel deployment in your DNS.

---

## The database

The live Supabase project is already provisioned with 11 tables, Row-Level
Security on all of them, and all seed data for the Spiritual Gifts assessment.
You do not need to run migrations to use this app. The schema and the security
model are documented in [docs/DATABASE.md](./docs/DATABASE.md).

## Security notes

- The anon/publishable key is meant to ship in the browser. Row-Level Security
  is what protects the data, not the key.
- Standard assessments deliver results through a random 32-character token in
  the URL. The token is not guessable, which is the standard tokenized-link
  model.
- Sensitive assessments (Called Together, Pastor Profile) must require login
  before they are published. That gate is part of a later phase. Do not publish
  a sensitive assessment on the public tokenized-link model. See BUILD-PHASES.md.

---

## License

Proprietary. Built for Mission USA and the Congregational Holiness Church.
Not for redistribution.
