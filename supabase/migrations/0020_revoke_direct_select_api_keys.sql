-- 0020 · Revoke direct SELECT on organization_api_keys (D4 security fix)
--
-- The table has a key_hash column.  Direct SELECT via PostgREST would
-- expose it to any org member.  All application access goes through
-- list_organization_api_keys RPC (security definer, row_security = off)
-- which never returns key_hash.  Revoke the direct grant.

revoke select on public.organization_api_keys from authenticated;

drop policy if exists "org_api_keys_select_member" on public.organization_api_keys;
