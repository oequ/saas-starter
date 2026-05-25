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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsis, lucideSearch, lucideUsers } from '@ng-icons/lucide';
import {
  BILLING_PORT,
  BILLING_PROVIDER_ID,
  countMembersTowardSeats,
  formatSeatUsageValue,
  isBillingSeatsExhausted,
  needsPerSeatSeatSyncAfterRemove,
  needsPerSeatSeatSyncBeforeInvite,
  needsStripeSeatChargeConfirmBeforeInvite,
  ORG_PORT,
  targetSeatQuantityAfterMemberRemoved,
  targetSeatQuantityForInvite,
  type BillingProviderId,
  type OrganizationMember,
  type OrgRole,
} from '@oequ/ports';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
  translatePortError,
} from '@oequ/i18n';
import { PaywallDialogService } from '@oequ/shell';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import {
  HlmDropdownMenuImports,
  provideHlmDropdownMenuConfig,
} from '@spartan-ng/helm/dropdown-menu';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmBadgeImports, type BadgeVariants } from '@spartan-ng/helm/badge';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { startWith } from 'rxjs';

import { ChangeMemberRoleDialogComponent } from './change-member-role-dialog.component';
import { ConfirmSeatChargeDialogComponent } from './confirm-seat-charge-dialog.component';
import {
  InviteMemberDialogComponent,
  type InviteMemberInput,
} from './invite-member-dialog.component';
import { RemoveMemberDialogComponent } from './remove-member-dialog.component';

type MemberRoleFilter = 'all' | OrgRole;

