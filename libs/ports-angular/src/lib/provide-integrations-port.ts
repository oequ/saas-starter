import type { Provider } from '@angular/core';
import type { IntegrationsPort } from '@oequ/ports';

import { INTEGRATIONS_PORT } from './injection-tokens';

/** Bind a concrete IntegrationsPort implementation to the Angular DI token. */
export function provideIntegrationsPort(impl: IntegrationsPort): Provider {
  return { provide: INTEGRATIONS_PORT, useValue: impl };
}
