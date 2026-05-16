# angular-saas-starter-ui

Angular B2B SaaS shell — layout, org settings, auth UI. **You bring the API.**

Standalone UI monorepo (Spartan + Tailwind v4). Implement `@oequ/ports` against your API. For Supabase, RLS, and tenant isolation at the database layer, see the full-stack starter: [oequ/saas-starter](https://github.com/oequ/saas-starter).

## Stack

- Angular 21 · Nx 22
- [Spartan UI](https://spartan.ng) (`@spartan-ng/brain`, helm in `libs/ui`)
- Tailwind CSS v4

## Quick start

```bash
npm install
npx nx serve demo
```

Open http://localhost:4200

## Monorepo layout

```text
apps/demo              # Runnable demo (mock adapters later)
libs/ports             # AuthPort, OrgPort — interfaces only
libs/shell             # App layout (sidebar, header)
libs/ui                # Spartan helm components (@spartan-ng/helm/*)
libs/adapters-mock     # Mock port implementations for demo
```

## Scripts

| Command | Description |
|---------|-------------|
| `npx nx serve demo` | Dev server |
| `npx nx build demo` | Production build |
| `npx nx run-many -t lint --all` | Lint all projects |
| `npx nx run-many -t test --all` | Unit tests |

## Product plan

Architecture and integration with the full-stack repo: [ANGULAR_SAAS_STARTER_UI.md](https://github.com/oequ/saas-starter/blob/main/docs/ANGULAR_SAAS_STARTER_UI.md) (in `oequ/saas-starter`).

## License

MIT — see [LICENSE](./LICENSE).
