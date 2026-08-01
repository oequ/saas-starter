/**
 * Split @oequ/ports imports: InjectionToken values → @oequ/ports-angular.
 * Run: node scripts/rewire-ports-angular-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TOKEN_NAMES = new Set([
  'ACTIVATION_ONBOARDING_CONFIG',
  'ACTIVATION_PORT',
  'API_KEYS_PORT',
  'AUTH_PORT',
  'AUTH_FEATURES',
  'BILLING_PORT',
  'BILLING_PROVIDER_ID',
  'STRIPE_BILLING_ENABLED',
  'DEMO_AUTH_EXTENSION',
  'EMAILS_PORT',
  'HELP_PANEL_PORT',
  'INTEGRATIONS_PORT',
  'LOGIN_FORM_PREFILL',
  'METRICS_PORT',
  'ORG_PORT',
  'PROJECT_PORT',
  'SUPPORT_PORT',
  'USAGE_UNITS_PORT',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.angular',
  'coverage',
  'ports-angular',
]);

/** @param {string} dir */
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/**
 * Parse a single import specifier list into items.
 * @param {string} body
 */
function splitSpecifiers(body) {
  /** @type {{ raw: string, name: string, isType: boolean }[]} */
  const items = [];
  let i = 0;
  const s = body.trim();
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (i >= s.length) break;
    let isType = false;
    if (s.slice(i, i + 4) === 'type' && /\s/.test(s[i + 4] ?? '')) {
      isType = true;
      i += 4;
      while (i < s.length && /\s/.test(s[i])) i++;
    }
    const start = i;
    // identifier or "X as Y"
    while (i < s.length && /[A-Za-z0-9_$]/.test(s[i])) i++;
    const name = s.slice(start, i);
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s.slice(i, i + 2) === 'as') {
      i += 2;
      while (i < s.length && /\s/.test(s[i])) i++;
      while (i < s.length && /[A-Za-z0-9_$]/.test(s[i])) i++;
    }
    const raw = s.slice(start, i).trim();
    // include leading "type " in raw for reconstruction if needed
    items.push({
      raw: isType ? `type ${raw}` : raw,
      name,
      isType,
    });
    while (i < s.length && /[\s,]/.test(s[i])) i++;
  }
  return items;
}

function formatImport(items, from, typeOnly) {
  if (items.length === 0) return '';
  const body = items.map((x) => x.raw).join(', ');
  if (typeOnly) return `import type { ${body} } from '${from}';`;
  // If all items are type-prefixed, use import type
  if (items.every((x) => x.isType)) {
    const cleaned = items.map((x) => ({
      ...x,
      raw: x.raw.replace(/^type\s+/, ''),
    }));
    return `import type { ${cleaned.map((x) => x.raw).join(', ')} } from '${from}';`;
  }
  return `import { ${body} } from '${from}';`;
}

function transform(source) {
  const importRe =
    /^([ \t]*)import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]@oequ\/ports['"];?[ \t]*$/gm;

  let changed = false;
  /** @type {string[]} */
  const angularExtras = [];

  const rewritten = source.replace(importRe, (full, indent, typeKw, body) => {
    const typeOnly = Boolean(typeKw);
    const items = splitSpecifiers(body);
    const portsItems = [];
    const angularItems = [];
    for (const item of items) {
      if (!item.isType && TOKEN_NAMES.has(item.name)) {
        angularItems.push({ ...item, isType: false, raw: item.raw.replace(/^type\s+/, '') });
      } else {
        portsItems.push(item);
      }
    }
    if (angularItems.length === 0) return full;
    changed = true;
    const parts = [];
    if (portsItems.length) {
      parts.push(formatImport(portsItems, '@oequ/ports', typeOnly));
    }
    // tokens are always value imports
    const ang = formatImport(angularItems, '@oequ/ports-angular', false);
    if (ang) {
      // If this file already will get ports-angular from another rewrite pass,
      // collect and merge later — for simplicity emit here; merge duplicates after.
      angularExtras.push(ang);
      parts.push(ang);
    }
    return parts.map((p) => indent + p).join('\n');
  });

  if (!changed) return { source, changed: false };

  // Dedupe identical @oequ/ports-angular import lines
  const lines = rewritten.split(/\r?\n/);
  const seenAng = new Set();
  /** @type {string[]} */
  const out = [];
  for (const line of lines) {
    const m = line.match(
      /^([ \t]*)import\s+\{([^}]*)\}\s+from\s+['"]@oequ\/ports-angular['"];?[ \t]*$/,
    );
    if (!m) {
      out.push(line);
      continue;
    }
    const items = splitSpecifiers(m[2]);
    const key = items
      .map((x) => x.name)
      .sort()
      .join(',');
    if (seenAng.has(key)) continue;
    // Merge all angular imports into one later — first collect
    seenAng.add(key);
    out.push(line);
  }

  // Merge multiple ports-angular imports into one
  const angIndexes = [];
  const angItems = [];
  for (let i = 0; i < out.length; i++) {
    const m = out[i].match(
      /^([ \t]*)import\s+\{([^}]*)\}\s+from\s+['"]@oequ\/ports-angular['"];?[ \t]*$/,
    );
    if (!m) continue;
    angIndexes.push(i);
    angItems.push(...splitSpecifiers(m[2]));
  }
  if (angIndexes.length > 1) {
    const byName = new Map();
    for (const it of angItems) byName.set(it.name, it);
    const merged = formatImport([...byName.values()], '@oequ/ports-angular', false);
    const indent = out[angIndexes[0]].match(/^([ \t]*)/)?.[1] ?? '';
    out[angIndexes[0]] = indent + merged;
    for (let j = angIndexes.length - 1; j >= 1; j--) out.splice(angIndexes[j], 1);
  }

  return { source: out.join('\n'), changed: true };
}

const roots = [
  path.join(ROOT, 'libs'),
  path.join(ROOT, 'apps'),
].filter((p) => fs.existsSync(p));

let fileCount = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    // Don't touch ports lib itself for token re-exports (already stripped)
    if (file.includes(`${path.sep}libs${path.sep}ports${path.sep}`)) continue;
    if (file.includes(`${path.sep}ports-angular${path.sep}`)) continue;
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes("'@oequ/ports'") && !before.includes('"@oequ/ports"')) {
      continue;
    }
    const { source, changed } = transform(before);
    if (!changed) continue;
    fs.writeFileSync(file, source);
    fileCount++;
    console.log('rewired', path.relative(ROOT, file));
  }
}
console.log(`Done. Updated ${fileCount} files.`);
