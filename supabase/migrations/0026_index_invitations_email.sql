-- #30 · Add index on organization_invitations(email)
--
-- Claim flows (claim_my_invitations, handle_auth_user_claim_invitations)
-- and invite_organization_member filter by email alone.  The existing
-- unique constraint on (organization_id, email) does not cover
-- email-only lookups — every signup / login claim triggers a full scan.

create index concurrently if not exists
  idx_organization_invitations_email
  on public.organization_invitations (email);
