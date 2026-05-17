import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown, lucidePlus } from '@ng-icons/lucide';
import { ORG_PORT } from '@oequ/ports';
import { provideBrnPopoverConfig } from '@spartan-ng/brain/popover';
import { HlmSelectImports } from '@spartan-ng/helm/select';

export const PERSONAL_WORKSPACE_VALUE = '__personal__';

@Component({
  selector: 'oequ-workspace-switcher',
  imports: [HlmSelectImports, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideChevronsUpDown, lucidePlus }),
    provideBrnPopoverConfig({ align: 'start', sideOffset: 4, offsetX: 0 }),
  ],
  template: `
    <hlm-select
      class="block w-full"
      align="start"
      [sideOffset]="4"
      [offsetX]="0"
      [value]="selectedValue()"
      (valueChange)="onValueChange($event)"
    >
      <hlm-select-trigger
        aria-label="Switch workspace"
        class="text-gray-900 !h-9 w-full !justify-start !gap-0 !rounded-md !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-gray-100 focus-visible:!ring-2 [&>ng-icon]:hidden"
      >
        <span
          class="flex h-9 w-full min-w-0 items-center gap-2 px-2 text-left"
        >
          <span
            class="bg-muted text-foreground grid size-7 shrink-0 place-content-center rounded-md text-xs font-semibold"
            aria-hidden="true"
          >
            {{ triggerInitial() }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm font-medium leading-none">
            {{ triggerLabel() }}
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
        <hlm-select-item [value]="personalValue" class="gap-2">
          <span
            class="bg-muted text-foreground grid size-6 shrink-0 place-content-center rounded-md text-[11px] font-semibold"
            aria-hidden="true"
          >
            P
          </span>
          <span class="min-w-0 truncate">Personal</span>
        </hlm-select-item>

        <p class="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Workspaces ({{ organizations().length }})
        </p>
        @for (org of organizations(); track org.id) {
          <hlm-select-item [value]="org.slug" class="gap-2">
            <span
              class="bg-muted text-foreground grid size-6 shrink-0 place-content-center rounded-md text-[11px] font-semibold"
              aria-hidden="true"
            >
              {{ orgInitial(org.name) }}
            </span>
            <span class="min-w-0 truncate">{{ org.name }}</span>
          </hlm-select-item>
        }

        <hlm-select-item
          [value]="createWorkspaceValue"
          class="text-muted-foreground gap-2"
          disabled
        >
          <ng-icon name="lucidePlus" class="size-4 shrink-0" aria-hidden="true" />
          <span>Create workspace</span>
        </hlm-select-item>
      </hlm-select-content>
    </hlm-select>
  `,
})
export class WorkspaceSwitcherComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);

  protected readonly personalValue = PERSONAL_WORKSPACE_VALUE;
  protected readonly createWorkspaceValue = '__create_workspace__';

  protected readonly organizations = toSignal(this.orgPort.organizations$, {
    initialValue: [],
  });

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly selectedValue = computed(() => {
    const slug = this.activeOrganization()?.slug;
    return slug ?? PERSONAL_WORKSPACE_VALUE;
  });

  protected readonly triggerLabel = computed(() => {
    const org = this.activeOrganization();
    return org?.name ?? 'Personal';
  });

  protected readonly triggerInitial = computed(() => {
    const org = this.activeOrganization();
    return org ? this.orgInitial(org.name) : 'P';
  });

  protected orgInitial(name: string | null | undefined): string {
    const trimmed = name?.trim() ?? '';
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }

  protected async onValueChange(value: string | null): Promise<void> {
    if (!value || value === this.createWorkspaceValue) {
      return;
    }

    if (value === PERSONAL_WORKSPACE_VALUE) {
      if (this.selectedValue() === PERSONAL_WORKSPACE_VALUE) {
        return;
      }
      await this.orgPort.selectPersonal();
      if (!this.router.url.startsWith('/account')) {
        await this.router.navigate(['/account/profile']);
      }
      return;
    }

    if (value === this.activeOrganization()?.slug) {
      return;
    }

    const result = await this.orgPort.selectOrganization(value);
    if (!result.ok) {
      return;
    }

    if (this.router.url.startsWith('/account')) {
      await this.router.navigate(['/workspace/settings/general']);
    }
  }
}
