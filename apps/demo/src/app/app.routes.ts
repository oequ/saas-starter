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
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@oequ/features-auth').then((m) => m.ForgotPasswordPageComponent),
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
            path: 'api-keys',
            loadComponent: () =>
              import('@oequ/features-org').then(
                (m) => m.WorkspaceApiKeysPageComponent,
              ),
            data: { title: 'API keys' },
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
                  { path: '', pathMatch: 'full', redirectTo: 'overview' },
                  {
                    path: 'overview',
                    loadComponent: () =>
                      import('@oequ/features-org').then(
                        (m) => m.WorkspaceSettingsBillingPageComponent,
                      ),
                    data: { title: 'Overview', billingSection: 'overview' },
                  },
                  {
                    path: 'invoices',
                    loadComponent: () =>
                      import('@oequ/features-org').then(
                        (m) => m.WorkspaceSettingsBillingPageComponent,
                      ),
                    data: { title: 'Invoices', billingSection: 'invoices' },
                  },
                  {
                    path: 'payment',
                    loadComponent: () =>
                      import('@oequ/features-org').then(
                        (m) => m.WorkspaceSettingsBillingPageComponent,
                      ),
                    data: { title: 'Payment method', billingSection: 'payment' },
                  },
                ],
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
