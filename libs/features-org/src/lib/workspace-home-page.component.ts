import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBuilding2,
  lucideCreditCard,
  lucideUsers,
} from '@ng-icons/lucide';
import {
  BILLING_PORT,
  formatPlanLabel,
  ORG_PORT,
} from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmIcon } from '@spartan-ng/helm/icon';

import {
  type GettingStartedStepId,
  WorkspaceGettingStartedStore,
} from './workspace-getting-started.store';

interface GettingStartedStep {
  readonly id: GettingStartedStepId;
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

interface ChecklistGroup {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly seeMorePath: string;
  readonly seeMoreLabel: string;
  readonly steps: readonly GettingStartedStep[];
}

@Component({
  selector: 'oequ-workspace-home-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCheckboxImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideUsers,
      lucideBuilding2,
      lucideCreditCard,
      lucideArrowRight,
    }),
  ],
  template: `
    <div class="space-y-8">
      <header class="flex flex-wrap items-start gap-4">
        <span
          class="from-primary/25 via-primary/15 to-muted flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xl font-semibold tracking-tight"
          aria-hidden="true"
        >
          {{ workspaceInitial() }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ workspaceName() }}
            </h1>
            @if (billingSummary(); as billing) {
              <span hlmBadge variant="secondary">
                {{ formatPlanLabel(billing.planId, billing.planName) }}
              </span>
            }
          </div>
          <p class="text-muted-foreground mt-1 text-sm leading-6">
            Overview — set up your workspace, team, and billing.
          </p>
        </div>
      </header>

      @if (showGettingStarted()) {
        <section class="space-y-8">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold tracking-tight">
                We think you're gonna like it here.
              </h2>
              <p class="text-muted-foreground mt-1 text-sm leading-6">
                {{ gettingStartedSubtitle() }}
              </p>
            </div>
            @if (allStepsComplete()) {
              <button
                hlmBtn
                type="button"
                variant="ghost"
                size="sm"
                (click)="dismissGettingStarted()"
              >
                Dismiss
              </button>
            }
          </div>

          <div class="flex flex-col gap-8">
            @for (group of checklistGroups; track group.id; let last = $last) {
              <div class="flex gap-4">
                <div class="flex w-8 shrink-0 flex-col items-center self-stretch">
                  <span
                    class="bg-background border-border relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <ng-icon hlm class="size-4" [name]="group.icon" />
                  </span>
                  @if (!last) {
                    <div
                      class="bg-border -mb-8 w-px flex-1 min-h-8"
                      aria-hidden="true"
                    ></div>
                  }
                </div>

                <div class="min-w-0 flex-1 space-y-3">
                  <div
                    class="flex min-h-8 flex-wrap items-center justify-between gap-2"
                  >
                    <h3 class="text-sm font-semibold leading-none">
                      {{ group.title }}
                    </h3>
                    <a
                      class="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      [routerLink]="group.seeMorePath"
                    >
                      {{ group.seeMoreLabel }}
                      <ng-icon hlm class="size-3.5" name="lucideArrowRight" />
                    </a>
                  </div>

                  <ul class="grid gap-3 sm:grid-cols-2">
                    @for (step of group.steps; track step.id) {
                      <li
                        class="border-input hover:bg-muted/40 rounded-[5px] border p-4 transition-colors"
                        [class.bg-muted/30]="isStepComplete(step.id)"
                      >
                        <div
                          class="flex cursor-pointer gap-3"
                          role="group"
                          [attr.aria-label]="step.title"
                        >
                          <span
                            class="flex h-5 shrink-0 items-center self-start"
                            aria-hidden="true"
                          >
                            <hlm-checkbox
                              [checked]="isStepComplete(step.id)"
                              (checkedChange)="onStepChecked(step.id, $event)"
                            />
                          </span>
                          <span class="min-w-0">
                            <a
                              class="text-primary block text-sm leading-5 font-medium hover:underline"
                              [routerLink]="step.path"
                              (click)="$event.stopPropagation()"
                            >
                              {{ step.title }}
                            </a>
                            <span
                              class="text-muted-foreground mt-0.5 block text-sm leading-5"
                            >
                              {{ step.description }}
                            </span>
                          </span>
                        </div>
                      </li>
                    }
                  </ul>
                </div>
              </div>
            }
          </div>
        </section>
      } @else {
        <p class="text-muted-foreground text-sm leading-6">
          You're all set. Replace this overview with your product routes.
        </p>
      }
    </div>
  `,
})
export class WorkspaceHomePageComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly billingPort = inject(BILLING_PORT);
  private readonly gettingStarted = inject(WorkspaceGettingStartedStore);

  protected readonly formatPlanLabel = formatPlanLabel;

  private readonly checklistVersion = signal(0);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly workspaceName = computed(
    () => this.activeOrganization()?.name ?? 'Workspace',
  );

  protected readonly workspaceInitial = computed(() => {
    const name = this.workspaceName().trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  protected readonly billingResource = resource({
    params: () => {
      const org = this.activeOrganization();
      return org ? { orgId: org.id } : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.getSummary(params.orgId, abortSignal);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly billingSummary = computed(
    () => this.billingResource.value(),
  );

  protected readonly checklistGroups: readonly ChecklistGroup[] = [
    {
      id: 'team',
      title: 'Team',
      icon: 'lucideUsers',
      seeMorePath: '/workspace/settings/members',
      seeMoreLabel: 'See members',
      steps: [
        {
          id: 'invite',
          title: 'Invite your first teammate',
          description: 'Add members and assign roles.',
          path: '/workspace/settings/members',
        },
      ],
    },
    {
      id: 'workspace',
      title: 'Workspace',
      icon: 'lucideBuilding2',
      seeMorePath: '/workspace/settings/general',
      seeMoreLabel: 'See settings',
      steps: [
        {
          id: 'customize',
          title: 'Customize your workspace',
          description: 'Update name and logo in general settings.',
          path: '/workspace/settings/general',
        },
      ],
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: 'lucideCreditCard',
      seeMorePath: '/workspace/settings/billing',
      seeMoreLabel: 'See billing',
      steps: [
        {
          id: 'billing',
          title: 'Review your plan',
          description: 'Check plan, invoices, and payment method.',
          path: '/workspace/settings/billing',
        },
      ],
    },
  ];

  protected readonly showGettingStarted = computed(() => {
    this.checklistVersion();
    const orgId = this.activeOrganization()?.id;
    if (!orgId) {
      return false;
    }
    return !this.gettingStarted.isDismissed(orgId);
  });

  protected readonly allStepsComplete = computed(() => {
    this.checklistVersion();
    const orgId = this.activeOrganization()?.id;
    if (!orgId) {
      return false;
    }
    return this.gettingStarted.allStepsComplete(orgId);
  });

  protected gettingStartedSubtitle(): string {
    return this.allStepsComplete()
      ? 'All set — you can hide this checklist.'
      : 'Use this overview to finish workspace setup.';
  }

  protected isStepComplete(stepId: GettingStartedStepId): boolean {
    this.checklistVersion();
    const orgId = this.activeOrganization()?.id;
    return orgId ? this.gettingStarted.isStepComplete(orgId, stepId) : false;
  }

  protected onStepChecked(
    stepId: GettingStartedStepId,
    checked: boolean,
  ): void {
    const orgId = this.activeOrganization()?.id;
    if (!orgId) {
      return;
    }
    this.gettingStarted.setStepComplete(orgId, stepId, checked);
    this.checklistVersion.update((v) => v + 1);
  }

  protected dismissGettingStarted(): void {
    const orgId = this.activeOrganization()?.id;
    if (!orgId) {
      return;
    }
    this.gettingStarted.dismiss(orgId);
    this.checklistVersion.update((v) => v + 1);
  }
}
