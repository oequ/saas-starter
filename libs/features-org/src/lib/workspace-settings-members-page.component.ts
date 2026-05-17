import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OrgSettingsMembersComponent } from './org-settings-members.component';

@Component({
  selector: 'oequ-workspace-settings-members-page',
  imports: [OrgSettingsMembersComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-settings-members [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsMembersPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
