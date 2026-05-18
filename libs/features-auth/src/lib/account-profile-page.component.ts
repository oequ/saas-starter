import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { AUTH_PORT } from '@oequ/ports';
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
  ],
  templateUrl: './account-profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePageComponent {
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  private readonly authPort = inject(AUTH_PORT);

  private readonly session = toSignal(this.authPort.session$, {
    initialValue: null,
  });

  protected readonly profileForm = new FormGroup({
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
  /** Bumps when display name is patched without emitting valueChanges. */
  private readonly displayNameStateVersion = signal(0);

  protected readonly displayNameValue = toSignal(
    this.profileForm.controls.displayName.valueChanges.pipe(
      startWith(this.profileForm.controls.displayName.value),
    ),
    { initialValue: '' },
  );

  protected readonly canSaveProfile = computed(() => {
    this.displayNameStateVersion();
    const saved = this.savedDisplayName();
    const name = this.profileForm.controls.displayName.value.trim();
    return (
      saved !== null && name !== saved.trim() && !this.saving()
    );
  });

  protected readonly userEmail = computed(
    () => this.session()?.user.email ?? '',
  );

  protected readonly userInitial = computed(() => {
    const name =
      this.displayNameValue().trim() ||
      this.session()?.user.displayName?.trim() ||
      this.session()?.user.email ||
      '?';
    return name.charAt(0).toUpperCase();
  });

  constructor() {
    this.profileForm.controls.displayName.valueChanges.subscribe(() => {
      this.displayNameStateVersion.update((v) => v + 1);
    });

    effect(() => {
      const user = this.session()?.user;
      if (!user) {
        return;
      }
      const displayName = user.displayName?.trim() || user.email;
      this.savedDisplayName.set(displayName);
      this.profileForm.patchValue({ displayName }, { emitEvent: false });
      this.profileForm.markAsPristine();
      this.statusMessage.set(null);
      this.submitAttempted.set(false);
      this.displayNameStateVersion.update((v) => v + 1);
    });
  }

  protected async saveProfile(): Promise<void> {
    this.submitAttempted.set(true);
    if (!this.canSaveProfile()) {
      return;
    }

    if (this.profileForm.invalid) {
      return;
    }

    this.saving.set(true);
    this.statusMessage.set(null);

    const displayName = this.profileForm.getRawValue().displayName.trim();

    try {
      const result = await this.authPort.updateProfile({ displayName });

      if (result.ok) {
        this.savedDisplayName.set(displayName);
        this.profileForm.patchValue({ displayName }, { emitEvent: false });
        this.profileForm.markAsPristine();
        this.displayNameStateVersion.update((v) => v + 1);
        this.statusMessage.set('Saved.');
      } else {
        this.statusMessage.set(result.error.message);
      }
    } catch {
      this.statusMessage.set('Something went wrong. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected updateEmail(): void {
    this.statusMessage.set(
      'Email change with verification will be available in v0.3.',
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
    this.statusMessage.set(
      'Account deletion will be available in v0.3.',
    );
  }
}
