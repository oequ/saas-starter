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
| `demo-billing.png` | Parcel — `/workspace/settings/billing` (subscription + invoices + payment methods list) |
| `demo-usage.png` | Nova — `/workspace/settings/usage` (meters + locked SSO / image transforms with Upgrade) |
| `demo-paywall.png` | Nova — Billing → **Change subscription plan** → paywall open (Free / Pro / Team cards visible) |
| `demo-cookie-consent.png` | Login — `/auth/login` with bottom cookie banner visible (Reject all / Accept all / Manage preferences) |
| `demo-help-panel.png` | Parcel — `/workspace/metrics` → **Need help?** → help sheet open (hub: *For this page* + *Browse topics*) |

### Paywall capture tips

1. Switch to **Nova** (trialing Pro plan).
2. Open `/workspace/settings/billing`.
3. Click **Change subscription plan**.
4. Wait until plan cards are loaded (not skeletons).
5. Frame the main paywall with all three tiers visible (screenshot is the plan picker only, not the stacked upgrade/downgrade dialogs).

### Cookie consent capture tips

1. Open `/auth/login` in a private window (or clear `oequ-cookie-consent` in localStorage).
2. Wait for the bottom **Cookie consent** bar — do not click any button.
3. Frame the banner and login card; ~1280px wide PNG as `demo-cookie-consent.png`.

### Help panel capture tips

1. Stay on **Parcel** (or any workspace).
2. Open `/workspace/metrics` (shows metrics-specific topics).
3. Click **Need help?** in the header (or press `?`).
4. Capture the hub view — *For this page* list + footer with system status.

### Billing capture tips

1. **Parcel** — `/workspace/settings/billing`, full-page scroll: all three cards; Payment Methods shows seeded **Visa •••• 4242** and **Add payment method** (no Manage billing button).
2. **Nova** — same route with trial banner at top of viewport.
3. **Lumen** — optional second shot: empty payment methods + open **Add payment method** dialog (test card hint visible).

### Usage capture tips

1. Switch to **Nova** (Pro trial — shows locked premium rows).
2. Open `/workspace/settings/usage`.
3. Capture full card: header, Usage Summary sidebar, and 2-column meter grid.

Legacy URLs (`/billing/overview`, `/invoices`, `/payment`) redirect to the unified page.
