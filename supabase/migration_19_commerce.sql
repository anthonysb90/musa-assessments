-- Migration 19: Commerce — paid assessments, discounted bundles, church seat
-- packs, and access grants. Pay-upfront model: a paid assessment (or bundle)
-- is purchased on-screen with Stripe, which creates an access grant carrying a
-- shareable code and a seat count. Taking a paid assessment requires a valid
-- code with a seat remaining; a seat is consumed when a taker completes.
--
-- Security: access_grants is never client-readable (no select policy). All
-- access checks and seat changes go through SECURITY DEFINER functions that
-- return only what's needed. Admin writes are guarded by is_admin() inside the
-- functions, so no broad table-write policies are needed.

alter table public.assessments add column if not exists is_paid boolean not null default false;
alter table public.assessments add column if not exists price_cents int not null default 0;

create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents int not null default 0,
  assessment_slugs text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.bundles enable row level security;
drop policy if exists "bundles readable" on public.bundles;
create policy "bundles readable" on public.bundles for select using (true);

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default encode(gen_random_bytes(6), 'hex'),
  email text,
  buyer_name text,
  assessment_slugs text[] not null default '{}',
  seats_total int not null default 1,
  seats_used int not null default 0,
  kind text not null default 'assessment',
  bundle_slug text,
  church_id uuid,
  stripe_payment_intent text unique,
  created_at timestamptz not null default now()
);
alter table public.access_grants enable row level security;
-- No public SELECT/INSERT/UPDATE policy: emails and codes must not be
-- enumerable. Everything goes through the functions below. Admins read via the
-- admin_grants() function.

-- Verify a code grants access to a slug and has a seat left. Returns minimal info.
create or replace function public.check_access(p_code text, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from access_grants where code = p_code;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not (p_slug = any(g.assessment_slugs)) then return jsonb_build_object('ok', false, 'reason', 'wrong_assessment'); end if;
  if g.seats_used >= g.seats_total then return jsonb_build_object('ok', false, 'reason', 'no_seats'); end if;
  return jsonb_build_object('ok', true, 'remaining', g.seats_total - g.seats_used, 'kind', g.kind);
end $$;

-- Consume one seat (called at completion). No-op if already full.
create or replace function public.consume_seat(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update access_grants set seats_used = seats_used + 1
   where code = p_code and seats_used < seats_total;
end $$;

-- Create an access grant after a verified Stripe payment. Idempotent on the
-- payment intent, so re-finalizing the same purchase returns the same code.
create or replace function public.finalize_purchase(
  p_pi text, p_email text, p_name text, p_slugs text[], p_seats int, p_kind text, p_bundle text, p_church uuid
) returns text language plpgsql security definer set search_path = public as $$
declare existing text; newcode text;
begin
  select code into existing from access_grants where stripe_payment_intent = p_pi;
  if existing is not null then return existing; end if;
  insert into access_grants (email, buyer_name, assessment_slugs, seats_total, kind, bundle_slug, church_id, stripe_payment_intent)
  values (p_email, p_name, p_slugs, greatest(coalesce(p_seats,1),1), coalesce(p_kind,'assessment'), p_bundle, p_church, p_pi)
  returning code into newcode;
  return newcode;
end $$;

-- Admin: set an assessment's price (guarded).
create or replace function public.admin_set_pricing(p_slug text, p_is_paid boolean, p_price int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update assessments set is_paid = coalesce(p_is_paid,false), price_cents = greatest(coalesce(p_price,0),0) where slug = p_slug;
end $$;

-- Admin: create or update a bundle (guarded).
create or replace function public.admin_upsert_bundle(
  p_slug text, p_name text, p_description text, p_price int, p_slugs text[], p_active boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  insert into bundles (slug, name, description, price_cents, assessment_slugs, is_active)
  values (p_slug, p_name, p_description, greatest(coalesce(p_price,0),0), coalesce(p_slugs,'{}'), coalesce(p_active,true))
  on conflict (slug) do update set
    name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
    assessment_slugs = excluded.assessment_slugs, is_active = excluded.is_active;
end $$;

-- Admin: issue a comp/manual grant (e.g. gift a church seats without payment).
create or replace function public.admin_issue_grant(
  p_email text, p_name text, p_slugs text[], p_seats int, p_kind text, p_church uuid
) returns text language plpgsql security definer set search_path = public as $$
declare newcode text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  insert into access_grants (email, buyer_name, assessment_slugs, seats_total, kind, church_id)
  values (p_email, p_name, coalesce(p_slugs,'{}'), greatest(coalesce(p_seats,1),1), coalesce(p_kind,'seats'), p_church)
  returning code into newcode;
  return newcode;
end $$;

-- Admin: list grants for the CRM (guarded).
create or replace function public.admin_grants()
returns setof public.access_grants language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select * from access_grants order by created_at desc limit 500;
end $$;

-- Read a grant's contents for the redemption page (no email exposed).
create or replace function public.grant_info(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from access_grants where code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'assessment_slugs', g.assessment_slugs,
    'seats_total', g.seats_total, 'seats_used', g.seats_used, 'kind', g.kind, 'bundle_slug', g.bundle_slug);
end $$;
