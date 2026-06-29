# Contributing

Thank you for considering a contribution to **Oequ SaaS Starter**.

## Getting started

```bash
npm install
npx nx serve demo        # mock demo at localhost:4200
```

For the full-stack app see the [README](./README.md#full-stack-supabase-local).

## Development workflow

1. **Branch** from `main` with a descriptive name (`fix/...`, `feat/...`, `docs/...`).
2. Make changes — one logical change per commit.
3. Run checks locally before pushing:

```bash
npx nx run-many -t lint
npx nx run-many -t test --projects=ports
npx nx build web
```

4. Open a pull request against `main`.

## Architecture rules

- Features depend on `@oequ/ports` tokens only — never import adapters or Supabase/Stripe SDKs.
- Standalone components only — no `NgModule`.
- Signal-first: `input()`, `output()`, `computed()`, `resource()`.
- Built-in control flow: `@if`, `@for`, `@switch`.
- See [AGENTS.md](./AGENTS.md) for the full constraint table.

## Commit messages

Use a short imperative subject line:

```
fix(auth): handle expired session gracefully
feat(billing): add invoice PDF download
docs: update STRIPE_LOCAL runbook
```

## Code style

- Prettier formats on save (see `.prettierrc`).
- ESLint enforces Angular, TypeScript, and Nx boundary rules.
- All repository text (commits, comments, docs) must be in English.

## Reporting bugs

Open a [GitHub issue](../../issues) with steps to reproduce, expected vs actual behavior, and browser/OS info.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](./LICENSE).
