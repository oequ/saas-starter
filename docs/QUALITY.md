# Quality self-assessment

Assessment of **angular-saas-starter-ui** against [Quality Framework v1.0](https://github.com/oequ/quality-framework).

| Field | Value |
|-------|--------|
| **Rubric version** | Quality Framework v1.0 |
| **Assessment date** | 2026-05-17 |
| **Total score** | In progress (not yet scored) |
| **Maturity level** | L1 target (self-assessed, in progress) |

## Summary

This repo aligns with several architecture **Must** criteria: ports without Angular imports, mock adapters, feature-sliced libs, Playwright E2E, and SaaS flows (billing, members, org switcher). Gaps to close before claiming **L1** publicly include published `AGENTS.md`, `@nx/enforce-module-boundaries` in CI, and production-grade security (CSP, token storage) documented separately from the demo mock.

## Strengths

- `libs/ports` — framework-free contracts; `PortResult` error model
- `libs/adapters-mock` — runnable demo without backend
- Playwright E2E — auth, onboarding, billing, members
- Spartan UI + Tailwind v4; signal-first components in active development
- Members invite/remove/change role via `OrgPort`

## Known gaps (honest)

| Area | Status |
|------|--------|
| AGENTS.md | Not yet in repo root |
| Nx boundary enforcement in CI | To be verified/enforced |
| Zoneless (NG1/NG2) | Not adopted; zone.js still in use |
| Production CSP / HttpOnly auth | Demo mock only; document before L2 |
| OpenSSF Scorecard | Not configured |

## Next actions

1. Add root `AGENTS.md` from [quality-framework template](https://github.com/oequ/quality-framework/blob/main/templates/AGENTS.md.template)
2. Enable `@nx/enforce-module-boundaries` and fail CI on violations
3. Complete scored rubric pass and update total score

Full rubric: [github.com/oequ/quality-framework/tree/main/docs/rubric](https://github.com/oequ/quality-framework/tree/main/docs/rubric)
