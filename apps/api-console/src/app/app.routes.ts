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
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings.page').then((m) => m.SettingsPageComponent),
        data: { title: 'Settings' },
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
