-- 0006 · Allow authenticated role to invoke private helpers used in RLS policies

grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;
