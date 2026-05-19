import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideDemoAdapters } from '@oequ/adapters-mock';
import { ACTIVATION_ONBOARDING_CONFIG, HELP_PANEL_PORT } from '@oequ/ports';

import { DEMO_EMAIL_ACTIVATION_CONFIG } from './demo-activation.config';
import { HelpPanelService, ThemeService } from '@oequ/shell';
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
    { provide: HELP_PANEL_PORT, useExisting: HelpPanelService },
    provideAppInitializer(() => {
      inject(ThemeService).init();
    }),
  ],
};
