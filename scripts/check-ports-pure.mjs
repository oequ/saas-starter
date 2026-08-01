/**
 * Fail if libs/ports contains Angular imports (framework-agnostic guard).
 * Run: node scripts/check-ports-pure.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'libs', 'ports');
const FORBIDDEN = /from\s+['"]@angular\/|from\s+['"]@spartan-ng\/|InjectionToken/;

/** @param {string} dir @param {string[]} out */
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.error('libs/ports not found');
  process.exit(1);
}

const hits = [];
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN.test(text)) {
    hits.push(path.relative(process.cwd(), file));
  }
}

if (hits.length) {
  console.error('libs/ports must stay framework-agnostic. Forbidden Angular markers in:');
  for (const h of hits) console.error(' -', h);
  process.exit(1);
}

console.log('check-ports-pure: ok (no Angular in libs/ports)');
