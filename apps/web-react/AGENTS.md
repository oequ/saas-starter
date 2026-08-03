# React shell (`apps/web-react`)

Статус: agent notes for this app only  
Не путать с Angular `apps/web` / Spartan helm.

## Stack

- Vite + React, composition root via plain `new` (no Angular DI).
- Ports: `@oequ/ports` — Auth + Org only in this shell.
- Modes: `VITE_OEQU_PORTS=mock` (default) or `supabase`.

## Design system

- **React DS = shadcn/ui (Radix) + Angular oklch zinc tokens** from [`apps/web/src/styles.css`](../web/src/styles.css).
- Tokens live in [`src/styles.css`](./src/styles.css). Primitives in [`src/components/ui`](./src/components/ui).
- Config: [`components.json`](./components.json). Utils: [`src/lib/utils.ts`](./src/lib/utils.ts) (`cn`).
- **Not Spartan.** Do not use `@spartan-ng/helm/*`, `@spartan-ng/mcp`, or Angular `libs/ui`.
- Add components: from `apps/web-react` run `npx shadcn@latest add <name> -y` (prefer Radix; keep tokens in sync with Angular web).

## Ports wiring

- Mock: [`src/ports/create-demo-ports.ts`](./src/ports/create-demo-ports.ts)
- Supabase: [`src/ports/create-web-ports.ts`](./src/ports/create-web-ports.ts) → `createWebPorts`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OEQU_PORTS=supabase`

## Run

```bash
npm run start:web-react
# Supabase:
# VITE_OEQU_PORTS=supabase VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run start:web-react
```

## Out of scope (for now)

Register/forgot, settings, billing, api-keys, dual-UI with Angular, full helm→shadcn inventory.
