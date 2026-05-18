import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  API_KEY_DOMAIN_SCOPE_LABEL,
  apiKeyPermissionLabel,
  type ApiKeyPermission,
  type CreateApiKeyInput,
} from '@oequ/ports';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
  SETTINGS_DIALOG_FIELD_CLASS,
} from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';

@Component({
  selector: 'oequ-create-api-key-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Add API Key</h3>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="w-full min-w-0">
              <label for="api-key-name" class="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <input
                id="api-key-name"
                hlmInput
                type="text"
                placeholder="Your API Key name"
                [class]="dialogFieldClass"
                class="border-input bg-background h-9 rounded-[5px] shadow-none"
                [formControl]="form.controls.name"
                autocomplete="off"
              />
              @if (submitAttempted() && form.controls.name.invalid) {
                <p class="text-destructive mt-1.5 text-sm">Enter a name.</p>
              }
            </div>

            <div class="w-full min-w-0">
              <label
                for="api-key-permission-trigger"
                class="mb-1.5 block text-sm font-medium"
              >
                Permission
              </label>
              <hlm-select
                class="block w-full"
                [value]="form.controls.permission.value"
                (valueChange)="onPermissionChange($event)"
              >
                <hlm-select-trigger
                  buttonId="api-key-permission-trigger"
                  [class]="dialogFieldClass"
                  class="w-full max-w-full shadow-none"
                >
                  <span class="truncate">{{
                    permissionLabel(form.controls.permission.value)
                  }}</span>
                </hlm-select-trigger>
                <hlm-select-content
                  *hlmSelectPortal
                  class="w-[var(--brn-select-width)]"
                >
                  @for (option of permissionOptions; track option.value) {
                    <hlm-select-item [value]="option.value">
                      {{ option.label }}
                    </hlm-select-item>
                  }
                </hlm-select-content>
              </hlm-select>
            </div>

            <div class="w-full min-w-0">
              <label
                for="api-key-domain-trigger"
                class="mb-1.5 block text-sm font-medium"
              >
                Domain
              </label>
              <hlm-select
                class="block w-full"
                [value]="form.controls.domainScope.value"
                (valueChange)="onDomainChange($event)"
              >
                <hlm-select-trigger
                  buttonId="api-key-domain-trigger"
                  [class]="dialogFieldClass"
                  class="w-full max-w-full shadow-none"
                >
                  <span class="truncate">{{ domainScopeLabel }}</span>
                </hlm-select-trigger>
                <hlm-select-content
                  *hlmSelectPortal
                  class="w-[var(--brn-select-width)]"
                >
                  <hlm-select-item value="all_domains">All domains</hlm-select-item>
                </hlm-select-content>
              </hlm-select>
            </div>

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                Cancel
              </button>
              <button hlmBtn type="submit" [disabled]="creating()">
                {{ creating() ? 'Adding…' : 'Add' }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class CreateApiKeyDialogComponent {
  readonly open = input(false);
  readonly creating = input(false);

  readonly submitted = output<CreateApiKeyInput>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly dialogFieldClass = SETTINGS_DIALOG_FIELD_CLASS;

  protected readonly submitAttempted = signal(false);

  protected readonly permissionOptions: ReadonlyArray<{
    value: ApiKeyPermission;
    label: string;
  }> = [
    { value: 'full_access', label: 'Full access' },
    { value: 'sending_access', label: 'Sending access' },
  ];

  protected readonly permissionLabel = apiKeyPermissionLabel;
  protected readonly domainScopeLabel = API_KEY_DOMAIN_SCOPE_LABEL;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    permission: new FormControl<ApiKeyPermission>('full_access', {
      nonNullable: true,
    }),
    domainScope: new FormControl<'all_domains'>('all_domains', {
      nonNullable: true,
    }),
  });

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  private confirming = false;

  protected onPermissionChange(
    value: string | string[] | null | undefined,
  ): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (next === 'full_access' || next === 'sending_access') {
      this.form.controls.permission.setValue(next);
    }
  }

  protected onDomainChange(value: string | string[] | null | undefined): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (next === 'all_domains') {
      this.form.controls.domainScope.setValue('all_domains');
    }
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }
    this.confirming = true;
    this.submitted.emit({
      name: this.form.controls.name.value.trim(),
      permission: this.form.controls.permission.value,
      domainScope: this.form.controls.domainScope.value,
    });
  }

  protected onDialogClosed(): void {
    if (this.confirming) {
      this.confirming = false;
      this.submitAttempted.set(false);
      this.form.reset({
        name: '',
        permission: 'full_access',
        domainScope: 'all_domains',
      });
      return;
    }
    this.cancelled.emit();
  }
}
