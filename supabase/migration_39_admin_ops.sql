-- Migration 39 — Admin operations pack: audit log, refunds/revocation,
-- and the pastoral care-list workflow.

-- 1. Refund / revocation tracking on grants.
alter table public.access_grants add column if not exists revoked_at        timestamptz;
alter table public.access_grants add column if not exists refunded_at       timestamptz;
alter table public.access_grants add column if not exists refund_amount_cents integer;

-- 2. Care-list workflow. wellbeing_results is quarantined (owner + admin read
-- only); care-team updates go through an admin function, never the client key.
alter table public.wellbeing_results add column if not exists contacted     boolean not null default false;
alter table public.wellbeing_results add column if not exists contacted_note text;
alter table public.wellbeing_results add column if not exists contacted_at   timestamptz;
alter table public.wellbeing_results add column if not exists contacted_by   text;

-- 3. Audit log — append-only record of sensitive admin actions.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "admin reads audit_log" on public.audit_log;
create policy "admin reads audit_log" on public.audit_log
  for select using (is_admin());
-- No client insert policy: writes go through admin_log() (definer) or the
-- service-role key in server routes.

-- Central logger. Any admin-gated RPC or the client can record an action.
create or replace function public.admin_log(
  p_action text, p_target_type text default null,
  p_target_id text default null, p_detail jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  insert into public.audit_log (actor_email, action, target_type, target_id, detail)
  values (coalesce(auth.jwt() ->> 'email', 'unknown'), p_action, p_target_type, p_target_id, p_detail);
end $$;
revoke execute on function public.admin_log(text, text, text, jsonb) from public;
grant execute on function public.admin_log(text, text, text, jsonb) to authenticated, service_role;

-- Reader for the Activity panel.
create or replace function public.admin_audit_log()
returns setof public.audit_log
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select * from public.audit_log order by created_at desc limit 200;
end $$;
revoke execute on function public.admin_audit_log() from public;
grant execute on function public.admin_audit_log() to authenticated, service_role;

-- 4. Care-list update (contacted flag + note).
create or replace function public.admin_set_wellbeing_contacted(
  p_session_id uuid, p_contacted boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(auth.jwt() ->> 'email', 'unknown');
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.wellbeing_results
     set contacted = coalesce(p_contacted, contacted),
         contacted_note = p_note,
         contacted_at = case when p_contacted then now() else null end,
         contacted_by = case when p_contacted then v_email else null end
   where session_id = p_session_id;
  insert into public.audit_log (actor_email, action, target_type, target_id, detail)
  values (v_email, 'wellbeing_contacted', 'session', p_session_id::text,
          jsonb_build_object('contacted', p_contacted));
end $$;
revoke execute on function public.admin_set_wellbeing_contacted(uuid, boolean, text) from public;
grant execute on function public.admin_set_wellbeing_contacted(uuid, boolean, text) to authenticated, service_role;

-- 5. Log inside the existing grant mutators so deletes and issues are recorded.
create or replace function public.admin_delete_grant(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.access_grants where code = p_code;
  insert into public.audit_log (actor_email, action, target_type, target_id)
  values (coalesce(auth.jwt() ->> 'email', 'unknown'), 'grant_deleted', 'grant', p_code);
end $$;
revoke execute on function public.admin_delete_grant(text) from public, anon;
grant execute on function public.admin_delete_grant(text) to authenticated, service_role;

create or replace function public.admin_issue_grant(
  p_email text, p_name text, p_slugs text[], p_seats integer, p_kind text, p_church uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare newcode text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  insert into access_grants (email, buyer_name, assessment_slugs, seats_total, kind, church_id)
  values (p_email, p_name, coalesce(p_slugs,'{}'), greatest(coalesce(p_seats,1),1), coalesce(p_kind,'seats'), p_church)
  returning code into newcode;
  insert into public.audit_log (actor_email, action, target_type, target_id, detail)
  values (coalesce(auth.jwt() ->> 'email', 'unknown'), 'grant_issued', 'grant', newcode,
          jsonb_build_object('email', p_email, 'seats', p_seats, 'kind', p_kind));
  return newcode;
end $$;
revoke execute on function public.admin_issue_grant(text, text, text[], integer, text, uuid) from public, anon;
grant execute on function public.admin_issue_grant(text, text, text[], integer, text, uuid) to authenticated, service_role;
