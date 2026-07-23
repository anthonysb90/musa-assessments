-- Migration 28 — Platform fee settings
-- A single-row table holding the checkout service fee, admin-editable.
-- Fee = fee_enabled ? round(amount * fee_percent/100) + fee_fixed_cents : 0
-- Read publicly (so the buy page can display it); written only by admins
-- through the admin_set_platform_fee() RPC. Applied to the live DB on
-- 2026-07-23; kept here for the repo's records.

create table if not exists public.platform_settings (
  id             smallint primary key default 1 check (id = 1),
  fee_fixed_cents integer  not null default 30  check (fee_fixed_cents >= 0 and fee_fixed_cents <= 10000),
  fee_percent    numeric(5,2) not null default 3.50 check (fee_percent >= 0 and fee_percent <= 30),
  fee_label      text     not null default 'Platform fee',
  fee_enabled    boolean  not null default true,
  updated_at     timestamptz not null default now()
);

insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Anyone may read the (non-sensitive) fee configuration.
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select using (true);

-- No public write policy: writes go only through the admin RPC below.

create or replace function public.admin_set_platform_fee(
  p_fixed_cents integer,
  p_percent     numeric,
  p_label       text,
  p_enabled     boolean
) returns public.platform_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.platform_settings;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  update public.platform_settings set
    fee_fixed_cents = greatest(0, least(10000, coalesce(p_fixed_cents, fee_fixed_cents))),
    fee_percent     = greatest(0, least(30, coalesce(p_percent, fee_percent))),
    fee_label       = coalesce(nullif(btrim(p_label), ''), fee_label),
    fee_enabled     = coalesce(p_enabled, fee_enabled),
    updated_at      = now()
  where id = 1
  returning * into row;

  return row;
end;
$$;

revoke all on function public.admin_set_platform_fee(integer, numeric, text, boolean) from public;
grant execute on function public.admin_set_platform_fee(integer, numeric, text, boolean) to authenticated;
