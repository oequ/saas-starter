import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports-angular';

import { OrgIntegrationsComponent } from './org-integrations.component';

@Component({
  selector: 'oequ-workspace-integrations-page',
  imports: [OrgIntegrationsComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-integrations [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceIntegrationsPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
