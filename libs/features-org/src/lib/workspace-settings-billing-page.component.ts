import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OrgSettingsBillingComponent } from './org-settings-billing.component';

@Component({
  selector: 'oequ-workspace-settings-billing-page',
  imports: [OrgSettingsBillingComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-settings-billing [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsBillingPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
