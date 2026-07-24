/**
 * One-off live smoke against local Supabase (same Auth path as apps/native).
 *
 * From apps/native (loads `.env` if present):
 *   node scripts/smoke-auth.mjs
 *
 * Or set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY explicitly.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'http://127.0.0.1:54321';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
if (!KEY) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy apps/native/.env.example to .env and fill from `npm run db:status`, then re-run.',
  );
  process.exit(1);
}

const MAILPIT = 'http://127.0.0.1:54324/api/v1';
const email = `native-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@oequ.io`;
const password = 'password123';

const steps = [];
function pass(name, detail = '') {
  steps.push({ name, ok: true, detail });
  console.log('PASS', name, detail);
}
function fail(name, detail) {
  steps.push({ name, ok: false, detail });
  console.error('FAIL', name, detail);
  process.exitCode = 1;
}

async function fetchOtp(targetEmail) {
  for (let i = 0; i < 24; i++) {
    const listRes = await fetch(`${MAILPIT}/messages?limit=25`);
    const json = await listRes.json();
    for (const msg of json.messages ?? []) {
      const to = (msg.To ?? [])
        .map((t) => t.Address ?? '')
        .join(' ')
        .toLowerCase();
      if (!to.includes(targetEmail.toLowerCase())) continue;
      const detail = await (await fetch(`${MAILPIT}/message/${msg.ID}`)).json();
      const text = detail.Text ?? detail.HTML ?? '';
      const match = text.match(/\b(\d{6})\b/);
      if (match?.[1]) return match[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('No OTP in Mailpit');
}

const supabase = createClient(URL, KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

console.log('URL', URL);
console.log('email', email);

{
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && /invalid login credentials/i.test(error.message)) {
    pass('reject-unknown-user', error.message);
  } else {
    fail('reject-unknown-user', error?.message ?? 'expected invalid credentials');
  }
}

{
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fail('signUp', error.message);
  else if (!data.session && data.user) {
    pass('signUp-pending-confirm', `user=${data.user.id}`);
  } else if (data.session) {
    pass('signUp-session-immediate', 'confirmations may be off');
  } else {
    fail('signUp', 'no user/session');
  }
}

let otp;
try {
  otp = await fetchOtp(email);
  pass('mailpit-otp', otp);
} catch (e) {
  fail('mailpit-otp', e.message);
  console.log(JSON.stringify(steps, null, 2));
  process.exit(1);
}

{
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  });
  if (error) fail('verifyOtp', error.message);
  else if (!data.session) fail('verifyOtp', 'no session');
  else pass('verifyOtp', `uid=${data.session.user.id}`);
}

await supabase.auth.signOut();

{
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: 'wrong-password',
  });
  if (error && /invalid login credentials/i.test(error.message)) {
    pass('reject-bad-password', error.message);
  } else {
    fail('reject-bad-password', error?.message ?? 'expected invalid credentials');
  }
}

{
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail('signIn', error.message);
  else if (!data.session) fail('signIn', 'no session');
  else {
    pass('signIn', data.session.user.email ?? '');
    const { error: rpcErr } = await supabase.rpc('claim_my_invitations');
    if (rpcErr) pass('claim_my_invitations-nonfatal', rpcErr.message);
    else pass('claim_my_invitations', 'ok');
  }
}

const passed = steps.filter((s) => s.ok).length;
console.log(`\nSummary: ${passed}/${steps.length} passed`);
if (process.exitCode) process.exit(1);
