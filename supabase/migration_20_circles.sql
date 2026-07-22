-- Migration 20: Co-rater "circles" — the optional multi-person layer for
-- Church Planter (spouse + assessor) and Leadership Health (peer 360). The
-- subject takes their self-assessment normally; they may then invite others,
-- who rate the subject with an observer instrument. The circle report shows
-- self vs observed, side by side. Best results come from multiple voices.

create table if not exists public.review_circles (
  id uuid primary key default gen_random_uuid(),
  circle_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  base_slug text not null,
  subject_name text,
  subject_email text,
  self_json jsonb,
  result_token text unique,
  created_at timestamptz not null default now()
);
alter table public.review_circles enable row level security;
drop policy if exists "circles readable" on public.review_circles;
create policy "circles readable" on public.review_circles for select using (true);

create table if not exists public.circle_responses (
  id uuid primary key default gen_random_uuid(),
  circle_code text not null,
  role text not null,
  name text,
  scored_json jsonb,
  created_at timestamptz not null default now()
);
alter table public.circle_responses enable row level security;
-- No client read of individual observer answers: only the aggregate is exposed,
-- via circle_aggregate(). Writes go through record_circle_response().

create or replace function public.create_circle(
  p_base_slug text, p_subject_name text, p_subject_email text, p_self jsonb, p_token text
) returns text language plpgsql security definer set search_path = public as $$
declare existing text; newcode text;
begin
  if p_token is not null then
    select circle_code into existing from review_circles where result_token = p_token;
    if existing is not null then return existing; end if;
  end if;
  insert into review_circles (base_slug, subject_name, subject_email, self_json, result_token)
  values (p_base_slug, p_subject_name, p_subject_email, p_self, p_token)
  returning circle_code into newcode;
  return newcode;
end $$;

