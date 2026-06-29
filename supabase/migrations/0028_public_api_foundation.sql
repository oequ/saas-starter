-- 0028 · Public REST API foundation (service-role RPCs)

-- verify_organization_api_key: Bearer secret → org + key metadata (no plaintext storage).
-- ensure_api_project: idempotent default project for API workloads (slug api-default).

-- ---------------------------------------------------------------------------
-- verify_organization_api_key
-- ---------------------------------------------------------------------------

create or replace function public.verify_organization_api_key(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
set row_security = off
as $$
declare
  v_secret text := trim(p_secret);
  v_hash text;
  v_row public.organization_api_keys;
  v_can_write boolean;
begin
  if v_secret is null or v_secret = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_secret');
  end if;

  if not v_secret like 'oeq\_%' escape '\' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_prefix');
  end if;

  if char_length(v_secret) < 16 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_secret');
  end if;

  v_hash := encode(extensions.digest(v_secret, 'sha256'), 'hex');

  select *
    into v_row
    from public.organization_api_keys k
   where k.key_hash = v_hash
     and k.revoked_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_can_write := v_row.permission = 'full_access';

  update public.organization_api_keys k
     set last_used_at = now()
   where k.id = v_row.id;

  return jsonb_build_object(
    'ok', true,
    'key_id', v_row.id,
    'organization_id', v_row.organization_id,
    'permission', v_row.permission,
    'can_write', v_can_write,
    'can_read', true
  );
end;
$$;

comment on function public.verify_organization_api_key(text) is
  'Validates oeq_* API key secret (SHA-256). Service role only. Updates last_used_at on success.';

revoke all on function public.verify_organization_api_key(text) from public, anon, authenticated;
grant execute on function public.verify_organization_api_key(text) to service_role;

-- ---------------------------------------------------------------------------
-- ensure_api_project
-- ---------------------------------------------------------------------------

create or replace function public.ensure_api_project(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_row public.organization_projects;
  v_owner uuid;
begin
  if p_organization_id is null then
    raise exception 'organization_id required' using errcode = '22023';
  end if;

  select p.*
    into v_row
    from public.organization_projects p
   where p.organization_id = p_organization_id
     and p.slug = 'api-default';

  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'project', jsonb_build_object(
        'id', v_row.id,
        'organization_id', v_row.organization_id,
        'name', v_row.name,
        'slug', v_row.slug
      )
    );
  end if;

  select m.user_id
    into v_owner
    from public.organization_members m
   where m.organization_id = p_organization_id
     and m.role in ('owner', 'admin')
   order by case m.role when 'owner' then 0 else 1 end, m.created_at
   limit 1;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'reason', 'no_org_admin');
  end if;

  insert into public.organization_projects (
    organization_id,
    name,
    slug,
    description,
    created_by
  )
  values (
    p_organization_id,
    'API',
    'api-default',
    'Default workspace for REST API workloads',
    v_owner
  )
  returning * into v_row;

  insert into public.project_members (project_id, user_id, role)
  values (v_row.id, v_owner, 'owner')
  on conflict (project_id, user_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'project', jsonb_build_object(
      'id', v_row.id,
      'organization_id', v_row.organization_id,
      'name', v_row.name,
      'slug', v_row.slug
    )
  );
end;
$$;

comment on function public.ensure_api_project(uuid) is
  'Returns org default API project (slug api-default), creating it if missing. Service role only.';

revoke all on function public.ensure_api_project(uuid) from public, anon, authenticated;
grant execute on function public.ensure_api_project(uuid) to service_role;
