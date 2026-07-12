#!/usr/bin/env node
/**
 * Security smoke: org admins must not PostgREST-insert role = 'owner'.
 *
 * Prerequisites: npm run db:start && npm run db:reset
 *
 * Regression for migration 0033_block_owner_member_insert.
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
const OWNER_EMAIL = `owner-insert-smoke-${stamp}@local.invalid`;
const ADMIN_EMAIL = `admin-insert-smoke-${stamp}@local.invalid`;
const COLLUDER_EMAIL = `colluder-insert-smoke-${stamp}@local.invalid`;
const PASSWORD = 'OequSecuritySmoke2026!';

function fail(message) {
  console.error(`security-block-owner-insert-smoke: FAIL — ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function createConfirmedUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    fail(`createUser ${email}: ${error?.message ?? 'no user'}`);
  }
  return data.user;
}

async function main() {
  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerUser = await createConfirmedUser(service, OWNER_EMAIL, PASSWORD);
  const adminUser = await createConfirmedUser(service, ADMIN_EMAIL, PASSWORD);
  const colluderUser = await createConfirmedUser(
    service,
    COLLUDER_EMAIL,
    PASSWORD,
  );

  const ownerClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: ownerSignInError } = await ownerClient.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: PASSWORD,
  });
  if (ownerSignInError) {
    fail(`owner sign-in: ${ownerSignInError.message}`);
  }

  const slug = `owner-insert-${stamp}`;
  const { data: org, error: createOrgError } = await ownerClient.rpc(
    'create_organization',
    { p_name: `Owner Insert Smoke ${stamp}`, p_slug: slug },
  );
  if (createOrgError || !org?.id) {
    fail(
      `create_organization: ${createOrgError?.message ?? 'missing org id'}`,
    );
  }
  const organizationId = org.id;

  const { data: ownerMembership, error: ownerMembershipError } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', ownerUser.id)
    .maybeSingle();
  if (ownerMembershipError) {
    fail(`read owner membership: ${ownerMembershipError.message}`);
  }
  assert(ownerMembership?.role === 'owner', 'create_organization must still create owner');

  const { error: seedAdminError } = await service
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: adminUser.id,
      role: 'admin',
    });
  if (seedAdminError) {
    fail(`seed admin membership: ${seedAdminError.message}`);
  }

  const adminClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: adminSignInError } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: PASSWORD,
  });
  if (adminSignInError) {
    fail(`admin sign-in: ${adminSignInError.message}`);
  }

  const { error: ownerEscalationError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: colluderUser.id,
      role: 'owner',
    });

  assert(
    ownerEscalationError != null,
    'admin must not insert organization_members with role=owner',
  );

  const { data: colluderAsOwner, error: colluderReadError } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', colluderUser.id)
    .maybeSingle();
  if (colluderReadError) {
    fail(`read colluder membership: ${colluderReadError.message}`);
  }
  assert(
    colluderAsOwner == null,
    'colluder must not exist as owner after rejected insert',
  );

  const { error: memberInsertError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: colluderUser.id,
      role: 'member',
    });
  if (memberInsertError) {
    fail(
      `admin insert role=member should still be allowed by policy: ${memberInsertError.message}`,
    );
  }

  console.log(
    'security-block-owner-insert-smoke: OK — owner insert blocked; member insert allowed; create_organization intact',
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
