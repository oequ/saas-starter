import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideEllipsis,
  lucideKeyRound,
  lucideSearch,
} from '@ng-icons/lucide';
import {
  API_KEYS_PORT,
  type ApiKey,
  type CreateApiKeyInput,
  apiKeyPermissionFilterLabel,
  apiKeyPermissionLabel,
  formatCreatedRelativeTime,
  formatRelativeTime,
  type ApiKeyPermissionFilter,
} from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import {
  HlmDropdownMenuImports,
  provideHlmDropdownMenuConfig,
} from '@spartan-ng/helm/dropdown-menu';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map, startWith } from 'rxjs';

import { ApiKeysDocsSheetComponent } from './api-keys-docs-sheet.component';
import { ApiKeySecretDialogComponent } from './api-key-secret-dialog.component';
import { CreateApiKeyDialogComponent } from './create-api-key-dialog.component';
import { RevokeApiKeyDialogComponent } from './revoke-api-key-dialog.component';

/** Hide footer until the list is large enough for real pagination. */
const API_KEYS_PAGE_SIZE = 10;

@Component({
  selector: 'oequ-org-api-keys',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmButtonImports,
    HlmInput,
    HlmSelectImports,
    HlmTableImports,
    HlmDropdownMenuImports,
    HlmEmptyImports,
    ApiKeysDocsSheetComponent,
    CreateApiKeyDialogComponent,
    RevokeApiKeyDialogComponent,
    ApiKeySecretDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideKeyRound,
      lucideSearch,
      lucideEllipsis,
    }),
    provideHlmDropdownMenuConfig({ align: 'end', side: 'bottom' }),
  ],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-semibold tracking-tight">API keys</h1>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative min-w-0 flex-1 sm:max-w-xs">
          <ng-icon
            name="lucideSearch"
            class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            hlmInput
            type="search"
            placeholder="Search…"
            class="border-input bg-background h-9 w-full rounded-[5px] ps-9 shadow-none"
            [formControl]="searchControl"
          />
        </div>
        <hlm-select
          class="w-full sm:w-44"
          [value]="permissionFilter()"
          (valueChange)="onPermissionFilterChange($event)"
        >
          <hlm-select-trigger class="h-9 w-full shadow-none">
            <span class="truncate">{{ permissionFilterLabel() }}</span>
          </hlm-select-trigger>
          <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
            <hlm-select-item value="all">All permissions</hlm-select-item>
            <hlm-select-item value="full_access">Full access</hlm-select-item>
            <hlm-select-item value="sending_access">Sending access</hlm-select-item>
          </hlm-select-content>
        </hlm-select>
        <div class="flex shrink-0 items-center gap-2 sm:ms-auto">
          <oequ-api-keys-docs-sheet />
          <button hlmBtn type="button" (click)="openCreateDialog()">
            + Create API key
          </button>
        </div>
      </div>

      @if (keysLoading()) {
        <div
          class="border-input text-muted-foreground flex min-h-[280px] items-center justify-center rounded-[5px] border text-sm"
        >
          Loading API keys…
        </div>
      } @else if (allKeys().length === 0) {
        <hlm-empty class="border-input min-h-[280px]">
          <hlm-empty-header>
            <hlm-empty-media variant="icon">
              <ng-icon name="lucideKeyRound" aria-hidden="true" />
            </hlm-empty-media>
            <h2 hlmEmptyTitle>No API keys yet</h2>
            <p hlmEmptyDescription>
              Generate an API key to authenticate requests and send emails through
              the API.
            </p>
          </hlm-empty-header>
          <hlm-empty-content>
            <button hlmBtn type="button" (click)="openCreateDialog()">
              + Create API key
            </button>
          </hlm-empty-content>
        </hlm-empty>
      } @else {
      <div hlmTableContainer class="border-input rounded-[5px] border">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr class="bg-muted/50 text-muted-foreground text-xs">
              <th hlmTh class="px-4">Name</th>
              <th hlmTh class="px-4">Token</th>
              <th hlmTh class="hidden px-4 md:table-cell">Permission</th>
              <th hlmTh class="hidden px-4 lg:table-cell">Last used</th>
              <th hlmTh class="hidden px-4 sm:table-cell">Created</th>
              <th hlmTh class="w-12 px-2 text-end">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @if (filteredKeys().length === 0) {
              <tr hlmTr>
                <td
                  hlmTd
                  colspan="6"
                  class="text-muted-foreground px-4 py-10 text-center whitespace-normal"
                >
                  No keys match your filters.
                </td>
              </tr>
            } @else {
              @for (key of filteredKeys(); track key.id) {
                <tr hlmTr>
                  <td hlmTd class="px-4 py-3 whitespace-normal">
                    <div class="flex items-center gap-2">
                      <span
                        class="bg-primary/10 text-primary grid size-7 shrink-0 place-content-center rounded-md"
                      >
                        <ng-icon
                          name="lucideKeyRound"
                          class="size-3.5"
                          aria-hidden="true"
                        />
                      </span>
                      <span class="font-medium">{{ key.name }}</span>
                    </div>
                  </td>
                  <td hlmTd class="px-4 py-3">
                    <code
                      class="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs"
                    >
                      {{ key.tokenPrefix }}
                    </code>
                  </td>
                  <td
                    hlmTd
                    class="text-muted-foreground hidden px-4 py-3 md:table-cell"
                  >
                    {{ permissionLabel(key.permission) }}
                  </td>
                  <td
                    hlmTd
                    class="text-muted-foreground hidden px-4 py-3 lg:table-cell"
                  >
                    {{ formatLastUsed(key.lastUsedAt) }}
                  </td>
                  <td
                    hlmTd
                    class="text-muted-foreground hidden px-4 py-3 sm:table-cell"
                  >
                    {{ formatCreated(key.createdAt) }}
                  </td>
                  <td hlmTd class="px-2 py-3 text-end">
                    <button
                      type="button"
                      hlmBtn
                      variant="ghost"
                      size="icon"
                      class="size-8"
                      [hlmDropdownMenuTrigger]="keyActionsMenu"
                      [attr.aria-label]="'Actions for ' + key.name"
                    >
                      <ng-icon
                        name="lucideEllipsis"
                        class="size-4"
                        aria-hidden="true"
                      />
                    </button>
                    <ng-template #keyActionsMenu>
                      <div hlmDropdownMenu class="min-w-40 p-1">
                        <button
                          type="button"
                          hlmDropdownMenuItem
                          variant="destructive"
                          (triggered)="openRevokeDialog(key)"
                        >
                          Revoke
                        </button>
                      </div>
                    </ng-template>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      }

      @if (showPaginationFooter()) {
        <p class="text-muted-foreground text-sm">
          Page 1 – {{ filteredKeys().length }} of {{ allKeys().length }} keys
        </p>
      }
    </div>

    <oequ-create-api-key-dialog
      [open]="createDialogOpen()"
      [creating]="creating()"
      (submitted)="onCreateSubmitted($event)"
      (cancelled)="closeCreateDialog()"
    />

    <oequ-revoke-api-key-dialog
      [open]="revokeDialogOpen()"
      [keyName]="revokeTargetName()"
      [revoking]="revoking()"
      (confirmed)="confirmRevoke()"
      (cancelled)="closeRevokeDialog()"
    />

    <oequ-api-key-secret-dialog
      [open]="secretDialogOpen()"
      [secret]="createdSecret()"
      (closed)="closeSecretDialog()"
    />
  `,
})
export class OrgApiKeysComponent {
  readonly organizationId = input.required<string>();

  private readonly apiKeysPort = inject(API_KEYS_PORT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  protected readonly permissionFilter = signal<ApiKeyPermissionFilter>('all');

  protected readonly permissionFilterLabel = computed(() =>
    apiKeyPermissionFilterLabel(this.permissionFilter()),
  );
  protected readonly createDialogOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly revokeDialogOpen = signal(false);
  protected readonly revoking = signal(false);
  protected readonly revokeTarget = signal<ApiKey | null>(null);
  protected readonly secretDialogOpen = signal(false);
  protected readonly createdSecret = signal('');

  private readonly dataRefresh = signal(0);

  protected readonly keysResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      refresh: this.dataRefresh(),
    }),
    loader: async ({ params }) => {
      const result = await this.apiKeysPort.listKeys(params.orgId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly allKeys = computed(() => this.keysResource.value() ?? []);
  protected readonly keysLoading = computed(() => this.keysResource.isLoading());

  protected readonly showPaginationFooter = computed(
    () => this.allKeys().length > API_KEYS_PAGE_SIZE,
  );

  protected readonly filteredKeys = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const permission = this.permissionFilter();

    return this.allKeys().filter((key) => {
      if (permission !== 'all' && key.permission !== permission) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        key.name.toLowerCase().includes(query) ||
        key.tokenPrefix.toLowerCase().includes(query)
      );
    });
  });

  protected readonly revokeTargetName = computed(
    () => this.revokeTarget()?.name ?? '',
  );

  private readonly createQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('create'))),
    { initialValue: null as string | null },
  );

  constructor() {
    effect(() => {
      if (this.createQuery() === '1' && !this.createDialogOpen()) {
        this.openCreateDialog();
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  protected readonly permissionLabel = apiKeyPermissionLabel;
  protected readonly formatLastUsed = formatRelativeTime;
  protected readonly formatCreated = formatCreatedRelativeTime;

  protected onPermissionFilterChange(
    value: string | string[] | null | undefined,
  ): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (
      next === 'all' ||
      next === 'full_access' ||
      next === 'sending_access'
    ) {
      this.permissionFilter.set(next);
    }
  }

  protected openCreateDialog(): void {
    this.createDialogOpen.set(true);
  }

  protected closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  protected openRevokeDialog(key: ApiKey): void {
    this.revokeTarget.set(key);
    this.revokeDialogOpen.set(true);
  }

  protected closeRevokeDialog(): void {
    this.revokeDialogOpen.set(false);
    this.revokeTarget.set(null);
  }

  protected closeSecretDialog(): void {
    this.secretDialogOpen.set(false);
    this.createdSecret.set('');
  }

  protected async onCreateSubmitted(input: CreateApiKeyInput): Promise<void> {
    if (this.creating()) {
      return;
    }

    this.creating.set(true);
    const result = await this.apiKeysPort.createKey(this.organizationId(), input);
    this.creating.set(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    this.createDialogOpen.set(false);
    this.createdSecret.set(result.data.secret);
    this.secretDialogOpen.set(true);
    this.dataRefresh.update((n) => n + 1);
    toast.success('API key created.');
  }

  protected async confirmRevoke(): Promise<void> {
    const key = this.revokeTarget();
    if (!key || this.revoking()) {
      return;
    }

    this.revoking.set(true);
    const result = await this.apiKeysPort.revokeKey(
      this.organizationId(),
      key.id,
    );
    this.revoking.set(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    this.closeRevokeDialog();
    this.dataRefresh.update((n) => n + 1);
    toast.success('API key revoked.');
  }
}
