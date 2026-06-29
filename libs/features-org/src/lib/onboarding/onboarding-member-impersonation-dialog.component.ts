import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ORG_PORT,
  formatMemberDisplayLabel,
  formatOrgRole,
  type OrganizationMember,
} from '@oequ/ports';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
} from '@oequ/i18n';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

@Component({
  selector: 'oequ-onboarding-member-impersonation-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmBadgeImports,
    HlmSkeletonImports,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>
              {{ 'onboarding.impersonationDialog.title' | transloco }}
            </h3>
            <p hlmDialogDescription>
              {{ 'onboarding.impersonationDialog.description' | transloco }}
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            @if (membersLoading()) {
              <div
                class="max-h-[min(18rem,50dvh)] space-y-2 overflow-y-auto overscroll-contain"
                aria-busy="true"
              >
                @for (_ of skeletonSlots; track $index) {
                  <hlm-skeleton class="h-14 w-full rounded-lg" />
                }
              </div>
            } @else if (membersError()) {
              <p class="text-destructive text-sm" role="alert">
                {{ membersError() }}
              </p>
            } @else if (activeMembers().length === 0) {
              <p class="text-muted-foreground text-sm">
                {{ 'onboarding.impersonationDialog.noMembers' | transloco }}
              </p>
            } @else {
              <fieldset class="flex min-h-0 flex-col gap-2">
                <legend class="text-sm font-medium">
                  {{ 'onboarding.impersonationDialog.memberLegend' | transloco }}
                  <span class="text-muted-foreground font-normal">
                    {{
                      'onboarding.impersonationDialog.memberActiveCount'
                        | transloco: { count: activeMembers().length }
                    }}
                  </span>
                </legend>
                <div
                  class="max-h-[min(18rem,50dvh)] space-y-2 overflow-y-auto overscroll-contain pe-0.5"
                  role="listbox"
                  [attr.aria-label]="
                    'onboarding.impersonationDialog.membersAria' | transloco
                  "
                >
                @for (member of members(); track member.userId) {
                  <label
                    role="option"
                    [attr.aria-selected]="
                      form.controls.memberId.value === member.userId
                    "
                    class="border-input hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                    [class.border-primary]="
                      form.controls.memberId.value === member.userId
                    "
                    [class.bg-primary/5]="
                      form.controls.memberId.value === member.userId
                    "
                    [class.cursor-not-allowed]="member.status !== 'active'"
                    [class.opacity-50]="member.status !== 'active'"
                  >
                    <input
                      type="radio"
                      class="mt-1"
                      formControlName="memberId"
                      [value]="member.userId"
                      [disabled]="member.status !== 'active'"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{{
                          memberOptionLabel(member)
                        }}</span>
                        <span
                          hlmBadge
                          variant="outline"
                          class="text-[10px] capitalize"
                        >
                          {{ formatOrgRole(member.role) }}
                        </span>
                        @if (member.status !== 'active') {
                          <span
                            hlmBadge
                            variant="outline"
                            class="text-muted-foreground text-[10px] capitalize"
                          >
                            {{ member.status }}
                          </span>
                        }
                      </span>
                      <span class="text-muted-foreground block truncate text-xs">
                        {{ member.email }}
                      </span>
                    </span>
                  </label>
                }
                </div>
              </fieldset>
              @if (submitAttempted() && form.controls.memberId.invalid) {
                <p class="text-destructive text-xs">
                  {{ 'onboarding.impersonationDialog.selectMember' | transloco }}
                </p>
              }
            }

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                {{ 'common.cancel' | transloco }}
              </button>
              <button
                hlmBtn
                type="submit"
                [disabled]="
                  submitting() ||
                  membersLoading() ||
                  activeMembers().length === 0
                "
              >
                {{
                  submitting()
                    ? ('onboarding.impersonationDialog.signingIn' | transloco)
                    : ('onboarding.impersonationDialog.signIn' | transloco)
                }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class OnboardingMemberImpersonationDialogComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly organizationId = input<string | null>(null);
  readonly submitting = input(false);

  readonly confirmed = output<OrganizationMember>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly formatOrgRole = formatOrgRole;
  protected readonly submitAttempted = signal(false);
  protected readonly skeletonSlots = [0, 1, 2];

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  protected readonly membersResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      open: this.open(),
    }),
    loader: async ({ params }) => {
      if (!params.open || !params.orgId) {
        return [] as readonly OrganizationMember[];
      }
      const result = await this.orgPort.getMembers(params.orgId);
      if (!result.ok) {
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly members = computed(
    () => this.membersResource.value() ?? [],
  );

  protected readonly activeMembers = computed(() =>
    this.members().filter((member) => member.status === 'active'),
  );

  protected readonly membersLoading = computed(
    () => this.open() && this.membersResource.isLoading(),
  );

  protected readonly membersError = computed(() => {
    const error = this.membersResource.error();
    return error instanceof Error ? error.message : null;
  });

  protected readonly form = new FormGroup({
    memberId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const active = this.activeMembers();
      const current = this.form.controls.memberId.value;
      const stillValid = active.some((member) => member.userId === current);
      if (active.length > 0 && !stillValid) {
        this.form.controls.memberId.setValue(active[0].userId);
      }
    });
  }

  protected memberOptionLabel(member: OrganizationMember): string {
    return formatMemberDisplayLabel(member);
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    const memberId = this.form.controls.memberId.value;
    const member = this.activeMembers().find((m) => m.userId === memberId);
    if (!member) {
      return;
    }

    this.confirmed.emit(member);
  }

  protected onDialogClosed(): void {
    this.submitAttempted.set(false);
    this.form.reset({ memberId: '' });
    this.cancelled.emit();
  }
}
