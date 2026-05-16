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
          import('./pages/settings-placeholder.component').then(
            (m) => m.SettingsPlaceholderComponent,
          ),
        data: { title: 'Settings' },
      },
    ],
  },
];
