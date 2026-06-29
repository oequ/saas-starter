-- 0032 · Seed usage unit balance on workspace create; harden ensure_api_project races

-- ---------------------------------------------------------------------------
-- create_organization: starter sandbox quota for new workspaces
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org public.organizations;
  v_uid uuid := auth.uid();
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_starter_usage_units integer := 100;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from auth.users u where u.id = v_uid) then
    raise exception 'session stale: sign out and sign in again' using errcode = '28000';
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

  insert into public.organization_activation (organization_id, status)
  values (v_org.id, 'pending')
  on conflict (organization_id) do nothing;

  insert into public.usage_unit_balances (org_id, available, monthly_allowance)
  values (v_org.id, v_starter_usage_units, v_starter_usage_units)
  on conflict (org_id) do nothing;

  return v_org;
exception
  when unique_violation then
    raise exception 'workspace slug taken' using errcode = '23505';
end;
$$;

-- ---------------------------------------------------------------------------
-- ensure_api_project: tolerate concurrent api-default creation
-- ---------------------------------------------------------------------------

create or replace function public.ensure_api_project(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_row public.organization_projects;
  v_owner uuid;
begin
  if p_organization_id is null then
    raise exception 'organization_id required' using errcode = '22023';
  end if;

  select p.*
    into v_row
    from public.organization_projects p
   where p.organization_id = p_organization_id
     and p.slug = 'api-default';

  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'project', jsonb_build_object(
        'id', v_row.id,
        'organization_id', v_row.organization_id,
        'name', v_row.name,
        'slug', v_row.slug
      )
    );
  end if;

  select m.user_id
    into v_owner
    from public.organization_members m
   where m.organization_id = p_organization_id
     and m.role in ('owner', 'admin')
   order by case m.role when 'owner' then 0 else 1 end, m.created_at
   limit 1;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'reason', 'no_org_admin');
  end if;

  begin
    insert into public.organization_projects (
      organization_id,
      name,
      slug,
      description,
      created_by
    )
    values (
      p_organization_id,
      'API',
      'api-default',
      'Default workspace for REST API workloads',
      v_owner
    )
    returning * into v_row;

    insert into public.project_members (project_id, user_id, role)
    values (v_row.id, v_owner, 'owner')
    on conflict (project_id, user_id) do nothing;
  exception
    when unique_violation then
      select p.*
        into v_row
        from public.organization_projects p
       where p.organization_id = p_organization_id
         and p.slug = 'api-default';

      if not found then
        raise;
      end if;
  end;

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'project', jsonb_build_object(
      'id', v_row.id,
      'organization_id', v_row.organization_id,
      'name', v_row.name,
      'slug', v_row.slug
    )
  );
end;
$$;

notify pgrst, 'reload schema';
