import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideWebAdapters } from '@oequ/data-access-supabase';
import { LocalePreferenceService, provideOequI18n } from '@oequ/i18n';
import {
  CookieConsentService,
  provideShellConfig,
  ThemeService,
} from '@oequ/shell';

import { appRoutes } from './app.routes';
import { apiConsoleSupabaseSettings } from './supabase.settings';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideOequI18n(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    ...provideWebAdapters(apiConsoleSupabaseSettings),
    provideShellConfig({ mode: 'api', postAuthRoute: 'overview' }),
    provideAppInitializer(() => {
      inject(ThemeService).init();
      inject(CookieConsentService).init();
    }),
    provideAppInitializer(() => inject(LocalePreferenceService).init()),
  ],
};
