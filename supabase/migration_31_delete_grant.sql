-- Migration 31 — Admin delete access code (grant). Applied live 2026-07-23.
create or replace function public.admin_delete_grant(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.access_grants where code = p_code;
end $$;
revoke all on function public.admin_delete_grant(text) from public;
grant execute on function public.admin_delete_grant(text) to authenticated;
