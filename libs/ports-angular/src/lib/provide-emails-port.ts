import type { Provider } from '@angular/core';
import type { EmailsPort } from '@oequ/ports';

import { EMAILS_PORT } from './injection-tokens';

/** Bind a concrete EmailsPort implementation to the Angular DI token. */
export function provideEmailsPort(impl: EmailsPort): Provider {
  return { provide: EMAILS_PORT, useValue: impl };
}
