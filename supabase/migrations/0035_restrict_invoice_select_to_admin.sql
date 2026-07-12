-- 0035 · Restrict organization_invoices SELECT to org admins
--
-- Migration 0023 already gates list_organization_invoices RPC to
-- private.is_org_admin. Direct PostgREST SELECT still used
-- org_invoices_select_member (any member), so invoice amounts/PDF URLs
-- leaked to non-admins via /rest/v1/organization_invoices.

drop policy if exists "org_invoices_select_member" on public.organization_invoices;

drop policy if exists "org_invoices_select_admin" on public.organization_invoices;
create policy "org_invoices_select_admin"
  on public.organization_invoices
  for select
  to authenticated
  using (private.is_org_admin(organization_id));

comment on table public.organization_invoices is
  'Provider invoice mirror; SELECT limited to org owner/admin (RPC list_organization_invoices matches).';
