import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideGlobe,
  lucideKeyRound,
  lucideSend,
  lucideSparkles,
  lucideTestTubeDiagonal,
} from '@ng-icons/lucide';
import { ACTIVATION_PORT, API_KEYS_PORT, ORG_PORT } from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import {
  ACTIVATION_ONBOARDING_CONFIG,
} from './activation-ui.model';
import { OnboardingCodeBlockComponent } from './onboarding-code-block.component';

@Component({
  selector: 'oequ-onboarding-activation',
  imports: [
    RouterLink,
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmTooltipImports,
    OnboardingCodeBlockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideKeyRound,
      lucideSparkles,
      lucideGlobe,
      lucideTestTubeDiagonal,
      lucideSend,
      lucideArrowRight,
    }),
  ],
  template: `
    <div class="mx-auto w-full max-w-3xl">
      <div
        class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ config().title }}
          </h1>
          <p class="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            {{ config().subtitle }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2 text-sm">
          <a
            href="#"
            class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >Docs</a
          >
          <span class="text-muted-foreground" aria-hidden="true">·</span>
          <a
            href="#"
            class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >Need help?</a
          >
        </div>
      </div>

      <ol class="border-border ms-1.5 space-y-8 border-s ps-7">
        @for (step of config().steps; track step.id; let index = $index) {
          <li class="relative">
            <span
              class="border-background absolute top-[1.875rem] -start-[calc(1.75rem+1px)] z-10 box-border size-2.5 -translate-x-1/2 rounded-full border-2 bg-background"
              [class.border-foreground]="stepIsActive(index)"
              [class.border-muted-foreground/50]="!stepIsActive(index)"
              aria-hidden="true"
            ></span>
            @if (step.kind === 'prerequisite') {
              <section
                hlmCard
                class="gap-0 overflow-hidden py-0"
                [class.opacity-60]="!stepIsActive(index)"
              >
                <div hlmCardContent class="!p-6">
                  <h2 class="text-base font-semibold leading-6">{{ step.title }}</h2>
                  <p class="text-muted-foreground mt-1 text-sm leading-6">
                    {{ step.description }}
                  </p>
                  <div class="mt-4">
                    @if (step.id === 'api-key' && !isPrerequisiteDone(step.id)) {
                      <a
                        hlmBtn
                        routerLink="/workspace/api-keys"
                        [queryParams]="{ create: '1' }"
                      >
                        <ng-icon
                          name="lucideKeyRound"
                          class="me-2 size-4"
                          aria-hidden="true"
                        />
                        {{ step.actionLabel }}
                      </a>
                    } @else {
                      <button
                        hlmBtn
                        type="button"
                        [disabled]="isPrerequisiteDone(step.id)"
                        (click)="completePrerequisite(step.id)"
                      >
                        <ng-icon
                          name="lucideKeyRound"
                          class="me-2 size-4"
                          aria-hidden="true"
                        />
                        {{
                          isPrerequisiteDone(step.id)
                            ? (step.actionLabel ? step.actionLabel + ' ✓' : 'Done')
                            : step.actionLabel
                        }}
                      </button>
                    }
                  </div>
                </div>
              </section>
            } @else {
              <section
                hlmCard
                class="gap-0 overflow-hidden py-0"
                [class.opacity-60]="!stepIsActive(index)"
              >
                <div hlmCardContent class="!p-6">
                  <h2 class="text-base font-semibold leading-6">{{ step.title }}</h2>
                  <p class="text-muted-foreground mt-1 text-sm leading-6">
                    {{ step.description }}
                  </p>
                  @if (step.codeSnippet) {
                    <oequ-onboarding-code-block
                      [code]="step.codeSnippet"
                      [languageLabel]="step.codeLanguageLabel ?? 'Code'"
                    />
                  }
                  <div class="mt-4">
                    <button
                      hlmBtn
                      type="button"
                      [disabled]="!prerequisitesComplete() || completing()"
                      (click)="completeActivation()"
                    >
                      <ng-icon
                        name="lucideSparkles"
                        class="me-2 size-4"
                        aria-hidden="true"
                      />
                      {{
                        completing()
                          ? 'Sending…'
                          : (step.completeLabel ?? 'Complete')
                      }}
                    </button>
                  </div>
                </div>
              </section>
            }
          </li>
        }
      </ol>

      @if (config().exploreCards?.length) {
        <section class="border-border/60 mt-14 border-t pt-10">
          <h2 class="text-lg font-semibold tracking-tight">
            {{ config().exploreTitle }}
          </h2>
          <p class="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            {{ config().exploreSubtitle }}
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (card of config().exploreCards ?? []; track card.id) {
              <article
                class="group border-border/70 bg-card/30 hover:border-border hover:bg-card/60 relative flex h-full flex-col rounded-xl border p-5 transition-[background-color,border-color,box-shadow] hover:shadow-sm"
              >
                <div
                  class="bg-muted/50 ring-border/50 mb-4 flex size-10 items-center justify-center rounded-lg ring-1"
                >
                  <ng-icon
                    [name]="exploreIcon(card.id)"
                    class="text-foreground size-4"
                    aria-hidden="true"
                  />
                </div>
                <h3 class="text-sm font-semibold leading-snug">
                  {{ card.title }}
                </h3>
                <p
                  class="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed"
                >
                  {{ card.description }}
                </p>
                <button
                  hlmBtn
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-foreground mt-5 -ms-2.5 w-fit gap-1 px-2.5"
                  [hlmTooltip]="exploreDemoTooltip"
                  position="top"
                  (click)="onExploreAction($event)"
                >
                  {{ card.actionLabel }}
                  <ng-icon
                    name="lucideArrowRight"
                    class="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class OnboardingActivationComponent {
  private readonly configToken = inject(ACTIVATION_ONBOARDING_CONFIG);
  private readonly activationPort = inject(ACTIVATION_PORT);
  private readonly apiKeysPort = inject(API_KEYS_PORT);
  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);

  protected readonly config = computed(() => this.configToken);

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly completedPrerequisites = signal<ReadonlySet<string>>(
    new Set(),
  );
  protected readonly completing = signal(false);

  protected readonly exploreDemoTooltip = 'Demo only — this action is not wired';

  constructor() {
    void this.syncApiKeyPrerequisite();
  }

  protected prerequisitesComplete(): boolean {
    const required = this.config().steps.filter((s) => s.kind === 'prerequisite');
    return required.every((s) => this.completedPrerequisites().has(s.id));
  }

  protected isPrerequisiteDone(stepId: string): boolean {
    return this.completedPrerequisites().has(stepId);
  }

  protected stepIsActive(index: number): boolean {
    if (index === 0) {
      return true;
    }
    const prior = this.config().steps.slice(0, index);
    return prior
      .filter((s) => s.kind === 'prerequisite')
      .every((s) => this.completedPrerequisites().has(s.id));
  }

  protected exploreIcon(cardId: string): string {
    switch (cardId) {
      case 'domain':
        return 'lucideGlobe';
      case 'test-emails':
        return 'lucideTestTubeDiagonal';
      default:
        return 'lucideSend';
    }
  }

  protected completePrerequisite(stepId: string): void {
    this.completedPrerequisites.update(
      (current) => new Set([...current, stepId]),
    );
  }

  private async syncApiKeyPrerequisite(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      return;
    }

    const result = await this.apiKeysPort.listKeys(org.id);
    if (result.ok && result.data.length > 0) {
      this.completePrerequisite('api-key');
    }
  }

  protected onExploreAction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected async completeActivation(): Promise<void> {
    if (!this.prerequisitesComplete() || this.completing()) {
      return;
    }

    const org = this.activeOrganization();
    if (!org) {
      toast.error('No active workspace. Select a workspace and try again.');
      return;
    }

    this.completing.set(true);
    const result = await this.activationPort.markComplete(org.id);
    if (!result.ok) {
      toast.error(result.error.message);
      this.completing.set(false);
      return;
    }

    await this.router.navigate(['/workspace/settings/general']);
    this.completing.set(false);
  }
}
