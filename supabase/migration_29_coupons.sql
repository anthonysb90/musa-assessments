-- Migration 29 — Coupon codes + free-order path
-- Coupon discounts at checkout, plus a free-order path that doubles as the
-- end-to-end "test the buying system" tool (a 100%-off coupon runs the whole
-- flow and issues an access code without charging a card). Applied to the live
-- DB on 2026-07-23; kept here for the repo's records.
-- Gifting reuses the existing admin_issue_grant()/admin_grants() (migration 19).

create table if not exists public.coupons (
  code            text primary key,
  kind            text not null check (kind in ('percent','fixed')),
  amount          numeric not null check (amount >= 0),
  applies_to      text[] not null default '{}',
  active          boolean not null default true,
  max_redemptions integer,
  redemptions     integer not null default 0,
  expires_at      timestamptz,
  note            text,
  created_at      timestamptz not null default now()
);
alter table public.coupons enable row level security;

-- See migration applied via MCP for the full function bodies:
--   validate_coupon(code, slug, bundle, subtotal_cents) -> jsonb
--   redeem_coupon(code) -> void
--   redeem_free_order(email, name, slug, bundle, seats, kind, code) -> text (code)
--   admin_create_coupon(...), admin_list_coupons(), admin_set_coupon_active(code, active)
