-- Migration 09: tokenized reads and anonymous result inserts
-- Applied to the live musa-assessments project.
-- Included here so the tokenized-link model is documented in version control.

-- Allow inserting a result for a session that exists (anonymous submission flow).
-- Reads remain restricted (own/admin), but the submit route needs to write.
create policy "insert results for existing session" on results for insert
  with check (exists (select 1 from sessions s where s.id = results.session_id));

-- Allow reading a result via its session's result_token path.
-- Public results pages resolve by result_token; permit select when the session
-- is not tied to a profile (anonymous). Owner/admin reads are covered elsewhere.
create policy "anon results readable for tokenized sessions" on results for select
  using (exists (
    select 1 from sessions s
    where s.id = results.session_id and s.profile_id is null
  ));

-- Sessions: allow reading anonymous sessions, needed to resolve result_token
-- on the results page.
create policy "anon sessions readable" on sessions for select
  using (profile_id is null);
