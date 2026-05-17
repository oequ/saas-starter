import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideDemoAdapters } from '@oequ/adapters-mock';
import { ThemeService } from '@oequ/shell';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideDemoAdapters(),
    provideAppInitializer(() => {
      inject(ThemeService).init();
    }),
  ],
};
