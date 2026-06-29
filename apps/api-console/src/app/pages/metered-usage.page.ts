import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT, USAGE_UNITS_PORT } from '@oequ/ports';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'ac-metered-usage-page',
  imports: [HlmCardImports, DatePipe],
  templateUrl: './metered-usage.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeteredUsagePageComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly usageUnitsPort = inject(USAGE_UNITS_PORT);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly events = resource({
    params: () => this.activeOrganization()?.id,
    loader: async ({ params: orgId }) => {
      if (!orgId) {
        return [];
      }
      const result = await this.usageUnitsPort.listApiUsageEvents(orgId, {
        limit: 50,
      });
      return result.ok ? result.data : [];
    },
  });
}
