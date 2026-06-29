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

## Do not

- Put Supabase/Firebase/Stripe SDKs in feature components.
- Use `bypassSecurityTrustHtml` without security review.
- Treat route guards as authorization (backend enforces access).
- Import `@angular/*` or `rxjs` in `libs/ports`.
- Push non-English text to the repository (commits, docs, comments).
