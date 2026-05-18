import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';

interface StatusComponent {
  readonly name: string;
  readonly status: 'operational' | 'degraded' | 'maintenance';
  readonly detail: string;
}

@Component({
  selector: 'oequ-system-status-page',
  imports: [RouterLink, HlmCardImports, HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-muted/30 flex min-h-svh flex-col items-center px-4 py-12">
      <div class="w-full max-w-lg">
        <div class="mb-8 text-center">
          <p class="text-primary text-sm font-medium tracking-wide uppercase">
            Trust
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">
            System status
          </h1>
          <p class="text-muted-foreground mt-2 text-sm leading-6">
            Demo environment — all components operational.
          </p>
        </div>

        <section hlmCard class="gap-0 overflow-hidden py-0">
          <div
            hlmCardContent
            class="!flex !flex-row !items-center !justify-between !p-6"
          >
            <div>
              <p class="font-medium">Overall</p>
              <p class="text-muted-foreground mt-1 text-sm">
                Last checked just now
              </p>
            </div>
            <span
              hlmBadge
              variant="secondary"
              class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            >
              Operational
            </span>
          </div>
        </section>

        <ul class="mt-4 space-y-2">
          @for (item of components; track item.name) {
            <li
              class="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium">{{ item.name }}</p>
                <p class="text-muted-foreground mt-0.5 text-xs">
                  {{ item.detail }}
                </p>
              </div>
              <span
                hlmBadge
                variant="secondary"
                class="shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              >
                Operational
              </span>
            </li>
          }
        </ul>

        <p
          class="text-muted-foreground mt-8 text-center text-xs leading-relaxed"
        >
          <a
            routerLink="/auth/login"
            class="hover:text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </a>
          <span class="mx-2" aria-hidden="true">·</span>
          <a
            routerLink="/auth/security"
            class="hover:text-foreground underline-offset-4 hover:underline"
          >
            Security
          </a>
        </p>
      </div>
    </div>
  `,
})
export class SystemStatusPageComponent {
  protected readonly components: readonly StatusComponent[] = [
    {
      name: 'Web application',
      status: 'operational',
      detail: 'Angular demo shell and API adapters',
    },
    {
      name: 'Authentication',
      status: 'operational',
      detail: 'Mock AuthPort — replace with your IdP in production',
    },
    {
      name: 'Workspace API',
      status: 'operational',
      detail: 'Org, billing, and activation ports (in-memory / localStorage)',
    },
  ];
}
