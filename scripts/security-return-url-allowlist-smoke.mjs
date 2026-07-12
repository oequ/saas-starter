#!/usr/bin/env node
/**
 * Security smoke: billing return_url must reject foreign origins (open redirect).
 *
 * Hits billing-create-portal and billing-create-checkout before Stripe work.
 * Prerequisites: npm run db:start && npm run db:reset (+ Edge healthy).
 *
 * Must match supabase/functions/_shared/return-url.ts:
 * - With ALLOWED_REDIRECT_ORIGINS unset: only localhost / 127.0.0.1
 * - https://evil.example is always rejected in that mode
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
const anonKey =
  envValue('SUPABASE_ANON_KEY') ||
  status.ANON_KEY ||
  status.anon_key ||
  status.PUBLISHABLE_KEY ||
  status.publishable_key ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const serviceRoleKey =
  envValue('SUPABASE_SERVICE_ROLE_KEY') ||
  status.SERVICE_ROLE_KEY ||
  status.service_role_key ||
  status.SECRET_KEY ||
  status.secret_key ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const stamp = Date.now();
const EMAIL = `return-url-smoke-${stamp}@local.invalid`;
const PASSWORD = 'OequSecuritySmoke2026!';
const ORG_ID = '00000000-0000-4000-8000-000000000001';

function fail(message) {
  console.error(`security-return-url-allowlist-smoke: FAIL — ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function invoke(fnName, accessToken, body) {
  const res = await fetch(`${url}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

async function main() {
  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
  if (createError || !created.user) {
    fail(`createUser: ${createError?.message ?? 'no user'}`);
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: signInError } =
    await userClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
  if (signInError || !signedIn.session?.access_token) {
    fail(`signIn: ${signInError?.message ?? 'no session'}`);
  }
  const token = signedIn.session.access_token;

  const evil = 'https://evil.example/phish';
  const local = 'http://localhost:4201/workspace/settings/billing';

  for (const fnName of ['billing-create-portal', 'billing-create-checkout']) {
    const body =
      fnName === 'billing-create-checkout'
        ? { organization_id: ORG_ID, plan_id: 'pro', return_url: evil }
        : { organization_id: ORG_ID, return_url: evil };

    const bad = await invoke(fnName, token, body);
    assert(
      bad.status === 400,
      `${fnName} evil return_url expected HTTP 400, got ${bad.status}: ${bad.text}`,
    );
    assert(
      String(bad.json?.error ?? '').includes('return_url origin not allowed'),
      `${fnName} evil return_url expected allowlist error, got: ${bad.text}`,
    );

    const okBody =
      fnName === 'billing-create-checkout'
        ? { organization_id: ORG_ID, plan_id: 'pro', return_url: local }
        : { organization_id: ORG_ID, return_url: local };
    const localRes = await invoke(fnName, token, okBody);
    assert(
      !String(localRes.json?.error ?? '').includes(
        'return_url origin not allowed',
      ),
      `${fnName} localhost return_url must pass allowlist (got ${localRes.status}: ${localRes.text})`,
    );
  }

  console.log(
    'security-return-url-allowlist-smoke: OK — portal+checkout reject foreign origins',
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
