import { Route } from '@angular/router';
import {
  accountContextGuard,
  authGuard,
  guestGuard,
  onboardingRouteGuard,
  ShellLayoutComponent,
  WorkspaceEntryComponent,
  workspaceContextGuard,
} from '@oequ/shell';

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
    path: 'auth',
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.AuthLegalLayoutComponent),
    children: [
      {
        path: 'terms',
        loadComponent: () =>
          import('@oequ/features-auth').then((m) => m.LegalDocumentPageComponent),
        data: { legalDocId: 'terms' },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('@oequ/features-auth').then((m) => m.LegalDocumentPageComponent),
        data: { legalDocId: 'privacy' },
      },
      {
        path: 'security',
        loadComponent: () =>
          import('@oequ/features-auth').then((m) => m.LegalDocumentPageComponent),
        data: { legalDocId: 'security' },
      },
      {
        path: 'cookies',
        loadComponent: () =>
          import('@oequ/features-auth').then((m) => m.LegalDocumentPageComponent),
        data: { legalDocId: 'cookies' },
      },
    ],
  },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'onboarding',
        canActivate: [onboardingRouteGuard],
        loadComponent: () =>
          import('@oequ/features-org').then((m) => m.OnboardingPageComponent),
        data: { title: 'Onboarding' },
      },
      { path: '', pathMatch: 'full', redirectTo: 'workspace' },
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
        path: 'workspace',
        canActivate: [workspaceContextGuard],
        canActivateChild: [workspaceContextGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: WorkspaceEntryComponent,
          },
          {
            path: 'metrics',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceMetricsPageComponent,
              ),
            data: { title: 'Metrics' },
          },
          {
            path: 'emails',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceEmailsPageComponent,
              ),
            data: { title: 'Emails' },
          },
          {
            path: 'api-keys',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceApiKeysPageComponent,
              ),
            data: { title: 'API keys' },
          },
          {
            path: 'integrations',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceIntegrationsPageComponent,
              ),
            data: { title: 'Integrations' },
          },
          {
            path: 'settings',
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
                children: [
                  {
                    path: '',
                    loadComponent: () =>
                      import('@oequ/features-org').then(
                        (m) => m.WorkspaceSettingsBillingPageComponent,
                      ),
                    data: { title: 'Billing' },
                  },
                  {
                    path: 'overview',
                    redirectTo: '',
                    pathMatch: 'full',
                  },
                  {
                    path: 'invoices',
                    redirectTo: '',
                    pathMatch: 'full',
                  },
                  {
                    path: 'payment',
                    redirectTo: '',
                    pathMatch: 'full',
                  },
                ],
              },
              {
                path: 'usage',
                loadComponent: () =>
                  import('@oequ/features-org').then(
                    (m) => m.WorkspaceSettingsUsagePageComponent,
                  ),
                data: { title: 'Usage' },
              },
            ],
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
