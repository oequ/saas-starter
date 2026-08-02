import type { Provider } from '@angular/core';
import type { ActivationPort } from '@oequ/ports';

import { ACTIVATION_PORT } from './injection-tokens';

/** Bind a concrete ActivationPort implementation to the Angular DI token. */
export function provideActivationPort(impl: ActivationPort): Provider {
  return { provide: ACTIVATION_PORT, useValue: impl };
}
