import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLineChart, lucideUserRound } from '@ng-icons/lucide';
import {
  ACTIVATION_PORT,
  DEMO_AUTH_EXTENSION,
  ORG_PORT,
  formatMemberDisplayLabel,
  formatOrgRole,
  type OrganizationMember,
} from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ACTIVATION_ONBOARDING_CONFIG } from './activation-ui.model';
import {
  OnboardingRetrospectiveDialogComponent,
  type OnboardingRetrospectiveConfirm,
} from './onboarding-retrospective-dialog.component';
import { MetricsRetrospectiveSimulationService } from './metrics-retrospective-simulation.service';
import { OnboardingMemberImpersonationDialogComponent } from './onboarding-member-impersonation-dialog.component';

@Component({
  selector: 'oequ-onboarding-activation',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    OnboardingRetrospectiveDialogComponent,
    OnboardingMemberImpersonationDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideLineChart,
      lucideUserRound,
    }),
  ],
  template: `
    <div class="mx-auto w-full max-w-3xl">
      <div class="mb-10">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ config().title }}
        </h1>
        <p class="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          {{ config().subtitle }}
        </p>
      </div>

      @if (timelineSteps().length > 0) {
        <div class="relative ms-1.5 grid grid-cols-[0_1fr] gap-x-7">
          <div class="relative self-stretch" aria-hidden="true">
            <div
              class="pointer-events-none absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent_0px,var(--border)_15px,var(--border)_calc(100%-15px),transparent_100%)]"
            ></div>
          </div>
          <ol class="space-y-8">
          @for (step of timelineSteps(); track step.id; let index = $index) {
            <li class="relative">
              <span
                class="border-background absolute top-[1.875rem] -start-7 z-10 box-border size-2.5 -translate-x-1/2 rounded-full border-2 border-foreground bg-background"
                aria-hidden="true"
              ></span>
              <section hlmCard class="gap-0 overflow-hidden py-0">
                <div hlmCardContent class="!p-6">
                  <h2 class="text-base font-semibold leading-6">
                    {{ step.title }}
                  </h2>
                  <p class="text-muted-foreground mt-1 text-sm leading-6">
                    {{ step.description }}
                  </p>
                  <div class="mt-4">
                    @switch (step.action) {
                      @case ('metrics-retrospective') {
                        <button
                          hlmBtn
                          type="button"
                          [disabled]="retrospectiveSubmitting()"
                          (click)="openRetrospectiveDialog()"
                        >
                          <ng-icon
                            name="lucideLineChart"
                            class="me-2 size-4"
                            aria-hidden="true"
                          />
                          {{ step.actionLabel }}
                        </button>
                      }
                      @case ('member-impersonation') {
                        <button
                          hlmBtn
                          type="button"
                          [disabled]="memberImpersonationSubmitting()"
                          (click)="openMemberImpersonationDialog()"
                        >
                          <ng-icon
                            name="lucideUserRound"
                            class="me-2 size-4"
                            aria-hidden="true"
                          />
                          {{ step.actionLabel }}
                        </button>
                      }
                    }
                  </div>
                </div>
              </section>
            </li>
          }
          </ol>
        </div>
      }

      @if (productionSteps().length > 0) {
        <div class="relative ms-1.5 mt-10 grid grid-cols-[0_1fr] gap-x-7">
          <div class="relative self-stretch" aria-hidden="true">
            <div
              class="pointer-events-none absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent_0px,var(--border)_15px,var(--border)_calc(100%-15px),transparent_100%)]"
            ></div>
          </div>
          <ol class="space-y-8">
          @for (step of productionSteps(); track step.id; let index = $index) {
            <li class="relative">
              <span
                class="border-background absolute top-[1.875rem] -start-7 z-10 box-border size-2.5 -translate-x-1/2 rounded-full border-2 bg-background"
                [class.border-foreground]="productionStepIsActive(index)"
                [class.border-muted-foreground/50]="!productionStepIsActive(index)"
                aria-hidden="true"
              ></span>
              <section
                hlmCard
                class="gap-0 overflow-hidden py-0"
                [class.opacity-60]="!productionStepIsActive(index)"
              >
                <div hlmCardContent class="!p-6">
                  <h2 class="text-base font-semibold leading-6">
                    {{ step.title }}
                  </h2>
                  <p class="text-muted-foreground mt-1 text-sm leading-6">
                    {{ step.description }}
                  </p>
                  <p class="text-muted-foreground mt-4 text-xs">
                    Configure production steps in ACTIVATION_ONBOARDING_CONFIG.
                  </p>
                </div>
              </section>
            </li>
          }
          </ol>
        </div>
      }

      <oequ-onboarding-retrospective-dialog
        [open]="retrospectiveDialogOpen()"
        [submitting]="retrospectiveSubmitting()"
        (confirmed)="onRetrospectiveConfirmed($event)"
        (cancelled)="closeRetrospectiveDialog()"
      />

      <oequ-onboarding-member-impersonation-dialog
        [open]="memberImpersonationDialogOpen()"
        [organizationId]="activeOrganization()?.id ?? null"
        [submitting]="memberImpersonationSubmitting()"
        (confirmed)="onMemberImpersonationConfirmed($event)"
        (cancelled)="closeMemberImpersonationDialog()"
      />
    </div>
  `,
})
export class OnboardingActivationComponent {
  private readonly configToken = inject(ACTIVATION_ONBOARDING_CONFIG);
  private readonly activationPort = inject(ACTIVATION_PORT);
  private readonly orgPort = inject(ORG_PORT);
  private readonly demoAuth = inject(DEMO_AUTH_EXTENSION);
  private readonly router = inject(Router);
  private readonly retrospectiveSimulation = inject(
    MetricsRetrospectiveSimulationService,
  );

