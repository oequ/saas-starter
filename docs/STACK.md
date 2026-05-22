# Locked stack (internal)

> Single source of truth for dependency versions in this monorepo.  
> Do not copy `package.json` from other repos. New packages: check peers, pin to this major.  
> Last verified: **2026-05-22** (`nx run demo:build:development` — success)

## Runtime

| Tool | Version |
|------|---------|
| Node | `>=22` (CI/dev: 22.22.x) |
| npm | `>=11` (dev: 11.6.x) |

## Angular ecosystem (one major — do not mix 20/22)

| Package | Pin in `package.json` |
|---------|------------------------|
| `@angular/*` | `~21.2.0` |
| `@angular/cdk` | `~21.2.11` |
| `angular-eslint` | `^21.2.0` |
| `@angular/build`, `@angular/cli` | `~21.2.0` |
| `ng-packagr` | `~21.2.0` |
| `@schematics/angular` | `~21.2.0` |

## Workspace

| Package | Pin |
|---------|-----|
| `nx` | `22.7.2` |
| `@nx/*` | `22.7.2` (align with `nx`) |
| `typescript` | `~5.9.2` |
| `vite` | `^8.0.0` |
| `vitest` | `~4.1.0` |

## UI

| Package | Pin | Notes |
|---------|-----|--------|
| `@spartan-ng/brain` | `0.0.1-alpha.694` | Pin; do not use `latest` |
| `@spartan-ng/cli` | `0.0.1-alpha.694` | Match brain |
| `tailwindcss` | `^4.3.0` |
| `@jsverse/transloco` | `^8.3.0` |

## Apps

| App | Purpose | Adapter |
|-----|---------|---------|
| `demo` | BYO / mock / GitHub Pages | `provideDemoAdapters()` |
| `web` | Full-stack (Supabase auth/org) | `provideWebAdapters()` |

## Adding dependencies (checklist)

1. Read this file and root [`package.json`](../package.json).
2. `npm view <pkg> peerDependencies` (and `@latest` if new major).
3. Install with explicit version pin (e.g. `npm install @supabase/supabase-js@^2.105.4`).
4. Run `nx run demo:build:development` (and `web` when it exists).
5. Never use `--legacy-peer-deps` as the first fix.

## Docs to consult before changes

- [Angular](https://angular.dev)
- [Nx](https://nx.dev)
- [Supabase](https://supabase.com/docs) — before `supabase/` or `@supabase/supabase-js`
- [Spartan](https://spartan.ng) — CDK major must match Angular major
- [Transloco](https://jsverse.github.io/transloco/)

## Supabase (full-stack track)

| Tool | Notes |
|------|--------|
| Docker Desktop | **Required** for `npm run db:start` — CLI runs containers ([supabase/README.md](../supabase/README.md)) |
| CLI | devDependency `supabase@~2.101.0` — use `npm run db:*`, not global `npm i -g` |
| `@supabase/supabase-js` | `~2.106.1` — `apps/web` + `libs/data-access-supabase` |

## Forbidden on bootstrap

- `ng new` / `create-nx-workspace` for new apps (use `nx g @nx/angular:application` from this workspace).
- `nx migrate latest` mid-sprint without a dedicated migration task.
- Copying Angular/Nx config from deleted skeleton (was Angular 20).
