import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ACTIVATION_PORT, ORG_PORT } from '@oequ/ports';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'oequ-workspace-entry',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceEntryComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orgPort = inject(ORG_PORT);
  private readonly activationPort = inject(ACTIVATION_PORT);

  async ngOnInit(): Promise<void> {
    const orgs = await firstValueFrom(this.orgPort.organizations$);
    if (orgs.length === 0) {
      await this.router.navigateByUrl('/onboarding');
      return;
    }

    const active = await firstValueFrom(this.orgPort.activeOrganization$);
    const org = active ?? orgs[0];
    if (!active) {
      await this.orgPort.selectOrganization(org.slug);
    }

    const status = await this.activationPort.getStatus(org.id);
    if (!status.ok || status.data !== 'complete') {
      await this.router.navigateByUrl('/onboarding');
      return;
    }

    await this.router.navigateByUrl('/workspace/settings/general');
  }
}
