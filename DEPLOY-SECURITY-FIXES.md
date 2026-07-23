# Security + Platform Fixes — Deploy Notes (2026-07-23)

Applied by Claude in one session. **The 6 database migrations (32–37) are ALREADY
APPLIED to the live Supabase project `rtcahxypgqtbkomuwwci`.** The code changes are
on disk in this repo but **not deployed** — you need to commit and push so Vercel
builds them.

## CRITICAL: deploy order

The DB is already locked down. The old deployed code still expects the old (open)
database, so **some flows are broken in production RIGHT NOW until you push this
code.** Since the app is pre-launch with zero users, the safe move is: push these
changes immediately.

```
cd musa-assessments
git add -A
git commit -m "Security hardening: RLS, commerce lockdown, rate limiting, payments webhook"
git push
```

## REQUIRED environment variables (set in Vercel before/at deploy)

| Var | Why | If missing |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Now mandatory.** Checkout finalize, free orders, coupon validation, seat consumption, the Stripe webhook, and anonymous/team/couple submissions all call it. It was already used by the magic-link route. | Checkout and all submissions fail. This is the one that must be set. |
| `STRIPE_WEBHOOK_SECRET` | New webhook at `/api/webhooks/stripe` that records payments and finalizes purchases even if the buyer never returns to the success page. | Webhook returns without recording; the return-page flow still grants access, so not fatal, but donations/receipts and the ledger won't populate. |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Real cross-instance rate limiting. | Falls back to a per-instance in-memory limiter (soft limit). Recommended but not blocking. |
| `NEXT_PUBLIC_APP_URL` | Should already be `https://assessments.chchurch.com`. Confirm it — email links and logos use it. | Emails link to the vercel.app fallback (spam-filter risk). |

## Stripe webhook setup

In the Stripe dashboard → Developers → Webhooks → add endpoint:
- URL: `https://assessments.chchurch.com/api/webhooks/stripe`
- Event: `payment_intent.succeeded`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.

## What changed

**Security (the launch blockers from the audit):**
- Commerce RPCs (`finalize_purchase`, `redeem_free_order`, `redeem_coupon`,
  `validate_coupon`, `consume_seat`) revoked from anon — no more free access-code
  minting. Called only via the new service-role client.
- `sessions`/`results` anon-read policies dropped; reports now load through a
  `result_by_token` RPC that also enforces church "withhold" server-side (scores
  never reach a withheld viewer).
- `couples`/`review_circles`/`rater_groups` public reads dropped; replaced with
  code-keyed RPCs.
- `/api/invite/send` no longer accepts a raw link (was an open phishing relay); it
  builds links server-side from the group code. Magic-link + invites + submit +
  checkout + observe + partner-request now rate-limited. Turnstile fails closed and
  covers the team/couple paths. Auth callback open-redirect closed. Submit no longer
  trusts client `church_id` (uses the validated assignment token).

**Platform correctness:**
- Idempotent seat consumption, coupon over-redemption guard, percent-coupon bound,
  missing indexes, 128-bit invite codes (migration 35).
- Stripe webhook + `payments` ledger (migration 36).
- `email_log` table + all email now escaped and routed through one branded template;
  care-alert send failures are logged (migration 37).
- Checkout pay-screen price bug fixed (was showing 1/100th of the amount);
  double-submit guarded.
- Assessment take flow now autosaves to localStorage and offers resume; a failed
  submit preserves answers with a retry.

## Still TODO (not done this session — see the full audit .md)

Reports-to-$100 work (interaction content, per-report architecture, server PDF),
admin operations pack (resend/refund/audit log), mobile nav + a11y, and the
schema baseline dump. These are work orders WO-6(partial),10,12,13,14 in the audit.
