#!/usr/bin/env node
/**
 * HTTP smoke for OSS metered endpoint POST /v1/demo-runs.
 * Prerequisites: npm run db:reset && npm run functions:serve
 */
import { createHash, randomBytes } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
const SMOKE_OWNER_EMAIL = 'public-api-smoke@local.invalid';

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
const url = (envValue('SUPABASE_URL') || status.API_URL || status.APIUrl || 'http://127.0.0.1:54321').replace(/\/$/, '');
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

const API_BASE = `${url}/functions/v1/public-v1`;

function fail(message) {
  console.error(`demo-runs-http-smoke: FAIL — ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function hashSecret(secret) {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

function ensureEdgeRuntime() {
  const result = spawnSync(process.execPath, ['scripts/wait-edge-health.mjs', '30'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function ensureDemoOrgOwner(supabase) {
  const { count, error: countError } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', DEMO_ORG_ID)
    .in('role', ['owner', 'admin']);

  if (countError) fail(`count org members: ${countError.message}`);
  if ((count ?? 0) > 0) return;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: SMOKE_OWNER_EMAIL,
    password: 'PublicApiSmoke2026!',
    email_confirm: true,
  });

  let userId = created?.user?.id;
  if (createError) {
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) fail(`list users: ${listError.message}`);
    userId = listed?.users?.find((u) => u.email === SMOKE_OWNER_EMAIL)?.id;
    if (!userId) fail(`create smoke user: ${createError.message}`);
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: DEMO_ORG_ID,
    user_id: userId,
    role: 'owner',
  });
  if (memberError) fail(`insert demo org owner: ${memberError.message}`);
}

async function main() {
  ensureEdgeRuntime();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureDemoOrgOwner(supabase);

  const secret = `oeq_${randomBytes(24).toString('hex')}`;
  const keyHash = hashSecret(secret);

  const { error: insertError } = await supabase.from('organization_api_keys').insert({
    organization_id: DEMO_ORG_ID,
    name: 'demo-runs-smoke',
    token_prefix: `${secret.slice(0, 12)}…`,
    key_hash: keyHash,
    permission: 'full_access',
    domain_scope: 'all_domains',
  });
  if (insertError) fail(`insert test key: ${insertError.message}`);

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${secret}`,
  };

  const accountBefore = await fetch(`${API_BASE}/v1/account`, { headers }).then((r) =>
    r.json(),
  );
  assert(typeof accountBefore.usage_units?.balance === 'number', `usage_units.balance missing: ${JSON.stringify(accountBefore)}`);
  const before = accountBefore.usage_units.balance;

  const createRes = await fetch(`${API_BASE}/v1/demo-runs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'demo-runs smoke' }),
  });
  const created = await createRes.json();
  assert(createRes.status === 200, `POST /v1/demo-runs → ${createRes.status}: ${JSON.stringify(created)}`);
  assert(typeof created.id === 'string', 'run id');
  assert(created.status === 'completed', 'run status');

  const getRes = await fetch(`${API_BASE}/v1/demo-runs/${created.id}`, { headers });
  const got = await getRes.json();
  assert(getRes.ok, `GET demo run → ${getRes.status}`);
  assert(got.run?.id === created.id, 'GET returns same run');

  const accountAfter = await fetch(`${API_BASE}/v1/account`, { headers }).then((r) => r.json());
  const after = accountAfter.usage_units.balance;
  assert(before - after === 1, `expected 1 unit spent, before=${before} after=${after}`);

  console.log('demo-runs-http-smoke: OK');
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
