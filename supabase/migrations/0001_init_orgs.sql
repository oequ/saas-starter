-- 0001 · Organizations + members (tenant tables) + RLS (read)
--
-- No permissive INSERT policies: local demo data comes from seed.sql (postgres role).
-- Authenticated users get SELECT only at the privilege layer; writes come in a later step.

create schema if not exists private;

comment on schema private is 'Security definer helpers (added in a later migration).';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Privilege layer: authenticated may only read these tables (RLS still filters rows).
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member"
  on public.organizations
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.organization_members m
       where m.organization_id = organizations.id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select"
  on public.organization_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
        from public.organization_members m2
       where m2.organization_id = organization_members.organization_id
         and m2.user_id = auth.uid()
    )
  );