create or replace function public.record_circle_response(
  p_code text, p_role text, p_name text, p_json jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from review_circles where circle_code = p_code) then
    return jsonb_build_object('ok', false);
  end if;
  insert into circle_responses (circle_code, role, name, scored_json) values (p_code, p_role, p_name, p_json);
  select count(*) into n from circle_responses where circle_code = p_code;
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- Self + observer aggregate for the circle report. Observers are averaged per
-- domain (never shown individually).
create or replace function public.circle_aggregate(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; obs jsonb; roles jsonb; n int;
begin
  select * into c from review_circles where circle_code = p_code;
  if not found then return jsonb_build_object('ok', false); end if;
  select count(*) into n from circle_responses where circle_code = p_code;

  with resp as (
    select r.role, d.domain, (d.value->>'average')::numeric avg
    from circle_responses r, jsonb_array_elements(r.scored_json->'domains') d(value),
         lateral (select d.value->>'domain' as domain) d2
    cross join lateral (select d.value as value) dv
    -- flatten each observer's domain averages
  ),
  perdom as (
    select (d.value->>'domain') as domain, avg((d.value->>'average')::numeric) as average, count(*) as raters
    from circle_responses r, jsonb_array_elements(r.scored_json->'domains') d(value)
    group by (d.value->>'domain')
  )
  select coalesce(jsonb_agg(jsonb_build_object('domain', domain, 'average', round(average,2), 'raters', raters) order by average desc), '[]'::jsonb)
    into obs from perdom;

  select coalesce(jsonb_agg(distinct role), '[]'::jsonb) into roles from circle_responses where circle_code = p_code;

  return jsonb_build_object('ok', true, 'subject_name', c.subject_name, 'base_slug', c.base_slug,
    'self', coalesce(c.self_json->'domains','[]'::jsonb), 'observers', obs, 'observer_count', n, 'roles', roles);
end $$;

-- ---- Observer instruments (unpublished; taken only via circle invite links) ----

insert into public.assessments (slug,name,subtitle,category,scale_min,scale_max,estimated_minutes,questions_per_page,sensitivity,is_published)
values
 ('leadership-health-peer','Leadership Health — Peer Input','How you see this leader','church',1,5,4,10,'standard',false),
 ('church-planter-spouse','Church Planter — Spouse Input','A spouse''s honest perspective','ministry',1,5,6,10,'standard',false),
 ('church-planter-assessor','Church Planter — Assessor Rating','A trained assessor''s evidence-based rating','ministry',1,5,12,15,'standard',false)
on conflict (slug) do update set name=excluded.name, subtitle=excluded.subtitle, category=excluded.category,
  scale_min=excluded.scale_min, scale_max=excluded.scale_max, estimated_minutes=excluded.estimated_minutes,
  questions_per_page=excluded.questions_per_page, sensitivity=excluded.sensitivity;

-- Leadership peer: one statement per domain (matches LEADERSHIP_DOMAINS keys).
delete from items where assessment_id=(select id from assessments where slug='leadership-health-peer');
with a as (select id from assessments where slug='leadership-health-peer')
insert into items (assessment_id,item_order,text,domain,is_scored,is_reverse_scored,item_type)
select a.id,v.ord,v.txt,v.dom,true,false,'standard'::item_type from a,(values
 (1,'This leader sets a clear direction and helps people move toward it.','Vision & Direction'),
 (2,'This leader makes sound decisions in a timely way.','Decision-Making'),
 (3,'This leader communicates clearly and listens well.','Communication'),
 (4,'This leader hands off real responsibility and builds up the team.','Delegation & Team Building'),
 (5,'This leader stays steady and grounded under pressure.','Emotional & Spiritual Resilience'),
 (6,'This leader is trustworthy and owns their mistakes.','Integrity & Accountability'),
 (7,'This leader handles conflict directly and fairly.','Conflict Navigation'),
 (8,'This leader keeps growing and adapts well when things change.','Growth & Adaptability')
) as v(ord,txt,dom);

-- Church Planter spouse: what a spouse can genuinely observe (maps to characteristics).
delete from items where assessment_id=(select id from assessments where slug='church-planter-spouse');
with a as (select id from assessments where slug='church-planter-spouse')
insert into items (assessment_id,item_order,text,domain,is_scored,is_reverse_scored,item_type)
select a.id,v.ord,v.txt,v.dom,true,false,'standard'::item_type from a,(values
 (1,'My spouse keeps working hard toward goals even when no one is watching.','Intrinsically Motivated'),
 (2,'My spouse builds genuine friendships easily, including with people far from God.','Reaches the Unchurched'),
 (3,'My spouse connects naturally with people outside the church.','Reaches the Unchurched'),
 (4,'My spouse bounces back from setbacks and criticism.','Resilience'),
 (5,'My spouse adjusts well when plans change.','Flexible and Adaptable'),
 (6,'My spouse''s faith in God is the real engine behind their ministry.','Exercises Faith'),
 (7,'My spouse helps other people take ownership and grow as leaders.','Creates Ownership of Ministry'),
 (8,'People are naturally drawn to follow my spouse.','Effectively Builds Relationships')
) as v(ord,txt,dom);

-- Church Planter assessor: one evidence-based rating per characteristic.
delete from items where assessment_id=(select id from assessments where slug='church-planter-assessor');
with a as (select id from assessments where slug='church-planter-assessor')
insert into items (assessment_id,item_order,text,domain,is_scored,is_reverse_scored,item_type)
select a.id,v.ord,v.txt,v.dom,true,false,'standard'::item_type from a,(values
 (1,'Has started things that did not exist, and made others want to build them.','Visioning Capacity'),
 (2,'Pursues goals over the long haul with no one supervising.','Intrinsically Motivated'),
 (3,'Develops others who then lead on their own.','Creates Ownership of Ministry'),
 (4,'Builds real friendships with people far from God.','Reaches the Unchurched'),
 (5,'Is united with their spouse on the call to plant.','Spousal Cooperation'),
 (6,'Builds trust and relationships across different kinds of people.','Effectively Builds Relationships'),
 (7,'Has changed methods in order to reach more people.','Committed to Church Growth'),
 (8,'Shapes ministry around a community''s real, specific needs.','Responsive to the Community'),
 (9,'Places people in roles that fit their gifts.','Utilizes the Giftedness of Others'),
 (10,'Adapts when plans fall apart, without losing the mission.','Flexible and Adaptable'),
 (11,'Forms groups that become genuinely close and lasting.','Builds Group Cohesiveness'),
 (12,'Recovers from real failure and keeps going.','Resilience'),
 (13,'Takes real steps of faith that depend on God coming through.','Exercises Faith')
) as v(ord,txt,dom);
