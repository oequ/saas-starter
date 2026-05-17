import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  BILLING_PORT,
  billingSeatUsagePercent,
  isBillingSeatsExhausted,
  ORG_PORT,
  type OrgRole,
} from '@oequ/ports';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
  SETTINGS_FORM_FIELD_CLASS,
} from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { startWith, switchMap } from 'rxjs';

@Component({
  selector: 'oequ-org-settings-members',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section hlmCard class="gap-0 overflow-hidden py-0">
      <div hlmCardContent class="!p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-xl leading-8 font-semibold tracking-tight">
              Members
            </h2>
            <p class="text-muted-foreground mt-1 text-sm leading-6">
              People who have access to this workspace.
            </p>
          </div>
          <div [class]="fieldClass + ' w-full sm:max-w-xs'">
            <label for="member-search" class="sr-only">Search members</label>
            <input
              id="member-search"
              hlmInput
              type="search"
              placeholder="Search by name or email"
              class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
              [formControl]="searchControl"
            />
          </div>
        </div>

        @if (billingResource.isLoading()) {
          <p class="text-muted-foreground mt-4 text-sm">Loading seat usage…</p>
        } @else if (billingSummary(); as billing) {
          @if (seatUsagePercent(billing); as percent) {
            <div class="mt-4 max-w-md">
              <div class="mb-2 flex justify-between text-sm">
                <span class="text-muted-foreground">Seats</span>
                <span class="font-medium">
                  {{ billing.seatsUsed }} /
                  {{ billing.seatsLimit ?? '∞' }} used
                </span>
              </div>
              <div
                class="bg-muted h-2 w-full overflow-hidden rounded-full"
                role="progressbar"
                [attr.aria-valuenow]="percent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="bg-primary h-full rounded-full transition-[width]"
                  [style.width.%]="percent"
                ></div>
              </div>
            </div>
          }
          @if (seatsExhausted()) {
            <div
              class="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-md border px-4 py-3 text-sm"
              role="status"
            >
              Seat limit reached. Remove a member or
              <a
                routerLink="/workspace/settings/billing/overview"
                class="font-medium underline underline-offset-2"
                >upgrade your plan</a
              >
              to invite more people.
            </div>
          }
        }

        <div class="border-input mt-6 overflow-hidden rounded-[5px] border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
              <tr>
                <th class="px-4 py-2.5 font-medium">Member</th>
                <th class="hidden px-4 py-2.5 font-medium sm:table-cell">Role</th>
                <th class="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="divide-border divide-y">
              @if (filteredMembers().length === 0) {
                <tr>
                  <td
                    colspan="3"
                    class="text-muted-foreground px-4 py-8 text-center"
                  >
                    No members match your search.
                  </td>
                </tr>
              } @else {
                @for (member of filteredMembers(); track member.userId) {
                  <tr class="hover:bg-muted/30">
                    <td class="px-4 py-3">
                      <p class="font-medium">
                        {{ member.displayName ?? member.email }}
                      </p>
                      @if (member.displayName) {
                        <p class="text-muted-foreground text-xs">
                          {{ member.email }}
                        </p>
                      }
                    </td>
                    <td
                      class="text-muted-foreground hidden px-4 py-3 capitalize sm:table-cell"
                    >
                      {{ member.role }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-md px-2 py-0.5 text-xs font-medium capitalize"
                        [class]="statusClass(member.status)"
                      >
                        {{ member.status }}
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

      </div>

      <div
        hlmCardFooter
        class="border-border bg-muted/50 text-foreground flex min-h-[57px] flex-wrap items-center justify-between gap-4 border-t !py-3 text-sm leading-relaxed"
      >
        @if (statusMessage(); as message) {
          <p role="status" class="min-w-0 flex-1">{{ message }}</p>
        } @else {
          <p class="text-muted-foreground min-w-0 flex-1">
            Invite teammates by email. They receive a link to join this workspace.
          </p>
        }
        <button
          hlmBtn
          type="button"
          [disabled]="seatsExhausted()"
          (click)="openInviteDialog()"
        >
          Invite member
        </button>
      </div>
    </section>

    <hlm-dialog [state]="inviteDialogState()" (closed)="closeInviteDialog()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Invite member</h3>
            <p hlmDialogDescription>
              Send an invitation to join this workspace.
            </p>
          </hlm-dialog-header>

          <form
            class="space-y-4"
            [formGroup]="inviteForm"
            (ngSubmit)="submitInvite()"
          >
            <div class="w-full min-w-0">
              <label for="invite-email" class="mb-1.5 block text-sm font-medium">
                Email address
              </label>
              <input
                id="invite-email"
                hlmInput
                type="email"
                placeholder="colleague@company.com"
                class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                [formControl]="inviteForm.controls.email"
                autocomplete="email"
              />
              @if (
                inviteSubmitAttempted() && inviteForm.controls.email.invalid
              ) {
                <p class="text-destructive mt-1.5 text-sm">
                  Enter a valid email address.
                </p>
              }
            </div>

            <div class="w-full min-w-0">
              <label for="invite-role-trigger" class="mb-1.5 block text-sm font-medium">
                Role
              </label>
              <hlm-select
                class="block w-full"
                [value]="inviteForm.controls.role.value"
                (valueChange)="onInviteRoleChange($event)"
              >
                <hlm-select-trigger
                  buttonId="invite-role-trigger"
                  class="w-full max-w-full shadow-none"
                >
                  <span hlmSelectValue placeholder="Select a role"></span>
                </hlm-select-trigger>
                <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
                  @for (option of inviteRoleOptions; track option.value) {
                    <hlm-select-item [value]="option.value">
                      <span class="font-medium">{{ option.label }}</span>
                      <span class="text-muted-foreground block text-xs font-normal">
                        {{ option.description }}
                      </span>
                    </hlm-select-item>
                  }
                </hlm-select-content>
              </hlm-select>
            </div>

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                Cancel
              </button>
              <button hlmBtn type="submit">Send invite</button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class OrgSettingsMembersComponent {
  readonly organizationId = input.required<string>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  private readonly orgPort = inject(ORG_PORT);
  private readonly billingPort = inject(BILLING_PORT);

  protected readonly seatUsagePercent = billingSeatUsagePercent;

  protected readonly billingResource = resource({
    params: () => ({ orgId: this.organizationId() }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.getSummary(
        params.orgId,
        abortSignal,
      );
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly billingSummary = computed(() =>
    this.billingResource.value(),
  );

  protected readonly seatsExhausted = computed(() => {
    const summary = this.billingSummary();
    return summary ? isBillingSeatsExhausted(summary) : false;
  });

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly inviteRoleOptions: readonly {
    value: OrgRole;
    label: string;
    description: string;
  }[] = [
    {
      value: 'member',
      label: 'Member',
      description: 'Can access workspace apps and data.',
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Can manage settings, members, and billing.',
    },
  ];

  protected readonly inviteForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<OrgRole>('member', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly inviteSubmitAttempted = signal(false);
  protected readonly inviteDialogOpen = signal(false);
  protected readonly inviteDialogState = computed(() =>
    this.inviteDialogOpen() ? 'open' : 'closed',
  );
  protected readonly statusMessage = signal<string | null>(null);

  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  private readonly membersResult = toSignal(
    toObservable(this.organizationId).pipe(
      switchMap((id) => this.orgPort.getMembers(id)),
    ),
    { initialValue: null },
  );

  protected readonly members = computed(() => {
    const result = this.membersResult();
    return result?.ok ? result.data : [];
  });

  protected readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.members();
    if (!query) {
      return list;
    }
    return list.filter((member) => {
      const name = member.displayName?.toLowerCase() ?? '';
      const email = member.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  });

  protected statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'invited':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-400';
      case 'suspended':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  protected onInviteRoleChange(value: string | null): void {
    if (value === 'admin' || value === 'member') {
      this.inviteForm.controls.role.setValue(value);
    }
  }

  protected openInviteDialog(): void {
    if (this.seatsExhausted()) {
      return;
    }
    this.inviteSubmitAttempted.set(false);
    this.statusMessage.set(null);
    this.inviteForm.reset({ email: '', role: 'member' });
    this.inviteDialogOpen.set(true);
  }

  protected closeInviteDialog(): void {
    this.inviteSubmitAttempted.set(false);
    this.inviteDialogOpen.set(false);
  }

  protected submitInvite(): void {
    this.inviteSubmitAttempted.set(true);
    if (this.inviteForm.invalid) {
      return;
    }

    const email = this.inviteForm.controls.email.value.trim();
    const role = this.inviteForm.controls.role.value;
    const roleLabel =
      this.inviteRoleOptions.find((o) => o.value === role)?.label ?? role;
    this.closeInviteDialog();
    this.statusMessage.set(
      `Invitation sent to ${email} as ${roleLabel}.`,
    );
  }
}
