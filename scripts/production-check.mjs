#!/usr/bin/env node
/**
 * Pre-flight checks for hosted Supabase + static frontend (e.g. Vercel).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run production:check
 *   APP_URL=https://your-app.vercel.app npm run production:check
 *
 * Optional:
 *   SEED_ORG_SLUG=demo
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — verify login when seed user exists
 *
 * Loads `.env` from repo root when vars are not already set.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from './production-check.manifest.json' with { type: 'json' };

const root = process.cwd();
loadEnvFile(join(root, '.env'));

const config = {
  url: process.env.SUPABASE_URL?.trim().replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY?.trim(),
  appUrl: process.env.APP_URL?.trim().replace(/\/$/, ''),
  seedOrgSlug:
    process.env.SEED_ORG_SLUG?.trim() || manifest.defaultSeedOrgSlug,
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL?.trim(),
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD,
};

/** @type {{ id: string, label: string, status: 'pass' | 'fail' | 'warn' | 'skip', detail?: string }[]} */
const results = [];

function record(id, label, status, detail) {
  results.push({ id, label, status, detail });
  const icon = { pass: '✓', fail: '✗', warn: '⚠', skip: '−' }[status];
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`${icon} ${label}${suffix}`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
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

function projectRefFromUrl(urlString) {
  try {
    const host = new URL(urlString).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function projectRefFromJwt(jwt) {
  const parts = jwt.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

async function fetchWithAnon(path, { method = 'GET', body } = {}) {
  const headers = {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${config.url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function checkRequiredEnv() {
  if (!config.url) {
    record('env-url', 'SUPABASE_URL set', 'fail', 'missing');
    return false;
  }
  if (!config.anonKey) {
    record('env-key', 'SUPABASE_ANON_KEY set', 'fail', 'missing');
    return false;
  }
  record('env-url', 'SUPABASE_URL set', 'pass', config.url);
  record('env-key', 'SUPABASE_ANON_KEY set', 'pass');
  return true;
}

async function checkSupabaseReachable() {
  try {
    const res = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.anonKey },
    });
    if (!res.ok) {
      record(
        'reachability',
        'Supabase Auth reachable',
        'fail',
        `HTTP ${res.status}`,
      );
      return false;
    }
    record('reachability', 'Supabase Auth reachable', 'pass');
    return true;
  } catch (err) {
    record(
      'reachability',
      'Supabase Auth reachable',
      'fail',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

async function checkAnonKeyValid() {
  try {
    const res = await fetchWithAnon('/rest/v1/', { method: 'HEAD' });
    if (res.status === 401 || res.status === 403) {
      record('anon-key', 'Anon key accepted by REST', 'fail', `HTTP ${res.status}`);
      return false;
    }
    record('anon-key', 'Anon key accepted by REST', 'pass');
    return true;
  } catch (err) {
    record(
      'anon-key',
      'Anon key accepted by REST',
      'fail',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

function checkProjectRefMatch() {
  const urlRef = projectRefFromUrl(config.url);
  const keyRef = projectRefFromJwt(config.anonKey);
  if (!urlRef) {
    record(
      'project-ref',
      'Anon key matches Supabase project ref',
      'skip',
      'local or custom host',
    );
    return true;
  }
  if (!keyRef) {
    record(
      'project-ref',
      'Anon key matches Supabase project ref',
      'warn',
      'could not decode JWT ref',
    );
    return true;
  }
  if (urlRef !== keyRef) {
    record(
      'project-ref',
      'Anon key matches Supabase project ref',
      'fail',
      `URL ref ${urlRef} ≠ key ref ${keyRef}`,
    );
    return false;
  }
  record('project-ref', 'Anon key matches Supabase project ref', 'pass', urlRef);
  return true;
}

async function checkSchemaProbes() {
  let ok = true;
  for (const probe of manifest.schemaProbes) {
    try {
      const res = await fetchWithAnon(
        `/rest/v1/${probe.table}?select=*&limit=0`,
      );
      if (res.status === 404) {
        record(
          `schema-${probe.table}`,
          `Table ${probe.table}`,
          'fail',
          'not found — run migrations',
        );
        ok = false;
        continue;
      }
      const body = await res.text();
      if (body.includes('does not exist') || body.includes('PGRST205')) {
        record(
          `schema-${probe.table}`,
          `Table ${probe.table}`,
          'fail',
          probe.description,
        );
        ok = false;
        continue;
      }
      if (!res.ok && res.status !== 406) {
        record(
          `schema-${probe.table}`,
          `Table ${probe.table}`,
          'warn',
          `HTTP ${res.status} (${probe.description})`,
        );
        continue;
      }
      record(`schema-${probe.table}`, `Table ${probe.table}`, 'pass', probe.description);
    } catch (err) {
      record(
        `schema-${probe.table}`,
        `Table ${probe.table}`,
        'fail',
        err instanceof Error ? err.message : String(err),
      );
      ok = false;
    }
  }
  return ok;
}

async function checkEdgeFunctions() {
  let ok = true;
  for (const name of manifest.edgeFunctions) {
    try {
      const res = await fetch(`${config.url}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      if (res.status === 404) {
        record(
          `fn-${name}`,
          `Edge Function ${name}`,
          'fail',
          'not deployed',
        );
        ok = false;
      } else if (res.status === 503) {
        record(
          `fn-${name}`,
          `Edge Function ${name}`,
          'warn',
          'runtime unavailable (start functions:serve locally or deploy to hosted project)',
        );
      } else {
        record(
          `fn-${name}`,
          `Edge Function ${name}`,
          'pass',
          `HTTP ${res.status}`,
        );
      }
    } catch (err) {
      record(
        `fn-${name}`,
        `Edge Function ${name}`,
        'fail',
        err instanceof Error ? err.message : String(err),
      );
      ok = false;
    }
  }
  return ok;
}

async function checkSeedOrg() {
  try {
    const slug = encodeURIComponent(config.seedOrgSlug);
    const res = await fetchWithAnon(
      `/rest/v1/organizations?select=slug,name&slug=eq.${slug}&limit=1`,
    );
    if (!res.ok) {
      record(
        'seed-org',
        `Seed org "${config.seedOrgSlug}"`,
        'warn',
        `HTTP ${res.status} — run seed or create org`,
      );
      return true;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      record(
        'seed-org',
        `Seed org "${config.seedOrgSlug}"`,
        'warn',
        'not found — run supabase/seed.sql or sign up',
      );
      return true;
    }
    record(
      'seed-org',
      `Seed org "${config.seedOrgSlug}"`,
      'pass',
      rows[0].name ?? config.seedOrgSlug,
    );
    return true;
  } catch (err) {
    record(
      'seed-org',
      `Seed org "${config.seedOrgSlug}"`,
      'warn',
      err instanceof Error ? err.message : String(err),
    );
    return true;
  }
}

async function checkSeedAdminLogin() {
  if (!config.seedAdminEmail || !config.seedAdminPassword) {
    record(
      'seed-login',
      'Seed admin can sign in',
      'skip',
      'set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to test',
    );
    return true;
  }
  try {
    const res = await fetch(
      `${config.url}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: config.seedAdminEmail,
          password: config.seedAdminPassword,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      record(
        'seed-login',
        'Seed admin can sign in',
        'fail',
        `HTTP ${res.status} ${text.slice(0, 120)}`,
      );
      return false;
    }
    record('seed-login', 'Seed admin can sign in', 'pass', config.seedAdminEmail);
    return true;
  } catch (err) {
    record(
      'seed-login',
      'Seed admin can sign in',
      'fail',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

function checkAuthRedirects() {
  if (!config.appUrl) {
    record(
      'auth-redirects',
      'Auth redirect URLs',
      'skip',
      'set APP_URL to verify production redirects',
    );
    return true;
  }
  const paths = ['', '/auth/callback', '/auth/reset-password', '/auth/confirm-email'];
  const expected = paths.map((p) => `${config.appUrl}${p}`);
  record(
    'auth-redirects',
    'Auth redirect URLs (manual)',
    'warn',
    `In Supabase Dashboard → Auth → URL config, allow: ${expected.join(', ')}`,
  );
  return true;
}

async function main() {
  console.log('production:check — hosted Supabase pre-flight\n');

  if (!(await checkRequiredEnv())) {
    printSummary();
    process.exit(1);
  }

  let ok = true;
  ok = (await checkSupabaseReachable()) && ok;
  ok = (await checkAnonKeyValid()) && ok;
  ok = checkProjectRefMatch() && ok;
  ok = (await checkSchemaProbes()) && ok;
  ok = (await checkEdgeFunctions()) && ok;
  await checkSeedOrg();
  ok = (await checkSeedAdminLogin()) && ok;
  checkAuthRedirects();

  printSummary();
  process.exit(ok ? 0 : 1);
}

function printSummary() {
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  console.log('');
  if (failed === 0) {
    console.log(
      warned > 0
        ? `✓ production:check passed with ${warned} warning(s)`
        : '✓ production:check passed',
    );
  } else {
    console.log(`✗ production:check failed (${failed} error(s), ${warned} warning(s))`);
    console.log('  See docs/DEPLOY.md for the full launch runbook.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
