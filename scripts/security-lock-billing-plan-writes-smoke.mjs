#!/usr/bin/env node
/**
 * Security smoke: billing plan/seat writes must not be client-bypassable.
 *
 * Prerequisites: npm run db:start && npm run db:reset
 *
 * Regression for migration 0034_lock_billing_plan_writes.
 */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function readSupabaseStatus() {
  try {
    const out = execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(out);
  } catch {
    return {};
  }
}

function envValue(key) {
  const raw = process.env[key];
  if (raw == null) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

const status = readSupabaseStatus();
const url = (
  envValue('SUPABASE_URL') ||
  status.API_URL ||
  status.APIUrl ||
  'http://127.0.0.1:54321'
).replace(/\/$/, '');
const serviceRoleKey =
  envValue('SUPABASE_SERVICE_ROLE_KEY') ||
  status.SERVICE_ROLE_KEY ||
  status.service_role_key ||
  status.SECRET_KEY ||
  status.secret_key ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const anonKey =
  envValue('SUPABASE_ANON_KEY') ||
  status.ANON_KEY ||
  status.anon_key ||
  status.PUBLISHABLE_KEY ||
  status.publishable_key ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const stamp = Date.now();
const OWNER_EMAIL = `billing-lock-smoke-${stamp}@local.invalid`;
const PASSWORD = 'OequSecuritySmoke2026!';

function fail(message) {
  console.error(`security-lock-billing-plan-writes-smoke: FAIL — ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function main() {
  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
  if (createError || !created.user) {
    fail(`createUser: ${createError?.message ?? 'no user'}`);
  }

  const ownerClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await ownerClient.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: PASSWORD,
  });
  if (signInError) fail(`sign-in: ${signInError.message}`);

  const slug = `billing-lock-${stamp}`;
  const { data: org, error: createOrgError } = await ownerClient.rpc(
    'create_organization',
    { p_name: `Billing Lock ${stamp}`, p_slug: slug },
  );
  if (createOrgError || !org?.id) {
    fail(`create_organization: ${createOrgError?.message ?? 'missing id'}`);
  }
  const organizationId = org.id;

  const { error: patchError } = await ownerClient
    .from('organizations')
    .update({ plan_id: 'team', seats_limit: 50 })
    .eq('id', organizationId);
  assert(
    patchError != null,
    'authenticated PATCH of plan_id/seats_limit must be rejected',
  );

  const { data: afterPatch, error: readError } = await service
    .from('organizations')
    .select('plan_id, seats_limit, name')
    .eq('id', organizationId)
    .single();
  if (readError) fail(`read org: ${readError.message}`);
  assert(afterPatch.plan_id === 'free', 'plan_id must remain free after PATCH');
  assert(
    Number(afterPatch.seats_limit) === 3,
    'seats_limit must remain free-plan default after PATCH',
  );

  const { error: rpcError } = await ownerClient.rpc('update_organization_plan', {
    p_organization_id: organizationId,
    p_plan_id: 'pro',
    p_seats_limit: null,
  });
  assert(
    rpcError != null,
    'authenticated update_organization_plan must be rejected',
  );

  const { error: nameError } = await ownerClient
    .from('organizations')
    .update({ name: `Billing Lock Renamed ${stamp}` })
    .eq('id', organizationId);
  if (nameError) {
    fail(`name update should still work: ${nameError.message}`);
  }

  const { data: serviceSync, error: serviceSyncError } = await service.rpc(
    'update_organization_plan',
    {
      p_organization_id: organizationId,
      p_plan_id: 'pro',
      p_seats_limit: null,
    },
  );
  if (serviceSyncError) {
    fail(`service_role update_organization_plan: ${serviceSyncError.message}`);
  }
  assert(
    serviceSync?.plan_id === 'pro',
    'service_role must still be able to upgrade plan',
  );

  console.log(
    'security-lock-billing-plan-writes-smoke: OK — PATCH/RPC blocked; name update + service_role sync intact',
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
