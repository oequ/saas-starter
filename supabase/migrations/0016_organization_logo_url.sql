-- 0016 · Workspace logo (data URL stored on organizations)

alter table public.organizations
  add column if not exists logo_url text;

comment on column public.organizations.logo_url is
  'Workspace icon: data URL (data:image/...) or null. Set via authenticated UPDATE (admin/owner).';
