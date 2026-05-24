-- 0013 · Provider-agnostic billing mirror (Stripe today; custom / YooKassa later)

create table public.organization_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  provider text not null,
  external_customer_id text not null,
  external_subscription_id text,
  subscription_status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_billing_provider_customer_unique
    unique (provider, external_customer_id),
  constraint organization_billing_provider_subscription_unique
    unique (provider, external_subscription_id)
);

create index organization_billing_provider_subscription_idx
  on public.organization_billing (provider, external_subscription_id)
  where external_subscription_id is not null;

alter table public.organization_billing enable row level security;

grant select on public.organization_billing to authenticated;

drop policy if exists "org_billing_select_member" on public.organization_billing;
create policy "org_billing_select_member"
  on public.organization_billing
  for select
  to authenticated
  using (private.is_org_member(organization_id));

insert into public.organization_billing (
  organization_id,
  provider,
  external_customer_id,
  external_subscription_id,
  subscription_status,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
select
  organization_id,
  'stripe',
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
from public.organization_stripe;

alter table public.billing_events
  add column if not exists provider text;

update public.billing_events
   set provider = 'stripe'
 where provider is null;

alter table public.billing_events
  alter column provider set not null;

alter table public.billing_events
  rename column stripe_event_id to external_event_id;

alter table public.billing_events
  drop constraint if exists billing_events_pkey;

alter table public.billing_events
  add primary key (provider, external_event_id);

create or replace function public.apply_billing_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_provider text,
  p_external_customer_id text,
  p_external_subscription_id text,
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
  v_provider text := lower(trim(p_provider));
  v_row public.organizations;
begin
  if v_plan_id not in ('free', 'pro', 'team') then
    raise exception 'invalid plan id' using errcode = '22023';
  end if;

  if v_provider = '' then
    raise exception 'billing provider required' using errcode = '22023';
  end if;

  update public.organizations o
     set plan_id = v_plan_id,
         seats_limit = private.seat_limit_for_plan(v_plan_id)
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
    p_external_customer_id,
    p_external_subscription_id,
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
  p_cancel_at_period_end boolean
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
    p_cancel_at_period_end
  );
$$;

create or replace function public.link_organization_billing_provider(
  p_organization_id uuid,
  p_provider text,
  p_external_customer_id text,
  p_external_subscription_id text default null,
  p_subscription_status text default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_provider text := lower(trim(p_provider));
begin
  if v_provider = '' then
    raise exception 'billing provider required' using errcode = '22023';
  end if;

  insert into public.organization_billing (
    organization_id,
    provider,
    external_customer_id,
    external_subscription_id,
    subscription_status
  )
  values (
    p_organization_id,
    v_provider,
    p_external_customer_id,
    p_external_subscription_id,
    coalesce(nullif(trim(p_subscription_status), ''), 'active')
  )
  on conflict (organization_id) do update
    set provider = excluded.provider,
        external_customer_id = excluded.external_customer_id,
        external_subscription_id = coalesce(
          excluded.external_subscription_id,
          organization_billing.external_subscription_id
        ),
        subscription_status = excluded.subscription_status,
        updated_at = now();
end;
$$;

create or replace function public.link_organization_stripe_customer(
  p_organization_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text default null,
  p_subscription_status text default 'active'
)
returns void
language sql
security definer
set search_path = public
as $$
  select public.link_organization_billing_provider(
    p_organization_id,
    'stripe',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_status
  );
$$;

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
  v_billing public.organization_billing;
  v_plan_id text;
  v_month_start timestamptz;
  v_emails_month integer;
  v_emails_today integer;
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

  select * into v_billing
    from public.organization_billing b
   where b.organization_id = p_organization_id;

  v_plan_id := v_row.plan_id;
  v_month_start := date_trunc('month', now() at time zone 'utc');
  v_emails_month := private.org_billable_email_count(p_organization_id, v_month_start);
  v_emails_today := private.org_billable_emails_today(p_organization_id);

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id),
    'subscription_status', coalesce(v_billing.subscription_status, 'none'),
    'current_period_end', v_billing.current_period_end,
    'cancel_at_period_end', coalesce(v_billing.cancel_at_period_end, false),
    'billing_provider', coalesce(v_billing.provider, 'none'),
    'has_billing_customer', v_billing.external_customer_id is not null,
    'has_stripe_customer',
      v_billing.provider = 'stripe' and v_billing.external_customer_id is not null,
    'emails_used_month', v_emails_month,
    'emails_used_today', v_emails_today,
    'emails_monthly_limit', (select monthly_limit from private.email_quota_for_plan(v_plan_id)),
    'emails_daily_limit', (select daily_limit from private.email_quota_for_plan(v_plan_id))
  );
end;
$$;

revoke all on function public.apply_billing_subscription(
  uuid, text, text, text, text, text, timestamptz, boolean
) from public, anon, authenticated;

revoke all on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean
) from public, anon, authenticated;

revoke all on function public.link_organization_billing_provider(uuid, text, text, text, text)
  from public, anon, authenticated;

revoke all on function public.link_organization_stripe_customer(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_billing_subscription(
  uuid, text, text, text, text, text, timestamptz, boolean
) to service_role;

grant execute on function public.apply_stripe_subscription(
  uuid, text, text, text, text, timestamptz, boolean
) to service_role;

grant execute on function public.link_organization_billing_provider(uuid, text, text, text, text)
  to service_role;

grant execute on function public.link_organization_stripe_customer(uuid, text, text, text)
  to service_role;

drop table public.organization_stripe;
