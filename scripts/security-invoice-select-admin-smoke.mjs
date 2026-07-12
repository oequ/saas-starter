#!/usr/bin/env node
/**
 * Security smoke: organization_invoices readable only by org admins.
 *
 * Prerequisites: npm run db:start && npm run db:reset
 *
 * Regression for migration 0035_restrict_invoice_select_to_admin
 * (RPC already admin-only since 0023; this closes direct PostgREST SELECT).
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
)
  .replace('://localhost', '://127.0.0.1')
  .replace(/\/$/, '');
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
const OWNER_EMAIL = `invoice-admin-smoke-owner-${stamp}@local.invalid`;
const MEMBER_EMAIL = `invoice-admin-smoke-member-${stamp}@local.invalid`;
const PASSWORD = 'OequSecuritySmoke2026!';

function fail(message) {
  console.error(`security-invoice-select-admin-smoke: FAIL — ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function createConfirmedUser(admin, email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    fail(`createUser ${email}: ${error?.message ?? 'no user'}`);
  }
  return data.user;
}

async function signIn(email) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    fail(`signIn ${email}: ${error.message}`);
  }
  return client;
}

async function main() {
  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerUser = await createConfirmedUser(service, OWNER_EMAIL);
  const memberUser = await createConfirmedUser(service, MEMBER_EMAIL);

  const ownerClient = await signIn(OWNER_EMAIL);
  const slug = `invoice-admin-${stamp}`;
  const { data: org, error: createOrgError } = await ownerClient.rpc(
    'create_organization',
    { p_name: `Invoice Admin Smoke ${stamp}`, p_slug: slug },
  );
  if (createOrgError || !org?.id) {
    fail(
      `create_organization: ${createOrgError?.message ?? 'missing org id'}`,
    );
  }
  const organizationId = org.id;

  const { error: seedMemberError } = await service
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: memberUser.id,
      role: 'member',
    });
  if (seedMemberError) {
    fail(`seed member: ${seedMemberError.message}`);
  }

  const { error: seedInvoiceError } = await service
    .from('organization_invoices')
    .insert({
      organization_id: organizationId,
      provider: 'custom',
      external_invoice_id: `smoke-inv-${stamp}`,
      invoice_number: `SMOKE-${stamp}`,
      amount_due: 4200,
      amount_paid: 4200,
      currency: 'usd',
      status: 'paid',
      invoice_created_at: new Date().toISOString(),
      hosted_url: 'https://example.invalid/invoice',
      invoice_pdf: 'https://example.invalid/invoice.pdf',
    });
  if (seedInvoiceError) {
    fail(`seed invoice: ${seedInvoiceError.message}`);
  }

  const memberClient = await signIn(MEMBER_EMAIL);

  const { data: memberRows, error: memberSelectError } = await memberClient
    .from('organization_invoices')
    .select('id, amount_due, invoice_pdf')
    .eq('organization_id', organizationId);
  if (memberSelectError) {
    fail(`member SELECT error: ${memberSelectError.message}`);
  }
  assert(
    (memberRows ?? []).length === 0,
    'member must not SELECT organization_invoices via PostgREST',
  );

  const { data: memberRpc, error: memberRpcError } = await memberClient.rpc(
    'list_organization_invoices',
    { p_organization_id: organizationId, p_limit: 10 },
  );
  assert(
    memberRpcError != null,
    'member list_organization_invoices must fail (admin-only RPC)',
  );
  assert(
    /forbidden|42501|not authorized/i.test(
      `${memberRpcError?.message ?? ''} ${memberRpcError?.code ?? ''}`,
    ),
    `member RPC expected forbidden, got: ${memberRpcError?.message}`,
  );
  assert(memberRpc == null, 'member RPC must not return invoice payload');

  const { data: ownerRows, error: ownerSelectError } = await ownerClient
    .from('organization_invoices')
    .select('id, amount_due')
    .eq('organization_id', organizationId);
  if (ownerSelectError) {
    fail(`owner SELECT error: ${ownerSelectError.message}`);
  }
  assert(
    (ownerRows ?? []).length === 1,
    'owner must SELECT organization_invoices via PostgREST',
  );
  assert(
    ownerRows[0].amount_due === 4200,
    'owner must see seeded invoice amount',
  );

  const { data: ownerRpc, error: ownerRpcError } = await ownerClient.rpc(
    'list_organization_invoices',
    { p_organization_id: organizationId, p_limit: 10 },
  );
  if (ownerRpcError) {
    fail(`owner RPC: ${ownerRpcError.message}`);
  }
  const items = ownerRpc?.items ?? [];
  assert(items.length === 1, 'owner RPC must return one invoice');
  assert(items[0].amountDue === 4200, 'owner RPC amountDue mismatch');

  void ownerUser;
  console.log(
    'security-invoice-select-admin-smoke: OK — member blocked, owner can read',
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
