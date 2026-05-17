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
import {
  isValidOrganizationSlug,
  ORG_PORT,
  slugifyOrganizationName,
} from '@oequ/ports';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
  SETTINGS_DIALOG_FIELD_CLASS,
} from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

import { CreateWorkspaceDialogService } from '@oequ/shell';

@Component({
  selector: 'oequ-create-workspace-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Create workspace</h3>
            <p hlmDialogDescription>
              A workspace is where your team collaborates. You can create more
              later.
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div [class]="fieldClass">
              <label for="workspace-name" class="mb-1.5 block text-sm font-medium">
                Workspace name
              </label>
              <input
                id="workspace-name"
                hlmInput
                type="text"
                class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                formControlName="name"
                autocomplete="organization"
              />
              @if (
                form.controls.name.invalid &&
                form.controls.name.touched
              ) {
                <p class="text-destructive mt-1.5 text-sm">
                  Enter between 2 and 64 characters.
                </p>
              }
            </div>

            @if (errorMessage(); as message) {
              <p class="text-destructive text-sm" role="alert">{{ message }}</p>
            }

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                Cancel
              </button>
              <button
                hlmBtn
                type="submit"
                [disabled]="form.invalid || creating()"
              >
                {{ creating() ? 'Creating…' : 'Create workspace' }}
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
  private readonly router = inject(Router);
  private readonly dialogService = inject(CreateWorkspaceDialogService);

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly fieldClass = SETTINGS_DIALOG_FIELD_CLASS;

  protected readonly dialogState = computed(() =>
    this.dialogService.open() ? 'open' : 'closed',
  );

  protected readonly creating = signal(false);
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
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const name = this.form.controls.name.value.trim();
    const slug = slugifyOrganizationName(name);

    if (!isValidOrganizationSlug(slug)) {
      this.errorMessage.set(
        'Choose a workspace name with at least one letter or number.',
      );
      return;
    }

    this.creating.set(true);
    this.errorMessage.set(null);

    const result = await this.orgPort.createOrganization({ name, slug });

    this.creating.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.error.message);
      return;
    }

    const selectResult = await this.orgPort.selectOrganization(result.data.slug);
    if (!selectResult.ok) {
      this.errorMessage.set(selectResult.error.message);
      return;
    }

    this.dialogService.close();
    this.resetForm();
    await this.router.navigate(['/workspace']);
  }

  protected onDialogClosed(): void {
    if (this.creating()) {
      return;
    }
    this.dialogService.close();
    this.resetForm();
  }

  private resetForm(): void {
    this.errorMessage.set(null);
    this.form.reset();
  }
}
