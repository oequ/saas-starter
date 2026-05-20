import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OrgEmailsComponent } from './org-emails.component';

@Component({
  selector: 'oequ-workspace-emails-page',
  imports: [OrgEmailsComponent],
  template: `
    @if (activeOrganization(); as org) {
      <oequ-org-emails [organizationId]="org.id" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceEmailsPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );
}
