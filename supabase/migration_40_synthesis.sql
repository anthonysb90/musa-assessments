-- Migration 40 — Cross-assessment synthesis ("Your Ministry Profile").
--
-- Stores a one-line headline + type on each result (computed at submit time),
-- then exposes a token-gated function that returns a taker's OTHER results as
-- lightweight summaries. Full score data of the other reports is never
-- returned here; only the same one-line headline already shown in dashboards.

alter table public.results add column if not exists headline    text;
alter table public.results add column if not exists result_type text;

-- Given ONE valid result token, return the same person's other completed
-- results (matched by the contact email stored on the result they hold).
-- Possession of the token proves the caller received that emailed report.
create or replace function public.synthesis_for_token(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_email text; v_session uuid; out jsonb;
begin
  if p_token is null or btrim(p_token) = '' then return jsonb_build_object('ok', false); end if;

  select s.id, lower(r.scored_json->'contact'->>'email')
    into v_session, v_email
    from sessions s join results r on r.session_id = s.id
   where s.result_token = p_token;
  if v_email is null then return jsonb_build_object('ok', false); end if;

  select jsonb_build_object(
           'ok', true,
           'others', coalesce(jsonb_agg(row order by created_at desc), '[]'::jsonb)
         )
    into out
    from (
      select jsonb_build_object(
               'slug', a.slug,
               'name', a.name,
               'category', a.category,
               'result_type', coalesce(r.result_type, r.scored_json->>'type'),
               'headline', r.headline,
               'result_token', s.result_token,
               'created_at', r.created_at
             ) as row, r.created_at
        from results r
        join sessions s on s.id = r.session_id
        join assessments a on a.id = s.assessment_id
       where s.id <> v_session
         and lower(r.scored_json->'contact'->>'email') = v_email
    ) q;

  return out;
end $$;
revoke execute on function public.synthesis_for_token(text) from public;
grant execute on function public.synthesis_for_token(text) to anon, authenticated;
