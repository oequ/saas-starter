import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OrgApiKeysComponent } from './org-api-keys.component';

@Component({
  selector: 'oequ-workspace-api-keys-page',
  imports: [OrgApiKeysComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-api-keys [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceApiKeysPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
