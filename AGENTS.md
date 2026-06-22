# AGENTS.md

Machine-readable context for AI coding assistants (Cursor, Copilot, etc.).

## Commands

- Install: `npm install`
- Dev server (demo): `npx nx serve demo`
- Dev server (web): `npm run start:web` (requires Docker + `npm run db:start`)
- Lint: `npx nx run-many -t lint`
- Test: `npx nx run-many -t test --projects=ports`
- E2E (demo): `npm run e2e`
- E2E (web, needs Supabase): `npm run e2e:web:release`
- Build: `npx nx build web`
- DB reset: `npm run db:reset`

## Repository layout

```text
apps/demo/                    # Mock-only demo app (GitHub Pages, PWA)
apps/web/                     # Full-stack app (Supabase backend)
apps/demo-e2e/                # Playwright E2E for demo
apps/web-e2e/                 # Playwright E2E for web (@web tag)
libs/ports/                   # Framework-free port interfaces ONLY
libs/adapters-mock/           # Demo/mock implementations
libs/data-access-supabase/    # Supabase production adapters
libs/shell/                   # App shell, layout, guards, paywall
libs/features-auth/           # Auth domain (login, register, account)
libs/features-org/            # Org domain (workspace, settings, billing, members)
libs/i18n/                    # Transloco i18n assets and locale service
libs/ui/                      # Design system (Spartan helm components)
supabase/                     # Migrations, seed, Edge Functions, config
```

## Architecture rules (ports & adapters)

1. **NEVER** import adapter libraries from `libs/features-*` or `libs/ui`.
2. Features inject ports via `InjectionToken` (e.g. `ORG_PORT`, `PROJECT_PORT`, `AUTH_PORT`, `BILLING_PORT`).
3. Swap mock vs production adapters only in `app.config.ts` via `provideDemoAdapters()` or `provideWebAdapters()`.
4. `libs/ports` must not import `@angular/*` or `rxjs`.
5. Route guards are UX-only; backend RLS enforces authorization.

## Nx tags (enforced via eslint depConstraints)

| Tag | May depend on |
|-----|---------------|
| `type:ports` | nothing (leaf layer) |
| `type:ui` | `type:ui` only |
| `type:shared` | `type:ports`, `type:shared` |
| `type:adapters` | `type:ports`, `type:adapters` |
| `type:shell` | `type:ports`, `type:shared`, `type:ui`, `type:shell` |
| `type:features` | `type:ports`, `type:shared`, `type:ui`, `type:shell`, `type:features` |
| `type:app` | all library tags |
| `type:e2e` | all library tags |

## Angular conventions

- Standalone components only (no new NgModules).
- Use `input()`, `output()`, `computed()` — avoid new `@Input` / `@Output`.
- Use `@if`, `@for`, `@switch` — avoid `*ngIf` / `*ngFor`.
- Prefer `resource()` loaders calling port methods — avoid `subscribe()` in templates.
- Functional guards (`canActivateFn`) with `inject()`.
- Typed reactive forms — no untyped `FormGroup`.

## Quality

- Rubric: [Quality Framework v1.0](https://github.com/oequ/quality-framework)
- Self-assessment: [docs/QUALITY.md](./docs/QUALITY.md)

## Do not

- Put Supabase/Firebase/Stripe SDKs in feature components.
- Use `bypassSecurityTrustHtml` without security review.
- Treat route guards as authorization (backend enforces access).
- Import `@angular/*` or `rxjs` in `libs/ports`.
- Push non-English text to the repository (commits, docs, comments).

## Cursor Cloud specific instructions

The startup update script runs `npm install` only. Node 22 + npm 10 are preinstalled; the lockfile was generated with npm 11, so `npm ci` fails (use `npm install`). `npm install` harmlessly rewrites a few `peer:` flags in `package-lock.json` — do not commit that churn.

Two apps; see `## Commands` for the canonical run/lint/test/build commands.

- **Demo (`apps/demo`, port 4200)** — fully self-contained, all mock adapters, no backend. `npx nx serve demo`, sign in with `demo@example.com` / `OequDemo2026!` (pre-filled). This is the frictionless path and works out of the box.
- **Web (`apps/web`, port 4201)** — needs Docker + local Supabase.

### Running the web stack (Docker + Supabase)

Docker is installed in the VM but the daemon may not be running on a fresh boot. If `docker ps` fails: start it with `sudo dockerd` (background) and make the socket usable without sudo (`sudo chmod 666 /var/run/docker.sock`). The daemon is configured for `fuse-overlayfs` with the containerd snapshotter disabled (Docker 29 + Firecracker requirement) in `/etc/docker/daemon.json`.

Then: `npm run db:start` (already uses `--ignore-health-check`) → `npm run db:reset`. Generate the gitignored `apps/web/src/app/supabase.settings.ts` with `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<Publishable key from npm run db:status> node scripts/write-web-supabase-settings.mjs`, then `npm run start:web`.

### Known web gotchas (non-obvious)

- **Committed CSP blocks the browser web app against local Supabase.** `apps/web/src/index.html` sets `connect-src 'self' https://*.supabase.co ...` with no `http://127.0.0.1:*`, so the browser blocks all calls to the local Supabase API (`http://127.0.0.1:54321`). Sign-in/registration in the browser fail with "Authentication failed" and never leave `/auth/login` or `/auth/register`. This is a pre-existing bug, not an environment problem — it is the exact reason the `web-e2e` CI job fails on `main` (`registerUser` never reaches `/onboarding`). The web **backend** (auth + RPCs + RLS) is fully functional via the REST/Auth API; only the in-browser app is blocked until the CSP is fixed.
- **Email confirmation is ON.** `supabase/config.toml` has `enable_confirmations = true`. Signup creates an unconfirmed user with no session. For the browser to route to the OTP page, set `requireEmailConfirmation: true` in `supabase.settings.ts`; read the 6-digit code from Mailpit (`http://127.0.0.1:54324`). For API testing, `POST /auth/v1/verify` with `{"type":"signup","email","token"}`.
- **Service worker cache.** The web production build registers a service worker; a stale SW on `localhost` can keep serving an old cached app (wrong Supabase URL, stale session). `nx serve` does not register one, but if the browser misbehaves on :4201, use an incognito window or DevTools → Application → "Clear site data".
- Auth `site_url`/redirects use `localhost` (not `127.0.0.1`); open the app at `http://localhost:4201`.
