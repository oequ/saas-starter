import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideDemoAdapters } from '@oequ/adapters-mock';
import { ACTIVATION_ONBOARDING_CONFIG } from '@oequ/ports';

import { DEMO_EMAIL_ACTIVATION_CONFIG } from './demo-activation.config';
import { ThemeService } from '@oequ/shell';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideDemoAdapters(),
    {
      provide: ACTIVATION_ONBOARDING_CONFIG,
      useValue: DEMO_EMAIL_ACTIVATION_CONFIG,
    },
    provideAppInitializer(() => {
      inject(ThemeService).init();
    }),
  ],
};
