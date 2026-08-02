import type { Provider } from '@angular/core';
import type { ApiKeysPort } from '@oequ/ports';

import { API_KEYS_PORT } from './injection-tokens';

/** Bind a concrete ApiKeysPort implementation to the Angular DI token. */
export function provideApiKeysPort(impl: ApiKeysPort): Provider {
  return { provide: API_KEYS_PORT, useValue: impl };
}
