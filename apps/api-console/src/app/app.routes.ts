import { Route } from '@angular/router';
import {
  accountContextGuard,
  authGuard,
  guestGuard,
  workspaceContextGuard,
} from '@oequ/shell';

import { ApiConsoleShellComponent } from './shell/api-console-shell.component';

export const appRoutes: Route[] = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.LoginPageComponent),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'auth/confirm-email',
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.ConfirmEmailPageComponent),
  },
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.ForgotPasswordPageComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.ResetPasswordPageComponent),
  },
  {
    path: 'auth/status',
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.SystemStatusPageComponent),
  },
  {
    path: 'showcase',
    loadComponent: () =>
      import('./showcase/showcase.page').then((m) => m.ShowcasePageComponent),
  },
  {
    path: '',
    component: ApiConsoleShellComponent,
    canActivate: [authGuard, workspaceContextGuard],
    canActivateChild: [authGuard, workspaceContextGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview.page').then((m) => m.OverviewPageComponent),
        data: { title: 'Overview' },
      },
      {
        path: 'keys',
        loadComponent: () =>
          import('@oequ/features-org').then(
            (m) => m.WorkspaceApiKeysPageComponent,
          ),
        data: { title: 'API Keys' },
      },
      {
        path: 'playground',
        loadComponent: () =>
          import('./pages/playground.page').then((m) => m.PlaygroundPageComponent),
        data: { title: 'Playground' },
      },
      {
        path: 'metered-usage',
        loadComponent: () =>
          import('./pages/metered-usage.page').then(
            (m) => m.MeteredUsagePageComponent,
          ),
        data: { title: 'Usage' },
      },
      {
        path: 'docs',
        loadComponent: () =>
          import('./pages/docs.page').then((m) => m.DocsPageComponent),
        data: { title: 'Get started' },
      },
      {
        path: 'account',
        canActivate: [accountContextGuard],
        loadComponent: () =>
          import('./pages/account.page').then((m) => m.AccountPageComponent),
        data: { title: 'Account' },
      },
    ],
  },
  { path: '**', redirectTo: 'overview' },
];
