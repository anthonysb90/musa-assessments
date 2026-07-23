-- Migration 25: per-church branding + "withhold results from taker" (reveal
-- in person). withhold_from_taker hides the report from the person who took it
-- (church + admins still see it); logo_url brands that church's reports.
alter table public.churches add column if not exists withhold_from_taker boolean not null default false;
alter table public.churches add column if not exists logo_url text;

create or replace function public.admin_set_church_branding(p_church_id uuid, p_withhold boolean, p_logo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update churches set withhold_from_taker = coalesce(p_withhold, false), logo_url = nullif(p_logo,'')
   where id = p_church_id;
end $$;

-- Extend the admin overview to include the new fields.
create or replace function public.admin_churches()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into result from (
    select c.id, c.name, c.city, c.state, c.district, c.recipient_email, c.recipient_email_2,
      c.results_visibility::text as results_visibility, c.is_active,
      c.withhold_from_taker, c.logo_url,
      (select coalesce(jsonb_agg(a.slug order by a.slug), '[]'::jsonb)
         from church_assessments ca join assessments a on a.id=ca.assessment_id where ca.church_id=c.id) as assigned_slugs,
      (select coalesce(jsonb_agg(jsonb_build_object('token', ca.assignment_token, 'slug', a.slug, 'name', a.name) order by a.name), '[]'::jsonb)
         from church_assessments ca join assessments a on a.id=ca.assessment_id where ca.church_id=c.id) as links,
      (select coalesce(jsonb_agg(jsonb_build_object('id', cu.id, 'email', cu.email, 'status', cu.status::text) order by cu.email), '[]'::jsonb)
         from church_users cu where cu.church_id=c.id and cu.status<>'removed') as users,
      (select count(*) from sessions s where s.church_id=c.id and s.status='completed') as completed_count
    from churches c order by c.name
  ) x;
  return result;
end $$;

-- Resolve a session's church branding/withhold for the report reader.
create or replace function public.session_church_brand(p_session uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('church_id', c.id, 'name', c.name, 'logo_url', c.logo_url, 'withhold', c.withhold_from_taker)
  from sessions s join churches c on c.id = s.church_id
  where s.id = p_session;
$$;
