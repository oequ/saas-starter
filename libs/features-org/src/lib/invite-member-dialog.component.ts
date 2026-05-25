import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe } from '@oequ/i18n';
import type { OrgRole } from '@oequ/ports';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
  SETTINGS_DIALOG_FIELD_CLASS,
} from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';

export interface InviteMemberInput {
  readonly email: string;
  readonly role: 'admin' | 'member';
}

export interface InviteMemberRoleOption {
  readonly value: OrgRole;
  readonly labelKey: string;
  readonly descriptionKey: string;
}

@Component({
  selector: 'oequ-invite-member-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    HlmSelectImports,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>
              {{ 'org.members.inviteDialog.title' | transloco }}
            </h3>
            <p hlmDialogDescription>
              {{ 'org.members.inviteDialog.description' | transloco }}
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="w-full min-w-0">
              <label for="invite-email" class="mb-1.5 block text-sm font-medium">
                {{ 'org.members.inviteDialog.emailLabel' | transloco }}
              </label>
              <input
                id="invite-email"
                hlmInput
                type="email"
                [placeholder]="'org.members.inviteDialog.emailPlaceholder' | transloco"
                [class]="dialogFieldClass"
                class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                [formControl]="form.controls.email"
                autocomplete="email"
              />
              @if (submitAttempted() && form.controls.email.invalid) {
                <p class="text-destructive mt-1.5 text-sm">
                  {{ 'org.members.inviteDialog.emailInvalid' | transloco }}
                </p>
              }
            </div>

            <div class="w-full min-w-0">
              <label
                for="invite-role-trigger"
                class="mb-1.5 block text-sm font-medium"
              >
                {{ 'common.role' | transloco }}
              </label>
              <hlm-select
                class="block w-full"
                [value]="form.controls.role.value"
                (valueChange)="onRoleChange($event)"
              >
                <hlm-select-trigger
                  buttonId="invite-role-trigger"
                  [class]="dialogFieldClass"
                  class="w-full max-w-full shadow-none"
                >
                  <span
                    hlmSelectValue
                    [placeholder]="'common.selectRole' | transloco"
                  ></span>
                </hlm-select-trigger>
                <hlm-select-content
                  *hlmSelectPortal
                  class="w-[var(--brn-select-width)]"
                >
                  @for (option of roleOptions(); track option.value) {
                    <hlm-select-item [value]="option.value">
                      <span class="font-medium">{{
                        option.labelKey | transloco
                      }}</span>
                      <span
                        class="text-muted-foreground block text-xs font-normal"
                      >
                        {{ option.descriptionKey | transloco }}
                      </span>
                    </hlm-select-item>
                  }
                </hlm-select-content>
              </hlm-select>
            </div>

            @if (seatsExhausted()) {
              <p class="text-destructive text-sm leading-relaxed" role="alert">
                @if (seatsUsageLabel(); as usage) {
                  {{ 'org.members.inviteDialog.seatsExhaustedWithUsage' | transloco: { usage } }}
                } @else {
                  {{ 'org.members.inviteDialog.seatsExhausted' | transloco }}
                }
                <button
                  type="button"
                  class="text-destructive font-medium underline underline-offset-4 hover:text-destructive/90 hover:no-underline"
                  (click)="upgradeRequested.emit()"
                >
                  {{ 'org.members.inviteDialog.upgradePlan' | transloco }}
                </button>
                {{ 'org.members.inviteDialog.upgradeSuffix' | transloco }}
              </p>
            } @else if (submitError()) {
              <p class="text-destructive text-sm" role="alert">{{ submitError() }}</p>
            }

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                {{ 'common.cancel' | transloco }}
              </button>
              <button
                hlmBtn
                type="submit"
                [disabled]="inviting() || seatsExhausted()"
              >
                @if (syncingSeats()) {
                  {{ 'org.members.inviteDialog.syncingSeats' | transloco }}
                } @else if (inviting()) {
                  {{ 'org.members.inviteDialog.sending' | transloco }}
                } @else {
                  {{ 'org.members.inviteDialog.sendInvite' | transloco }}
                }
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class InviteMemberDialogComponent {
  readonly open = input(false);
  readonly inviting = input(false);
  readonly syncingSeats = input(false);
  readonly seatsExhausted = input(false);
  readonly seatsUsageLabel = input<string | null>(null);
  readonly submitError = input<string | null>(null);
  readonly roleOptions = input.required<readonly InviteMemberRoleOption[]>();

  readonly submitted = output<InviteMemberInput>();
  readonly cancelled = output<void>();
  readonly upgradeRequested = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly dialogFieldClass = SETTINGS_DIALOG_FIELD_CLASS;

  protected readonly submitAttempted = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<'admin' | 'member'>('member', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.submitAttempted.set(false);
        this.form.reset({ email: '', role: 'member' });
      }
    });

  }

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  private confirming = false;

  protected onRoleChange(value: string | string[] | null | undefined): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (next === 'admin' || next === 'member') {
      this.form.controls.role.setValue(next);
    }
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }
    this.confirming = true;
    this.submitted.emit({
      email: this.form.controls.email.value.trim(),
      role: this.form.controls.role.value,
    });
  }

  protected onDialogClosed(): void {
    if (this.confirming) {
      this.confirming = false;
      this.submitAttempted.set(false);
      this.form.reset({ email: '', role: 'member' });
      return;
    }
    this.cancelled.emit();
  }
}
