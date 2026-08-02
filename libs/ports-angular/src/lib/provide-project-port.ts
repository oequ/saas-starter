import type { Provider } from '@angular/core';
import type { ProjectPort } from '@oequ/ports';

import { PROJECT_PORT } from './injection-tokens';

/** Bind a concrete ProjectPort implementation to the Angular DI token. */
export function provideProjectPort(impl: ProjectPort): Provider {
  return { provide: PROJECT_PORT, useValue: impl };
}
