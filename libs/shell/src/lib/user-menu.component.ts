import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronsUpDown,
  lucideLogOut,
  lucideMonitor,
  lucideShield,
  lucideUser,
} from '@ng-icons/lucide';
import { AUTH_PORT, ORG_PORT } from '@oequ/ports';
import { provideBrnPopoverConfig } from '@spartan-ng/brain/popover';
import { HlmSelectImports } from '@spartan-ng/helm/select';

/** No menu row selected — user menu is an action list, not persistent selection. */
export const USER_MENU_CLOSED_VALUE = '__user_menu_closed__';

@Component({
  selector: 'oequ-user-menu',
  imports: [HlmSelectImports, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideUser,
      lucideShield,
      lucideMonitor,
      lucideLogOut,
    }),
    provideBrnPopoverConfig({ align: 'start', sideOffset: 4, offsetX: 0 }),
  ],
  template: `
    <hlm-select
      class="block w-full"
      align="start"
      [sideOffset]="4"
      [offsetX]="0"
      [value]="selectedMenuValue()"
      (valueChange)="onMenuAction($event)"
    >
      <hlm-select-trigger
        aria-label="User menu"
        class="text-gray-900 !h-9 w-full !justify-start !gap-0 !rounded-md !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-gray-100 focus-visible:!ring-2 [&>ng-icon]:hidden"
      >
        <span
          class="flex h-9 w-full min-w-0 items-center gap-2 px-2 text-left"
        >
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
      </hlm-select-trigger>

      <hlm-select-content
        *hlmSelectPortal
        class="!min-w-0 !w-[var(--brn-select-width)] !max-w-[var(--brn-select-width)] p-1"
      >
        <hlm-select-item value="profile" class="gap-2">
          <ng-icon name="lucideUser" class="size-4 shrink-0" aria-hidden="true" />
          <span>Account settings</span>
        </hlm-select-item>
        <hlm-select-item value="security" class="gap-2">
          <ng-icon name="lucideShield" class="size-4 shrink-0" aria-hidden="true" />
          <span>Security</span>
        </hlm-select-item>
        <hlm-select-item value="sessions" class="gap-2">
          <ng-icon name="lucideMonitor" class="size-4 shrink-0" aria-hidden="true" />
          <span>Sessions</span>
        </hlm-select-item>
        <hlm-select-item value="sign-out" class="gap-2">
          <ng-icon name="lucideLogOut" class="size-4 shrink-0" aria-hidden="true" />
          <span>Sign out</span>
        </hlm-select-item>
      </hlm-select-content>
    </hlm-select>
  `,
})
export class UserMenuComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Highlights the current account page only; workspace routes show no selection. */
  protected readonly selectedMenuValue = computed(() => {
    const url = this.currentUrl() ?? '';
    if (url.startsWith('/account/profile')) {
      return 'profile';
    }
    if (url.startsWith('/account/security')) {
      return 'security';
    }
    if (url.startsWith('/account/sessions')) {
      return 'sessions';
    }
    return USER_MENU_CLOSED_VALUE;
  });

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

  protected async onMenuAction(action: string | null): Promise<void> {
    if (!action || action === USER_MENU_CLOSED_VALUE) {
      return;
    }

    switch (action) {
      case 'profile':
        await this.navigateToAccount('/account/profile');
        break;
      case 'security':
        await this.navigateToAccount('/account/security');
        break;
      case 'sessions':
        await this.navigateToAccount('/account/sessions');
        break;
      case 'sign-out':
        await this.authPort.signOut();
        break;
    }
  }

  private async navigateToAccount(path: string): Promise<void> {
    await this.orgPort.selectPersonal();
    await this.router.navigateByUrl(path);
  }
}
