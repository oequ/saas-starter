# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0-ui] - 2026-05-19

Billing payment methods, paywall UX, settings polish, PWA docs, and README alignment.

### Added

- `BillingPort`: `listPaymentMethods`, `addPaymentMethod`, `setDefaultPaymentMethod`, `removePaymentMethod`; `PaymentMethod` model and mock card validation (`4242…`, `5555…`)
- Billing settings: payment method list, add-card dialog, default/remove actions, Sonner toasts
- Paywall: stacked **Upgrade checkout** and **Downgrade confirm** dialogs over the plan picker
- Workspace General: workspace icon upload/remove; profile save toasts
- Demo PWA: web manifest, Angular service worker (production / GitHub Pages builds), icon generator script
- Playwright E2E: add payment method on Lumen

### Changed

- Billing page: unified `/workspace/settings/billing` only (legacy `/billing/overview`, `/invoices`, `/payment` redirect)
- README + `docs/assets/README.md`: billing/paywall/PWA capture notes; `package.json` version `0.4.0-ui`
- Mock fixtures: Parcel Team 4/50 seats with seeded Visa; Nova trialing with seeded Mastercard

### Removed

- **Manage billing** button from Payment Methods footer (cards managed in-app; `createPortalSession` kept on port for future portal link)

## [0.3.0-ui] - 2026-05-16

Workspace billing demo on mock ports: sidebar IA, upgrade funnel, seat limits, Playwright E2E, and README screenshots.

### Added

- `BillingPort` extensions, `billing.utils`, mock billing fixtures (Parcel Team, Nova trialing)
- Billing settings: plan summary, invoices table, payment portal stub, mock upgrade dialog
- Shell: collapsible Billing nav, trial/past-due status banner (workspace only)
- Members: seat usage meter, disable invite when seats exhausted, CTA to billing
- Playwright E2E (`apps/demo-e2e`): upgrade funnel, seat block, billing nav
- README billing previews and `docs/assets/demo-billing.png` (regenerate via `UPDATE_SCREENSHOTS=1`)

### Changed

- Billing routes: `/workspace/settings/billing/overview|invoices|payment`
- Package version tag line: `0.3.0-ui`

## [0.1.0-ui] - 2026-05-16

First publishable UI kit milestone: demo app, shell layout, and org settings on mock ports.

### Added

- Nx 22 monorepo with Angular 21 and Spartan UI (`libs/ui`)
- Port contracts: `AuthPort`, `OrgPort`, `BillingPort` (`libs/ports`)
- Mock adapters for local demo (`libs/adapters-mock`)
- App shell: sidebar, sticky header, breadcrumbs, org switcher (`libs/shell`)
- Org settings: General (name), Members, Billing placeholder, danger zone (`libs/features-org`)
- Demo app with lazy-loaded settings route (`apps/demo`)
- README preview screenshot (`docs/assets/demo-settings.png`)
- GitHub Actions CI: lint and production build

### Changed

- Org switcher moved to sidebar header (Vercel Account Settings alignment)
- Save enabled only when organization name changed (dirty-aware)
- Form validation: name 2–64 characters, trimmed on save

### Removed

- Nx default welcome screen from demo app
