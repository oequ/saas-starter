-- 0031 · OSS generic usage units + demo runs (public API metering primitive)

create table if not exists public.usage_unit_balances (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  available integer not null default 0 check (available >= 0),
  monthly_allowance integer not null default 0 check (monthly_allowance >= 0),
  reset_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  api_key_id uuid references public.organization_api_keys (id) on delete set null,
  event_type text not null,
  endpoint text not null,
  unit text not null default 'usage_unit',
  quantity integer not null default 1 check (quantity > 0),
  http_status integer,
  latency_ms integer,
  source text not null default 'public_api',
  metadata jsonb not null default '{}'::jsonb,
  run_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_org_created_idx
  on public.usage_events (org_id, created_at desc);

create table if not exists public.demo_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  api_key_id uuid references public.organization_api_keys (id) on delete set null,
  status text not null default 'completed'
    check (status in ('queued', 'running', 'completed', 'failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  units_charged integer not null default 1 check (units_charged > 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists demo_runs_org_created_idx
  on public.demo_runs (org_id, created_at desc);

alter table public.usage_events
  add constraint usage_events_run_id_fkey
  foreign key (run_id) references public.demo_runs (id) on delete set null;

insert into public.usage_unit_balances (org_id, available, monthly_allowance)
select o.id, 100, 100
  from public.organizations o
 on conflict (org_id) do nothing;

create or replace function public.get_org_usage_unit_balance(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_row public.usage_unit_balances%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row
    from public.usage_unit_balances b
   where b.org_id = p_org_id;

  if not found then
    return jsonb_build_object(
      'available', 0,
      'monthly_allowance', 0,
      'reset_at', null
    );
  end if;

  return jsonb_build_object(
    'available', v_row.available,
    'monthly_allowance', v_row.monthly_allowance,
    'reset_at', v_row.reset_at
  );
end;
$$;

revoke all on function public.get_org_usage_unit_balance(uuid) from public, anon;
grant execute on function public.get_org_usage_unit_balance(uuid) to authenticated;

create or replace function public.list_org_api_usage_events(
  p_org_id uuid,
  p_limit integer default 50,
  p_cursor timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          e.id,
          e.created_at,
          e.event_type,
          e.endpoint,
          e.unit,
          e.quantity,
          e.http_status,
          e.latency_ms,
          e.api_key_id,
          e.run_id
        from public.usage_events e
        where e.org_id = p_org_id
          and e.api_key_id is not null
          and (p_cursor is null or e.created_at < p_cursor)
        order by e.created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_api_usage_events(uuid, integer, timestamptz)
  from public, anon;
grant execute on function public.list_org_api_usage_events(uuid, integer, timestamptz)
  to authenticated;

create or replace function public.submit_public_demo_run(
  p_org_id uuid,
  p_api_key_id uuid,
  p_input jsonb default '{}'::jsonb,
  p_units integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_balance public.usage_unit_balances%rowtype;
  v_run public.demo_runs%rowtype;
  v_message text;
  v_output jsonb;
  v_event_id uuid;
begin
  if p_units < 1 then
    raise exception 'invalid units' using errcode = '22023';
  end if;

  select * into v_balance
    from public.usage_unit_balances b
   where b.org_id = p_org_id
     for update;

  if not found then
    raise exception 'usage unit balance not found' using errcode = 'P0001';
  end if;

  if v_balance.available < p_units then
    raise exception 'insufficient usage units' using errcode = 'P0001';
  end if;

  update public.usage_unit_balances
     set available = available - p_units,
         updated_at = now()
   where org_id = p_org_id;

  v_message := coalesce(nullif(trim(p_input ->> 'message'), ''), 'hello from demo run');

  v_output := jsonb_build_object(
    'echo', v_message,
    'processed_at', now(),
    'units_charged', p_units
  );

  insert into public.demo_runs (
    org_id,
    api_key_id,
    status,
    input,
    output,
    units_charged,
    completed_at
  )
  values (
    p_org_id,
    p_api_key_id,
    'completed',
    coalesce(p_input, '{}'::jsonb),
    v_output,
    p_units,
    now()
  )
  returning * into v_run;

  insert into public.usage_events (
    org_id,
    api_key_id,
    event_type,
    endpoint,
    unit,
    quantity,
    http_status,
    source,
    metadata,
    run_id
  )
  values (
    p_org_id,
    p_api_key_id,
    'demo_run',
    'POST /v1/demo-runs',
    'usage_unit',
    p_units,
    200,
    'public_api',
    jsonb_build_object('run_id', v_run.id),
    v_run.id
  )
  returning id into v_event_id;

  return jsonb_build_object(
    'id', v_run.id,
    'status', v_run.status,
    'output', v_run.output,
    'units_charged', v_run.units_charged,
    'usage_event_id', v_event_id
  );
end;
$$;

revoke all on function public.submit_public_demo_run(uuid, uuid, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.submit_public_demo_run(uuid, uuid, jsonb, integer)
  to service_role;

alter table public.usage_unit_balances enable row level security;
alter table public.usage_events enable row level security;
alter table public.demo_runs enable row level security;

revoke all on table public.usage_unit_balances from public, anon, authenticated;
revoke all on table public.usage_events from public, anon, authenticated;
revoke all on table public.demo_runs from public, anon, authenticated;

grant select, insert, update, delete on table public.usage_unit_balances to service_role;
grant select, insert, update, delete on table public.usage_events to service_role;
grant select, insert, update, delete on table public.demo_runs to service_role;

notify pgrst, 'reload schema';
