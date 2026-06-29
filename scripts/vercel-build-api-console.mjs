#!/usr/bin/env node
/** Vercel production build for apps/api-console. */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();

function run(label, command, args) {
  const r = spawnSync(command, args, { stdio: 'inherit', cwd: root, env: process.env });
  if (r.status !== 0) {
    console.error(`vercel-build-api-console: ${label} failed (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

run('settings', process.execPath, [join(root, 'scripts/write-web-supabase-settings.mjs')]);
run('nx build', process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'nx',
  'build',
  'api-console',
  '--configuration=production',
]);
