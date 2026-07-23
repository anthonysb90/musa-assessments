-- Migration 36 — Server-side payment ledger, written by the Stripe webhook.
-- Purchases AND donations get a row; the webhook also finalizes purchases so
-- a buyer who never returns to the success page still gets their access code.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_intent text unique not null,
  kind text not null default 'purchase' check (kind in ('purchase','donation')),
  amount_cents integer not null,
  currency text not null default 'usd',
  email text,
  status text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

drop policy if exists "admin reads payments" on public.payments;
create policy "admin reads payments" on public.payments
  for select using (is_admin());
-- No insert/update policies: the webhook writes with the service-role key.
