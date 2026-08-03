# React shell (`apps/web-react`)

Статус: agent notes for this app only  
Не путать с Angular `apps/web` / Spartan.

## Stack

- Vite + React, composition root via plain `new` (no Angular DI).
- Ports: `@oequ/ports` — Auth + Org only in this shell.
- Modes: `VITE_OEQU_PORTS=mock` (default) or `supabase`.

## Design system

- **Not Spartan.** Do not use `@spartan-ng/helm/*`, `@spartan-ng/mcp`, or Angular shell tokens.
- Style with local [`src/styles.css`](./src/styles.css) CSS variables (Syne/Manrope, cool stone/teal).
- Prefer extending existing Sign-in / Workspace composition over new card-heavy layouts.

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

Register/forgot, settings, billing, api-keys, dual-UI with Angular.
