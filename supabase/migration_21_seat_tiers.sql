-- Migration 21: Volume seat tiers — quantity discounts on paid assessments
-- (e.g. 5 seats for $99, 20 for $299, 100 for $999). Tiers are stored as
-- [{qty, price_cents}] on the assessment and priced server-side at checkout.
alter table public.assessments add column if not exists seat_tiers jsonb not null default '[]'::jsonb;

-- Admin: set an assessment's volume tiers (guarded by is_admin()).
create or replace function public.admin_set_tiers(p_slug text, p_tiers jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update assessments set seat_tiers = coalesce(p_tiers, '[]'::jsonb) where slug = p_slug;
end $$;
