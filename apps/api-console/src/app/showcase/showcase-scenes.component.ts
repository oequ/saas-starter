import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

import { ShowcaseUsageChartComponent } from './showcase-usage-chart.component';
import {
  SHOWCASE_API_KEY,
  SHOWCASE_MONTHLY_QUOTA,
  SHOWCASE_NEW_API_KEY_ROW,
  SHOWCASE_PROJECT_ID,
  getShowcasePlaygroundResponse,
  getShowcaseQuotaRemaining,
  getShowcaseUsageEvents,
  getShowcaseUsageRows,
  type ShowcaseApiKeyRow,
} from './showcase.data';

@Component({
  selector: 'ac-showcase-scenes',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmInput, HlmTextarea, ShowcaseUsageChartComponent],
  templateUrl: './showcase-scenes.component.html',
  styleUrl: './showcase-scenes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCheck })],
})
export class ShowcaseScenesComponent {
  readonly activeScene = input.required<number>();
  readonly showResponse = input(false);
  readonly copyHint = input('');
  readonly stagingKeyCreated = input(false);
  readonly playgroundRequestSent = input(false);
  readonly tourUsageOccurredAt = input<string | null>(null);
  readonly usageViewed = input(false);
  readonly playgroundApiKey = input('');
  readonly highlightTarget = input<string | null>(null);

  protected readonly projectId = SHOWCASE_PROJECT_ID;
  protected readonly playgroundResponse = computed(() =>
    this.tourUsageOccurredAt()
      ? getShowcasePlaygroundResponse(this.tourUsageOccurredAt()!)
      : '',
  );

  protected readonly usageEvents = computed(() =>
    getShowcaseUsageEvents(
      this.playgroundRequestSent(),
      this.tourUsageOccurredAt(),
    ),
  );

  protected readonly quotaRemaining = computed(() =>
    getShowcaseQuotaRemaining(this.usageEvents()),
  );
  protected readonly monthlyQuota = SHOWCASE_MONTHLY_QUOTA;

  protected readonly usageRows = computed(() =>
    getShowcaseUsageRows(
      this.playgroundRequestSent(),
      this.tourUsageOccurredAt(),
    ),
  );

  protected readonly apiKeyCount = computed(() =>
    this.stagingKeyCreated() ? 2 : 1,
  );

  protected readonly apiKeyRows = computed(() => {
    if (!this.stagingKeyCreated()) {
      return [SHOWCASE_API_KEY];
    }

    const stagingRow: ShowcaseApiKeyRow = {
      ...SHOWCASE_NEW_API_KEY_ROW,
      lastUsed: this.playgroundRequestSent() ? 'just now' : '—',
    };

    return [stagingRow, SHOWCASE_API_KEY];
  });

  protected isHighlighted(target: string): boolean {
    return this.highlightTarget() === target;
  }
}
