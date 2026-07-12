#!/usr/bin/env node
/**
 * Fast GoTrue signup probe (no browser). Fails CI early when Auth/Mailpit
 * cannot create an unconfirmed user — the root cause of web-e2e register hangs.
 *
 * Prerequisites: supabase start (+ db reset for a clean Auth).
 */
import { execSync } from 'node:child_process';

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

const email = `signup-smoke-${Date.now()}@oequ.io`;
const password = 'password123';

function fail(message, detail) {
  console.error(`auth-signup-smoke: FAIL — ${message}`);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    data: {},
    gotrue_meta_security: {},
  }),
});

const bodyText = await res.text();
let body;
try {
  body = JSON.parse(bodyText);
} catch {
  body = { raw: bodyText };
}

if (!res.ok) {
  fail(`GoTrue signup HTTP ${res.status} against ${url}`, bodyText);
}

// GoTrue may return `{ user, session }` or (when session is null) the user object
// at the top level — both are success for enable_confirmations=true.
const user = body?.user ?? body;
const session = body?.session ?? null;
if (!user?.id || typeof user.email !== 'string') {
  fail('GoTrue signup returned no user', bodyText);
}

if (session != null) {
  console.warn(
    'auth-signup-smoke: WARN — session returned (enable_confirmations may be false)',
  );
}

console.log(
  `auth-signup-smoke: OK — user=${user.id} confirmed=${user.email_confirmed_at ?? 'null'} session=${session ? 'yes' : 'null'} url=${url}`,
);
