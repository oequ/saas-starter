import type { Provider } from '@angular/core';
import type { SupportPort } from '@oequ/ports';

import { SUPPORT_PORT } from './injection-tokens';

/** Bind a concrete SupportPort implementation to the Angular DI token. */
export function provideSupportPort(impl: SupportPort): Provider {
  return { provide: SUPPORT_PORT, useValue: impl };
}
