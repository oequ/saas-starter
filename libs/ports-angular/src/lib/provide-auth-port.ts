import type { Provider } from '@angular/core';
import type { AuthPort } from '@oequ/ports';

import { AUTH_PORT } from './injection-tokens';

/** Bind a concrete AuthPort implementation to the Angular DI token. */
export function provideAuthPort(impl: AuthPort): Provider {
  return { provide: AUTH_PORT, useValue: impl };
}
