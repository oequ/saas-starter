import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronsUpDown,
  lucideCircleHelp,
  lucideCookie,
  lucideLogOut,
  lucideMoon,
  lucideRocket,
  lucideSun,
  lucideUser,
} from '@ng-icons/lucide';
import { TranslocoPipe } from '@oequ/i18n';
import { AUTH_PORT } from '@oequ/ports';
import {
  HlmDropdownMenuImports,
  provideHlmDropdownMenuConfig,
} from '@spartan-ng/helm/dropdown-menu';
import { CookieConsentService } from './cookie-consent/cookie-consent.service';
import { HelpPanelService } from './help/help-panel.service';
import { isApiShell, SHELL_CONFIG } from './shell-config';
import { SHELL_SIDEBAR_SELECT_TRIGGER_CLASS } from './settings-layout.tokens';
import { ThemeService } from './theme.service';

@Component({
  selector: 'oequ-user-menu',
  imports: [HlmDropdownMenuImports, NgIcon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideUser,
      lucideRocket,
      lucideCircleHelp,
      lucideCookie,
      lucideMoon,
      lucideSun,
      lucideLogOut,
    }),
    provideHlmDropdownMenuConfig({ align: 'start', side: 'top' }),
  ],
  template: `
    <button
      #menuTrigger
      type="button"
      [hlmDropdownMenuTrigger]="userMenu"
      (hlmDropdownMenuOpened)="syncMenuWidth()"
      aria-label="User menu"
      [class]="sidebarSelectTriggerClass"
    >
      <span class="flex h-9 w-full min-w-0 items-center gap-2 px-2 text-left">
        <span
          class="bg-muted text-foreground grid size-7 shrink-0 place-content-center rounded-md text-xs font-semibold"
          aria-hidden="true"
        >
          {{ userInitial() }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium leading-none">{{
            displayName()
          }}</span>
          <span class="text-muted-foreground block truncate text-xs leading-4">{{
            email()
          }}</span>
        </span>
        <ng-icon
          name="lucideChevronsUpDown"
          class="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
      </span>
    </button>

    <ng-template #userMenu>
      <div
        hlmDropdownMenu
        class="!min-w-0 p-1"
        [style.width.px]="menuWidthPx()"
        [style.maxWidth.px]="menuWidthPx()"
        [sideOffset]="4"
      >
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          [class.bg-accent]="isAccountRoute()"
          (triggered)="navigateToAccount()"
        >
          <ng-icon name="lucideUser" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ 'shell.userMenu.accountSettings' | transloco }}</span>
        </button>
        @if (showOnboardingLink()) {
          <button
            type="button"
            hlmDropdownMenuItem
            class="gap-2"
            [class.bg-accent]="isOnboardingRoute()"
            (triggered)="navigateToOnboarding()"
          >
            <ng-icon name="lucideRocket" class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ 'shell.userMenu.onboarding' | transloco }}</span>
          </button>
        }
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          (triggered)="openHelp()"
        >
          <ng-icon
            name="lucideCircleHelp"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{{ 'shell.userMenu.help' | transloco }}</span>
        </button>
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          (triggered)="openCookiePreferences()"
        >
          <ng-icon
            name="lucideCookie"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{{ 'shell.userMenu.cookiePreferences' | transloco }}</span>
        </button>
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          (triggered)="toggleTheme()"
        >
          <ng-icon
            [name]="themeIsDark() ? 'lucideSun' : 'lucideMoon'"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{{ 'shell.userMenu.toggleTheme' | transloco }}</span>
          <span hlmDropdownMenuShortcut>M</span>
        </button>
        <div hlmDropdownMenuSeparator></div>
        <button
          type="button"
          hlmDropdownMenuItem
          variant="destructive"
          class="gap-2"
          (triggered)="signOut()"
        >
          <ng-icon name="lucideLogOut" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ 'shell.userMenu.signOut' | transloco }}</span>
        </button>
      </div>
    </ng-template>
  `,
})
export class UserMenuComponent {
  protected readonly sidebarSelectTriggerClass = SHELL_SIDEBAR_SELECT_TRIGGER_CLASS;

  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');
  protected readonly menuWidthPx = signal<number | null>(null);

  private readonly authPort = inject(AUTH_PORT);
  private readonly shell = inject(SHELL_CONFIG);
  private readonly router = inject(Router);
  private readonly helpPanel = inject(HelpPanelService);
  private readonly cookieConsent = inject(CookieConsentService);
  protected readonly themeService = inject(ThemeService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly themeIsDark = this.themeService.resolvedDark;

  private readonly session = toSignal(this.authPort.session$, {
    initialValue: null,
  });

  protected displayName(): string {
    return (
      this.session()?.user.displayName?.trim() ||
      this.session()?.user.email ||
      'Account'
    );
  }

  protected email(): string {
    return this.session()?.user.email ?? '';
  }

  protected userInitial(): string {
    const name = this.displayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  protected isAccountRoute(): boolean {
    const url = this.currentUrl() ?? '';
    return url === '/account' || url.startsWith('/account/');
  }

  protected showOnboardingLink(): boolean {
    return !isApiShell(this.shell);
  }

  protected isOnboardingRoute(): boolean {
    return (this.currentUrl() ?? '').startsWith('/onboarding');
  }

  protected syncMenuWidth(): void {
    const width = this.menuTrigger()?.nativeElement.offsetWidth;
    if (width) {
      this.menuWidthPx.set(width);
    }
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected async signOut(): Promise<void> {
    const result = await this.authPort.signOut();
    if (result.ok) {
      await this.router.navigate(['/auth/login']);
    }
  }

  protected async navigateToAccount(): Promise<void> {
    const path = isApiShell(this.shell) ? '/account' : '/account/profile';
    await this.router.navigateByUrl(path);
  }

  protected async navigateToOnboarding(): Promise<void> {
    await this.router.navigateByUrl('/onboarding');
  }

  protected openHelp(): void {
    this.helpPanel.open();
  }

  protected openCookiePreferences(): void {
    this.cookieConsent.openPreferences();
  }
}
