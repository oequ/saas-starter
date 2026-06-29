import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  afterNextRender,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { formatProjectPublicId } from '../utils/format-project-public-id';

@Component({
  selector: 'ac-account-page',
  imports: [HlmCardImports, HlmButtonImports],
  template: `
    <div class="space-y-8">
      <ng-container #profileHost />

      @if (projectPublicId(); as projId) {
        <section hlmCard>
          <div hlmCardHeader class="pb-2">
            <h2 hlmCardTitle class="text-sm font-medium">Project</h2>
          </div>
          <div hlmCardContent class="space-y-2">
            <code class="block truncate font-mono text-sm">{{ projId }}</code>
            <p class="text-muted-foreground text-xs">
              Use this id for support. API requests use keys from the API Keys
              page, not this id.
            </p>
            <button
              hlmBtn
              type="button"
              variant="outline"
              size="sm"
              (click)="copyProjectId(projId)"
            >
              {{ copyHint() || 'Copy project id' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly profileHost = viewChild.required('profileHost', {
    read: ViewContainerRef,
  });

  protected readonly copyHint = signal('');

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly projectPublicId = computed(() => {
    const org = this.activeOrganization();
    return org ? formatProjectPublicId(org.id) : null;
  });

  constructor() {
    afterNextRender(() => {
      void this.loadProfile();
    });
  }

  private async loadProfile(): Promise<void> {
    const { AccountProfilePageComponent } = await import('@oequ/features-auth');
    this.profileHost().createComponent(AccountProfilePageComponent);
  }

  protected async copyProjectId(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copyHint.set('Copied');
    } catch {
      this.copyHint.set('Copy failed');
    }
    setTimeout(() => this.copyHint.set(''), 2000);
  }
}
