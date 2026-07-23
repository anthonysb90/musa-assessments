-- Migration 38 — Fix the Featured toggle.
--
-- BUG: the admin "Featured" toggle calls admin_set_card_order with only
-- { p_slug, p_featured }, but the function had three required parameters
-- (p_slug, p_sort, p_featured) and no defaults. PostgREST could not resolve a
-- 2-argument signature, so the call failed silently; the admin UI flipped
-- optimistically and then reverted on reload. Un-featuring (and featuring)
-- never persisted.
--
-- FIX: give p_sort and p_featured defaults of null. The existing
-- coalesce(...) already means "null = leave unchanged", so a partial call now
-- updates only the field provided. The reorder path (which passes all three)
-- is unaffected.

create or replace function public.admin_set_card_order(
  p_slug text,
  p_sort integer default null,
  p_featured boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.assessments
     set sort_order  = coalesce(p_sort, sort_order),
         is_featured = coalesce(p_featured, is_featured)
   where slug = p_slug;
end $$;
