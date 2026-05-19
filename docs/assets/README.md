# README screenshots

PNG previews for [README.md](../../README.md). Commit them to this folder so they render on GitHub.

## Regenerate (Playwright)

```bash
UPDATE_SCREENSHOTS=1 npm run screenshots
```

Requires the demo app served by Playwright (`nx e2e demo-e2e`). Viewport: **1280×800**.

## Manual drop-in

You can replace any file below with your own capture (same filename, PNG, ~1280px wide).

| File | Route / state |
|------|----------------|
| `demo-onboarding.png` | Parcel — `/onboarding` (activation checklist) |
| `demo-metrics.png` | Parcel — `/workspace/metrics` |
| `demo-api-keys.png` | Parcel — `/workspace/api-keys` (empty state) |
| `demo-members.png` | Nova — `/workspace/settings/members` (member list, seats hint) |
| `demo-settings.png` | Parcel — `/workspace/settings/general` |
| `demo-billing-overview.png` | Parcel — `/workspace/settings/billing/overview` |
| `demo-billing-invoices.png` | Parcel — `/workspace/settings/billing/invoices` |
| `demo-billing-payment.png` | Parcel — `/workspace/settings/billing/payment` |
| `demo-billing-trial.png` | Nova — billing overview (trial banner + Starter plan) |
| `demo-members-seats.png` | Parcel — `/workspace/settings/members` (seat limit banner) |
