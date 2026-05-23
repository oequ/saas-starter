-- 0005 · Fix infinite recursion between organizations ↔ organization_members RLS
--
-- orgs_select_member queried organization_members; org_members_select queried
-- organization_members again inside EXISTS → PostgreSQL 42P17.
-- Use security-definer helpers with row_security = off for membership checks.

create or replace function private.user_role_in_org(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
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
set row_security = off
as $$
  select private.user_role_in_org(p_organization_id) is not null;
$$;

create or replace function private.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select private.user_role_in_org(p_organization_id) in ('owner', 'admin');
$$;

create or replace function private.is_org_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select private.user_role_in_org(p_organization_id) = 'owner';
$$;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member"
  on public.organizations
  for select
  to authenticated
  using (private.is_org_member(id));

drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select"
  on public.organization_members
  for select
  to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists "org_members_update_admin" on public.organization_members;
create policy "org_members_update_admin"
  on public.organization_members
  for update
  to authenticated
  using (
    private.is_org_admin(organization_id)
    and role <> 'owner'
  )
  with check (
    private.is_org_admin(organization_id)
    and role in ('admin', 'member')
  );

-- RLS policy expressions run as `authenticated`; EXECUTE required (schema stays private).
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;
