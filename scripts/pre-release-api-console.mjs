#!/usr/bin/env node
/**
 * Pre-release gate for apps/api-console: Supabase + preflight + Playwright @api-console.
 *
 * Usage: npm run pre-release:api-console
 * Requires: Docker (Supabase CLI), Playwright chromium (`npx playwright install chromium`)
 */
import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(label, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(npmCmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNode(label, scriptPath, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('Supabase start', ['run', 'db:start']);
run('DB reset (migrations + seed)', ['run', 'db:reset']);
runNode('Supabase settings (web + api-console)', 'scripts/write-web-supabase-settings.mjs');
runNode('Edge health (public-v1)', 'scripts/edge-runtime-health.mjs');
runNode('API console E2E preflight', 'scripts/e2e-api-console-preflight.mjs');
run('Build api-console', ['exec', '--', 'nx', 'build', 'api-console']);
run('Playwright chromium', ['exec', '--', 'playwright', 'install', 'chromium']);
run('API console E2E (@api-console)', ['run', 'e2e:api-console'], { CI: '1' });
run('Public API HTTP smoke', ['run', 'test:demo-runs-http']);

console.log('\n✓ pre-release:api-console passed');
