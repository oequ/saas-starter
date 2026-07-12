-- 0033 · Block owner privilege escalation via direct member INSERT
--
-- UPDATE policy already forbids role = 'owner', but INSERT only checked
-- private.is_org_admin. An org admin could PostgREST-insert a co-owner and
-- seize workspace control without going through create_organization.
--
-- Fix:
-- 1. Column CHECK so role values stay in the known set (defense in depth).
-- 2. Align INSERT WITH CHECK with UPDATE: only 'admin' | 'member'.
--
-- Legitimate owner rows still come from security-definer RPCs
-- (create_organization, claim_my_invitations paths that insert owner only via
-- create_organization). Those bypass RLS; the CHECK still allows 'owner'.

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'member'));

drop policy if exists "org_members_insert_admin" on public.organization_members;
create policy "org_members_insert_admin"
  on public.organization_members
  for insert
  to authenticated
  with check (
    private.is_org_admin(organization_id)
    and role in ('admin', 'member')
  );
