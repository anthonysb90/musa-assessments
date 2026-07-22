-- Migration 10: accounts, admin-by-email, and church-mode read paths
-- Applied to the live musa-assessments project (Phases 3-5).
-- Additive and reversible; no existing data is modified.

-- 1. Broaden admin match to email so an admin is recognized as soon as they
--    sign in, without hand-syncing auth uids. Still SECURITY DEFINER.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. Church-admin helper: is the current user an active leader of this church?
create or replace function public.is_church_admin(target uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from church_users cu
    where cu.church_id = target
      and cu.status = 'active'
      and lower(cu.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3. Church leaders can read their own membership rows (to resolve their church).
drop policy if exists "church_users read own" on church_users;
create policy "church_users read own" on church_users for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or is_admin());

-- 4. Church leaders can invite members to their own church.
drop policy if exists "church admin invites members" on church_users;
create policy "church admin invites members" on church_users for insert
  with check (is_church_admin(church_id) or is_admin());

-- 5. Church leaders can read sessions/results for their church, but only when
--    the church's visibility allows named individual results.
drop policy if exists "church reads its sessions" on sessions;
create policy "church reads its sessions" on sessions for select
  using (
    church_id is not null and is_church_admin(church_id)
    and exists (
      select 1 from churches c
      where c.id = sessions.church_id and c.results_visibility = 'individual_named'
    )
  );

drop policy if exists "church reads its results" on results;
create policy "church reads its results" on results for select
  using (exists (
    select 1 from sessions s join churches c on c.id = s.church_id
    where s.id = results.session_id
      and s.church_id is not null and is_church_admin(s.church_id)
      and c.results_visibility = 'individual_named'
  ));

-- 6. Bootstrap Mission USA admins on first magic-link signup. admin_users.id
--    is a FK to auth.users, so admins can't be pre-seeded before they exist;
--    this trigger promotes the allowlisted emails the moment they sign up.
create or replace function public.bootstrap_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) in ('asbaumann90@gmail.com', 'anthony@chchurch.com') then
    insert into admin_users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_bootstrap_admin on auth.users;
create trigger on_auth_user_bootstrap_admin after insert on auth.users
  for each row execute function public.bootstrap_admin();
