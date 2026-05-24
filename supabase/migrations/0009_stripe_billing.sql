-- 0009 · Stripe customer/subscription mirror + webhook idempotency

create table public.organization_stripe (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  subscription_status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_stripe_customer_id_unique unique (stripe_customer_id),
  constraint organization_stripe_subscription_id_unique unique (stripe_subscription_id)
);

create index organization_stripe_subscription_id_idx
  on public.organization_stripe (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.organization_stripe enable row level security;

grant select on public.organization_stripe to authenticated;

drop policy if exists "org_stripe_select_member" on public.organization_stripe;
create policy "org_stripe_select_member"
  on public.organization_stripe
  for select
  to authenticated
  using (private.is_org_member(organization_id));

create table public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

create or replace function public.apply_stripe_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
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
begin
  if v_plan_id not in ('free', 'pro', 'team') then
    raise exception 'invalid plan id' using errcode = '22023';
  end if;

  update public.organizations o
     set plan_id = v_plan_id,
         seats_limit = private.seat_limit_for_plan(v_plan_id)
   where o.id = p_organization_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  insert into public.organization_stripe (
    organization_id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  values (
    p_organization_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    coalesce(nullif(trim(p_subscription_status), ''), 'none'),
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    now()
  )
  on conflict (organization_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = coalesce(
          excluded.stripe_subscription_id,
          organization_stripe.stripe_subscription_id
        ),
        subscription_status = excluded.subscription_status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = now();

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id),
    'subscription_status', coalesce(nullif(trim(p_subscription_status), ''), 'none')
  );
end;
$$;

revoke all on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean
) from public, anon, authenticated;

create or replace function public.get_organization_billing_snapshot(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_row public.organizations;
  v_stripe public.organization_stripe;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row
    from public.organizations o
   where o.id = p_organization_id;

  if v_row.id is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  select * into v_stripe
    from public.organization_stripe s
   where s.organization_id = p_organization_id;

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id),
    'subscription_status', coalesce(v_stripe.subscription_status, 'none'),
    'current_period_end', v_stripe.current_period_end,
    'cancel_at_period_end', coalesce(v_stripe.cancel_at_period_end, false),
    'has_stripe_customer', v_stripe.stripe_customer_id is not null
  );
end;
$$;

create or replace function public.link_organization_stripe_customer(
  p_organization_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text default null,
  p_subscription_status text default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.organization_stripe (
    organization_id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status
  )
  values (
    p_organization_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    coalesce(nullif(trim(p_subscription_status), ''), 'active')
  )
  on conflict (organization_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = coalesce(
          excluded.stripe_subscription_id,
          organization_stripe.stripe_subscription_id
        ),
        subscription_status = excluded.subscription_status,
        updated_at = now();
end;
$$;

revoke all on function public.link_organization_stripe_customer(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean
) to service_role;

grant execute on function public.link_organization_stripe_customer(uuid, text, text, text)
  to service_role;
