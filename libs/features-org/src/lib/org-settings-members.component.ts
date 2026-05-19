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
  ORG_PORT,
  type OrganizationMember,
  type OrgRole,
  type PortError,
} from '@oequ/ports';
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
    ChangeMemberRoleDialogComponent,
    RemoveMemberDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideSearch, lucideEllipsis, lucideUsers }),
    provideHlmDropdownMenuConfig({ align: 'end', side: 'bottom' }),
  ],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-semibold tracking-tight">Members</h1>

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
            placeholder="Search…"
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
            <hlm-select-item value="all">All roles</hlm-select-item>
            <hlm-select-item value="owner">Owner</hlm-select-item>
            <hlm-select-item value="admin">Admin</hlm-select-item>
            <hlm-select-item value="member">Member</hlm-select-item>
          </hlm-select-content>
        </hlm-select>

        <div class="flex shrink-0 items-center gap-2 sm:ms-auto">
          <button hlmBtn type="button" (click)="openInviteDialog()">
            + Invite member
          </button>
        </div>
      </div>

      @if (membersLoading() && members().length === 0) {
        <div
          class="border-input text-muted-foreground flex min-h-[280px] items-center justify-center rounded-[5px] border text-sm"
        >
          Loading members…
        </div>
      } @else if (members().length === 0) {
        <hlm-empty class="border-input min-h-[280px]">
          <hlm-empty-header>
            <hlm-empty-media variant="icon">
              <ng-icon name="lucideUsers" aria-hidden="true" />
            </hlm-empty-media>
            <h2 hlmEmptyTitle>No members yet</h2>
            <p hlmEmptyDescription>
              Invite teammates by email. They receive a link to join this
              workspace.
            </p>
          </hlm-empty-header>
          <hlm-empty-content>
            <button hlmBtn type="button" (click)="openInviteDialog()">
              + Invite member
            </button>
          </hlm-empty-content>
        </hlm-empty>
      } @else {
        <div hlmTableContainer class="border-input rounded-[5px] border">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr class="text-muted-foreground border-b text-xs">
                <th hlmTh class="px-4">Member</th>
                <th hlmTh class="hidden px-4 sm:table-cell">Role</th>
                <th hlmTh class="px-4">Status</th>
                <th hlmTh class="w-12 px-2 text-end">
                  <span class="sr-only">Actions</span>
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
                    No members match your filters.
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
                      {{ member.role }}
                    </td>
                    <td hlmTd class="px-4 py-3">
                      @let statusBadge = memberStatusBadge(member.status);
                      <span
                        hlmBadge
                        [variant]="statusBadge.variant"
                        [class]="statusBadge.class"
                      >
                        {{ member.status }}
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
                            'Actions for ' +
                            (member.displayName ?? member.email)
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
                              Change role
                            </button>
                            <div hlmDropdownMenuSeparator></div>
                            <button
                              type="button"
                              hlmDropdownMenuItem
                              variant="destructive"
                              (triggered)="openRemoveDialog(member)"
                            >
                              Remove
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
      [roleOptions]="inviteRoleOptions"
      (submitted)="onInviteSubmitted($event)"
      (cancelled)="closeInviteDialog()"
    />

    <oequ-change-member-role-dialog
      [open]="changeRoleDialogOpen()"
      [memberLabel]="changeRoleTargetLabel()"
      [currentRole]="changeRoleCurrentRole()"
      [saving]="changingRole()"
      (confirmed)="confirmChangeRole($event)"
      (cancelled)="closeChangeRoleDialog()"
    />

    <oequ-remove-member-dialog
      [open]="removeDialogOpen()"
      [memberLabel]="removeTargetLabel()"
      [removing]="removing()"
      (confirmed)="confirmRemove()"
      (cancelled)="closeRemoveDialog()"
    />
  `,
})
export class OrgSettingsMembersComponent {
  readonly organizationId = input.required<string>();

  private readonly orgPort = inject(ORG_PORT);

  private readonly dataRefresh = signal(0);

  protected readonly membersResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      refresh: this.dataRefresh(),
    }),
    loader: async ({ params }) => {
      const result = await this.orgPort.getMembers(params.orgId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly roleFilter = signal<MemberRoleFilter>('all');

  protected readonly inviteRoleOptions = [
    {
      value: 'member' as const,
      label: 'Member',
      description: 'Can access workspace apps and data.',
    },
    {
      value: 'admin' as const,
      label: 'Admin',
      description: 'Can manage settings, members, and billing.',
    },
  ];

  protected readonly inviteDialogOpen = signal(false);
  protected readonly inviting = signal(false);

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
    switch (this.roleFilter()) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      case 'all':
      default:
        return 'All roles';
    }
  });

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
    this.inviteDialogOpen.set(true);
  }

  protected closeInviteDialog(): void {
    this.inviteDialogOpen.set(false);
  }

  protected async onInviteSubmitted(input: InviteMemberInput): Promise<void> {
    if (this.inviting()) {
      return;
    }

    this.inviting.set(true);
    const result = await this.orgPort.inviteMember(this.organizationId(), {
      email: input.email,
      role: input.role,
    });
    this.inviting.set(false);

    if (!result.ok) {
      toast.error(this.portErrorMessage(result.error));
      return;
    }

    this.closeInviteDialog();
    this.dataRefresh.update((value) => value + 1);
    toast.success(`Invitation sent to ${input.email}.`);
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
      toast.error(this.portErrorMessage(result.error));
      return;
    }

    const label = member.displayName ?? member.email;
    const roleLabel =
      this.inviteRoleOptions.find((o) => o.value === role)?.label ?? role;
    this.changeRoleDialogOpen.set(false);
    this.changeRoleTarget.set(null);
    this.dataRefresh.update((value) => value + 1);
    toast.success(`${label} is now ${roleLabel}.`);
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
    if (!member || this.removing()) {
      return;
    }

    this.removing.set(true);
    const result = await this.orgPort.removeMember(
      this.organizationId(),
      member.userId,
    );
    this.removing.set(false);

    if (!result.ok) {
      toast.error(this.portErrorMessage(result.error));
      return;
    }

    const label = member.displayName ?? member.email;
    this.removeDialogOpen.set(false);
    this.removeTarget.set(null);
    this.dataRefresh.update((value) => value + 1);
    toast.success(`${label} was removed from the workspace.`);
  }

  private portErrorMessage(error: PortError): string {
    switch (error.code) {
      case 'SEATS_EXHAUSTED':
        return 'No seats available. Upgrade your plan.';
      case 'CONFLICT':
        return 'This email is already a member or has a pending invite.';
      case 'FORBIDDEN':
        return error.message.includes('role')
          ? 'The workspace owner role cannot be changed.'
          : 'The workspace owner cannot be removed.';
      default:
        return error.message || 'Something went wrong.';
    }
  }
}
