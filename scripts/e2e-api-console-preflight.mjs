#!/usr/bin/env node
/**
 * Preconditions for API Developer Console Playwright E2E (OSS).
 *
 * Usage: npm run e2e:api-console:preflight
 * Skips Edge probe when SKIP_EDGE_ENSURE=1 (UI-only / broken Edge on Windows).
 */
import { spawnSync } from 'node:child_process';

const supabaseUrl = (process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321').replace(
  /\/$/,
  '',
);
const anonKey =
  process.env['SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const mailpitApi =
  process.env['MAILPIT_API'] ?? 'http://127.0.0.1:54324/api/v1';

function fail(message) {
  console.error(`\napi-console preflight: FAIL — ${message}\n`);
  process.exit(1);
}

function ok(label) {
  console.log(`  ✓ ${label}`);
}

async function checkSupabase() {
  let res;
  try {
    res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(
      `Supabase not reachable at ${supabaseUrl} (${msg}). Run: npm run db:reset`,
    );
  }
  if (!res.ok) {
    fail(
      `Supabase unhealthy at ${supabaseUrl} (HTTP ${res.status}). Run: npm run db:reset`,
    );
  }
  ok(`Supabase REST (${supabaseUrl})`);
}

async function checkMailpit() {
  let res;
  try {
    res = await fetch(`${mailpitApi}/messages?limit=1`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(
      `Mailpit not reachable at ${mailpitApi} (${msg}). Start Supabase: npm run db:start`,
    );
  }
  if (!res.ok) {
    fail(
      `Mailpit unhealthy (HTTP ${res.status}). Signup OTP E2E needs Mailpit on :54324.`,
    );
  }
  ok(`Mailpit (${mailpitApi})`);
}

function checkEdge() {
  if (process.env['SKIP_EDGE_ENSURE'] === '1') {
    console.log('  ⊘ Edge probe skipped (SKIP_EDGE_ENSURE=1)');
    return;
  }
  const edge = spawnSync(process.execPath, ['scripts/wait-edge-health.mjs', '30'], {
    stdio: 'inherit',
  });
  if (edge.status !== 0) {
    fail(
      'Edge runtime unhealthy. Run: npm run db:start && npm run test:demo-runs-http. ' +
        'For UI-only E2E: SKIP_EDGE_ENSURE=1',
    );
  }
  ok('Edge public-v1');
}

async function main() {
  console.log('\napi-console E2E preflight\n');
  await checkSupabase();
  await checkMailpit();
  checkEdge();
  console.log('\n✓ api-console preflight passed\n');
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
