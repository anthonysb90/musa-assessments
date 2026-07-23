-- Migration 23: Admin publish/unpublish toggle. Lets an admin drop an
-- assessment off the public homepage (and re-list it) without a deploy.
-- Guarded by is_admin(). Co-rater instruments stay unpublished by design.
create or replace function public.admin_set_published(p_slug text, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update assessments set is_published = coalesce(p_published, false) where slug = p_slug;
end $$;
