-- Migration 37: email_log — a lightweight audit trail of every transactional
-- email attempt. Written fire-and-forget from app/lib/email.js using the
-- service-role client only. Privacy: we record the recipient's DOMAIN
-- (e.g. "gmail.com"), never the full address, plus the template name and the
-- send outcome, so deliverability problems can be diagnosed without building
-- a mailing list.

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  template text,          -- builder/template name, e.g. 'magic_link', 'care_alert_wellbeing'
  to_domain text,         -- domain part of the recipient address only
  ok boolean,             -- did the provider accept the send?
  status int,             -- HTTP status from the provider (200 on success)
  error text,             -- truncated provider error body / fetch error, if any
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;

-- Admins may read the log in the dashboard. There are deliberately NO client
-- INSERT/UPDATE/DELETE policies: rows are written only by the service-role
-- key (which bypasses RLS), so clients cannot forge or scrub the audit trail.
drop policy if exists "admin reads email log" on public.email_log;
create policy "admin reads email log" on public.email_log
  for select using (is_admin());
