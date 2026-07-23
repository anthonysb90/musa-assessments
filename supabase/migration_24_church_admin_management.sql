-- Migration 24: admin-side church management (onboard, assign assessments,
-- invite/remove church users, read overview). All guarded by is_admin().

create or replace function public.admin_upsert_church(
  p_id uuid, p_name text, p_city text, p_state text, p_district text,
  p_email text, p_email2 text, p_visibility text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_id is null then
    insert into churches(name, city, state, district, recipient_email, recipient_email_2, results_visibility, is_active, created_by)
    values (p_name, nullif(p_city,''), nullif(p_state,''), nullif(p_district,''), nullif(p_email,''), nullif(p_email2,''),
            coalesce(nullif(p_visibility,''),'individual_named')::church_visibility, true, auth.uid())
    returning id into v_id;
  else
    update churches set name=p_name, city=nullif(p_city,''), state=nullif(p_state,''), district=nullif(p_district,''),
      recipient_email=nullif(p_email,''), recipient_email_2=nullif(p_email2,''),
      results_visibility=coalesce(nullif(p_visibility,''),'individual_named')::church_visibility
    where id=p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.admin_set_church_assessments(p_church_id uuid, p_slugs text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from church_assessments ca using assessments a
   where ca.assessment_id=a.id and ca.church_id=p_church_id and not (a.slug = any(p_slugs));
  insert into church_assessments(church_id, assessment_id, assigned_by)
  select p_church_id, a.id, auth.uid() from assessments a
   where a.slug = any(p_slugs)
     and not exists (select 1 from church_assessments ca where ca.church_id=p_church_id and ca.assessment_id=a.id);
end $$;

create or replace function public.admin_invite_church_user(p_church_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update church_users set status='active', removed_at=null, activated_at=now()
   where church_id=p_church_id and lower(email)=lower(p_email);
  if not found then
    insert into church_users(church_id, email, role, status, invited_by, activated_at)
    values (p_church_id, lower(p_email), 'church_admin', 'active', auth.uid(), now());
  end if;
end $$;

create or replace function public.admin_remove_church_user(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update church_users set status='removed', removed_at=now() where id=p_id;
end $$;

create or replace function public.admin_churches()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into result from (
    select c.id, c.name, c.city, c.state, c.district, c.recipient_email, c.recipient_email_2,
      c.results_visibility::text as results_visibility, c.is_active,
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
