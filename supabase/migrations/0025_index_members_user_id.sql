-- #29 · Add index on organization_members(user_id)
--
-- The composite PK (organization_id, user_id) only helps lookups that
-- lead with organization_id.  RLS helpers (private.is_org_member,
-- private.is_org_admin, private.user_role_in_org), the JWT custom
-- access token hook, and Edge Function assertOrgAdmin all filter by
-- user_id alone.  Without a standalone index every authenticated API
-- call triggers a sequential scan on this table.

create index concurrently if not exists
  idx_organization_members_user_id
  on public.organization_members (user_id);
