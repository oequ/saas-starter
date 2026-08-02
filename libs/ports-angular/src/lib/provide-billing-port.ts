import type { Provider } from '@angular/core';
import type { BillingPort } from '@oequ/ports';

import { BILLING_PORT } from './injection-tokens';

/** Bind a concrete BillingPort implementation to the Angular DI token. */
export function provideBillingPort(impl: BillingPort): Provider {
  return { provide: BILLING_PORT, useValue: impl };
}
