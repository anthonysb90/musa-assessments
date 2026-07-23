-- Migration 30 — Homepage card order + Featured flag
-- Applied to the live DB on 2026-07-23; kept here for the repo's records.
alter table public.assessments add column if not exists sort_order integer not null default 100;
alter table public.assessments add column if not exists is_featured boolean not null default false;

create or replace function public.admin_set_card_order(p_slug text, p_sort integer, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.assessments
    set sort_order = coalesce(p_sort, sort_order), is_featured = coalesce(p_featured, is_featured)
    where slug = p_slug;
end $$;
revoke all on function public.admin_set_card_order(text, integer, boolean) from public;
grant execute on function public.admin_set_card_order(text, integer, boolean) to authenticated;
