import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSettings } from '@ng-icons/lucide';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { filter, map } from 'rxjs';

import { OrgSwitcherComponent } from './org-switcher.component';

interface ShellNavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly exact: boolean;
}

@Component({
  selector: 'oequ-shell-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HlmSidebarImports,
    HlmBreadcrumbImports,
    NgIcon,
    HlmIcon,
    OrgSwitcherComponent,
  ],
  templateUrl: './shell-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideSettings }),
  ],
})
export class ShellLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly navItems: readonly ShellNavItem[] = [
    {
      label: 'Settings',
      path: '/settings',
      icon: 'lucideSettings',
      exact: true,
    },
  ];

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveTitle()),
    ),
    { initialValue: 'Settings' },
  );

  private resolveTitle(): string {
    let active = this.route;
    while (active.firstChild) {
      active = active.firstChild;
    }
    const title = active.snapshot?.data?.['title'];
    return typeof title === 'string' ? title : 'Settings';
  }
}
