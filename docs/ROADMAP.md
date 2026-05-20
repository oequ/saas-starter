# Product roadmap — angular-saas-starter-ui

Living backlog for **angular-saas-starter-ui** (UI kit + mock demo).  
Last updated: **2026-05-19** (after billing, paywall, cookie consent, settings polish).

Aligns with [QUALITY.md](./QUALITY.md) (L1 target) and full-stack wiring in [oequ/saas-starter](https://github.com/oequ/saas-starter).

---

## Already shipped (baseline — do not re-litigate)

- Billing: subscription plan, invoices, in-app payment methods (add / default / remove)
- Paywall: plan picker + stacked upgrade checkout / downgrade confirm dialogs
- Workspace General: rename, icon upload/remove, Sonner toasts
- Cookie consent: GDPR-style banner (reject / accept / manage preferences), user-menu reopen
- Members, API keys, metrics, onboarding activation (mock ports)
- Account sessions (list / revoke), integrations (mock)
- Legal pages (demo copy): terms, privacy, security, cookies
- PWA on demo (production / GitHub Pages builds)

---

## P0 — UI promises, no real flow (demo trust)

Highest impact: routes and forms exist; user hits dead ends.

| Item | Current state | Target |
|------|---------------|--------|
| `/account/security` | Forms + “v0.3” toasts | `AuthPort`: `changePassword`, 2FA setup stub, connected accounts |
| Account profile | Email change / delete account toasts only | Port + mock persistence + dialogs |
| Forgot password | `setTimeout` only | `requestPasswordReset` on `AuthPort` + success UX |
| Cancel subscription | `BillingPort.cancelSubscription` only | Billing UI: cancel at period end + confirm dialog |

**Suggested order:** security + forgot password → cancel subscription → profile email/delete.

---

## P1 — Production path (starter as a product)

| Item | Why |
|------|-----|
| Real billing adapter | Stripe Setup Intent + Elements; wire to saas-starter backend |
| `adapters-http` (or doc + sample) | How to replace `provideDemoAdapters()` in `app.config` |
| Auth adapter (HTTP) | Reset password, verify email, OAuth — match UI hints |
| Cookie → scripts | Load analytics only after `CookieConsentService.hasOptionalConsent('analytics')` |

---

## P2 — Repo quality (public L1)

From [QUALITY.md](./QUALITY.md):

| Item | Status |
|------|--------|
| Root `AGENTS.md` | Missing |
| `@nx/enforce-module-boundaries` in CI | Verify / enforce |
| Scored rubric pass | In progress |
| Security docs (CSP, HttpOnly, tokens) | Demo mock only; document for L2 |
| README screenshots | Refresh billing, paywall; add `demo-cookie-consent.png` |
| Playwright in CI | E2E exists; stabilize for Pages / ports |

---

## P3 — UX polish (lower blocker)

| Item | Idea |
|------|------|
| Cookie settings on auth pages | Link on login/register besides banner + user menu |
| Consistent toasts | Security/profile still use inline `statusMessage` |
| Help / support form | Confirm `SupportPort` submit path end-to-end |
| Legal copy | Replace demo text with counsel-reviewed templates |
| Bundle budget | Initial bundle ~830 KB — address or raise budgets |

---

## P4 — Strategic (post v0.4)

- Zoneless Angular
- i18n / locales
- Enterprise SSO/SAML UI (Usage “locked” rows remain demo-only until then)
- OpenSSF Scorecard
- Git tag **v0.4.0-ui** + GitHub release notes

---

## Recommended next 2–3 sprints

### Sprint A — Demo credibility

1. Account security + forgot password (ports + mock)
2. Cancel subscription UI on billing
3. Profile: delete account + change email (mock)

### Sprint B — Quality gate

1. `AGENTS.md` + Nx boundaries in CI
2. README screenshots + E2E smoke in CI
3. QUALITY.md scored pass

### Sprint C — Production wiring

1. Stripe / billing HTTP adapter (with saas-starter)
2. Auth HTTP adapter (reset, verify)
3. Cookie-gated analytics example

---

## Out of scope (this repo)

- Database / RLS / Supabase (see saas-starter)
- Real email delivery (activation demo is pluggable fiction)
- Counsel-final legal text (provide structure only)

---

## How to use this doc

- Pick a **priority band** (P0–P4), open a GitHub issue with the table row title.
- When an item ships, move it to **Already shipped** and note the release in [CHANGELOG.md](../CHANGELOG.md).