  protected readonly config = computed(() => this.configToken);

  protected readonly timelineSteps = computed(
    () => this.config().demoSteps ?? [],
  );

  protected readonly productionSteps = computed(
    () => this.config().steps ?? [],
  );

  protected readonly retrospectiveDialogOpen = signal(false);
  protected readonly retrospectiveSubmitting = signal(false);
  protected readonly memberImpersonationDialogOpen = signal(false);
  protected readonly memberImpersonationSubmitting = signal(false);

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly completedProductionPrerequisites = signal<
    ReadonlySet<string>
  >(new Set());

  protected productionStepIsActive(index: number): boolean {
    if (index === 0) {
      return true;
    }
    const prior = this.productionSteps().slice(0, index);
    return prior
      .filter((s) => s.kind === 'prerequisite')
      .every((s) => this.completedProductionPrerequisites().has(s.id));
  }

  protected openRetrospectiveDialog(): void {
    this.retrospectiveDialogOpen.set(true);
  }

  protected closeRetrospectiveDialog(): void {
    this.retrospectiveDialogOpen.set(false);
    this.retrospectiveSubmitting.set(false);
  }

  protected async onRetrospectiveConfirmed(
    input: OnboardingRetrospectiveConfirm,
  ): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      toast.error('No active workspace. Select a workspace and try again.');
      return;
    }

    this.retrospectiveSubmitting.set(true);
    this.retrospectiveSimulation.schedule({
      organizationId: org.id,
      count: input.count,
      period: input.period,
    });
    this.retrospectiveDialogOpen.set(false);
    await this.markActivationComplete(org.id);
    await this.router.navigate(['/workspace/metrics']);
    this.retrospectiveSubmitting.set(false);
  }

  protected openMemberImpersonationDialog(): void {
    this.memberImpersonationDialogOpen.set(true);
  }

  protected closeMemberImpersonationDialog(): void {
    this.memberImpersonationDialogOpen.set(false);
    this.memberImpersonationSubmitting.set(false);
  }

  protected async onMemberImpersonationConfirmed(
    member: OrganizationMember,
  ): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      toast.error('No active workspace. Select a workspace and try again.');
      return;
    }

    this.memberImpersonationSubmitting.set(true);

    const result = await this.demoAuth.impersonateWorkspaceMember({
      organizationId: org.id,
      userId: member.userId,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
    });

    if (!result.ok) {
      toast.error(result.error.message);
      this.memberImpersonationSubmitting.set(false);
      return;
    }

    this.memberImpersonationDialogOpen.set(false);
    toast.success(
      `Signed in as ${formatMemberDisplayLabel(member)} (${formatOrgRole(member.role)}).`,
    );
    await this.markActivationComplete(org.id);
    await this.router.navigateByUrl('/workspace/settings/members', {
      onSameUrlNavigation: 'reload',
    });
    this.memberImpersonationSubmitting.set(false);
  }

  private async markActivationComplete(organizationId: string): Promise<void> {
    const status = await this.activationPort.getStatus(organizationId);
    if (status.ok && status.data === 'complete') {
      return;
    }
    await this.activationPort.markComplete(organizationId);
  }
}
