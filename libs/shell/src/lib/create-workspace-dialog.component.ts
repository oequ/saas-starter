import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { isValidOrganizationSlug, slugifyOrganizationName } from '@oequ/ports';
import { ORG_PORT } from '@oequ/ports-angular';
import {
  TranslocoPipe,
  TranslocoService,
  translatePortError,
} from '@oequ/i18n';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

import { CreateWorkspaceDialogService } from './create-workspace-dialog.service';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
  SETTINGS_DIALOG_FIELD_CLASS,
} from './settings-layout.tokens';

@Component({
  selector: 'oequ-create-workspace-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>
              {{ 'shell.workspace.createTitle' | transloco }}
            </h3>
            <p hlmDialogDescription>
              {{ 'shell.workspace.createDescription' | transloco }}
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div [class]="fieldClass">
              <label for="workspace-name" class="mb-1.5 block text-sm font-medium">
                {{ 'shell.workspace.nameLabel' | transloco }}
              </label>
              <input
                id="workspace-name"
                hlmInput
                type="text"
                class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                formControlName="name"
                autocomplete="organization"
              />
              @if (submitAttempted() && form.controls.name.invalid) {
                <p class="text-destructive mt-1.5 text-sm">
                  {{ 'shell.workspace.nameInvalid' | transloco }}
                </p>
              }
            </div>

            @if (errorMessage(); as message) {
              <p class="text-destructive text-sm" role="alert">{{ message }}</p>
            }

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                {{ 'common.cancel' | transloco }}
              </button>
              <button
                hlmBtn
                type="submit"
                [disabled]="creating()"
              >
                {{
                  creating()
                    ? ('shell.workspace.creating' | transloco)
                    : ('shell.workspace.createSubmit' | transloco)
                }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class CreateWorkspaceDialogComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(CreateWorkspaceDialogService);

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly fieldClass = SETTINGS_DIALOG_FIELD_CLASS;

  protected readonly dialogState = computed(() =>
    this.dialogService.open() ? 'open' : 'closed',
  );

  protected readonly creating = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(64),
      ],
    }),
  });

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    const name = this.form.controls.name.value.trim();
    const slug = slugifyOrganizationName(name);

    if (!isValidOrganizationSlug(slug)) {
      this.errorMessage.set(
        this.transloco.translate('shell.workspace.nameSlugInvalid'),
      );
      return;
    }

    this.creating.set(true);
    this.errorMessage.set(null);

    const result = await this.orgPort.createOrganization({ name, slug });

    this.creating.set(false);

    if (!result.ok) {
      this.errorMessage.set(
        translatePortError(result.error, this.transloco),
      );
      return;
    }

    const selectResult = await this.orgPort.selectOrganization(result.data.slug);
    if (!selectResult.ok) {
      this.errorMessage.set(
        translatePortError(selectResult.error, this.transloco),
      );
      return;
    }

    this.dialogService.close();
    this.resetForm();
    await this.router.navigate(['/onboarding']);
  }

  protected onDialogClosed(): void {
    if (this.creating()) {
      return;
    }
    this.dialogService.close();
    this.resetForm();
  }

  private resetForm(): void {
    this.submitAttempted.set(false);
    this.errorMessage.set(null);
    this.form.reset();
  }
}
