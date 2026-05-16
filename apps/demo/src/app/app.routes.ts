import { Route } from '@angular/router';
import { ShellLayoutComponent } from '@oequ/shell';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'settings' },
      {
        path: 'settings',
        loadComponent: () =>
          import('@oequ/features-org').then((m) => m.OrgSettingsPageComponent),
        data: { title: 'Settings' },
      },
    ],
  },
];
