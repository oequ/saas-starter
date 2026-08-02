import type { Provider } from '@angular/core';
import type { MetricsPort } from '@oequ/ports';

import { METRICS_PORT } from './injection-tokens';

/** Bind a concrete MetricsPort implementation to the Angular DI token. */
export function provideMetricsPort(impl: MetricsPort): Provider {
  return { provide: METRICS_PORT, useValue: impl };
}
