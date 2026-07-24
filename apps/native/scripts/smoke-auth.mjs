/**
 * One-off live smoke against local Supabase (same Auth path as apps/native).
 * Run from repo root: node apps/native/scripts/smoke-auth.mjs
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
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
