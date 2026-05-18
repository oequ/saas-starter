import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'oequ-account-security-page',
  imports: [
    ReactiveFormsModule,
    HlmCardImports,
    HlmButtonImports,
    HlmBadgeImports,
    HlmInput,
  ],
  templateUrl: './account-security-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityPageComponent {
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly statusMessage = signal<string | null>(null);
  protected readonly saving = signal(false);

  private readonly passwordFormValue = toSignal(
    this.passwordForm.valueChanges.pipe(
      startWith(this.passwordForm.getRawValue()),
    ),
    {
      initialValue: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
    },
  );

  protected readonly canSavePassword = computed(() => {
    const { currentPassword, newPassword, confirmPassword } =
      this.passwordFormValue();
    const current = (currentPassword ?? '').trim();
    const next = newPassword ?? '';
    const confirm = confirmPassword ?? '';

    const hasChanges =
      current.length > 0 || next.length > 0 || confirm.length > 0;

    return (
      hasChanges &&
      current.length > 0 &&
      next.length >= 8 &&
      next === confirm &&
      this.passwordForm.valid &&
      !this.saving()
    );
  });

  protected savePassword(): void {
    if (!this.canSavePassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.statusMessage.set(null);

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.statusMessage.set('New passwords do not match.');
      this.saving.set(false);
      return;
    }

    this.statusMessage.set(
      'Password change will be available in v0.3.',
    );
    this.passwordForm.reset();
    this.saving.set(false);
  }

  protected enableTwoFactor(): void {
    this.statusMessage.set('TOTP setup will be available in v0.3.');
  }
}
