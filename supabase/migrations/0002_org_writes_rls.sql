-- 0002 · Org writes, invitations, JWT org claim hook
--
-- Adds security-definer RPCs (no permissive INSERT policies), member/admin RLS,
-- pending invitations, and custom_access_token_hook (active_org_slug in user_metadata).

-- ---------------------------------------------------------------------------
-- private helpers (security definer; not exposed to API)
-- ---------------------------------------------------------------------------

create or replace function private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function private.user_role_in_org(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
    from public.organization_members m
   where m.organization_id = p_organization_id
     and m.user_id = auth.uid()
   limit 1;
$$;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.user_role_in_org(p_organization_id) is not null;
$$;

create or replace function private.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.user_role_in_org(p_organization_id) in ('owner', 'admin');
$$;

create or replace function private.is_org_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.user_role_in_org(p_organization_id) = 'owner';
$$;

revoke all on function private.current_user_id() from public, anon, authenticated;
revoke all on function private.user_role_in_org(uuid) from public, anon, authenticated;
revoke all on function private.is_org_member(uuid) from public, anon, authenticated;
revoke all on function private.is_org_admin(uuid) from public, anon, authenticated;
revoke all on function private.is_org_owner(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pending invitations (email not yet linked to auth.users)
-- ---------------------------------------------------------------------------

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint organization_invitations_role_check
    check (role in ('admin', 'member')),
  constraint organization_invitations_email_lower check (email = lower(email)),
  unique (organization_id, email)
);

alter table public.organization_invitations enable row level security;

grant select, insert, delete on public.organization_invitations to authenticated;

drop policy if exists "org_invites_select_member" on public.organization_invitations;
create policy "org_invites_select_member"
  on public.organization_invitations
  for select
  to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists "org_invites_insert_admin" on public.organization_invitations;
create policy "org_invites_insert_admin"
  on public.organization_invitations
  for insert
  to authenticated
  with check (
    private.is_org_admin(organization_id)
    and invited_by = auth.uid()
    and role in ('admin', 'member')
  );

drop policy if exists "org_invites_delete_admin" on public.organization_invitations;
create policy "org_invites_delete_admin"
  on public.organization_invitations
  for delete
  to authenticated
  using (private.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Table write grants + RLS (organizations: no direct INSERT — use RPC)
-- ---------------------------------------------------------------------------

grant update on public.organizations to authenticated;
grant insert, update, delete on public.organization_members to authenticated;

drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin"
  on public.organizations
  for update
  to authenticated
  using (private.is_org_admin(id))
  with check (private.is_org_admin(id));

drop policy if exists "org_members_insert_admin" on public.organization_members;
create policy "org_members_insert_admin"
  on public.organization_members
  for insert
  to authenticated
  with check (private.is_org_admin(organization_id));

drop policy if exists "org_members_update_admin" on public.organization_members;
create policy "org_members_update_admin"
  on public.organization_members
  for update
  to authenticated
  using (private.is_org_admin(organization_id))
  with check (
    private.is_org_admin(organization_id)
    and role in ('admin', 'member')
    and not exists (
      select 1
        from public.organization_members existing
       where existing.organization_id = organization_members.organization_id
         and existing.user_id = organization_members.user_id
         and existing.role = 'owner'
    )
  );

drop policy if exists "org_members_delete_admin" on public.organization_members;
create policy "org_members_delete_admin"
  on public.organization_members
  for delete
  to authenticated
  using (
    private.is_org_admin(organization_id)
    and role <> 'owner'
  );

-- ---------------------------------------------------------------------------
-- RPC: create workspace (org + owner membership)
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_uid uuid := auth.uid();
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 64 then
    raise exception 'workspace name invalid' using errcode = '22023';
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(v_slug) < 2
     or char_length(v_slug) > 48 then
    raise exception 'workspace slug invalid' using errcode = '22023';
  end if;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  return v_org;
exception
  when unique_violation then
    raise exception 'workspace slug taken' using errcode = '23505';
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: invite by email (existing auth user → member row; else invitation)
-- ---------------------------------------------------------------------------

create or replace function public.invite_organization_member(
  p_organization_id uuid,
  p_email text,
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_role text := lower(trim(p_role));
  v_inviter uuid := auth.uid();
  v_user_id uuid;
  v_member public.organization_members;
begin
  if v_inviter is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'invalid invite email' using errcode = '22023';
  end if;

  if v_role not in ('admin', 'member') then
    raise exception 'invalid member role' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.organization_invitations i
     where i.organization_id = p_organization_id and i.email = v_email
  ) then
    raise exception 'invite conflict' using errcode = '23505';
  end if;

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = v_email
   limit 1;

  if v_user_id is not null then
    if exists (
      select 1 from public.organization_members m
       where m.organization_id = p_organization_id and m.user_id = v_user_id
    ) then
      raise exception 'invite conflict' using errcode = '23505';
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (p_organization_id, v_user_id, v_role)
    returning * into v_member;

    return jsonb_build_object(
      'kind', 'member',
      'organization_id', v_member.organization_id,
      'user_id', v_member.user_id,
      'role', v_member.role,
      'email', v_email,
      'status', 'active'
    );
  end if;

  insert into public.organization_invitations (organization_id, email, role, invited_by)
  values (p_organization_id, v_email, v_role, v_inviter);

  return jsonb_build_object(
    'kind', 'invitation',
    'organization_id', p_organization_id,
    'email', v_email,
    'role', v_role,
    'status', 'invited'
  );
end;
$$;

revoke all on function public.invite_organization_member(uuid, text, text) from public, anon;
grant execute on function public.invite_organization_member(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Auth hook: embed app_metadata.org from active_org_slug (user_metadata)
-- ---------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims jsonb;
  v_user_id uuid;
  v_slug text;
  v_org_id uuid;
  v_role text;
begin
  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_user_id := nullif(event->>'user_id', '')::uuid;

  if v_user_id is null then
    return jsonb_build_object('claims', v_claims);
  end if;

  v_slug := nullif(trim(both from coalesce(
    v_claims->'user_metadata'->>'active_org_slug',
    ''
  )), '');

  if v_slug is null then
    return jsonb_build_object('claims', v_claims);
  end if;

  select o.id, m.role
    into v_org_id, v_role
    from public.organizations o
    join public.organization_members m
      on m.organization_id = o.id
     and m.user_id = v_user_id
   where o.slug = v_slug
   limit 1;

  if v_org_id is null then
    return jsonb_build_object('claims', v_claims);
  end if;

  v_claims := jsonb_set(
    v_claims,
    '{app_metadata,org}',
    jsonb_build_object(
      'organization_id', v_org_id,
      'role', v_role
    ),
    true
  );

  return jsonb_build_object('claims', v_claims);
end;
$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

grant usage on schema public to supabase_auth_admin;
grant select on table public.organizations to supabase_auth_admin;
grant select on table public.organization_members to supabase_auth_admin;
