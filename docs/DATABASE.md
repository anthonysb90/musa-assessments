# Database

The app runs on a Supabase (Postgres) project that is already provisioned. You
do not need to run migrations to use the app. This document explains the tables
and the security model so you can extend them safely.

Project ref: `rtcahxypgqtbkomuwwci`
URL: `https://rtcahxypgqtbkomuwwci.supabase.co`

## Tables

There are 11 tables, and Row-Level Security is enabled on all of them.

| Table | Purpose |
| --- | --- |
| `assessments` | One row per assessment. Holds slug, name, subtitle, category, scale range, `questions_per_page`, `sensitivity`, and `is_published`. |
| `items` | The questions. Each row belongs to an assessment and carries its order, its `gift_letter` (for Spiritual Gifts), and optional `domain` for domain-scored assessments. |
| `sessions` | One row per attempt. Carries `result_token`, `resume_token`, `duration_seconds`, `mode`, `status`, and optional `church_id`. |
| `responses` | One row per answered item, linked to a session. |
| `results` | The scored output for a session, stored as `scored_json`. |
| `events` | Lightweight event log (for example, `assessment_completed`). |
| `profiles` | Registered taker profiles (used once accounts land in Phase 3). |
| `admin_users` | Admin allow-list, used by the `is_admin()` helper. |
| `churches` | Churches that can run assessments. |
| `church_assessments` | Which assessments a church runs, with an `assignment_token`. |
| `church_users` | Links church leaders to their church. |

## Key fields to know

- `assessments.is_published` controls whether an assessment shows to the public.
  Unpublished assessments are invisible to takers but visible to admins.
- `assessments.questions_per_page` controls pagination. Spiritual Gifts is 25.
- `assessments.sensitivity` is `standard` or `sensitive`. Sensitive assessments
  must require login before they are published.
- `sessions.result_token` is a random 32-character hex string. The results page
  resolves a report by this token.
- `results.scored_json` holds the full scored output plus the taker's contact
  block, so a report can render without an auth user.

## Security model

- Takers can read only their own data.
- Admins can read all data, gated by the `is_admin()` helper and admin policies.
- Published assessments and their items are publicly readable, which is what lets
  the home page and take flow work without login.
- Anonymous sessions and their results are readable by token, which is the
  tokenized-link model for standard assessments.
- Results can be inserted for a session that exists, which is what the submit
  route needs.

## Scoring shapes

The scored output in `results.scored_json` has a `type` field so the results
page knows how to render it.

- `type: "gift-rank"` for Spiritual Gifts. Carries a ranked array of
  `{ letter, score }` and the contact block.
- `type: "domain-average"` for domain-scored assessments. Carries a ranked array
  of `{ domain, average, count }` and the contact block.

If you add an assessment that needs a different shape, add both the scorer in
`app/api/submit/route.js` and the matching renderer in
`app/results/[token]/page.js`.

## Migrations

The migrations that built this schema are applied in the live project. This repo
includes one reference migration, `supabase/migration_09_tokenized_reads.sql`,
which added the tokenized read and anonymous insert policies. It is included so
the tokenized-link model is documented in version control. The earlier
migrations (enums, tables, indexes, RLS helpers, seed data) live in the Supabase
project history.
