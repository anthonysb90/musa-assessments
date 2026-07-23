-- Migration 32 — Lock down the commerce functions.
--
-- WHY: finalize_purchase / redeem_free_order / redeem_coupon / validate_coupon /
-- consume_seat were SECURITY DEFINER and executable by anon. Anyone holding the
-- public anon key could call finalize_purchase with a made-up PaymentIntent id
-- and mint a working access code with unlimited seats — a full payment bypass.
--
-- AFTER THIS MIGRATION these functions are callable only by the service_role
-- key (which bypasses grants). The Next.js routes now call them through the
-- admin client (see app/lib/supabaseServer.js getAdminSupabase). This means
-- SUPABASE_SERVICE_ROLE_KEY MUST be set in Vercel for checkout to work.

revoke execute on function public.finalize_purchase(text, text, text, text[], integer, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.redeem_free_order(text, text, text, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.redeem_coupon(text) from public, anon, authenticated;
revoke execute on function public.validate_coupon(text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.consume_seat(text) from public, anon, authenticated;

-- Defense in depth: cap seats inside finalize_purchase itself (was only
-- floored at 1, never capped).
create or replace function public.finalize_purchase(
  p_pi text, p_email text, p_name text, p_slugs text[], p_seats integer,
  p_kind text, p_bundle text, p_church uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare existing text; newcode text;
begin
  select code into existing from access_grants where stripe_payment_intent = p_pi;
  if existing is not null then return existing; end if;
  insert into access_grants (email, buyer_name, assessment_slugs, seats_total, kind, bundle_slug, church_id, stripe_payment_intent)
  values (p_email, p_name, p_slugs, least(greatest(coalesce(p_seats,1),1), 1000), coalesce(p_kind,'assessment'), p_bundle, p_church, p_pi)
  returning code into newcode;
  return newcode;
end $$;

-- create or replace resets grants on some setups; re-assert the revoke.
revoke execute on function public.finalize_purchase(text, text, text, text[], integer, text, text, uuid) from public, anon, authenticated;

-- Guard coupon redemption against over-redemption under concurrency
-- (previously an unguarded increment).
create or replace function public.redeem_coupon(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.coupons
     set redemptions = redemptions + 1
   where code = upper(btrim(p_code))
     and (max_redemptions is null or redemptions < max_redemptions);
end $$;
revoke execute on function public.redeem_coupon(text) from public, anon, authenticated;
