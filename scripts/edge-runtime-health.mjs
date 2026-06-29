#!/usr/bin/env node
/**
 * Probe local Supabase Edge (public-v1). Exit 0 when router responds (401 without key is OK).
 * Usage: node scripts/edge-runtime-health.mjs [--restart]
 */
import { execSync } from 'node:child_process';

const EDGE_CONTAINER = 'supabase_edge_runtime_saas-starter';
const url = (process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321').replace(
  /\/$/,
  '',
);
const anonKey =
  process.env['SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const wantRestart = process.argv.includes('--restart');

function edgeContainerRunning() {
  try {
    const out = execSync(
      `docker ps --filter name=^/${EDGE_CONTAINER}$ --format "{{.Names}}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out.trim() === EDGE_CONTAINER;
  } catch {
    return false;
  }
}

function edgeContainerState() {
  try {
    return execSync(
      `docker inspect ${EDGE_CONTAINER} --format "{{.State.Status}}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    return 'missing';
  }
}

function edgeLogsTail() {
  try {
    return execSync(`docker logs ${EDGE_CONTAINER} --tail 20 2>&1`, {
      encoding: 'utf8',
    });
  } catch {
    return '(could not read docker logs)';
  }
}

async function probeEdge() {
  const endpoint = `${url}/functions/v1/public-v1/v1/account`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: 'Bearer oeq_probe_invalid_key',
      },
    });
    const body = (await res.text()).slice(0, 200);
    if (res.status === 401 || res.status === 403) {
      return { ok: true, status: res.status, body };
    }
    if (res.ok) {
      return { ok: true, status: res.status, body };
    }
    return { ok: false, status: res.status, body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, body: msg };
  }
}

function printWindowsHints() {
  console.error('');
  console.error('Edge runtime is not healthy. Common fixes on Windows:');
  console.error('');
  console.error('  1. Docker Desktop → Settings → Network → DNS: 8.8.8.8 (or enable host DNS)');
  console.error('     (logs may mention jsr.io / deno.land / TLS close_notify — same root cause)');
  console.error('  2. Restart Docker Desktop, then:');
  console.error('       npx supabase stop --no-backup');
  console.error('       npm run db:reset');
  console.error('  3. Retry: npm run edge:health');
  console.error('');
  console.error('  Workaround (stack Edge broken, use CLI serve instead):');
  console.error('       docker stop supabase_edge_runtime_saas-starter');
  console.error('       npm run functions:serve    # keep terminal open');
  console.error('       npm run test:public-api-http');
  console.error('');
  console.error('  See: supabase/README.md → Troubleshooting → Edge runtime');
  console.error('');
}

async function main() {
  if (wantRestart && edgeContainerRunning()) {
    console.log(`Restarting ${EDGE_CONTAINER}…`);
    execSync(`docker restart ${EDGE_CONTAINER}`, { stdio: 'inherit' });
    await new Promise((r) => setTimeout(r, 15_000));
  }

  const first = await probeEdge();
  if (first.ok) {
    console.log(`edge-runtime-health: OK (HTTP ${first.status} from public-v1)`);
    if (edgeContainerRunning()) {
      console.log(`  container: ${EDGE_CONTAINER} (running)`);
    } else {
      console.log('  container: not running (functions may be served via CLI)');
    }
    return;
  }

  console.error(
    `edge-runtime-health: FAIL (HTTP ${first.status}) ${first.body}`,
  );
  const state = edgeContainerState();
  if (state === 'exited' || state === 'dead') {
    console.error(`  container: ${EDGE_CONTAINER} (${state})`);
  } else if (edgeContainerRunning()) {
    console.error(`  container: ${EDGE_CONTAINER} (running)`);
  }
  if (state !== 'missing') {
    console.error(edgeLogsTail());
  }
  printWindowsHints();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
