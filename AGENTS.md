# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is an Angular B2B SaaS starter (Nx monorepo) with two apps:
- **`apps/demo`** — fully mock, no database needed (port 4200)
- **`apps/web`** — full-stack with Supabase backend (port 4201)

Standard commands are in `package.json` scripts and [README.md](./README.md).

### Prerequisites (already in VM environment)

- Node.js >=22, npm >=11
- Docker (required for Supabase local stack)

### Running services

1. **Demo app** (no external deps): `npx nx serve demo` → http://localhost:4200  
   Login: `demo@example.com` / `OequDemo2026!` (pre-filled)

2. **Web app** (needs Supabase running):
   ```
   npm run db:start
   npm run db:reset
   npm run start:web
   ```
   → http://localhost:4201  
   Register a new user; local Supabase auto-confirms emails.

3. **Supabase settings file**: Before serving `web`, ensure `apps/web/src/app/supabase.settings.ts` exists. Copy from `supabase.settings.example.ts` and paste the Publishable key from `npm run db:status`. This file is gitignored.

### Non-obvious gotchas

- **Docker daemon must be running** before `npm run db:start`. Start it with `sudo dockerd &>/tmp/dockerd.log &` and ensure socket permissions: `sudo chmod 666 /var/run/docker.sock`.
- **fuse-overlayfs storage driver** is required in nested Docker environments (Cloud Agent VMs). The daemon config at `/etc/docker/daemon.json` must set `"storage-driver": "fuse-overlayfs"`. Also switch to iptables-legacy.
- **Supabase analytics and storage are disabled** in `supabase/config.toml` (not needed for auth/org). This is intentional; don't re-enable.
- **npm >=11** is required by `engines` but Node 22 ships with npm 10. Upgrade npm globally: `npx npm@11 install -g npm@11` (from the Node lib directory).
- **Lint has pre-existing warnings**: Some UI libs have directive-selector prefix warnings. These are known and not blocking.
- **Unit tests**: Some projects (`shell`, `adapters-mock`, `ui`) have empty/placeholder test files that fail with "no tests found". This is pre-existing.
- **`supabase.settings.ts`** is gitignored. The anon key changes each time `db:reset` runs (it's deterministic for a given Supabase project_id, but regenerate if you see auth errors).

### Key commands reference

| Task | Command |
|------|---------|
| Lint all | `npm run lint` |
| Unit tests | `npx nx run-many -t test --all` |
| E2E (demo) | `npm run e2e` |
| E2E (web, needs Supabase) | `npm run e2e:web:release` |
| Build demo | `npx nx build demo` |
| Supabase status | `npm run db:status` |
| Supabase stop | `npm run db:stop` |
