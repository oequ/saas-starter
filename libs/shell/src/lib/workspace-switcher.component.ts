import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronsUpDown,
  lucidePlus,
} from '@ng-icons/lucide';
import { ORG_PORT } from '@oequ/ports';
import { CreateWorkspaceDialogService } from './create-workspace-dialog.service';
import { SHELL_SIDEBAR_SELECT_TRIGGER_CLASS } from './settings-layout.tokens';
import {
  HlmDropdownMenuImports,
  provideHlmDropdownMenuConfig,
} from '@spartan-ng/helm/dropdown-menu';

export const PERSONAL_WORKSPACE_VALUE = '__personal__';

@Component({
  selector: 'oequ-workspace-switcher',
  imports: [HlmDropdownMenuImports, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideChevronsUpDown, lucidePlus, lucideCheck }),
    provideHlmDropdownMenuConfig({ align: 'start', side: 'bottom' }),
  ],
  template: `
    <button
      #menuTrigger
      type="button"
      [hlmDropdownMenuTrigger]="workspaceMenu"
      (hlmDropdownMenuOpened)="syncMenuWidth()"
      aria-label="Switch workspace"
      [class]="sidebarSelectTriggerClass"
    >
      <span class="flex h-9 w-full min-w-0 items-center gap-2 px-2 text-left">
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
    </button>

    <ng-template #workspaceMenu>
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
          class="relative gap-2 pr-8"
          [class.bg-accent]="selectedValue() === personalValue"
          (triggered)="onWorkspaceSelect(personalValue)"
        >
          <span
            class="bg-muted text-foreground grid size-6 shrink-0 place-content-center rounded-md text-[11px] font-semibold"
            aria-hidden="true"
          >
            P
          </span>
          <span class="min-w-0 truncate">Personal</span>
          @if (selectedValue() === personalValue) {
            <ng-icon
              name="lucideCheck"
              class="absolute right-2 size-4 shrink-0"
              aria-hidden="true"
            />
          }
        </button>

        <p
          hlmDropdownMenuLabel
          class="text-muted-foreground px-2 py-1.5 text-xs font-medium"
        >
          Workspaces ({{ organizations().length }})
        </p>

        @for (org of organizations(); track org.id) {
          <button
            type="button"
            hlmDropdownMenuItem
            class="relative gap-2 pr-8"
            [class.bg-accent]="selectedValue() === org.slug"
            (triggered)="onWorkspaceSelect(org.slug)"
          >
            <span
              class="bg-muted text-foreground grid size-6 shrink-0 place-content-center rounded-md text-[11px] font-semibold"
              aria-hidden="true"
            >
              {{ orgInitial(org.name) }}
            </span>
            <span class="min-w-0 truncate">{{ org.name }}</span>
            @if (selectedValue() === org.slug) {
              <ng-icon
                name="lucideCheck"
                class="absolute right-2 size-4 shrink-0"
                aria-hidden="true"
              />
            }
          </button>
        }

        <button
          type="button"
          hlmDropdownMenuItem
          class="text-muted-foreground gap-2"
          (triggered)="onCreateWorkspace()"
        >
          <ng-icon name="lucidePlus" class="size-4 shrink-0" aria-hidden="true" />
          <span>Create workspace</span>
        </button>
      </div>
    </ng-template>
  `,
})
export class WorkspaceSwitcherComponent {
  protected readonly sidebarSelectTriggerClass = SHELL_SIDEBAR_SELECT_TRIGGER_CLASS;

  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');
  protected readonly menuWidthPx = signal<number | null>(null);

  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);
  private readonly createWorkspaceDialog = inject(CreateWorkspaceDialogService);

  protected readonly personalValue = PERSONAL_WORKSPACE_VALUE;

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

  protected syncMenuWidth(): void {
    const width = this.menuTrigger()?.nativeElement.offsetWidth;
    if (width) {
      this.menuWidthPx.set(width);
    }
  }

  protected onCreateWorkspace(): void {
    this.createWorkspaceDialog.requestOpen();
  }

  protected async onWorkspaceSelect(value: string): Promise<void> {
    await this.onValueChange(value);
  }

  protected async onValueChange(value: string | null): Promise<void> {
    if (!value) {
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

    if (
      this.router.url.startsWith('/account') ||
      this.router.url.startsWith('/workspace')
    ) {
      await this.router.navigate(['/workspace']);
    }
  }
}
