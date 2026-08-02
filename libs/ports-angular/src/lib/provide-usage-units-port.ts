import type { Provider } from '@angular/core';
import type { UsageUnitsPort } from '@oequ/ports';

import { USAGE_UNITS_PORT } from './injection-tokens';

/** Bind a concrete UsageUnitsPort implementation to the Angular DI token. */
export function provideUsageUnitsPort(impl: UsageUnitsPort): Provider {
  return { provide: USAGE_UNITS_PORT, useValue: impl };
}
