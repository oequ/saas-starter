import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports-angular';

import { OrgSettingsUsageComponent } from './org-settings-usage.component';

@Component({
  selector: 'oequ-workspace-settings-usage-page',
  imports: [OrgSettingsUsageComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-settings-usage [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsUsagePageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
