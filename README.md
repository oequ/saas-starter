# Oequ Angular + Supabase SaaS Starter

> **Status:** Developer Preview (Skeleton).

An enterprise-grade B2B SaaS starter built with Angular 20, Nx, and Supabase.

## Tech Stack

- **Framework:** Angular 20 (Standalone, Signals, Zoneless ready)
- **Workspace:** Nx 21
- **Backend & Auth:** Supabase (Auth, RLS, Postgres)
- **Testing:** Vitest, Playwright

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

3. Run the development server:
   ```bash
   npm run serve
   ```
   Navigate to `http://localhost:4200/`.

## License

MIT
