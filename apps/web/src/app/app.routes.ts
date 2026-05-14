import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/app-home/app-home.page').then((m) => m.AppHomePage),
  },
  {
    path: 'orgs/:slug',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/org-shell/org-shell.page').then((m) => m.OrgShellPage),
  },
  { path: '**', redirectTo: '' },
];
