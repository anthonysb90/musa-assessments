-- Migration 26: the "withhold results" gate moves to per church+assessment
-- (a church can hold back one assessment's results but not another's). Logo
-- branding stays per church.
alter table public.church_assessments add column if not exists withhold_from_taker boolean not null default false;

create or replace function public.admin_set_assessment_gate(p_church_id uuid, p_slug text, p_withhold boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update church_assessments ca set withhold_from_taker = coalesce(p_withhold, false)
  from assessments a where a.id = ca.assessment_id and ca.church_id = p_church_id and a.slug = p_slug;
end $$;

-- Logo only now (gate is per-assessment).
create or replace function public.admin_set_church_branding(p_church_id uuid, p_withhold boolean, p_logo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update churches set logo_url = nullif(p_logo,'') where id = p_church_id;
end $$;

-- Admin overview: links now carry each assessment's withhold flag.
create or replace function public.admin_churches()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into result from (
    select c.id, c.name, c.city, c.state, c.district, c.recipient_email, c.recipient_email_2,
      c.results_visibility::text as results_visibility, c.is_active, c.logo_url,
      (select coalesce(jsonb_agg(a.slug order by a.slug), '[]'::jsonb)
         from church_assessments ca join assessments a on a.id=ca.assessment_id where ca.church_id=c.id) as assigned_slugs,
      (select coalesce(jsonb_agg(jsonb_build_object('token', ca.assignment_token, 'slug', a.slug, 'name', a.name, 'withhold', ca.withhold_from_taker) order by a.name), '[]'::jsonb)
         from church_assessments ca join assessments a on a.id=ca.assessment_id where ca.church_id=c.id) as links,
      (select coalesce(jsonb_agg(jsonb_build_object('id', cu.id, 'email', cu.email, 'status', cu.status::text) order by cu.email), '[]'::jsonb)
         from church_users cu where cu.church_id=c.id and cu.status<>'removed') as users,
      (select count(*) from sessions s where s.church_id=c.id and s.status='completed') as completed_count
    from churches c order by c.name
  ) x;
  return result;
end $$;

-- Report reader: withhold now comes from this session's church+assessment.
create or replace function public.session_church_brand(p_session uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('church_id', c.id, 'name', c.name, 'logo_url', c.logo_url,
    'withhold', coalesce(ca.withhold_from_taker, false))
  from sessions s
  join churches c on c.id = s.church_id
  left join church_assessments ca on ca.church_id = c.id and ca.assessment_id = s.assessment_id
  where s.id = p_session;
$$;
