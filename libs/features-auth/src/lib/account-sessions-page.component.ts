import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'oequ-account-sessions-page',
  imports: [HlmCardImports],
  template: `
    <section hlmCard class="gap-0 overflow-hidden py-0">
      <div hlmCardContent class="!p-6">
        <h2 class="text-xl leading-8 font-semibold tracking-tight">
          Active sessions
        </h2>
        <p class="text-muted-foreground my-3 text-sm leading-6">
          Review devices signed in to your account. Full session management
          ships in v0.3.
        </p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSessionsPageComponent {}
