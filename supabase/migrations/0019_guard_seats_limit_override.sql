-- 0019 · Only allow seats_limit override for team plan (E1 security fix)
--
-- Previously update_organization_plan and apply_billing_subscription accepted
-- any p_seats_limit value for any plan.  An org admin on the free plan could
-- call update_organization_plan('org_id', 'free', 50) to bypass the 3-seat cap.
-- Now: p_seats_limit is only honoured when the plan is 'team'; otherwise the
-- canonical seat_limit_for_plan value is used.

-- 1. update_organization_plan (callable by authenticated org admins)

drop function if exists public.update_organization_plan(uuid, text, integer);

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
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

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

revoke all on function public.update_organization_plan(uuid, text, integer) from public, anon;
grant execute on function public.update_organization_plan(uuid, text, integer) to authenticated;

-- 2. apply_billing_subscription (service_role only — defense in depth)

drop function if exists public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean, integer
);

drop function if exists public.apply_billing_subscription(
  uuid, text, text, text, text, text, timestamptz, boolean, integer
);

create or replace function public.apply_billing_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_provider text,
  p_external_customer_id text,
  p_external_subscription_id text,
  p_subscription_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
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
  v_provider text := lower(trim(p_provider));
  v_row public.organizations;
  v_seats_limit integer;
begin
  if v_plan_id not in ('free', 'pro', 'team') then
    raise exception 'invalid plan id' using errcode = '22023';
  end if;

  if v_provider = '' then
    raise exception 'billing provider required' using errcode = '22023';
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

  insert into public.organization_billing (
    organization_id,
    provider,
    external_customer_id,
    external_subscription_id,
    subscription_status,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  values (
    p_organization_id,
    v_provider,
    nullif(trim(p_external_customer_id), ''),
    nullif(trim(p_external_subscription_id), ''),
    coalesce(nullif(trim(p_subscription_status), ''), 'none'),
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    now()
  )
  on conflict (organization_id) do update
    set provider = excluded.provider,
        external_customer_id = excluded.external_customer_id,
        external_subscription_id = coalesce(
          excluded.external_subscription_id,
          organization_billing.external_subscription_id
        ),
        subscription_status = excluded.subscription_status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = now();

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id),
    'subscription_status', coalesce(nullif(trim(p_subscription_status), ''), 'none'),
    'billing_provider', v_provider
  );
end;
$$;

create or replace function public.apply_stripe_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_seats_limit integer default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.apply_billing_subscription(
    p_organization_id,
    p_plan_id,
    'stripe',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_status,
    p_current_period_end,
    p_cancel_at_period_end,
    p_seats_limit
  );
$$;

revoke all on function public.apply_billing_subscription(
  uuid, text, text, text, text, text, timestamptz, boolean, integer
) from public, anon, authenticated;

grant execute on function public.apply_billing_subscription(
  uuid, text, text, text, text, text, timestamptz, boolean, integer
) to service_role;

revoke all on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean, integer
) from public, anon, authenticated;

grant execute on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean, integer
) to service_role;
