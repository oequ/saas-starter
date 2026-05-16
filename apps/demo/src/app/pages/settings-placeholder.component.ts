import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-settings-placeholder',
  imports: [HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
        <p class="text-muted-foreground text-sm">
          Placeholder for General / Members / Billing tabs (step 3).
        </p>
      </div>

      <section hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>General</h2>
          <p hlmCardDescription>Organization profile (mock data via ports).</p>
        </div>
        <div hlmCardContent class="text-muted-foreground text-sm">
          Shell layout is wired. Next: features-org settings form.
        </div>
      </section>
    </div>
  `,
})
export class SettingsPlaceholderComponent {}
