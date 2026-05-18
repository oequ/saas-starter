# angular-saas-starter-ui

Angular B2B SaaS shell — layout, org settings, auth UI. **You bring the API.**

Standalone UI monorepo (Spartan + Tailwind v4). Implement `@oequ/ports` against your API. For Supabase, RLS, and tenant isolation at the database layer, see the full-stack starter: [oequ/saas-starter](https://github.com/oequ/saas-starter).

**Current UI release:** `v0.3.0-ui` — workspace billing (mock), seat limits, shell trial banner.

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

## Live demo (GitHub Pages)

After enabling **Pages → Source: GitHub Actions** in the repo settings:

**https://oequ.github.io/angular-saas-starter-ui/**

## Preview

### Workspace settings (General)

![Workspace settings — General](./docs/assets/demo-settings.png)

### Billing (Overview, invoices, trial)

Collapsible **Billing** in the workspace sidebar: Overview · Invoices · Payment method. Mock orgs:

| Workspace | Billing state | Demo purpose |
|-----------|---------------|--------------|
| **Acme Corp** | Active, 5/5 seats | Seat meter + invite blocked on Members |
| **Globex** | Trialing | Shell trial banner + mock upgrade funnel |

![Billing — plan summary and seats](./docs/assets/demo-billing-overview.png)

![Billing — invoices](./docs/assets/demo-billing-invoices.png)

![Billing — trial workspace (Globex)](./docs/assets/demo-billing-trial.png)

### Members — seat limit (Acme)

![Members — seat limit reached](./docs/assets/demo-members-seats.png)

## Monorepo layout

```text
apps/demo              # Runnable demo (mock adapters)
apps/demo-e2e          # Playwright E2E
libs/ports             # AuthPort, OrgPort, BillingPort — interfaces only
libs/shell             # App layout (sidebar, header, billing banner)
libs/features-org      # Workspace settings (general, members, billing)
libs/ui                # Spartan helm components (@spartan-ng/helm/*)
libs/adapters-mock     # Mock port implementations for demo
```

## Quality

This project follows the open **[Quality Framework](https://github.com/oequ/quality-framework)** (rubric + maturity levels for Angular B2B SaaS).

- Self-assessment: [docs/QUALITY.md](./docs/QUALITY.md)
- Rubric v1.0: [docs/rubric](https://github.com/oequ/quality-framework/tree/main/docs/rubric)

## Scripts

| Command | Description |
|---------|-------------|
| `npx nx serve demo` | Dev server |
| `npx nx build demo` | Production build |
| `npm run e2e` | Playwright E2E (billing + shell smoke) |
| `npx nx run-many -t lint --all` | Lint all projects |
| `npx nx run-many -t test --all` | Unit tests |

## License

MIT — see [LICENSE](./LICENSE).
