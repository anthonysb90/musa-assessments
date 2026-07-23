-- Migration 41 — Never return the assessor-only Planter validity block
-- (candor / infrequency / attention flags) in the candidate's tokenized report.
-- It was stored in scored_json but is assessor-only; strip it at the token
-- boundary. Admins still read full scored_json via their own admin queries.
-- (Body identical to migration_33's result_by_token except scored_json is
-- returned as `rec.scored_json - 'validity'`.)
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
      'id', rec.session_id, 'mode', rec.mode, 'church_id', rec.church_id, 'cohort', rec.cohort
    ),
    'assessment', jsonb_build_object(
      'id', rec.assessment_id, 'slug', rec.slug, 'name', rec.name, 'subtitle', rec.subtitle,
      'category', rec.category, 'is_paid', rec.is_paid, 'price_cents', rec.price_cents
    ),
    'church', case when rec.church_id is null then null
      else jsonb_build_object('church_id', rec.church_id, 'name', rec.church_name,
                              'logo_url', rec.church_logo, 'withhold', rec.withhold) end
  );

  if v_withheld then
    return base;
  end if;

  return base || jsonb_build_object(
    'scored_json', rec.scored_json - 'validity',
    'created_at', rec.created_at,
    'delivered_at', rec.delivered_at
  );
end $$;
revoke execute on function public.result_by_token(text) from public;
grant execute on function public.result_by_token(text) to anon, authenticated;
