# ADR 0003 — Organization projects (scoped workspaces)

**Status:** Accepted  
**Date:** 2026-05-26

## Context

Many B2B SaaS products need a scope **below organization** but above raw records: client folders, campaigns, boards, or team spaces. The starter already provides organizations (tenant boundary), billing, and org-level members. It does not provide optional **project-scoped** collaboration with finer-grained access.

Downstream products (e.g. AI Media Hub) need private-by-default containers that can be shared with selected teammates without exposing all org data.

## Decision

### 1. Add `organization_projects` and `project_members`

- **`organization_projects`**: belongs to one organization; has `name`, `slug`, `visibility` (MVP: `invited_only` only).
- **`project_members`**: `(project_id, user_id, role)` where role is `owner` | `editor` | `viewer`.
- Creating a project adds the creator as **`owner`**.
- **Default access:** only users listed in `project_members` can read the project (not all org members).

### 2. `ProjectPort` in `libs/ports`

Framework-agnostic contract for CRUD and member management. Product UIs may label projects as "Boards", "Clients", or "Campaigns" via i18n.

### 3. Adapters

- **Mock** (`adapters-mock`) for `apps/demo`.
- **Supabase RPCs** (`data-access-supabase`) for `apps/web`.

### 4. Starter profiles (configurations)

The starter remains **one repository**. Optional capabilities are composed via:

| Profile | Includes | Typical use |
|---------|----------|-------------|
| **Core** | Auth, org, billing, metrics | Default clone |
| **+ Projects** | `ProjectPort`, migrations `0027+` | Multi-scope collaboration |
| **Product fork** | Core + product ports (e.g. generation) | AI Media Hub, vertical SaaS |

Products enable profiles by wiring adapters and running migrations; no separate starter repos required.

## Consequences

- New migration `0027_organization_projects.sql` and Supabase RPCs.
- Org members must be invited to each project they should see.
- Product forks map UI "boards" to `organization_projects` without renaming database tables.
- Future: `project_invitations` for email invites to users not yet in org; link sharing (`invite_only` token).

## References

- [ADR 0001 — Supabase tenant RLS](./0001-supabase-tenant-rls.md)
- [WORKFLOW in product forks](../../ai-saas-starter/docs/WORKFLOW.md) (if synced)
