-- Migration 35 — Data integrity: idempotent seat consumption, email dedupe,
-- missing indexes, coupon bounds, longer invite codes.

-- One-time send guard for the access-code email (checkout re-finalize on a
-- page refresh must not resend it).
alter table public.access_grants add column if not exists emailed_at timestamptz;

-- Missing hot-path indexes.
create index if not exists access_grants_email_idx on public.access_grants (lower(email));
create index if not exists circle_responses_code_idx on public.circle_responses (circle_code);
create index if not exists sessions_cohort_idx on public.sessions (cohort);

-- A percent coupon over 100% is always a mistake.
alter table public.coupons drop constraint if exists coupons_percent_bound;
alter table public.coupons add constraint coupons_percent_bound
  check (kind <> 'percent' or amount <= 100);

-- Idempotent, audited seat consumption. A double-submit (or retry) of the
-- same session consumes exactly one seat, and every consumption is recorded.
create table if not exists public.seat_consumptions (
  grant_code text not null,
  session_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (grant_code, session_id)
);
alter table public.seat_consumptions enable row level security;
-- No client policies: server-only via the function below / service role.

drop function if exists public.consume_seat(text);
create or replace function public.consume_seat(p_code text, p_session_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare inserted boolean := false;
begin
  insert into public.seat_consumptions (grant_code, session_id)
  values (p_code, p_session_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if not inserted then
    return true; -- already consumed for this session; idempotent no-op
  end if;
  update public.access_grants
     set seats_used = seats_used + 1
   where code = p_code and seats_used < seats_total;
  return found;
end $$;
revoke execute on function public.consume_seat(text, uuid) from public, anon, authenticated;

-- New invite/grant codes get 128-bit entropy (existing 48-bit codes keep
-- working; they are no longer enumerable via table reads after migration 34).
alter table public.access_grants  alter column code        set default encode(gen_random_bytes(16), 'hex');
alter table public.rater_groups   alter column team_code   set default encode(gen_random_bytes(16), 'hex');
alter table public.couples        alter column couple_code set default encode(gen_random_bytes(16), 'hex');
alter table public.review_circles alter column circle_code set default encode(gen_random_bytes(16), 'hex');
