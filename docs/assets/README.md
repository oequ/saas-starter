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
| `demo-billing-trial.png` | Nova — billing overview (trial banner + Pro plan) |
| `demo-paywall.png` | Nova — Billing overview → **Upgrade plan** → paywall open (Free / Pro / Team cards visible) |
| `demo-help-panel.png` | Parcel — `/workspace/metrics` → **Need help?** → help sheet open (hub: *For this page* + *Browse topics*) |

### Paywall capture tips

1. Switch to **Nova** (trialing Pro plan).
2. Open `/workspace/settings/billing/overview`.
3. Click **Upgrade plan**.
4. Wait until plan cards are loaded (not skeletons).
5. Frame the dialog with all three tiers visible.

### Help panel capture tips

1. Stay on **Parcel** (or any workspace).
2. Open `/workspace/metrics` (shows metrics-specific topics).
3. Click **Need help?** in the header (or press `?`).
4. Capture the hub view — *For this page* list + footer with system status.
