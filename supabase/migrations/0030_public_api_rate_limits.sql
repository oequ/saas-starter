-- 0030 · Public API per-key rate limits (fixed 1-minute windows, service role only)

create table public.api_rate_limit_windows (
  api_key_id uuid not null
    references public.organization_api_keys (id) on delete cascade,
  route_class text not null
    check (route_class in ('read', 'write')),
  window_start timestamptz not null,
  request_count integer not null default 0
    check (request_count >= 0),
  primary key (api_key_id, route_class, window_start)
);

create index api_rate_limit_windows_window_start_idx
  on public.api_rate_limit_windows (window_start);

comment on table public.api_rate_limit_windows is
  'Per API key request counts per UTC minute (read vs write buckets).';

alter table public.api_rate_limit_windows enable row level security;

create or replace function public.consume_public_api_rate_limit(
  p_api_key_id uuid,
  p_route_class text,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
  v_retry_after integer;
begin
  if p_api_key_id is null then
    return jsonb_build_object('ok', true);
  end if;

  if p_route_class is null or p_route_class not in ('read', 'write') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_route_class');
  end if;

  if p_limit is null or p_limit <= 0 then
    return jsonb_build_object('ok', true, 'unlimited', true);
  end if;

  delete from public.api_rate_limit_windows
   where window_start < now() - interval '3 hours';

  insert into public.api_rate_limit_windows (
    api_key_id,
    route_class,
    window_start,
    request_count
  ) values (
    p_api_key_id,
    p_route_class,
    v_window,
    1
  )
  on conflict (api_key_id, route_class, window_start)
  do update
    set request_count = public.api_rate_limit_windows.request_count + 1
  returning request_count into v_count;

  if v_count > p_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_window + interval '1 minute' - now())))::integer
    );
    return jsonb_build_object(
      'ok', false,
      'reason', 'rate_limit_exceeded',
      'limit', p_limit,
      'count', v_count,
      'retry_after_seconds', v_retry_after
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'limit', p_limit,
    'count', v_count,
    'remaining', greatest(p_limit - v_count, 0)
  );
end;
$$;

comment on function public.consume_public_api_rate_limit(uuid, text, integer) is
  'Increments per-minute counter for API key; returns ok=false when limit exceeded.';

revoke all on function public.consume_public_api_rate_limit(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_api_rate_limit(uuid, text, integer)
  to service_role;

grant select, insert, update, delete on table public.api_rate_limit_windows to service_role;

notify pgrst, 'reload schema';
