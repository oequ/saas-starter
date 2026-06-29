-- 0029 · Service role access for public API Edge + smoke tests

grant select, insert, update on table public.organization_api_keys to service_role;
grant select, insert, update on table public.organization_members to service_role;
grant select, insert, update on table public.organization_projects to service_role;
grant select, insert, update on table public.project_members to service_role;

notify pgrst, 'reload schema';
