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
  lucideLogOut,
  lucideMonitor,
  lucideMoon,
  lucideShield,
  lucideSun,
  lucideUser,
} from '@ng-icons/lucide';
import { AUTH_PORT, ORG_PORT } from '@oequ/ports';
import {
  HlmDropdownMenuImports,
  provideHlmDropdownMenuConfig,
} from '@spartan-ng/helm/dropdown-menu';
import { SHELL_SIDEBAR_SELECT_TRIGGER_CLASS } from './settings-layout.tokens';

import { ThemeService } from './theme.service';

@Component({
  selector: 'oequ-user-menu',
  imports: [HlmDropdownMenuImports, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideUser,
      lucideShield,
      lucideMonitor,
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
          [class.bg-accent]="isAccountPath('/account/profile')"
          (triggered)="navigateToAccount('/account/profile')"
        >
          <ng-icon name="lucideUser" class="size-4 shrink-0" aria-hidden="true" />
          <span>Account settings</span>
        </button>
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          [class.bg-accent]="isAccountPath('/account/security')"
          (triggered)="navigateToAccount('/account/security')"
        >
          <ng-icon name="lucideShield" class="size-4 shrink-0" aria-hidden="true" />
          <span>Security</span>
        </button>
        <button
          type="button"
          hlmDropdownMenuItem
          class="gap-2"
          [class.bg-accent]="isAccountPath('/account/sessions')"
          (triggered)="navigateToAccount('/account/sessions')"
        >
          <ng-icon name="lucideMonitor" class="size-4 shrink-0" aria-hidden="true" />
          <span>Sessions</span>
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
          <span>Toggle theme</span>
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
          <span>Sign out</span>
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
  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);
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

  protected isAccountPath(path: string): boolean {
    return (this.currentUrl() ?? '').startsWith(path);
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
    await this.authPort.signOut();
  }

  protected async navigateToAccount(path: string): Promise<void> {
    await this.orgPort.selectPersonal();
    await this.router.navigateByUrl(path);
  }
}
