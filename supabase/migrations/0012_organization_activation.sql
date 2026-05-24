-- 0012 · Workspace activation status (onboarding gate)

create table public.organization_activation (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  status text not null check (status in ('pending', 'complete')),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.organization_activation enable row level security;

grant select on public.organization_activation to authenticated;

drop policy if exists "org_activation_select_member" on public.organization_activation;
create policy "org_activation_select_member"
  on public.organization_activation
  for select
  to authenticated
  using (private.is_org_member(organization_id));

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

  insert into public.organization_activation (organization_id, status)
  values (v_org.id, 'pending')
  on conflict (organization_id) do nothing;

  return v_org;
exception
  when unique_violation then
    raise exception 'workspace slug taken' using errcode = '23505';
end;
$$;

create or replace function public.get_organization_activation_status(p_organization_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select a.status into v_status
    from public.organization_activation a
   where a.organization_id = p_organization_id;

  return coalesce(v_status, 'pending');
end;
$$;

revoke all on function public.get_organization_activation_status(uuid) from public, anon;
grant execute on function public.get_organization_activation_status(uuid) to authenticated;

create or replace function public.mark_organization_activation_complete(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.organization_activation (
    organization_id,
    status,
    completed_at,
    updated_at
  )
  values (p_organization_id, 'complete', now(), now())
  on conflict (organization_id) do update
    set status = 'complete',
        completed_at = coalesce(organization_activation.completed_at, now()),
        updated_at = now();
end;
$$;

revoke all on function public.mark_organization_activation_complete(uuid) from public, anon;
grant execute on function public.mark_organization_activation_complete(uuid) to authenticated;
