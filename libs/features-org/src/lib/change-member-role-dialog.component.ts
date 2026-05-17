import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSelectImports } from '@spartan-ng/helm/select';

@Component({
  selector: 'oequ-change-member-role-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Change role</h3>
            <p hlmDialogDescription>
              Update the role for <strong>{{ memberLabel() }}</strong>.
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="confirm()">
            <div class="w-full min-w-0">
              <label
                for="change-role-trigger"
                class="mb-1.5 block text-sm font-medium"
              >
                Role
              </label>
              <hlm-select
                class="block w-full"
                [value]="form.controls.role.value"
                (valueChange)="onRoleChange($event)"
              >
                <hlm-select-trigger
                  buttonId="change-role-trigger"
                  class="w-full max-w-full shadow-none"
                >
                  <span hlmSelectValue placeholder="Select a role"></span>
                </hlm-select-trigger>
                <hlm-select-content
                  *hlmSelectPortal
                  class="w-[var(--brn-select-width)]"
                >
                  @for (option of roleOptions; track option.value) {
                    <hlm-select-item [value]="option.value">
                      <span class="font-medium">{{ option.label }}</span>
                      <span
                        class="text-muted-foreground block text-xs font-normal"
                      >
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
              <button hlmBtn type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save role' }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class ChangeMemberRoleDialogComponent {
  readonly open = input(false);
  readonly memberLabel = input.required<string>();
  readonly currentRole = input.required<'admin' | 'member'>();
  readonly saving = input(false);

  readonly confirmed = output<'admin' | 'member'>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  protected readonly roleOptions: readonly {
    value: 'admin' | 'member';
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

  protected readonly form = new FormGroup({
    role: new FormControl<'admin' | 'member'>('member', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private confirming = false;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.controls.role.setValue(this.currentRole());
      }
    });
  }

  protected onRoleChange(value: string | null): void {
    if (value === 'admin' || value === 'member') {
      this.form.controls.role.setValue(value);
    }
  }

  protected confirm(): void {
    if (this.form.invalid) {
      return;
    }
    this.confirming = true;
    this.confirmed.emit(this.form.controls.role.value);
  }

  protected onDialogClosed(): void {
    if (this.confirming) {
      this.confirming = false;
      return;
    }
    this.cancelled.emit();
  }
}
