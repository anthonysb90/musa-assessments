-- Migration 14a: quarantined wellbeing store for Pastor Profile.
-- Wellbeing answers never enter the shared responses/results tables; only the
-- computed band/total lives here. Readable by the pastor (owner) and, by
-- Mission USA's decision to pastor its pastors, by admins for proactive care.
-- Church leaders can NOT read it (no church policy).

create table if not exists public.wellbeing_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null,
  total int not null,
  max_total int not null,
  band text not null,            -- 'ok' | 'strain' | 'significant'
  elevated boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists wellbeing_results_session_idx on public.wellbeing_results(session_id);
create index if not exists wellbeing_results_profile_idx on public.wellbeing_results(profile_id);

alter table public.wellbeing_results enable row level security;

drop policy if exists "own wellbeing insert" on public.wellbeing_results;
create policy "own wellbeing insert" on public.wellbeing_results for insert
  with check (profile_id = auth.uid());

drop policy if exists "own wellbeing select" on public.wellbeing_results;
create policy "own wellbeing select" on public.wellbeing_results for select
  using (profile_id = auth.uid());

-- Mission USA pastoral care: admins may read wellbeing so they can reach out
-- when a pastor is struggling.
drop policy if exists "admin reads wellbeing" on public.wellbeing_results;
create policy "admin reads wellbeing" on public.wellbeing_results for select
  using (is_admin());
