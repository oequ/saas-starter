#!/usr/bin/env node
/** Vercel production build for apps/demo (mock SaaS starter). */
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function run(label, command, args) {
  const r = spawnSync(command, args, { stdio: 'inherit', cwd: root, env: process.env });
  if (r.status !== 0) {
    console.error(`vercel-build-demo: ${label} failed (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

run('nx build', process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'nx',
  'build',
  'demo',
  '--configuration=production',
]);
