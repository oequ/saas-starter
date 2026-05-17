import { Route } from '@angular/router';
import {
  accountContextGuard,
  ShellLayoutComponent,
  workspaceContextGuard,
} from '@oequ/shell';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'workspace/settings/general' },
      {
        path: 'account',
        canActivate: [accountContextGuard],
        loadComponent: () =>
          import('@oequ/features-auth').then(
            (m) => m.AccountSettingsLayoutComponent,
          ),
        data: { title: 'Account settings', settingsContext: 'account' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'profile' },
          {
            path: 'profile',
            loadComponent: () =>
              import('@oequ/features-auth').then(
                (m) => m.AccountProfilePageComponent,
              ),
            data: { title: 'Profile' },
          },
          {
            path: 'security',
            loadComponent: () =>
              import('@oequ/features-auth').then(
                (m) => m.AccountSecurityPageComponent,
              ),
            data: { title: 'Security' },
          },
          {
            path: 'sessions',
            loadComponent: () =>
              import('@oequ/features-auth').then(
                (m) => m.AccountSessionsPageComponent,
              ),
            data: { title: 'Sessions' },
          },
        ],
      },
      {
        path: 'workspace/settings',
        canActivate: [workspaceContextGuard],
        loadComponent: () =>
          import('@oequ/features-org').then(
            (m) => m.WorkspaceSettingsLayoutComponent,
          ),
        data: { title: 'Workspace settings', settingsContext: 'workspace' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'general' },
          {
            path: 'general',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceSettingsGeneralPageComponent,
              ),
            data: { title: 'General' },
          },
          {
            path: 'members',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceSettingsMembersPageComponent,
              ),
            data: { title: 'Members' },
          },
          {
            path: 'billing',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceSettingsBillingPageComponent,
              ),
            data: { title: 'Billing' },
          },
        ],
      },
      {
        path: 'settings',
        redirectTo: 'workspace/settings/general',
        pathMatch: 'full',
      },
    ],
  },
];
