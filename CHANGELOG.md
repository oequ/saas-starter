# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Angular 20 + Nx workspace skeleton.
- Supabase client integration with `authGuard`.
- Playwright E2E and Vitest unit testing configuration.
- `supabase/migrations/0000_hardened_baseline.sql` — default-deny on `public` (REVOKE ALL → targeted grants later).
- `supabase/migrations/0001_init_orgs.sql` — org tables, RLS read policies, explicit `GRANT SELECT` only.
- `supabase/seed.sql` — local demo org `demo` (membership linked manually after sign-up).

### Removed
- Permissive dev RLS policies (`WITH CHECK (true)` on `organizations` insert).
