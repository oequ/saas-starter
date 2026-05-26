import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
import {
  TranslocoPipe,
  TranslocoService,
  translatePortError,
} from '@oequ/i18n';
import { AUTH_PORT } from '@oequ/ports';
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { toast } from '@spartan-ng/brain/sonner';
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
    TranslocoPipe,
  ],
  templateUrl: './account-security-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly transloco = inject(TranslocoService);

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
  protected readonly statusIsError = signal(false);
  protected readonly submitAttempted = signal(false);
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

    return hasChanges && !this.saving();
  });

  protected savePassword(event: Event): void {
    event.preventDefault();
    void this.persistPassword();
  }

  private async persistPassword(): Promise<void> {
    this.submitAttempted.set(true);
    if (!this.canSavePassword()) {
      return;
    }

    const { currentPassword, newPassword, confirmPassword } =
      this.passwordForm.getRawValue();

    if (this.passwordForm.invalid) {
      return;
    }

    if (newPassword !== confirmPassword) {
      this.statusIsError.set(true);
      this.statusMessage.set(
        this.transloco.translate('account.security.passwordMismatch'),
      );
      return;
    }

    this.saving.set(true);
    this.statusMessage.set(null);
    this.statusIsError.set(false);

    try {
      const result = await this.authPort.changePassword({
        currentPassword,
        newPassword,
      });

      if (!result.ok) {
        this.statusIsError.set(true);
        this.statusMessage.set(
          translatePortError(result.error, this.transloco),
        );
        return;
      }

      this.passwordForm.reset();
      this.submitAttempted.set(false);
      toast.success(
        this.transloco.translate('account.security.passwordChanged'),
      );
    } catch {
      this.statusIsError.set(true);
      this.statusMessage.set(
        this.transloco.translate('common.errorGeneric'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected enableTwoFactor(): void {
    this.statusIsError.set(false);
    this.statusMessage.set(
      this.transloco.translate('account.security.twoFactorSoon'),
    );
  }
}
