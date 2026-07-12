-- 0034 · Lock billing plan/seat writes from authenticated clients
--
-- Two bypasses existed:
-- 1. orgs_update_admin allowed PATCH of any organizations column, including
--    plan_id / seats_limit (free paid-tier upgrade via PostgREST).
-- 2. update_organization_plan was EXECUTE-granted to authenticated and only
--    checked is_org_admin — no Stripe/mock gate.
--
-- Fix:
-- - Column-scoped UPDATE: clients may still edit name / logo_url.
-- - update_organization_plan is service_role only. Mock/CI billing calls it
--   through Edge Function billing-sync-mock-plan (JWT + assertOrgAdmin +
--   BILLING_PROVIDER gate). Stripe continues via apply_billing_subscription.

revoke update on public.organizations from authenticated;
grant update (name, logo_url) on public.organizations to authenticated;

comment on column public.organizations.plan_id is
  'Commercial plan tier; writable only via billing RPCs (service_role).';
comment on column public.organizations.seats_limit is
  'Seat cap; writable only via billing RPCs (service_role).';

create or replace function public.update_organization_plan(
  p_organization_id uuid,
  p_plan_id text,
  p_seats_limit integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id text := lower(trim(p_plan_id));
  v_row public.organizations;
  v_seats_limit integer;
begin
  -- Authorization is EXECUTE grant (service_role) + Edge Function admin check.
  if v_plan_id not in ('free', 'pro', 'team') then
    raise exception 'invalid plan id' using errcode = '22023';
  end if;

  if v_plan_id = 'team' and p_seats_limit is not null then
    v_seats_limit := greatest(1, least(p_seats_limit, 50));
  else
    v_seats_limit := private.seat_limit_for_plan(v_plan_id);
  end if;

  update public.organizations o
     set plan_id = v_plan_id,
         seats_limit = v_seats_limit
   where o.id = p_organization_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id)
  );
end;
$$;

revoke all on function public.update_organization_plan(uuid, text, integer)
  from public, anon, authenticated;

grant execute on function public.update_organization_plan(uuid, text, integer)
  to service_role;

notify pgrst, 'reload schema';
