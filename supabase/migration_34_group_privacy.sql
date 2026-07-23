-- Migration 34: lock down group tables (couples, rater_groups, review_circles).
--
-- The open SELECT/INSERT policies on these tables let anyone with the public
-- anon key enumerate spouse names/emails, full scored self-assessments, and
-- invite codes. All reads and inserts now go through SECURITY DEFINER
-- functions keyed by the secret code, each returning ONLY what the flow needs:
--
--   couple_by_code(code)     -> couple landing/report page (spouse JSONs only
--                               once BOTH spouses are done; progress before)
--   team_by_code(code)       -> team results page (aggregate only, and only
--                               once the min-raters anonymity floor is met)
--   couple_exists(code)      -> start-page couple-link validation
--   team_exists(code)        -> start-page team-link validation (+church name)
--   circle_by_code(code)     -> observe page (base_slug + subject first name)
--   create_couple(...)       -> couple setup page insert
--   create_rater_group(...)  -> team setup page insert
--
-- circle_aggregate(), record_couple_member(), record_circle_response(),
-- recompute_rater_group(), create_circle(), check_access(), grant_info()
-- already exist as SECURITY DEFINER and are unchanged. Server routes that
-- still read these tables directly do so with the service-role client.

begin;

-- ---------------------------------------------------------------------------
-- 1. Drop the wide-open policies. RLS stays enabled with no anon policy, so
--    the anon key can no longer read or insert these tables directly.
-- ---------------------------------------------------------------------------
drop policy if exists "couples readable"          on public.couples;
drop policy if exists "anyone creates couple"     on public.couples;
drop policy if exists "rater_groups readable"     on public.rater_groups;
drop policy if exists "anyone creates rater_group" on public.rater_groups;
drop policy if exists "circles readable"          on public.review_circles;

-- ---------------------------------------------------------------------------
-- 2. Code-gated readers
-- ---------------------------------------------------------------------------

-- Couple landing/report page. Names and done-timestamps are always returned
-- (the waiting screen shows who has finished); the scored domain JSONs are
-- returned only once BOTH spouses are done, because the side-by-side report
-- needs both and neither spouse may see the other's answers early.
create or replace function public.couple_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; a record; v_both boolean;
begin
  select * into c from couples where couple_code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  select name, slug, subtitle into a from assessments where id = c.assessment_id;
  v_both := c.spouse1_done_at is not null and c.spouse2_done_at is not null;
  return jsonb_build_object(
    'ok', true,
    'couple', jsonb_build_object(
      'couple_code',     c.couple_code,
      'spouse1_name',    c.spouse1_name,
      'spouse1_done_at', c.spouse1_done_at,
      'spouse2_name',    c.spouse2_name,
      'spouse2_done_at', c.spouse2_done_at,
      'both_done',       v_both,
      'spouse1_json',    case when v_both then c.spouse1_json end,
      'spouse2_json',    case when v_both then c.spouse2_json end
    ),
    'assessment', jsonb_build_object('name', a.name, 'slug', a.slug, 'subtitle', a.subtitle)
  );
end $$;

-- Team results page. Only the aggregate is ever exposed (never raw rater
-- rows), and only once the min-raters anonymity floor is met — belt and
-- braces on top of recompute_rater_group(), which already nulls the
-- aggregate below the floor.
create or replace function public.team_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; a record;
begin
  select team_code, church_name, rater_count, min_raters, aggregate_json, assessment_id
    into g from rater_groups where team_code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  select name, slug, subtitle into a from assessments where id = g.assessment_id;
  return jsonb_build_object(
    'ok', true,
    'group', jsonb_build_object(
      'team_code',      g.team_code,
      'church_name',    g.church_name,
      'rater_count',    g.rater_count,
      'min_raters',     g.min_raters,
      'aggregate_json', case when g.rater_count >= g.min_raters then g.aggregate_json end
    ),
    'assessment', jsonb_build_object('name', a.name, 'slug', a.slug, 'subtitle', a.subtitle)
  );
end $$;

-- Start-page validation: is this couple link valid? Payload intentionally
-- minimal — existence only.
create or replace function public.couple_exists(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('ok', exists (select 1 from couples where couple_code = p_code));
end $$;

-- Start-page validation: is this team link valid? Returns the church name,
-- which the rater intro screen displays.
create or replace function public.team_exists(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select church_name into v_name from rater_groups where team_code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'church_name', v_name);
end $$;

-- Observe page: an invited observer needs the instrument slug and the
-- subject's first name — nothing else (no email, no self_json, no
-- result_token). The circle report page itself uses circle_aggregate().
create or replace function public.circle_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select base_slug, subject_name into c from review_circles where circle_code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'base_slug', c.base_slug, 'subject_name', c.subject_name);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Code-generating writers (replace the dropped INSERT policies)
-- ---------------------------------------------------------------------------

-- Couple setup page. The secret couple_code comes from the column default;
-- only the code is returned.
create or replace function public.create_couple(p_assessment_id uuid, p_initiator_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not exists (select 1 from assessments where id = p_assessment_id and is_published = true) then
    return jsonb_build_object('ok', false, 'error', 'This assessment isn''t available.');
  end if;
  insert into couples (assessment_id, initiator_name)
  values (p_assessment_id, nullif(trim(coalesce(p_initiator_name, '')), ''))
  returning couple_code into v_code;
  return jsonb_build_object('ok', true, 'couple_code', v_code);
end $$;

-- Team setup page. Mirrors the old client insert payload
-- (assessment_id, church_name, target_count); team_code from column default.
create or replace function public.create_rater_group(p_assessment_id uuid, p_church_name text, p_target_count int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if not exists (
    select 1 from assessments
    where id = p_assessment_id and is_published = true and is_multi_rater = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'This assessment isn''t available.');
  end if;
  insert into rater_groups (assessment_id, church_name, target_count)
  values (p_assessment_id, nullif(trim(coalesce(p_church_name, '')), ''), p_target_count)
  returning team_code, church_name, min_raters into v;
  return jsonb_build_object('ok', true, 'team_code', v.team_code,
                            'church_name', v.church_name, 'min_raters', v.min_raters);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Execution grants: not callable via PUBLIC default; explicitly granted to
--    the web roles (service_role bypasses RLS but still needs EXECUTE).
-- ---------------------------------------------------------------------------
revoke execute on function public.couple_by_code(text)                  from public;
revoke execute on function public.team_by_code(text)                    from public;
revoke execute on function public.couple_exists(text)                   from public;
revoke execute on function public.team_exists(text)                     from public;
revoke execute on function public.circle_by_code(text)                  from public;
revoke execute on function public.create_couple(uuid, text)             from public;
revoke execute on function public.create_rater_group(uuid, text, int)   from public;

grant execute on function public.couple_by_code(text)                 to anon, authenticated, service_role;
grant execute on function public.team_by_code(text)                   to anon, authenticated, service_role;
grant execute on function public.couple_exists(text)                  to anon, authenticated, service_role;
grant execute on function public.team_exists(text)                    to anon, authenticated, service_role;
grant execute on function public.circle_by_code(text)                 to anon, authenticated, service_role;
grant execute on function public.create_couple(uuid, text)            to anon, authenticated, service_role;
grant execute on function public.create_rater_group(uuid, text, int)  to anon, authenticated, service_role;

commit;
