-- Local dev seed (runs as superuser on `supabase db reset` — bypasses RLS).
-- Creates the demo org. Membership is linked after you sign up (see supabase/README.md).

insert into public.organizations (id, slug, name)
values (
  '00000000-0000-4000-8000-000000000001',
  'demo',
  'Demo Organization'
)
on conflict (slug) do update
  set name = excluded.name;
