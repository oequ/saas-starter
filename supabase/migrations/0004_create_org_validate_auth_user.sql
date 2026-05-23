-- 0004 · Clearer create_organization when JWT uid is missing from auth.users (e.g. after db reset)

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

  return v_org;
exception
  when unique_violation then
    raise exception 'workspace slug taken' using errcode = '23505';
end;
$$;
