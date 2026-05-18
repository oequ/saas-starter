import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OrgMetricsComponent } from './org-metrics.component';

@Component({
  selector: 'oequ-workspace-metrics-page',
  imports: [OrgMetricsComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-metrics [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceMetricsPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
