import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  API_KEYS_PORT,
  ORG_PORT,
  USAGE_UNITS_PORT,
} from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { map } from 'rxjs';

import { formatProjectPublicId } from '../utils/format-project-public-id';

@Component({
  selector: 'ac-overview-page',
  imports: [RouterLink, HlmCardImports, HlmButtonImports],
  templateUrl: './overview.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPageComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly usageUnitsPort = inject(USAGE_UNITS_PORT);
  private readonly apiKeysPort = inject(API_KEYS_PORT);
  private readonly route = inject(ActivatedRoute);

  protected readonly bootstrapFailed = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('bootstrap') === 'failed'),
    ),
    { initialValue: false },
  );

  protected readonly copyHint = signal('');

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly projectPublicId = computed(() => {
    const org = this.activeOrganization();
    return org ? formatProjectPublicId(org.id) : null;
  });

  protected readonly usageBalance = resource({
    params: () => this.activeOrganization()?.id,
    loader: async ({ params: orgId }) => {
      if (!orgId) {
        return null;
      }
      const result = await this.usageUnitsPort.getBalance(orgId);
      return result.ok ? result.data : null;
    },
  });

  protected readonly apiKeys = resource({
    params: () => this.activeOrganization()?.id,
    loader: async ({ params: orgId }) => {
      if (!orgId) {
        return [];
      }
      const result = await this.apiKeysPort.listKeys(orgId);
      return result.ok ? result.data : [];
    },
  });

  protected readonly availableUnits = computed(
    () => this.usageBalance.value()?.available ?? 0,
  );

  protected readonly monthlyAllowance = computed(
    () => this.usageBalance.value()?.monthlyAllowance ?? 0,
  );

  protected readonly apiKeyCount = computed(() => this.apiKeys.value()?.length ?? 0);

  protected readonly hasApiKey = computed(() => this.apiKeyCount() > 0);

  protected readonly hasUsageUnits = computed(() => this.availableUnits() > 0);

  protected async copyProjectId(): Promise<void> {
    const id = this.projectPublicId();
    if (!id) {
      return;
    }
    try {
      await navigator.clipboard.writeText(id);
      this.copyHint.set('Copied');
      setTimeout(() => this.copyHint.set(''), 2000);
    } catch {
      this.copyHint.set('Copy failed');
    }
  }
}
