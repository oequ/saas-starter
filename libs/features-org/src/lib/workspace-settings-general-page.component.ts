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
import { ORG_PORT } from '@oequ/ports';
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'oequ-workspace-settings-general-page',
  imports: [
    ReactiveFormsModule,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
  ],
  templateUrl: './workspace-settings-general-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsGeneralPageComponent {
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly generalForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(64),
      ],
    }),
  });

  protected readonly saving = signal(false);
  protected readonly statusMessage = signal<string | null>(null);
  private readonly savedName = signal<string | null>(null);
  /** Bumps when the name control is patched without emitting valueChanges. */
  private readonly nameStateVersion = signal(0);

  protected readonly canSaveGeneral = computed(() => {
    this.nameStateVersion();
    const saved = this.savedName();
    const name = this.generalForm.controls.name.value.trim();
    return (
      saved !== null &&
      name !== saved.trim() &&
      this.generalForm.controls.name.valid &&
      !this.saving()
    );
  });

  protected readonly logoUploading = signal(false);
  protected readonly logoStatusMessage = signal<string | null>(null);
  private readonly logoPreviewUrl = signal<string | null>(null);

  protected readonly logoDisplayUrl = computed(
    () => this.logoPreviewUrl() ?? this.activeOrganization()?.logoUrl ?? null,
  );

  protected readonly workspaceInitial = computed(() => {
    const name = this.activeOrganization()?.name?.trim() || '?';
    return name.charAt(0).toUpperCase();
  });

  constructor() {
    this.generalForm.controls.name.valueChanges.subscribe(() => {
      this.nameStateVersion.update((v) => v + 1);
    });

    effect(() => {
      const org = this.activeOrganization();
      if (org) {
        this.savedName.set(org.name);
        this.generalForm.patchValue({ name: org.name }, { emitEvent: false });
        this.generalForm.markAsPristine();
        this.statusMessage.set(null);
        this.logoPreviewUrl.set(null);
        this.logoStatusMessage.set(null);
        this.nameStateVersion.update((v) => v + 1);
      }
    });
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    const org = this.activeOrganization();
    if (!org) {
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.logoStatusMessage.set('Use a PNG, JPG, or WebP image.');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.logoStatusMessage.set('Image must be 2 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      void this.uploadLogo(org.id, reader.result as string);
    };
    reader.onerror = () => {
      this.logoStatusMessage.set('Could not read the image. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  private async uploadLogo(
    organizationId: string,
    logoUrl: string,
  ): Promise<void> {
    this.logoUploading.set(true);
    this.logoStatusMessage.set(null);
    this.logoPreviewUrl.set(logoUrl);

    try {
      const result = await this.orgPort.update(organizationId, { logoUrl });

      if (result.ok) {
        this.logoPreviewUrl.set(null);
        this.logoStatusMessage.set('Logo updated.');
      } else {
        this.logoPreviewUrl.set(null);
        this.logoStatusMessage.set(result.error.message);
      }
    } catch {
      this.logoPreviewUrl.set(null);
      this.logoStatusMessage.set('Something went wrong. Please try again.');
    } finally {
      this.logoUploading.set(false);
    }
  }

  protected async saveGeneral(): Promise<void> {
    const org = this.activeOrganization();
    if (!org || !this.canSaveGeneral()) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.statusMessage.set(null);

    const name = this.generalForm.getRawValue().name.trim();

    try {
      const result = await this.orgPort.update(org.id, { name });

      if (result.ok) {
        this.savedName.set(name);
        this.generalForm.patchValue({ name }, { emitEvent: false });
        this.generalForm.markAsPristine();
        this.nameStateVersion.update((v) => v + 1);
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
}
