#!/usr/bin/env node
/**
 * Publishes docs/assets/api-console-showcase.mp4 to a GitHub Release so README
 * <video> can use an absolute github.com CDN URL (relative paths are stripped).
 *
 * Requires: gh auth login
 *
 * Usage: npm run upload:api-console-showcase-release
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asset = path.join(root, 'docs', 'assets', 'api-console-showcase.mp4');
const tag = 'showcase-assets';

if (!existsSync(asset)) {
  console.error(`Missing ${asset} — run npm run record:api-console-showcase first.`);
  process.exit(1);
}

function gh(args) {
  const result = spawnSync('gh', args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const list = spawnSync('gh', ['release', 'view', tag], { encoding: 'utf8', shell: true });
if (list.status !== 0) {
  gh([
    'release',
    'create',
    tag,
    asset,
    '--title',
    'README showcase assets',
    '--notes',
    'Hosts api-console-showcase.mp4 for the inline README player.',
  ]);
} else {
  gh(['release', 'upload', tag, asset, '--clobber']);
}

console.log(`Release: https://github.com/oequ/saas-starter/releases/tag/${tag}`);
