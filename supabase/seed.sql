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

insert into public.organization_activation (organization_id, status, completed_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'complete',
  now()
)
on conflict (organization_id) do update
  set status = 'complete',
      completed_at = coalesce(organization_activation.completed_at, now());

-- OSS public API sandbox quota (see docs/PUBLIC_API.md, ADR 0004)
insert into public.usage_unit_balances (org_id, available, monthly_allowance)
values (
  '00000000-0000-4000-8000-000000000001',
  100,
  100
)
on conflict (org_id) do update
  set available = excluded.available,
      monthly_allowance = excluded.monthly_allowance;
