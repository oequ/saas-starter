-- Playground: organizations + members + RLS (read).
-- Optional permissive INSERT policies for local seeding — replace before production.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member" on public.organizations for select to authenticated using (
  exists (
    select 1
    from public.organization_members m
    where
      m.organization_id = organizations.id
      and m.user_id = auth.uid ()
  )
);

drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select" on public.organization_members for select to authenticated using (
  user_id = auth.uid ()
  or exists (
    select 1
    from public.organization_members m2
    where
      m2.organization_id = organization_members.organization_id
      and m2.user_id = auth.uid ()
  )
);

-- Playground-only: create orgs and add yourself as member via SQL or app.
drop policy if exists "dev_org_insert" on public.organizations;
create policy "dev_org_insert" on public.organizations for insert to authenticated with check (true);

drop policy if exists "dev_member_insert_self" on public.organization_members;
create policy "dev_member_insert_self" on public.organization_members for insert to authenticated with check (user_id = auth.uid ());
