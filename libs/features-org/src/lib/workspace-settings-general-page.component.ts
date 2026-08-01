import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
import { ORG_PORT } from '@oequ/ports-angular';
import { SETTINGS_FORM_FIELD_CLASS } from '@oequ/shell';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

import { DeleteWorkspaceDialogComponent } from './delete-workspace-dialog.component';

@Component({
  selector: 'oequ-workspace-settings-general-page',
  imports: [
    ReactiveFormsModule,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    DeleteWorkspaceDialogComponent,
    TranslocoPipe,
  ],
  templateUrl: './workspace-settings-general-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsGeneralPageComponent {
  protected readonly fieldClass = SETTINGS_FORM_FIELD_CLASS;

  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly generalForm = new FormGroup<{
    name: FormControl<string>;
  }>({
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
  protected readonly submitAttempted = signal(false);
  private readonly savedName = signal<string | null>(null);
  /** Last org id synced into the form — avoid reset on same-org updates after save. */
  private readonly syncedOrgId = signal<string | null>(null);
  private readonly nameChanges = toSignal(
    this.generalForm.controls.name.valueChanges,
    { initialValue: '' },
  );

  protected readonly canSaveGeneral = computed(() => {
    this.nameChanges();
    const saved = this.savedName();
    const name = this.generalForm.controls.name.value.trim();
    return (
      saved !== null && name !== saved.trim() && !this.saving()
    );
  });

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deletingWorkspace = signal(false);

  protected readonly logoUploading = signal(false);
  private readonly logoPreviewUrl = signal<string | null>(null);

  protected readonly logoDisplayUrl = computed(
    () => this.logoPreviewUrl() ?? this.activeOrganization()?.logoUrl ?? null,
  );

  protected readonly workspaceInitial = computed(() => {
    const name = this.activeOrganization()?.name?.trim() || '?';
    return name.charAt(0).toUpperCase();
  });

  constructor() {
    effect(() => {
      const org = this.activeOrganization();
      if (!org) {
        this.syncedOrgId.set(null);
        return;
      }

      const isOrgSwitch = this.syncedOrgId() !== org.id;
      this.syncedOrgId.set(org.id);
      this.savedName.set(org.name);

      if (isOrgSwitch) {
        this.generalForm.patchValue({ name: org.name });
        this.generalForm.markAsPristine();
        this.submitAttempted.set(false);
        this.logoPreviewUrl.set(null);
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
    const hasAllowedExtension = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!allowedTypes.includes(file.type) && !hasAllowedExtension) {
      toast.error(this.transloco.translate('org.general.toast.invalidImageType'));
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(this.transloco.translate('org.general.toast.imageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      void this.uploadLogo(org.id, reader.result as string);
    };
    reader.onerror = () => {
      toast.error(this.transloco.translate('org.general.toast.readImageFailed'));
    };
    reader.readAsDataURL(file);
  }

  protected removeLogo(): void {
    const org = this.activeOrganization();
    if (!org || this.logoUploading()) {
      return;
    }
    void this.persistLogo(org.id, null);
  }

  private async uploadLogo(
    organizationId: string,
    logoUrl: string,
  ): Promise<void> {
    this.logoPreviewUrl.set(logoUrl);
    await this.persistLogo(organizationId, logoUrl);
  }

  private async persistLogo(
    organizationId: string,
    logoUrl: string | null,
  ): Promise<void> {
    this.logoUploading.set(true);

    try {
      const result = await this.orgPort.update(organizationId, { logoUrl });

      if (result.ok) {
        this.logoPreviewUrl.set(null);
        toast.success(
          this.transloco.translate(
            logoUrl === null
              ? 'org.general.toast.iconRemoved'
              : 'org.general.toast.iconUpdated',
          ),
        );
      } else {
        this.logoPreviewUrl.set(null);
        toast.error(translatePortError(result.error, this.transloco));
      }
    } catch {
      this.logoPreviewUrl.set(null);
      toast.error(this.transloco.translate('common.errorGeneric'));
    } finally {
      this.logoUploading.set(false);
    }
  }

  protected openDeleteDialog(): void {
    this.deleteDialogOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.deleteDialogOpen.set(false);
  }

  protected async confirmDeleteWorkspace(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      return;
    }

    this.deletingWorkspace.set(true);
    const result = await this.orgPort.deleteOrganization(org.id);
    this.deletingWorkspace.set(false);
    this.deleteDialogOpen.set(false);

    if (!result.ok) {
      toast.error(translatePortError(result.error, this.transloco));
      return;
    }

    const stillActive = this.activeOrganization();
    if (stillActive) {
      await this.router.navigate(['/workspace']);
    } else {
      await this.router.navigate(['/onboarding']);
    }
  }

  protected saveGeneral(event: Event): void {
    event.preventDefault();
    void this.persistGeneral();
  }

  protected onSaveClick(): void {
    void this.persistGeneral();
  }

  private async persistGeneral(): Promise<void> {
    this.submitAttempted.set(true);
    const org = this.activeOrganization();
    if (!org || !this.canSaveGeneral()) {
      return;
    }

    if (this.generalForm.invalid) {
      return;
    }

    this.saving.set(true);

    const name = this.generalForm.getRawValue().name.trim();

    try {
      const result = await this.orgPort.update(org.id, { name });

      if (result.ok) {
        this.savedName.set(name);
        this.generalForm.patchValue({ name });
        this.generalForm.markAsPristine();
        toast.success(
          this.transloco.translate('org.general.toast.nameUpdated'),
        );
      } else {
        toast.error(translatePortError(result.error, this.transloco));
      }
    } catch {
      toast.error(this.transloco.translate('common.errorGeneric'));
    } finally {
      this.saving.set(false);
    }
  }
}
