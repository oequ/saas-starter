import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  lucideMonitor,
  lucideSettings,
  lucideShield,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';
import { ORG_PORT } from '@oequ/ports';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { filter, map, startWith } from 'rxjs';

import {
  resolveSettingsContext,
} from './settings-layout.tokens';
import { UserMenuComponent } from './user-menu.component';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';

interface ShellNavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly exact: boolean;
}

const WORKSPACE_NAV: readonly ShellNavItem[] = [
  {
    label: 'General',
    path: '/workspace/settings/general',
    icon: 'lucideSettings',
    exact: true,
  },
  {
    label: 'Members',
    path: '/workspace/settings/members',
    icon: 'lucideUsers',
    exact: true,
  },
];

const PERSONAL_NAV: readonly ShellNavItem[] = [
  {
    label: 'Profile',
    path: '/account/profile',
    icon: 'lucideUser',
    exact: true,
  },
  {
    label: 'Security',
    path: '/account/security',
    icon: 'lucideShield',
    exact: true,
  },
  {
    label: 'Sessions',
    path: '/account/sessions',
    icon: 'lucideMonitor',
    exact: true,
  },
];

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
    WorkspaceSwitcherComponent,
    UserMenuComponent,
  ],
  templateUrl: './shell-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideSettings,
      lucideUser,
      lucideShield,
      lucideMonitor,
      lucideUsers,
    }),
  ],
})
export class ShellLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly orgPort = inject(ORG_PORT);

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly shellContext = computed(() =>
    this.activeOrganization() ? 'workspace' : 'personal',
  );

  protected readonly navItems = computed(() =>
    this.shellContext() === 'workspace' ? WORKSPACE_NAV : PERSONAL_NAV,
  );

  private readonly settingsContext = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => resolveSettingsContext(this.router)),
    ),
    {
      initialValue: resolveSettingsContext(this.router),
    },
  );

  protected readonly isAccountRoute = computed(
    () => this.settingsContext() === 'account',
  );

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveTitle()),
    ),
    { initialValue: this.resolveTitle() },
  );

  protected readonly breadcrumbRoot = computed(() =>
    this.settingsContext() === 'account'
      ? '/account/profile'
      : '/workspace/settings/general',
  );

  protected readonly breadcrumbRootLabel = computed(() =>
    this.settingsContext() === 'account' ? 'Account' : 'Home',
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
