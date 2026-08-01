import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { AUTH_PORT } from '@oequ/ports-angular';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

import { DeleteAccountDialogComponent } from './delete-account-dialog.component';

@Component({
  selector: 'oequ-account-profile-page',
  imports: [
    ReactiveFormsModule,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    DeleteAccountDialogComponent,
    TranslocoPipe,
  ],
  templateUrl: './account-profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePageComponent {
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  private readonly authPort = inject(AUTH_PORT);
  private readonly transloco = inject(TranslocoService);

  private readonly session = toSignal(this.authPort.session$, {
    initialValue: null,
  });

  protected readonly profileForm = new FormGroup<{
    displayName: FormControl<string>;
  }>({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(64),
      ],
    }),
  });

  protected readonly saving = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly deleteDialogOpen = signal(false);
  private readonly savedDisplayName = signal<string | null>(null);
  /** Last user id synced into the form — avoid reset on profile updates after save. */
  private readonly syncedUserId = signal<string | null>(null);
  private readonly displayNameChanges = toSignal(
    this.profileForm.controls.displayName.valueChanges,
    { initialValue: '' },
  );

  protected readonly canSaveProfile = computed(() => {
    this.displayNameChanges();
    const saved = this.savedDisplayName();
    const name = this.profileForm.controls.displayName.value.trim();
    return (
      saved !== null && name !== saved.trim() && !this.saving()
    );
  });

  protected readonly userEmail = computed(
    () => this.session()?.user.email ?? '',
  );

  constructor() {
    effect(() => {
      const user = this.session()?.user;
      if (!user) {
        this.syncedUserId.set(null);
        return;
      }

      const isUserSwitch = this.syncedUserId() !== user.id;
      this.syncedUserId.set(user.id);

      const displayName = user.displayName?.trim() || user.email;
      this.savedDisplayName.set(displayName);

      if (isUserSwitch) {
        this.profileForm.patchValue({ displayName });
        this.profileForm.markAsPristine();
        this.statusMessage.set(null);
        this.submitAttempted.set(false);
      }
    });
  }

  protected saveProfile(event: Event): void {
    event.preventDefault();
    void this.persistProfile();
  }

  protected onSaveClick(): void {
    void this.persistProfile();
  }

  private async persistProfile(): Promise<void> {
    this.submitAttempted.set(true);
    if (!this.canSaveProfile()) {
      return;
    }

    if (this.profileForm.invalid) {
      return;
    }

    this.saving.set(true);

    const displayName = this.profileForm.getRawValue().displayName.trim();

    try {
      const result = await this.authPort.updateProfile({ displayName });

      if (result.ok) {
        this.savedDisplayName.set(displayName);
        this.profileForm.patchValue({ displayName });
        this.profileForm.markAsPristine();
        toast.success(this.transloco.translate('account.profile.toastUpdated'));
      } else {
        toast.error(translatePortError(result.error, this.transloco));
      }
    } catch {
      toast.error(this.transloco.translate('common.errorGeneric'));
    } finally {
      this.saving.set(false);
    }
  }

  protected updateEmail(): void {
    this.statusMessage.set(
      this.transloco.translate('account.profile.emailChangeSoon'),
    );
  }

  protected openDeleteDialog(): void {
    this.deleteDialogOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.deleteDialogOpen.set(false);
  }

  protected confirmDeleteAccount(): void {
    this.deleteDialogOpen.set(false);
    this.statusMessage.set(this.transloco.translate('account.profile.deleteSoon'));
  }
}
