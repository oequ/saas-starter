-- 0022 · Count queued emails in billing quota (M2 security fix)
--
-- org_billable_email_count excluded status='queued', and
-- simulate_outbound_emails skipped quota checks for queued records.
-- A user could insert unlimited queued records bypassing the quota.
-- Fix: include queued in the count and remove the bypass branch.

-- 1. Count all non-failed statuses (delivered, bounced, queued)
create or replace function private.org_billable_email_count(
  p_organization_id uuid,
  p_since timestamptz default null
)
returns integer
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::integer
    from public.outbound_emails e
   where e.organization_id = p_organization_id
     and e.status <> 'failed'
     and (p_since is null or e.sent_at >= p_since);
$$;

-- 2. Recreate simulate_outbound_emails without the queued bypass
create or replace function public.simulate_outbound_emails(
  p_organization_id uuid,
  p_input jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id text;
  v_monthly_limit integer;
  v_daily_limit integer;
  v_month_start timestamptz;
  v_monthly_count integer;
  v_today_count integer;
  v_records jsonb;
  v_record jsonb;
  v_idx integer;
  v_allowed jsonb := '[]'::jsonb;
  v_created jsonb := '[]'::jsonb;
  v_row public.outbound_emails;
  v_default_subject text := coalesce(nullif(trim(p_input->>'subject'), ''), 'Welcome — your account is ready');
  v_default_to text := coalesce(nullif(trim(p_input->>'to'), ''), 'customer@example.com');
  v_count integer;
  v_api_key_id uuid;
  v_api_key_label text;
  v_status text;
  v_sent_at timestamptz;
  v_subject text;
  v_to text;
  v_capped boolean := false;
  v_requested integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select o.plan_id into v_plan_id
    from public.organizations o
   where o.id = p_organization_id;

  if v_plan_id is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  select q.monthly_limit, q.daily_limit
    into v_monthly_limit, v_daily_limit
    from private.email_quota_for_plan(v_plan_id) q;

  v_month_start := date_trunc('month', now() at time zone 'utc');
  v_monthly_count := private.org_billable_email_count(p_organization_id, v_month_start);
  v_today_count := private.org_billable_emails_today(p_organization_id);

  v_records := p_input->'records';
  if v_records is null or jsonb_typeof(v_records) <> 'array' then
    v_count := least(greatest(coalesce((p_input->>'count')::integer, 8), 1), 50);
    v_records := (
      select jsonb_agg(
        jsonb_build_object(
          'sent_at', (now() - (g.i * interval '45 seconds'))::text,
          'status', 'delivered',
          'subject', v_default_subject,
          'to', v_default_to
        )
      )
      from generate_series(0, v_count - 1) as g(i)
    );
  end if;

  v_requested := jsonb_array_length(v_records);

  select k.id, k.name
    into v_api_key_id, v_api_key_label
    from public.organization_api_keys k
   where k.organization_id = p_organization_id
     and k.revoked_at is null
   order by k.created_at asc
   limit 1;

  for v_idx in 0 .. v_requested - 1 loop
    v_record := v_records->v_idx;
    v_status := coalesce(nullif(trim(v_record->>'status'), ''), 'delivered');
    if v_status not in ('delivered', 'bounced', 'queued', 'failed') then
      v_status := 'delivered';
    end if;

    if v_status <> 'failed' then
      if v_monthly_limit is not null and v_monthly_count >= v_monthly_limit then
        v_capped := true;
        exit;
      end if;

      if v_daily_limit is not null and v_today_count >= v_daily_limit then
        v_capped := true;
        exit;
      end if;
    end if;

    v_allowed := v_allowed || jsonb_build_array(v_record);

    if v_status <> 'failed' then
      v_monthly_count := v_monthly_count + 1;
      v_today_count := v_today_count + 1;
    end if;
  end loop;

  if jsonb_array_length(v_allowed) = 0 then
    if v_monthly_limit is not null
       and private.org_billable_email_count(p_organization_id, v_month_start) >= v_monthly_limit then
      raise exception 'monthly email quota exceeded' using errcode = 'P0001';
    end if;
    if v_daily_limit is not null
       and private.org_billable_emails_today(p_organization_id) >= v_daily_limit then
      raise exception 'daily email quota exceeded' using errcode = 'P0001';
    end if;
    raise exception 'email quota exceeded' using errcode = 'P0001';
  end if;

  for v_idx in 0 .. jsonb_array_length(v_allowed) - 1 loop
    v_record := v_allowed->v_idx;
    v_status := coalesce(nullif(trim(v_record->>'status'), ''), 'delivered');
    v_sent_at := coalesce((v_record->>'sent_at')::timestamptz, now());
    v_subject := coalesce(nullif(trim(v_record->>'subject'), ''), v_default_subject);
    v_to := coalesce(nullif(trim(v_record->>'to'), ''), v_default_to);

    insert into public.outbound_emails (
      organization_id,
      recipient_email,
      subject,
      status,
      sent_at,
      api_key_id
    )
    values (
      p_organization_id,
      v_to,
      v_subject,
      v_status,
      v_sent_at,
      v_api_key_id
    )
    returning * into v_row;

    v_created := v_created || jsonb_build_array(
      jsonb_build_object(
        'id', v_row.id,
        'organizationId', v_row.organization_id,
        'to', v_row.recipient_email,
        'subject', v_row.subject,
        'status', v_row.status,
        'sentAt', v_row.sent_at,
        'apiKeyId', v_row.api_key_id,
        'apiKeyLabel', v_api_key_label
      )
    );
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'totalSent', private.org_billable_email_count(p_organization_id, null),
    'quotaLimit', v_monthly_limit,
    'requestedCount', v_requested,
    'capped', v_capped or jsonb_array_length(v_allowed) < v_requested
  );
end;
$$;

revoke all on function public.simulate_outbound_emails(uuid, jsonb) from public, anon;
grant execute on function public.simulate_outbound_emails(uuid, jsonb) to authenticated;
