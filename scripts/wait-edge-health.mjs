#!/usr/bin/env node
/**
 * Retry edge-runtime-health until public-v1 responds (CI after db reset).
 * Usage: node scripts/wait-edge-health.mjs [maxAttempts]
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const maxAttempts = Number(process.argv[2] ?? 30);
const script = join(
  dirname(fileURLToPath(import.meta.url)),
  'edge-runtime-health.mjs',
);

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status === 0) {
    process.exit(0);
  }
  if (attempt < maxAttempts) {
    console.log(
      `wait-edge-health: attempt ${attempt}/${maxAttempts} failed, retrying in 2s…`,
    );
    await setTimeout(2000);
  }
}

process.exit(1);
