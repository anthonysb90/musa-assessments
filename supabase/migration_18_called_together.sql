-- Migration 18: Called Together — couple engine (two linked spouse sessions).
-- Each spouse takes the assessment privately; the couple report shows both
-- side by side, with the couple band taken as the lower of the two views.
-- The confidential Safety check is never stored here and never shown in the
-- report; it is split out at submit time and routes privately to the care
-- team when a spouse indicates they don't feel safe.

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id),
  couple_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  initiator_name text,
  spouse1_name text,
  spouse1_json jsonb,
  spouse1_done_at timestamptz,
  spouse2_name text,
  spouse2_json jsonb,
  spouse2_done_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.couples enable row level security;

drop policy if exists "couples readable" on public.couples;
create policy "couples readable" on public.couples for select using (true);

drop policy if exists "anyone creates couple" on public.couples;
create policy "anyone creates couple" on public.couples for insert with check (true);
-- No client UPDATE/DELETE policy: spouse results are written only by the
-- SECURITY DEFINER function below, so one spouse can't overwrite the other and
-- raw scores can't be tampered with.

create or replace function public.record_couple_member(p_code text, p_name text, p_json jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; slot int; both boolean;
begin
  select * into c from couples where couple_code = p_code for update;
  if not found then return jsonb_build_object('ok', false); end if;

  if c.spouse1_done_at is null then
    update couples set spouse1_name = p_name, spouse1_json = p_json, spouse1_done_at = now() where id = c.id;
    slot := 1;
  elsif c.spouse2_done_at is null then
    update couples set spouse2_name = p_name, spouse2_json = p_json, spouse2_done_at = now() where id = c.id;
    slot := 2;
  else
    -- both slots already filled; ignore any extra submission
    return jsonb_build_object('ok', true, 'slot', 0, 'both_done', true);
  end if;

  select (spouse1_done_at is not null and spouse2_done_at is not null) into both from couples where id = c.id;
  return jsonb_build_object('ok', true, 'slot', slot, 'both_done', both);
end $$;

-- The couple flow is code-gated (like the team flow), so it does not force a
-- login. The confidential Safety item handles the sensitive part on its own.
update assessments set sensitivity = 'standard' where slug = 'called-together';
