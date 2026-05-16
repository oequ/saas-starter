import {
  ChangeDetectionStrategy,
  Component,
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
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';

import { OrgSettingsMembersComponent } from './org-settings-members.component';

@Component({
  selector: 'oequ-org-settings-page',
  imports: [
    ReactiveFormsModule,
    HlmTabsImports,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    OrgSettingsMembersComponent,
  ],
  templateUrl: './org-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgSettingsPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly generalForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  protected readonly saving = signal(false);
  protected readonly statusMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const org = this.activeOrganization();
      if (org) {
        this.generalForm.patchValue({ name: org.name }, { emitEvent: false });
        this.statusMessage.set(null);
      }
    });
  }

  protected async saveGeneral(): Promise<void> {
    const org = this.activeOrganization();
    if (!org || this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.statusMessage.set(null);

    const result = await this.orgPort.update(org.id, {
      name: this.generalForm.getRawValue().name,
    });

    this.saving.set(false);
    this.statusMessage.set(
      result.ok ? 'Saved.' : result.error.message,
    );
  }
}
