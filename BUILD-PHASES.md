# Build Phases and Assessment Rollout

This document does two things. First, it lays out the phases for building the
platform to full feature set. Second, it answers the practical question: when
can each of the other assessments go live, and what has to be true first.

Read the rollout rules before you publish anything past Spiritual Gifts. Some
assessments can be added with almost no code. Others must wait for a specific
phase, and publishing them early would expose sensitive data.

---

## Part 1: The phases

The order is deliberate. Each phase leaves you with something that works, so you
can launch, gather real use, and build the next layer with confidence instead of
guessing.

### Phase 1: Core loop (DONE)

The take-score-report loop for Spiritual Gifts, live on the database.

- Home page lists published assessments
- Intake, paginated questions, submit
- Server-side scoring and result storage
- Ranked report with print/PDF
- Tokenized results link

**Exit test:** a member can take Spiritual Gifts on the live site and see a
correct report. This is the launch you can put in front of people now.

### Phase 2: Email delivery

Send the results after completion so people do not lose the link.

- Integrate Emailit for transactional email
- Standard assessments: inline results in the email plus the results link, plus a
  "take this next" cross-promotion
- Sensitive assessments: no result content in the email, only a secure "log in to
  view" message
- Never put safety or wellbeing data in any email

**Before you build:** confirm the current Emailit API endpoint from their live
docs. A past build guessed the endpoint and got it wrong. Verify first.

**Exit test:** completing an assessment sends the right email for its
sensitivity level.

### Phase 3: Accounts and taker dashboard

Let people come back, see their history, and track growth.

- Magic-link login (no passwords)
- A taker dashboard listing past results
- Progress over time for repeatable assessments
- This phase also unlocks the login gate that sensitive assessments require

**Exit test:** a returning member logs in and sees every assessment they have
taken.

### Phase 4: Admin analytics

Give leadership a view of what is happening.

- Admin dashboard: completions, trends, breakdowns by role and church
- Export for reporting
- Uses the `is_admin()` helper and admin policies already in the database

**Exit test:** an admin can see totals and trends without touching the database
directly.

### Phase 5: Church mode

Let churches run assessments with their people.

- Church dashboards showing their members' results
- Member invites
- Assignment links so a church can send an assessment with its own tracking
- The disclosure and consent flow for church-shared results is already in the
  take form

**Exit test:** a church leader sends an assignment link, a member completes it,
and the result appears on that church's dashboard.

### Phase 6: Hardening and remaining flows

- Cloudflare Turnstile to stop spam and bots
- Server-generated fixed-layout PDF that looks the same everywhere
- Multi-rater flows for the 360-style assessments (self plus observers)

---

## Part 2: When can we add the other assessments

Here is the important part. This app is **config-driven**. The questions,
scale, pagination, and publish state all live in the database, not in the code.
That means many assessments can go live with no new code at all. You seed the
item bank, set the assessment to published, and it appears on the home page and
runs through the same take flow.

The one thing that is not fully generic yet is **scoring**. The app has two
scorers today:

1. **Ranked scorer** for Spiritual Gifts. Sums each gift and ranks greatest to
   least.
2. **Generic domain-average scorer** for everything else. Averages the items in
   each domain and ranks the domains.

So the rule is simple. If an assessment is happy with domain-average scoring, it
can go live as soon as its items are finalized. If it needs its own scoring math,
that math has to be added first. And if it holds sensitive data, it must wait for
the login gate in Phase 3.

### The decision table

| Assessment | Scoring needed | Sensitive | Can add when |
| --- | --- | --- | --- |
| Spiritual Gifts | Ranked (built) | No | Live now |
| Rooted | Domain-average (built) | No | As soon as items are seeded |
| Fivefold Calling | Ranked, same shape as gifts | No | Add ranked config, then seed |
| Wired to Lead | Domain-average (built) | No | As soon as items are seeded |
| Church Growth | Domain-average (built) | No | As soon as items are seeded |
| Church Planter | Readiness scoring (custom) | No | After scoring added and items finalized |
| Called Together | Domain-average (built) | Yes | After Phase 3 login gate |
| Pastor Profile | Custom | Yes | After Phase 3, scoring, and content finalized |
| Church Health | Multi-rater | No | After Phase 6 multi-rater flow |
| Leadership Health | Multi-rater | No | After Phase 6 multi-rater flow |

### Three groups, in plain terms

**Group A: Add now, no code.** Rooted, Wired to Lead, Church Growth. These use
domain-average scoring, which already works. Finalize the item bank, seed it,
set `is_published = true`. Done.

**Group B: Add after a small code change.** Fivefold Calling needs the ranked
scorer pointed at it (same shape as Spiritual Gifts, quick). Church Planter needs
its readiness scoring written. Neither is a large job, but neither is zero.

**Group C: Must wait for a phase.**
- Called Together and Pastor Profile hold sensitive relational and pastoral data.
  They must not go on the public tokenized-link model. Publish them only after
  Phase 3 gives you the login gate.
- Church Health and Leadership Health are 360-style. They need the multi-rater
  flow from Phase 6 before they mean anything.

### The steps to add a Group A assessment

1. Finalize the item bank (every question, its domain, and scale)
2. Seed the assessment row and its items into the database
3. Set `is_published = true` on the assessment
4. Load the home page. It appears automatically and runs end to end.

No deploy is required for a content-only add, because the app reads assessments
from the database at request time. You only redeploy when you change code.

### A safety reminder

Before you publish any assessment, confirm two things:

1. Is it sensitive? If yes, it needs the login gate. Do not publish it on a
   tokenized public link.
2. Does its scoring match one of the two built scorers? If not, the scoring has
   to be added first, or results will be wrong.

When in doubt, keep it unpublished. An unpublished assessment is invisible to
the public but fully testable by an admin.

---

## Suggested near-term order

1. Launch Phase 1 (Spiritual Gifts) and let people use it
2. Add the Group A assessments (Rooted, Wired to Lead, Church Growth) as their
   item banks are ready
3. Build Phase 2 email so results are not lost
4. Add Fivefold Calling once the ranked config is pointed at it
5. Build Phase 3 accounts, which also unlocks the sensitive assessments
6. Work through Phases 4 and 5 as ministry needs grow
7. Finish with Phase 6 hardening and the multi-rater assessments
