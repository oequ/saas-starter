import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideWebAdapters } from '@oequ/data-access-supabase';
import { LocalePreferenceService, provideOequI18n } from '@oequ/i18n';
import { ACTIVATION_ONBOARDING_CONFIG, HELP_PANEL_PORT } from '@oequ/ports';

import { DEMO_EMAIL_ACTIVATION_CONFIG } from './demo-activation.config';
import {
  CookieConsentService,
  HelpPanelService,
  ThemeService,
} from '@oequ/shell';
import { appRoutes } from './app.routes';
import { webSupabaseSettings } from './supabase.settings';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideOequI18n(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    ...provideWebAdapters(webSupabaseSettings),
    {
      provide: ACTIVATION_ONBOARDING_CONFIG,
      useValue: DEMO_EMAIL_ACTIVATION_CONFIG,
    },
    { provide: HELP_PANEL_PORT, useExisting: HelpPanelService },
    provideAppInitializer(() => {
      inject(ThemeService).init();
      inject(CookieConsentService).init();
    }),
    provideAppInitializer(() => inject(LocalePreferenceService).init()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