@Component({
  selector: 'oequ-org-settings-members',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmButtonImports,
    HlmInput,
    HlmSelectImports,
    HlmTableImports,
    HlmBadgeImports,
    HlmEmptyImports,
    HlmDropdownMenuImports,
    InviteMemberDialogComponent,
    ConfirmSeatChargeDialogComponent,
    ChangeMemberRoleDialogComponent,
    RemoveMemberDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideSearch, lucideEllipsis, lucideUsers }),
    provideHlmDropdownMenuConfig({ align: 'end', side: 'bottom' }),
  ],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ 'org.members.title' | transloco }}
      </h1>

      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="relative min-w-0 flex-1 sm:max-w-xs">
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
          class="w-full sm:w-44"
          [value]="roleFilter()"
          (valueChange)="onRoleFilterChange($event)"
        >
          <hlm-select-trigger class="h-9 w-full shadow-none">
            <span class="truncate">{{ roleFilterLabel() }}</span>
          </hlm-select-trigger>
          <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
            <hlm-select-item value="all">{{
              'org.members.filters.allRoles' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="owner">{{
              'org.members.filters.owner' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="admin">{{
              'org.members.filters.admin' | transloco
            }}</hlm-select-item>
            <hlm-select-item value="member">{{
              'org.members.filters.member' | transloco
            }}</hlm-select-item>
          </hlm-select-content>
        </hlm-select>

        <div class="flex shrink-0 items-center gap-2 sm:ms-auto">
          <button hlmBtn type="button" (click)="openInviteDialog()">
            {{ 'org.members.inviteButton' | transloco }}
          </button>
        </div>
      </div>

      @if (membersLoading() && members().length === 0) {
        <div
          class="border-input text-muted-foreground flex min-h-[280px] items-center justify-center rounded-[5px] border text-sm"
        >
          {{ 'org.members.loading' | transloco }}
        </div>
      } @else if (members().length === 0) {
        <hlm-empty class="border-input min-h-[280px]">
          <hlm-empty-header>
            <hlm-empty-media variant="icon">
              <ng-icon name="lucideUsers" aria-hidden="true" />
            </hlm-empty-media>
            <h2 hlmEmptyTitle>{{ 'org.members.emptyTitle' | transloco }}</h2>
            <p hlmEmptyDescription>
              {{ 'org.members.emptyDescription' | transloco }}
            </p>
          </hlm-empty-header>
          <hlm-empty-content>
            <button hlmBtn type="button" (click)="openInviteDialog()">
              {{ 'org.members.inviteButton' | transloco }}
            </button>
          </hlm-empty-content>
        </hlm-empty>
      } @else {
        <div hlmTableContainer class="border-input rounded-[5px] border">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr class="text-muted-foreground border-b text-xs">
                <th hlmTh class="px-4">
                  {{ 'org.members.columnMember' | transloco }}
                </th>
                <th hlmTh class="hidden px-4 sm:table-cell">
                  {{ 'org.members.columnRole' | transloco }}
                </th>
                <th hlmTh class="px-4">
                  {{ 'org.members.columnStatus' | transloco }}
                </th>
                <th hlmTh class="w-12 px-2 text-end">
                  <span class="sr-only">{{ 'common.actions' | transloco }}</span>
                </th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @if (filteredMembers().length === 0) {
                <tr hlmTr>
                  <td
                    hlmTd
                    colspan="4"
                    class="text-muted-foreground px-4 py-10 text-center whitespace-normal"
                  >
                    {{ 'org.members.noFilterMatch' | transloco }}
                  </td>
                </tr>
              } @else {
                @for (member of filteredMembers(); track member.userId) {
                  <tr hlmTr>
                    <td hlmTd class="px-4 py-3 whitespace-normal">
                      <div class="flex items-center gap-2">
                        <span
                          class="bg-primary/10 text-primary grid size-7 shrink-0 place-content-center rounded-md"
                        >
                          <ng-icon
                            name="lucideUsers"
                            class="size-3.5"
                            aria-hidden="true"
                          />
                        </span>
                        <div class="min-w-0">
                          <p class="truncate font-medium">
                            {{ member.displayName ?? member.email }}
                          </p>
                          @if (member.displayName) {
                            <p class="text-muted-foreground truncate text-xs">
                              {{ member.email }}
                            </p>
                          }
                        </div>
                      </div>
                    </td>
                    <td
                      hlmTd
                      class="text-muted-foreground hidden px-4 py-3 capitalize sm:table-cell"
                    >
                      {{ roleLabel(member.role) | transloco }}
                    </td>
                    <td hlmTd class="px-4 py-3">
                      @let statusBadge = memberStatusBadge(member.status);
                      <span
                        hlmBadge
                        [variant]="statusBadge.variant"
                        [class]="statusBadge.class"
                      >
                        {{ memberStatusLabel(member.status) | transloco }}
                      </span>
                    </td>
                    <td hlmTd class="px-2 py-3 text-end">
                      @if (member.role !== 'owner') {
                        <button
                          type="button"
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          class="size-8"
                          [hlmDropdownMenuTrigger]="memberActionsMenu"
                          [attr.aria-label]="
                            ('org.members.actionsFor' | transloco: {
                              name: member.displayName ?? member.email,
                            })
                          "
                        >
                          <ng-icon
                            name="lucideEllipsis"
                            class="size-4"
                            aria-hidden="true"
                          />
                        </button>
                        <ng-template #memberActionsMenu>
                          <div hlmDropdownMenu class="min-w-44 p-1">
                            <button
                              type="button"
                              hlmDropdownMenuItem
                              (triggered)="openChangeRoleDialog(member)"
                            >
                              {{ 'org.members.changeRole' | transloco }}
                            </button>
                            <div hlmDropdownMenuSeparator></div>
                            <button
                              type="button"
                              hlmDropdownMenuItem
                              variant="destructive"
                              (triggered)="openRemoveDialog(member)"
                            >
                              {{ 'org.members.remove' | transloco }}
                            </button>
                          </div>
                        </ng-template>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <oequ-invite-member-dialog
      [open]="inviteDialogOpen()"
      [inviting]="inviting()"
      [syncingSeats]="syncingSeats()"
      [seatsExhausted]="inviteSeatsExhausted()"
      [seatsUsageLabel]="inviteSeatsUsageLabel()"
      [submitError]="inviteSubmitError()"
      [roleOptions]="inviteRoleOptions"
      (submitted)="onInviteSubmitted($event)"
      (cancelled)="closeInviteDialog()"
      (upgradeRequested)="onInviteUpgradeRequested()"
    />

    <oequ-change-member-role-dialog
      [open]="changeRoleDialogOpen()"
      [memberLabel]="changeRoleTargetLabel()"
      [currentRole]="changeRoleCurrentRole()"
      [saving]="changingRole()"
      (confirmed)="confirmChangeRole($event)"
      (cancelled)="closeChangeRoleDialog()"
    />

    <oequ-confirm-seat-charge-dialog
      [open]="seatChargeConfirmOpen()"
      [inviteEmail]="pendingInviteEmail()"
      [seatQuantity]="pendingSeatQuantity()"
      [confirming]="syncingSeats()"
      (confirmed)="onSeatChargeConfirmed()"
      (cancelled)="closeSeatChargeConfirm()"
    />

    <oequ-remove-member-dialog
      [open]="removeDialogOpen()"
      [memberLabel]="removeTargetLabel()"
      [removing]="removing()"
      [syncingSeats]="syncingSeatsOnRemove()"
      (confirmed)="confirmRemove()"
      (cancelled)="closeRemoveDialog()"
    />
  `,
})
export class OrgSettingsMembersComponent {
  readonly organizationId = input.required<string>();

  private readonly orgPort = inject(ORG_PORT);
  private readonly billingPort = inject(BILLING_PORT);
  private readonly billingProviderId = inject(BILLING_PROVIDER_ID);
  private readonly paywallDialog = inject(PaywallDialogService);
  private readonly transloco = inject(TranslocoService);

  private readonly dataRefresh = signal(0);

  protected readonly membersResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      refresh: this.dataRefresh(),
    }),
    loader: async ({ params }) => {
      const result = await this.orgPort.getMembers(params.orgId);
      if (!result.ok) {
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly roleFilter = signal<MemberRoleFilter>('all');

  protected readonly inviteRoleOptions = [
    {
      value: 'member' as const,
      labelKey: 'org.members.roles.member.label',
      descriptionKey: 'org.members.roles.member.description',
    },
    {
      value: 'admin' as const,
      labelKey: 'org.members.roles.admin.label',
      descriptionKey: 'org.members.roles.admin.description',
    },
  ];

  protected readonly inviteDialogOpen = signal(false);
  protected readonly inviting = signal(false);
  protected readonly syncingSeats = signal(false);
  protected readonly syncingSeatsOnRemove = signal(false);
  protected readonly inviteSubmitError = signal<string | null>(null);
  protected readonly seatChargeConfirmOpen = signal(false);
  protected readonly pendingInvite = signal<InviteMemberInput | null>(null);
  protected readonly pendingSeatQuantity = signal(1);
  protected readonly pendingInviteEmail = computed(
    () => this.pendingInvite()?.email ?? '',
  );

  protected readonly billingResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      refresh: this.dataRefresh(),
    }),
    loader: async ({ params }) => {
      const result = await this.billingPort.getSummary(params.orgId);
      if (!result.ok) {
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly inviteSeatsExhausted = computed(() => {
    const summary = this.billingResource.value();
    if (
      summary &&
      needsPerSeatSeatSyncBeforeInvite(summary)
    ) {
      return false;
    }
    const members = this.members();
    if (members.length > 0) {
      const used = countMembersTowardSeats(members);
      const limit = summary?.seatsLimit;
      if (limit !== null && limit !== undefined) {
        return used >= limit;
      }
      // Postgres default (free tier) while billing snapshot is still loading
      if (this.billingResource.isLoading() || !summary) {
        return used >= 3;
      }
    }
    return summary ? isBillingSeatsExhausted(summary) : false;
  });

  protected readonly inviteSeatsUsageLabel = computed(() => {
    const summary = this.billingResource.value();
    return summary ? formatSeatUsageValue(summary) : null;
  });

  protected readonly changeRoleDialogOpen = signal(false);
  protected readonly changeRoleTarget = signal<OrganizationMember | null>(null);
  protected readonly changingRole = signal(false);
  protected readonly changeRoleTargetLabel = computed(() => {
    const member = this.changeRoleTarget();
    return member ? (member.displayName ?? member.email) : '';
  });
  protected readonly changeRoleCurrentRole = computed((): 'admin' | 'member' => {
    const member = this.changeRoleTarget();
    return member?.role === 'admin' ? 'admin' : 'member';
  });

  protected readonly removeDialogOpen = signal(false);
  protected readonly removeTarget = signal<OrganizationMember | null>(null);
  protected readonly removing = signal(false);
  protected readonly removeTargetLabel = computed(() => {
    const member = this.removeTarget();
    return member ? (member.displayName ?? member.email) : '';
  });

  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  protected readonly members = computed(
    () => this.membersResource.value() ?? [],
  );

  protected readonly membersLoading = computed(() =>
    this.membersResource.isLoading(),
  );

  protected readonly roleFilterLabel = computed(() => {
    const key =
      this.roleFilter() === 'all'
        ? 'org.members.filters.allRoles'
        : `org.members.filters.${this.roleFilter()}`;
    return this.transloco.translate(key);
  });

  protected roleLabel(role: OrgRole): string {
    return `org.members.filters.${role}`;
  }

  protected memberStatusLabel(
    status: OrganizationMember['status'],
  ): string {
    return `org.members.status.${status}`;
  }

  protected readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();

    return this.members().filter((member) => {
      if (role !== 'all' && member.role !== role) {
        return false;
      }
      if (!query) {
        return true;
      }
      const name = member.displayName?.toLowerCase() ?? '';
      const email = member.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  });

  protected memberStatusBadge(status: OrganizationMember['status']): {
    variant: BadgeVariants['variant'];
    class: string;
  } {
    switch (status) {
      case 'active':
        return {
          variant: 'outline',
          class:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 capitalize dark:text-emerald-400',
        };
      case 'invited':
        return {
          variant: 'outline',
          class:
            'border-amber-500/25 bg-amber-500/10 text-amber-800 capitalize dark:text-amber-400',
        };
      case 'suspended':
        return { variant: 'secondary', class: 'capitalize' };
      default:
        return { variant: 'secondary', class: 'capitalize' };
    }
  }

  protected onRoleFilterChange(
    value: string | string[] | null | undefined,
  ): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (
      next === 'all' ||
      next === 'owner' ||
      next === 'admin' ||
      next === 'member'
    ) {
      this.roleFilter.set(next);
    }
  }

  protected openInviteDialog(): void {
    this.inviteSubmitError.set(null);
    this.inviteDialogOpen.set(true);
  }

  protected closeInviteDialog(): void {
    this.inviteDialogOpen.set(false);
    this.inviteSubmitError.set(null);
  }

  protected async onInviteUpgradeRequested(): Promise<void> {
    this.closeInviteDialog();
    const result = await this.paywallDialog.requestOpen({ suggestedPlanId: 'team' });
    if (result === 'success') {
      this.billingResource.reload();
      this.dataRefresh.update((value) => value + 1);
      toast.success(
        this.transloco.translate('org.members.toast.planUpgraded'),
      );
    }
  }

  protected async onInviteSubmitted(input: InviteMemberInput): Promise<void> {
    if (this.inviting()) {
      return;
    }

    this.inviteSubmitError.set(null);

    const summary = this.billingResource.value();
    if (
      summary &&
      needsStripeSeatChargeConfirmBeforeInvite(
        summary,
        this.billingProviderId as BillingProviderId,
      )
    ) {
      this.pendingInvite.set(input);
      this.pendingSeatQuantity.set(targetSeatQuantityForInvite(summary));
      this.closeInviteDialog();
      this.seatChargeConfirmOpen.set(true);
      return;
    }

    await this.runInviteWithOptionalSeatSync(input);
  }

  protected closeSeatChargeConfirm(): void {
    if (this.syncingSeats()) {
      return;
    }
    this.seatChargeConfirmOpen.set(false);
    this.pendingInvite.set(null);
  }

  protected async onSeatChargeConfirmed(): Promise<void> {
    const input = this.pendingInvite();
    if (!input || this.syncingSeats()) {
      return;
    }

    const synced = await this.syncSeatsBeforeInvite();
    if (!synced) {
      const message = this.inviteSubmitError();
      if (message) {
        toast.error(message);
      }
      return;
    }

    this.seatChargeConfirmOpen.set(false);
    this.pendingInvite.set(null);
    await this.sendInvite(input);
  }

  private async runInviteWithOptionalSeatSync(
    input: InviteMemberInput,
  ): Promise<void> {
    const summary = this.billingResource.value();
    if (summary && needsPerSeatSeatSyncBeforeInvite(summary)) {
      const synced = await this.syncSeatsBeforeInvite();
      if (!synced) {
        return;
      }
    }

    this.inviting.set(true);
    await this.sendInvite(input);
    this.inviting.set(false);
  }

  private async syncSeatsBeforeInvite(): Promise<boolean> {
    const summary = this.billingResource.value();
    if (!summary) {
      this.inviteSubmitError.set(
        this.transloco.translate('errors.billingSeatSyncFailed'),
      );
      return false;
    }

    this.syncingSeats.set(true);
    const syncResult = await this.billingPort.syncSubscriptionSeats(
      this.organizationId(),
      targetSeatQuantityForInvite(summary),
    );
    this.syncingSeats.set(false);

    if (!syncResult.ok) {
      this.inviteSubmitError.set(
        translatePortError(syncResult.error, this.transloco),
      );
      return false;
    }

    if (needsPerSeatSeatSyncBeforeInvite(syncResult.data)) {
      this.inviteSubmitError.set(
        this.transloco.translate('errors.billingSeatSyncFailed'),
      );
      return false;
    }

    this.dataRefresh.update((value) => value + 1);
    return true;
  }

  private async sendInvite(input: InviteMemberInput): Promise<void> {
    this.inviteSubmitError.set(null);

    const result = await this.orgPort.inviteMember(this.organizationId(), {
      email: input.email,
      role: input.role,
    });

    if (!result.ok) {
      this.inviteSubmitError.set(
        translatePortError(result.error, this.transloco),
      );
      if (!this.seatChargeConfirmOpen()) {
        this.inviteDialogOpen.set(true);
      }
      return;
    }

    this.closeInviteDialog();
    this.dataRefresh.update((value) => value + 1);
    this.billingResource.reload();
    toast.success(
      this.transloco.translate('org.members.toast.inviteSent', {
        email: input.email,
      }),
    );
  }

  protected openChangeRoleDialog(member: OrganizationMember): void {
    this.changeRoleTarget.set(member);
    this.changeRoleDialogOpen.set(true);
  }

  protected closeChangeRoleDialog(): void {
    if (this.changingRole()) {
      return;
    }
    this.changeRoleDialogOpen.set(false);
    this.changeRoleTarget.set(null);
  }

  protected async confirmChangeRole(role: 'admin' | 'member'): Promise<void> {
    const member = this.changeRoleTarget();
    if (!member || this.changingRole()) {
      return;
    }

    this.changingRole.set(true);
    const result = await this.orgPort.updateMemberRole(
      this.organizationId(),
      member.userId,
      { role },
    );
    this.changingRole.set(false);

    if (!result.ok) {
      toast.error(translatePortError(result.error, this.transloco));
      return;
    }

    const label = member.displayName ?? member.email;
    const roleKey =
      this.inviteRoleOptions.find((o) => o.value === role)?.labelKey ??
      `org.members.filters.${role}`;
    this.changeRoleDialogOpen.set(false);
    this.changeRoleTarget.set(null);
    this.dataRefresh.update((value) => value + 1);
    toast.success(
      this.transloco.translate('org.members.toast.roleChanged', {
        name: label,
        role: this.transloco.translate(roleKey),
      }),
    );
  }

  protected openRemoveDialog(member: OrganizationMember): void {
    this.removeTarget.set(member);
    this.removeDialogOpen.set(true);
  }

  protected closeRemoveDialog(): void {
    if (this.removing()) {
      return;
    }
    this.removeDialogOpen.set(false);
    this.removeTarget.set(null);
  }

  protected async confirmRemove(): Promise<void> {
    const member = this.removeTarget();
    if (!member || this.removing() || this.syncingSeatsOnRemove()) {
      return;
    }

    this.removing.set(true);
    const result = await this.orgPort.removeMember(
      this.organizationId(),
      member.userId,
    );
    this.removing.set(false);

    if (!result.ok) {
      toast.error(translatePortError(result.error, this.transloco));
      return;
    }

    const label = member.displayName ?? member.email;
    this.dataRefresh.update((value) => value + 1);

    await this.billingResource.reload();
    const summary = this.billingResource.value();
    if (
      summary &&
      needsPerSeatSeatSyncAfterRemove(
        summary,
        this.billingProviderId as BillingProviderId,
      )
    ) {
      this.syncingSeatsOnRemove.set(true);
      const syncResult = await this.billingPort.syncSubscriptionSeats(
        this.organizationId(),
        targetSeatQuantityAfterMemberRemoved(summary),
      );
      this.syncingSeatsOnRemove.set(false);

      if (!syncResult.ok) {
        toast.error(
          translatePortError(syncResult.error, this.transloco),
        );
      } else {
        this.billingResource.reload();
      }
    }

    this.removeDialogOpen.set(false);
    this.removeTarget.set(null);
    toast.success(
      this.transloco.translate('org.members.toast.memberRemoved', {
        name: label,
      }),
    );
  }
}
