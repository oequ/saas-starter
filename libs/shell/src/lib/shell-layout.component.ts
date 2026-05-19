import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  untracked,
  viewChild,
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
  lucideBarChart2,
  lucideCreditCard,
  lucideHome,
  lucideKeyRound,
  lucideMonitor,
  lucideSettings,
  lucideShield,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';
import { ORG_PORT, type Organization } from '@oequ/ports';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { filter, map, startWith } from 'rxjs';

import {
  resolveSettingsContext,
  SHELL_SIDEBAR_NAV_BUTTON_CLASS,
} from './settings-layout.tokens';
import {
  PERSONAL_SHELL_NAV,
  WORKSPACE_SHELL_NAV,
} from './shell-nav.model';
import { ThemeService } from './theme.service';
import { BillingStatusBannerComponent } from './billing-status-banner.component';
import { CreateWorkspaceDialogComponent } from './create-workspace-dialog.component';
import { HelpPanelComponent } from './help/help-panel.component';
import { HelpPanelService } from './help/help-panel.service';
import { PaywallDialogComponent } from './paywall/paywall-dialog.component';
import { UserMenuComponent } from './user-menu.component';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';

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
    BillingStatusBannerComponent,
    CreateWorkspaceDialogComponent,
    PaywallDialogComponent,
    HelpPanelComponent,
  ],
  templateUrl: './shell-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideBarChart2,
      lucideHome,
      lucideKeyRound,
      lucideSettings,
      lucideUser,
      lucideShield,
      lucideMonitor,
      lucideCreditCard,
      lucideUsers,
    }),
  ],
})
export class ShellLayoutComponent {
  protected readonly shellSidebarNavButtonClass = SHELL_SIDEBAR_NAV_BUTTON_CLASS;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly orgPort = inject(ORG_PORT);
  private readonly themeService = inject(ThemeService);
  private readonly helpPanel = inject(HelpPanelService);

  protected readonly workspaceNav = WORKSPACE_SHELL_NAV;
  protected readonly personalNav = PERSONAL_SHELL_NAV;

  private readonly organizations = toSignal(this.orgPort.organizations$, {
    initialValue: [] as readonly Organization[],
  });

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly isOnboardingRoute = computed(() =>
    (this.currentUrl() ?? '').startsWith('/onboarding'),
  );

  protected readonly shellContext = computed(() => {
    const url = this.currentUrl() ?? '';
    if (url.startsWith('/onboarding') && this.organizations().length > 0) {
      return 'workspace';
    }
    return this.activeOrganization() ? 'workspace' : 'personal';
  });

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly mainScroll = viewChild<ElementRef<HTMLElement>>('mainScroll');

  constructor() {
    effect(() => {
      this.currentUrl();
      untracked(() => {
        queueMicrotask(() => this.resetMainScroll());
      });
    });

    // Guards do not re-run on in-app mock changes (E2E); redirect when org list becomes empty.
    effect(() => {
      const url = this.currentUrl() ?? '';
      if (this.organizations().length === 0 && url.startsWith('/workspace')) {
        untracked(() => {
          void this.router.navigate(['/onboarding']);
        });
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (this.isTypingTarget(event.target)) {
      return;
    }

    const opensHelp =
      event.key === '?' || (event.key === '/' && event.shiftKey);
    if (
      opensHelp &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      this.helpPanel.open();
      return;
    }

    if (event.key.toLowerCase() !== 'm' || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    event.preventDefault();
    this.themeService.toggle();
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
  }

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
    this.settingsContext() === 'account' ? 'Account' : 'Workspace',
  );

  private resetMainScroll(): void {
    this.mainScroll()?.nativeElement.scrollTo({ top: 0, left: 0 });
  }

  private resolveTitle(): string {
    let active = this.route;
    while (active.firstChild) {
      active = active.firstChild;
    }
    const title = active.snapshot?.data?.['title'];
    return typeof title === 'string' ? title : 'Settings';
  }
}
