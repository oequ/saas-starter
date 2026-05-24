-- 0010 · Organization API keys (hashed secrets, admin RPCs)

create extension if not exists pgcrypto with schema extensions;

create table public.organization_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  token_prefix text not null,
  key_hash text not null,
  permission text not null check (permission in ('full_access', 'sending_access')),
  domain_scope text not null default 'all_domains'
    check (domain_scope = 'all_domains'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index organization_api_keys_org_active_idx
  on public.organization_api_keys (organization_id)
  where revoked_at is null;

alter table public.organization_api_keys enable row level security;

grant select on public.organization_api_keys to authenticated;

drop policy if exists "org_api_keys_select_member" on public.organization_api_keys;
create policy "org_api_keys_select_member"
  on public.organization_api_keys
  for select
  to authenticated
  using (private.is_org_member(organization_id));

create or replace function public.list_organization_api_keys(p_organization_id uuid)
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

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', k.id,
          'organization_id', k.organization_id,
          'name', k.name,
          'token_prefix', k.token_prefix,
          'permission', k.permission,
          'domain_scope', k.domain_scope,
          'created_at', k.created_at,
          'last_used_at', k.last_used_at
        )
        order by k.created_at desc
      )
      from public.organization_api_keys k
      where k.organization_id = p_organization_id
        and k.revoked_at is null
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_organization_api_keys(uuid) from public, anon;
grant execute on function public.list_organization_api_keys(uuid) to authenticated;

create or replace function public.create_organization_api_key(
  p_organization_id uuid,
  p_name text,
  p_permission text,
  p_domain_scope text default 'all_domains'
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_name text := trim(p_name);
  v_permission text := trim(p_permission);
  v_domain_scope text := coalesce(nullif(trim(p_domain_scope), ''), 'all_domains');
  v_secret text;
  v_hash text;
  v_prefix text;
  v_row public.organization_api_keys;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 128 then
    raise exception 'api key name invalid' using errcode = '22023';
  end if;

  if v_permission not in ('full_access', 'sending_access') then
    raise exception 'api key permission invalid' using errcode = '22023';
  end if;

  if v_domain_scope <> 'all_domains' then
    raise exception 'api key domain scope invalid' using errcode = '22023';
  end if;

  v_secret := 'oeq_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := encode(extensions.digest(v_secret, 'sha256'), 'hex');
  v_prefix := left(v_secret, 12) || '…';

  insert into public.organization_api_keys (
    organization_id,
    name,
    token_prefix,
    key_hash,
    permission,
    domain_scope
  )
  values (
    p_organization_id,
    v_name,
    v_prefix,
    v_hash,
    v_permission,
    v_domain_scope
  )
  returning * into v_row;

  return jsonb_build_object(
    'key', jsonb_build_object(
      'id', v_row.id,
      'organization_id', v_row.organization_id,
      'name', v_row.name,
      'token_prefix', v_row.token_prefix,
      'permission', v_row.permission,
      'domain_scope', v_row.domain_scope,
      'created_at', v_row.created_at,
      'last_used_at', v_row.last_used_at
    ),
    'secret', v_secret
  );
end;
$$;

revoke all on function public.create_organization_api_key(uuid, text, text, text)
  from public, anon;
grant execute on function public.create_organization_api_key(uuid, text, text, text)
  to authenticated;

create or replace function public.revoke_organization_api_key(
  p_organization_id uuid,
  p_key_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.organization_api_keys k
     set revoked_at = now()
   where k.id = p_key_id
     and k.organization_id = p_organization_id
     and k.revoked_at is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'api key not found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.revoke_organization_api_key(uuid, uuid) from public, anon;
grant execute on function public.revoke_organization_api_key(uuid, uuid) to authenticated;
