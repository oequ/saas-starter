# ports

Framework-agnostic port interfaces, models, and utils for Oequ starters.

Angular DI tokens live in `@oequ/ports-angular`.

```ts
import type { AuthPort } from '@oequ/ports';
import { AUTH_PORT } from '@oequ/ports-angular';
```

## Building

Run `nx build ports` to build the library.

## Running unit tests

Run `nx test ports` to execute the unit tests via [Vitest](https://vitest.dev/).

## Purity guard

```bash
node scripts/check-ports-pure.mjs
```
