import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideDownload,
  lucideEllipsis,
  lucideMail,
  lucideSearch,
} from '@ng-icons/lucide';
import {
  API_KEYS_PORT,
  EMAILS_PORT,
  type EmailListPeriod,
  type EmailStatusFilter,
  type OutboundEmail,
  emailListPeriodLabel,
  emailStatusBadgeClass,
  formatEmailSentRelative,
  formatOutboundEmailStatus,
} from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map, startWith } from 'rxjs';

@Component({
  selector: 'oequ-org-emails',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmInput,
    HlmSelectImports,
    HlmTableImports,
    HlmBadgeImports,
    HlmEmptyImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideMail,
      lucideSearch,
      lucideDownload,
      lucideEllipsis,
    }),
  ],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-semibold tracking-tight">Emails</h1>

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative min-w-0 flex-1 lg:max-w-sm">
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
            class="w-full lg:w-40"
            [value]="periodFilter()"
            (valueChange)="onPeriodChange($event)"
          >
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">{{ periodLabel() }}</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              <hlm-select-item value="15d">Last 15 days</hlm-select-item>
              <hlm-select-item value="30d">Last 30 days</hlm-select-item>
              <hlm-select-item value="90d">Last 90 days</hlm-select-item>
            </hlm-select-content>
          </hlm-select>
          <hlm-select
            class="w-full lg:w-40"
            [value]="statusFilter()"
            (valueChange)="onStatusChange($event)"
          >
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">{{ statusFilterLabel() }}</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              <hlm-select-item value="all">All Statuses</hlm-select-item>
              <hlm-select-item value="delivered">Delivered</hlm-select-item>
              <hlm-select-item value="queued">Queued</hlm-select-item>
              <hlm-select-item value="bounced">Bounced</hlm-select-item>
              <hlm-select-item value="failed">Failed</hlm-select-item>
            </hlm-select-content>
          </hlm-select>
          <hlm-select
            class="w-full lg:w-44"
            [value]="apiKeyFilter()"
            (valueChange)="onApiKeyChange($event)"
          >
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">{{ apiKeyFilterLabel() }}</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              <hlm-select-item value="all">All API keys</hlm-select-item>
              @for (key of apiKeys(); track key.id) {
                <hlm-select-item [value]="key.id">{{ key.name }}</hlm-select-item>
              }
            </hlm-select-content>
          </hlm-select>
          <button
            hlmBtn
            type="button"
            variant="outline"
            size="icon"
            class="size-9 shrink-0"
            aria-label="Export"
          >
            <ng-icon name="lucideDownload" class="size-4" />
          </button>
        </div>

        @if (emailsResource.isLoading()) {
          <p class="text-muted-foreground text-sm">Loading emails…</p>
        } @else if (emailsResource.error(); as err) {
          <p class="text-destructive text-sm" role="alert">{{ err.message }}</p>
        } @else if (filteredEmails().length === 0) {
          <div hlmEmpty class="border-border rounded-[5px] border py-16">
            <div hlmEmptyHeader>
              <div hlmEmptyMedia variant="icon">
                <ng-icon name="lucideMail" class="size-6" />
              </div>
              <h2 hlmEmptyTitle>No outbound emails yet</h2>
              <p hlmEmptyDescription>
                Complete onboarding to simulate your first sends, or add an API
                key and send from your app.
              </p>
            </div>
            <div hlmEmptyContent>
              <a hlmBtn routerLink="/onboarding">Go to onboarding</a>
            </div>
          </div>
        } @else {
          <div class="border-input overflow-hidden rounded-[5px] border">
            <table hlmTable class="w-full text-left text-sm">
              <thead
                class="text-muted-foreground border-b text-xs font-medium"
              >
                <tr hlmTr>
                  <th hlmTh class="w-10 px-4 py-2.5"></th>
                  <th hlmTh class="px-4 py-2.5 font-medium">To</th>
                  <th hlmTh class="px-4 py-2.5 font-medium">Status</th>
                  <th hlmTh class="px-4 py-2.5 font-medium">Subject</th>
                  <th hlmTh class="px-4 py-2.5 font-medium">Sent</th>
                  <th hlmTh class="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody class="divide-border divide-y">
                @for (email of filteredEmails(); track email.id) {
                  <tr hlmTr class="hover:bg-muted/30">
                    <td hlmTd class="px-4 py-3">
                      <span
                        class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex size-8 items-center justify-center rounded-[5px]"
                        aria-hidden="true"
                      >
                        <ng-icon name="lucideMail" class="size-4" />
                      </span>
                    </td>
                    <td hlmTd class="px-4 py-3 font-medium">{{ email.to }}</td>
                    <td hlmTd class="px-4 py-3">
                      <span
                        hlmBadge
                        variant="outline"
                        [class]="statusBadgeClass(email.status)"
                      >
                        {{ formatStatus(email.status) }}
                      </span>
                    </td>
                    <td hlmTd class="text-muted-foreground max-w-md truncate px-4 py-3">
                      {{ email.subject }}
                    </td>
                    <td hlmTd class="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {{ formatSent(email.sentAt) }}
                    </td>
                    <td hlmTd class="px-4 py-3 text-right">
                      <button
                        hlmBtn
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="text-muted-foreground size-8"
                        aria-label="Row actions"
                      >
                        <ng-icon name="lucideEllipsis" class="size-4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
    </div>
  `,
})
export class OrgEmailsComponent {
  readonly organizationId = input.required<string>();

  private readonly emailsPort = inject(EMAILS_PORT);
  private readonly apiKeysPort = inject(API_KEYS_PORT);

  protected readonly formatStatus = formatOutboundEmailStatus;
  protected readonly formatSent = formatEmailSentRelative;
  protected readonly statusBadgeClass = emailStatusBadgeClass;

  protected readonly periodFilter = signal<EmailListPeriod>('15d');
  protected readonly statusFilter = signal<EmailStatusFilter>('all');
  protected readonly apiKeyFilter = signal<string>('all');

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(''),
      map((value) => value.trim()),
    ),
    { initialValue: '' },
  );

  protected readonly apiKeysResource = resource({
    params: () => ({ orgId: this.organizationId() }),
    loader: async ({ params }) => {
      const result = await this.apiKeysPort.listKeys(params.orgId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly apiKeys = computed(
    () => this.apiKeysResource.value() ?? [],
  );

  protected readonly emailsResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      search: this.searchTerm(),
      period: this.periodFilter(),
      status: this.statusFilter(),
      apiKeyId: this.apiKeyFilter(),
    }),
    loader: async ({ params }) => {
      const result = await this.emailsPort.listOutbound(params.orgId, {
        search: params.search || undefined,
        period: params.period,
        status: params.status,
        apiKeyId: params.apiKeyId,
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly filteredEmails = computed(
    (): readonly OutboundEmail[] => this.emailsResource.value() ?? [],
  );

  protected readonly periodLabel = computed(() =>
    emailListPeriodLabel(this.periodFilter()),
  );

  protected readonly statusFilterLabel = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return 'All Statuses';
    }
    return formatOutboundEmailStatus(filter);
  });

  protected readonly apiKeyFilterLabel = computed(() => {
    const id = this.apiKeyFilter();
    if (id === 'all') {
      return 'All API keys';
    }
    return this.apiKeys().find((key) => key.id === id)?.name ?? 'API key';
  });

  protected onPeriodChange(value: string | string[] | null | undefined): void {
    if (value === '15d' || value === '30d' || value === '90d') {
      this.periodFilter.set(value);
    }
  }

  protected onStatusChange(value: string | string[] | null | undefined): void {
    if (
      value === 'all' ||
      value === 'delivered' ||
      value === 'bounced' ||
      value === 'queued' ||
      value === 'failed'
    ) {
      this.statusFilter.set(value);
    }
  }

  protected onApiKeyChange(value: string | string[] | null | undefined): void {
    if (typeof value === 'string') {
      this.apiKeyFilter.set(value);
    }
  }
}
