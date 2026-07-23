-- Migration 27: public church partnership requests. A church submits a request
-- (pending), it appears in the admin, and one click approves it (activates,
-- assigns the requested assessments with the chosen gate, invites the contacts).
alter table public.churches add column if not exists status text not null default 'active';
alter table public.churches add column if not exists phone text;
alter table public.churches add column if not exists logo_white_url text;
alter table public.churches add column if not exists requested_slugs text[];
alter table public.churches add column if not exists requested_gate boolean not null default false;
alter table public.churches add column if not exists admin_email text;

create or replace function public.request_church_partnership(
  p_name text, p_district text, p_email text, p_phone text,
  p_logo_color text, p_logo_white text, p_slugs text[], p_gate boolean, p_admin_email text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_email),'') = '' then
    raise exception 'Church name and email are required';
  end if;
  insert into churches(name, district, recipient_email, phone, logo_url, logo_white_url,
    requested_slugs, requested_gate, admin_email, status, is_active, results_visibility)
  values (trim(p_name), nullif(trim(p_district),''), lower(trim(p_email)), nullif(trim(p_phone),''),
    nullif(p_logo_color,''), nullif(p_logo_white,''), p_slugs, coalesce(p_gate,false),
    nullif(lower(trim(p_admin_email)),''), 'pending', false, 'individual_named')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_approve_church(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into c from churches where id = p_id;
  update churches set status='active', is_active=true where id = p_id;
  if c.requested_slugs is not null then
    insert into church_assessments(church_id, assessment_id, assigned_by, withhold_from_taker)
    select p_id, a.id, auth.uid(), coalesce(c.requested_gate,false)
    from assessments a
    where a.slug = any(c.requested_slugs)
      and not exists (select 1 from church_assessments ca where ca.church_id=p_id and ca.assessment_id=a.id);
  end if;
  insert into church_users(church_id, email, role, status, activated_at)
  select p_id, lower(e), 'church_admin', 'active', now()
  from (select c.recipient_email as e union select c.admin_email) t
  where t.e is not null and t.e <> ''
    and not exists (select 1 from church_users cu where cu.church_id=p_id and lower(cu.email)=lower(t.e));
end $$;

-- admin_churches() is also extended in this migration to return status, phone,
-- requested_slugs, requested_gate, admin_email, and logo_white_url, ordered
-- pending-first, so requests surface in the admin Churches tab.
