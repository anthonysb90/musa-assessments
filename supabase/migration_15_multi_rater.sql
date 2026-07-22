-- Migration 15: multi-rater engine (Church Health; reused later for peer 360)
-- Anonymity is enforced in the data model, not just the UI:
--  * rater answers live in `responses` (anonymous users cannot SELECT them)
--  * no per-rater `results` row is ever created
--  * only the team aggregate (never individual data) is exposed, and only
--    once the 3-rater floor is met — computed by a SECURITY DEFINER function.

create table if not exists public.rater_groups (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id),
  team_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  church_name text,
  target_count int,
  min_raters int not null default 3,
  rater_count int not null default 0,
  aggregate_json jsonb,
  created_at timestamptz not null default now()
);
alter table public.rater_groups enable row level security;

drop policy if exists "rater_groups readable" on public.rater_groups;
create policy "rater_groups readable" on public.rater_groups for select using (true);

drop policy if exists "anyone creates rater_group" on public.rater_groups;
create policy "anyone creates rater_group" on public.rater_groups for insert with check (true);
-- No client UPDATE/DELETE policy: the aggregate is only ever written by the
-- SECURITY DEFINER function below, so raw scores can't be tampered with.

create or replace function public.recompute_rater_group(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare g record; n int; agg jsonb;
begin
  select * into g from rater_groups where team_code = p_code;
  if not found then return; end if;

  select count(*) into n from sessions s
   where s.cohort = p_code and s.mode = 'rater' and s.status = 'completed'
     and s.assessment_id = g.assessment_id;

  if n >= g.min_raters then
    with per_rater as (
      select s.id sid, i.domain, avg(r.value::numeric) ravg
      from responses r
      join items i on i.id = r.item_id
      join sessions s on s.id = r.session_id
      where s.cohort = p_code and s.mode = 'rater' and s.status = 'completed'
        and i.assessment_id = g.assessment_id and i.is_scored = true and i.domain is not null
      group by s.id, i.domain
    ),
    dom as (
      select domain, round(avg(ravg), 2) average, round(max(ravg) - min(ravg), 2) spread
      from per_rater group by domain
    )
    select jsonb_build_object(
      'rater_count', n,
      'domains', coalesce(jsonb_agg(jsonb_build_object('domain', domain, 'average', average, 'spread', spread) order by average desc), '[]'::jsonb)
    ) into agg from dom;
    update rater_groups set rater_count = n, aggregate_json = agg where id = g.id;
  else
    update rater_groups set rater_count = n, aggregate_json = null where id = g.id;
  end if;
end $$;

update assessments set is_multi_rater = true where slug = 'church-health';
