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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideDownload,
  lucideEllipsis,
  lucideMail,
  lucideSearch,
} from '@ng-icons/lucide';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
} from '@oequ/i18n';
import { type EmailListPeriod, type EmailStatusFilter, type OutboundEmail, type OutboundEmailStatus, emailStatusBadgeClass, formatEmailSentRelative } from '@oequ/ports';
import { API_KEYS_PORT, EMAILS_PORT } from '@oequ/ports-angular';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map, startWith } from 'rxjs';

import { EmailsTableSkeletonComponent } from './emails-table-skeleton.component';

const EMAILS_PAGE_SIZE = 50;

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
    EmailsTableSkeletonComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideMail,
      lucideSearch,
      lucideDownload,
      lucideEllipsis,
      lucideChevronLeft,
      lucideChevronRight,
    }),
  ],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ 'org.emails.title' | transloco }}
      </h1>

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
            [placeholder]="'common.searchPlaceholder' | transloco"
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
            <hlm-select-item value="15d">{{
              'org.emails.period.15d' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="30d">{{
              'org.emails.period.30d' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="90d">{{
              'org.emails.period.90d' | transloco
            }}</hlm-select-item>
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
            <hlm-select-item value="all">{{
              'org.emails.statusFilter.all' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="delivered">{{
              'org.emails.statusFilter.delivered' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="queued">{{
              'org.emails.statusFilter.queued' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="bounced">{{
              'org.emails.statusFilter.bounced' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="failed">{{
              'org.emails.statusFilter.failed' | transloco
            }}</hlm-select-item>
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
            <hlm-select-item value="all">{{
              'org.emails.allApiKeys' | transloco
            }}</hlm-select-item>
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
          [attr.aria-label]="'org.emails.exportAria' | transloco"
        >
          <ng-icon name="lucideDownload" class="size-4" />
        </button>
      </div>

      @if (emailsLoading()) {
        <oequ-emails-table-skeleton />
      } @else if (emailsResource.error(); as err) {
        <p class="text-destructive text-sm" role="alert">{{ err.message }}</p>
      } @else if (totalEmails() === 0 && filtersAreDefault()) {
        <div hlmEmpty class="border-border rounded-[5px] border py-16">
          <div hlmEmptyHeader>
            <div hlmEmptyMedia variant="icon">
              <ng-icon name="lucideMail" class="size-6" />
            </div>
            <h2 hlmEmptyTitle>{{ 'org.emails.emptyTitle' | transloco }}</h2>
            <p hlmEmptyDescription>
              {{ 'org.emails.emptyDescription' | transloco }}
            </p>
          </div>
          <div hlmEmptyContent>
            <a hlmBtn routerLink="/onboarding">{{
              'org.emails.goToOnboarding' | transloco
            }}</a>
          </div>
        </div>
      } @else {
        <div class="flex flex-col gap-3">
          <div hlmTableContainer class="border-input rounded-[5px] border">
            <table hlmTable class="w-full text-left text-sm">
              <thead hlmTHead>
                <tr
                  hlmTr
                  class="text-muted-foreground border-b text-xs font-medium"
                >
                  <th hlmTh class="w-10 px-4 py-2.5"></th>
                  <th hlmTh class="px-4 py-2.5 font-medium">
                    {{ 'org.emails.columnTo' | transloco }}
                  </th>
                  <th hlmTh class="px-4 py-2.5 font-medium">
                    {{ 'org.emails.columnStatus' | transloco }}
                  </th>
                  <th hlmTh class="px-4 py-2.5 font-medium">
                    {{ 'org.emails.columnSubject' | transloco }}
                  </th>
                  <th hlmTh class="px-4 py-2.5 font-medium">
                    {{ 'org.emails.columnSent' | transloco }}
                  </th>
                  <th hlmTh class="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody hlmTBody class="divide-border divide-y">
                @if (paginatedEmails().length === 0) {
                  <tr hlmTr>
                    <td
                      hlmTd
                      colspan="6"
                      class="text-muted-foreground px-4 py-10 text-center whitespace-normal"
                    >
                      {{ 'org.emails.noFilterMatch' | transloco }}
                    </td>
                  </tr>
                } @else {
                  @for (email of paginatedEmails(); track email.id) {
                    <tr hlmTr class="hover:bg-muted/30">
                      <td hlmTd class="px-4 py-3">
                        <span
                          class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex size-8 items-center justify-center rounded-[5px]"
                          aria-hidden="true"
                        >
                          <ng-icon name="lucideMail" class="size-4" />
                        </span>
                      </td>
                      <td hlmTd class="px-4 py-3 font-medium">
                        {{ email.to }}
                      </td>
                      <td hlmTd class="px-4 py-3">
                        <span
                          hlmBadge
                          variant="outline"
                          [class]="statusBadgeClass(email.status)"
                        >
                          {{ formatStatus(email.status) }}
                        </span>
                      </td>
                      <td
                        hlmTd
                        class="text-muted-foreground max-w-md truncate px-4 py-3"
                      >
                        {{ email.subject }}
                      </td>
                      <td
                        hlmTd
                        class="text-muted-foreground px-4 py-3 whitespace-nowrap"
                      >
                        {{ formatSent(email.sentAt) }}
                      </td>
                      <td hlmTd class="px-4 py-3 text-right">
                        <button
                          hlmBtn
                          type="button"
                          variant="ghost"
                          size="icon"
                          class="text-muted-foreground size-8"
                          [attr.aria-label]="'org.emails.rowActionsAria' | transloco"
                        >
                          <ng-icon name="lucideEllipsis" class="size-4" />
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          @if (showPaginationFooter()) {
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-muted-foreground text-sm tabular-nums">
                {{ paginationRangeLabel() }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  size="sm"
                  class="gap-1"
                  [disabled]="!canGoPreviousPage()"
                  (click)="goToPreviousPage()"
                >
                  <ng-icon name="lucideChevronLeft" class="size-4" />
                  {{ 'org.emails.previous' | transloco }}
                </button>
                <span class="text-muted-foreground px-1 text-sm tabular-nums">
                  {{
                    'org.emails.pageOf'
                      | transloco: {
                          current: currentPageNumber(),
                          total: totalPages(),
                        }
                  }}
                </span>
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  size="sm"
                  class="gap-1"
                  [disabled]="!canGoNextPage()"
                  (click)="goToNextPage()"
                >
                  {{ 'org.emails.next' | transloco }}
                  <ng-icon name="lucideChevronRight" class="size-4" />
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class OrgEmailsComponent {
  readonly organizationId = input.required<string>();

  private readonly emailsPort = inject(EMAILS_PORT);
  private readonly apiKeysPort = inject(API_KEYS_PORT);
  private readonly transloco = inject(TranslocoService);

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
        throw portErrorToError(result.error, this.transloco);
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
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly filteredEmails = computed(
    (): readonly OutboundEmail[] => this.emailsResource.value() ?? [],
  );

  protected readonly emailsLoading = computed(
    () =>
      this.emailsResource.isLoading() && this.emailsResource.value() === undefined,
  );

  protected readonly pageIndex = signal(0);

  protected readonly totalEmails = computed(() => this.filteredEmails().length);

  protected readonly filtersAreDefault = computed(
    () =>
      !this.searchTerm() &&
      this.periodFilter() === '15d' &&
      this.statusFilter() === 'all' &&
      this.apiKeyFilter() === 'all',
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalEmails() / EMAILS_PAGE_SIZE)),
  );

  protected readonly safePageIndex = computed(() =>
    Math.min(this.pageIndex(), Math.max(0, this.totalPages() - 1)),
  );

  protected readonly paginatedEmails = computed(() => {
    const start = this.safePageIndex() * EMAILS_PAGE_SIZE;
    return this.filteredEmails().slice(start, start + EMAILS_PAGE_SIZE);
  });

  protected readonly showPaginationFooter = computed(
    () => this.totalEmails() > EMAILS_PAGE_SIZE,
  );

  protected readonly currentPageNumber = computed(
    () => this.safePageIndex() + 1,
  );

  protected readonly paginationRangeLabel = computed(() => {
    const total = this.totalEmails();
    if (total <= 0) {
      return this.transloco.translate('org.emails.paginationEmpty');
    }
    const start = this.safePageIndex() * EMAILS_PAGE_SIZE + 1;
    const end = Math.min((this.safePageIndex() + 1) * EMAILS_PAGE_SIZE, total);
    return this.transloco.translate('org.emails.paginationRange', {
      start,
      end,
      total: total.toLocaleString(),
    });
  });

  protected readonly canGoPreviousPage = computed(() => this.safePageIndex() > 0);

  protected readonly canGoNextPage = computed(
    () => this.safePageIndex() < this.totalPages() - 1,
  );

  constructor() {
    effect(() => {
      this.searchTerm();
      this.periodFilter();
      this.statusFilter();
      this.apiKeyFilter();
      this.pageIndex.set(0);
    });
  }

  protected readonly periodLabel = computed(() =>
    this.transloco.translate(`org.emails.period.${this.periodFilter()}`),
  );

  protected readonly statusFilterLabel = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return this.transloco.translate('org.emails.statusFilter.all');
    }
    return this.formatStatus(filter);
  });

  protected readonly apiKeyFilterLabel = computed(() => {
    const id = this.apiKeyFilter();
    if (id === 'all') {
      return this.transloco.translate('org.emails.allApiKeys');
    }
    return (
      this.apiKeys().find((key) => key.id === id)?.name ??
      this.transloco.translate('org.emails.apiKeyFallback')
    );
  });

  protected formatStatus(status: OutboundEmailStatus): string {
    const key = `org.emails.statusFilter.${status}`;
    const translated = this.transloco.translate(key);
    return translated === key ? status : translated;
  }

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

  protected goToPreviousPage(): void {
    if (this.canGoPreviousPage()) {
      this.pageIndex.update((page) => page - 1);
    }
  }

  protected goToNextPage(): void {
    if (this.canGoNextPage()) {
      this.pageIndex.update((page) => page + 1);
    }
  }
}
