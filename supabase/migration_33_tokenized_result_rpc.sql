-- Migration 33: close the anonymous session/result enumeration hole.
--
-- WHY: the two policies dropped below let ANYONE holding the public anon key
-- select every anonymous session (and its result, including scored_json with
-- the taker's contact block) straight from PostgREST — no token required.
-- "Readable by token" was only ever enforced client-side by the WHERE clause
-- the results page happened to send.
--
-- REPLACEMENT: a single SECURITY DEFINER RPC, result_by_token(p_token), that
-- requires possession of the exact (unguessable, 32-hex) result_token and
-- returns only what the report page needs. It also moves the church
-- "withhold_from_taker" gate server-side: a withheld report never sends
-- scored_json to the browser at all (previously the client fetched the full
-- result and merely chose not to render it).
--
-- KEEPS WORKING (policies untouched): "own sessions select" /
-- "own results select" (profile_id = auth.uid() OR is_admin()), the church
-- read policies (is_church_admin + visibility), and admin reads.

-- 1. Drop the enumerable anon read policies.
drop policy if exists "anon sessions readable" on public.sessions;
drop policy if exists "anon results readable for tokenized sessions" on public.results;

-- 2. Keep anonymous submission working. The results INSERT policy from
-- migration_09 ("insert results for existing session") checks
-- EXISTS(SELECT 1 FROM sessions ...) — and policy subqueries run under the
-- caller's own RLS, so once the anon SELECT policy on sessions is gone the
-- check would always fail for anonymous submissions. Recreate it on top of a
-- SECURITY DEFINER existence probe (boolean only; session ids are random
-- UUIDs, so this discloses nothing useful).
create or replace function public.session_exists(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from sessions where id = p_id);
$$;
revoke execute on function public.session_exists(uuid) from public;
grant execute on function public.session_exists(uuid) to anon, authenticated;

drop policy if exists "insert results for existing session" on public.results;
create policy "insert results for existing session" on public.results for insert
  with check (public.session_exists(session_id));

-- 3. Tokenized report reader. Returns NULL when the token doesn't match a
-- completed, scored session. When the session's church withholds this
-- assessment from the taker (and the caller is neither a Mission USA admin
-- nor a leader of that church), returns identity + branding with
-- withheld = true and NO scored_json.
create or replace function public.result_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec record;
  v_admin boolean;
  v_church_admin boolean := false;
  v_withheld boolean;
  base jsonb;
begin
  if p_token is null or btrim(p_token) = '' then
    return null;
  end if;

  select s.id as session_id, s.mode, s.church_id, s.cohort,
         a.id as assessment_id, a.slug, a.name, a.subtitle, a.category,
         a.is_paid, a.price_cents,
         r.scored_json, r.created_at, r.delivered_at,
         c.name as church_name, c.logo_url as church_logo,
         coalesce(ca.withhold_from_taker, false) as withhold
    into rec
    from sessions s
    join assessments a on a.id = s.assessment_id
    left join results r on r.session_id = s.id
    left join churches c on c.id = s.church_id
    left join church_assessments ca
      on ca.church_id = s.church_id and ca.assessment_id = s.assessment_id
   where s.result_token = p_token;

  -- No such token, or no result stored yet: same "not found" the page showed.
  if not found or rec.scored_json is null then
    return null;
  end if;

  v_admin := coalesce(public.is_admin(), false);
  if rec.church_id is not null then
    v_church_admin := coalesce(public.is_church_admin(rec.church_id), false);
  end if;
  v_withheld := rec.withhold and not v_admin and not v_church_admin;

  base := jsonb_build_object(
    'withheld', v_withheld,
    'is_admin', v_admin,
    'is_church_admin', v_church_admin,
    'session', jsonb_build_object(
      'id', rec.session_id,
      'mode', rec.mode,
      'church_id', rec.church_id,
      'cohort', rec.cohort
    ),
    'assessment', jsonb_build_object(
      'id', rec.assessment_id,
      'slug', rec.slug,
      'name', rec.name,
      'subtitle', rec.subtitle,
      'category', rec.category,
      'is_paid', rec.is_paid,
      'price_cents', rec.price_cents
    ),
    -- Same shape session_church_brand returned, so the blocked screen and
    -- header badge keep working unchanged.
    'church', case when rec.church_id is null then null
      else jsonb_build_object(
        'church_id', rec.church_id,
        'name', rec.church_name,
        'logo_url', rec.church_logo,
        'withhold', rec.withhold
      ) end
  );

  -- Withheld from this viewer: identity + branding only. scored_json never
  -- leaves the database.
  if v_withheld then
    return base;
  end if;

  return base || jsonb_build_object(
    'scored_json', rec.scored_json,
    'created_at', rec.created_at,
    'delivered_at', rec.delivered_at
  );
end $$;

revoke execute on function public.result_by_token(text) from public;
grant execute on function public.result_by_token(text) to anon, authenticated;
