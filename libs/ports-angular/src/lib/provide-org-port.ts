import type { Provider } from '@angular/core';
import type { OrgPort } from '@oequ/ports';

import { ORG_PORT } from './injection-tokens';

/** Bind a concrete OrgPort implementation to the Angular DI token. */
export function provideOrgPort(impl: OrgPort): Provider {
  return { provide: ORG_PORT, useValue: impl };
}
