import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBarChart2,
  lucideChevronRight,
  lucideCircleHelp,
  lucideCreditCard,
  lucideGauge,
  lucideKeyRound,
  lucidePuzzle,
  lucideRocket,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';
import { TranslocoPipe, TranslocoService } from '@oequ/i18n';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { filter, map, startWith } from 'rxjs';

import { HelpContactFormComponent } from './help-contact-form.component';
import {
  HELP_BROWSE_TOPICS,
  HELP_SYSTEM_COMPONENTS,
  type HelpTopicCategory,
  topicsForRoute,
} from './help-context.config';
import { HelpPanelService } from './help-panel.service';
import {
  resolveHelpSystemComponent,
  resolveHelpTopic,
} from './help-topic.resolver';

const CATEGORY_ICONS: Record<HelpTopicCategory, string> = {
  metrics: 'lucideBarChart2',
  'api-keys': 'lucideKeyRound',
  integrations: 'lucidePuzzle',
  members: 'lucideUsers',
  billing: 'lucideCreditCard',
  usage: 'lucideGauge',
  onboarding: 'lucideRocket',
  account: 'lucideUser',
  general: 'lucideCircleHelp',
};

@Component({
  selector: 'oequ-help-panel',
  imports: [
    NgIcon,
    HlmButtonImports,
    HlmSheetImports,
    HelpContactFormComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideChevronRight,
      lucideArrowLeft,
      lucideBarChart2,
      lucideKeyRound,
      lucidePuzzle,
      lucideUsers,
      lucideCreditCard,
      lucideGauge,
      lucideRocket,
      lucideUser,
      lucideCircleHelp,
    }),
  ],
  template: `
    <button
      type="button"
      class="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
      (click)="panel.open()"
    >
      {{ 'help.trigger' | transloco }}
    </button>

    <hlm-sheet
      side="right"
      [state]="panel.sheetState()"
      (stateChanged)="onSheetStateChanged($event)"
    >
      <hlm-sheet-content
        *hlmSheetPortal="let ctx"
        class="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        @if (panel.view() === 'article' && selectedTopic(); as topic) {
          <div class="flex flex-1 flex-col overflow-y-auto">
            <div class="border-border border-b px-4 py-4">
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
                (click)="panel.backToHub()"
              >
                <ng-icon name="lucideArrowLeft" class="size-4" />
                {{ 'help.back' | transloco }}
              </button>
              <h2 class="text-lg font-semibold tracking-tight">
                {{ topic.title }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">{{ topic.summary }}</p>
            </div>
            <div class="space-y-4 px-4 py-4">
              @for (paragraph of topic.paragraphs; track paragraph) {
                <p class="text-muted-foreground text-sm leading-6">
                  {{ paragraph }}
                </p>
              }
            </div>
          </div>
        } @else if (panel.view() === 'contact') {
          <div class="flex flex-1 flex-col overflow-y-auto">
            <div class="border-border border-b px-4 py-4">
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
                (click)="panel.backToHub()"
              >
                <ng-icon name="lucideArrowLeft" class="size-4" />
                {{ 'help.back' | transloco }}
              </button>
              <h2 class="text-lg font-semibold tracking-tight">
                {{ 'help.contact.title' | transloco }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ 'help.contact.subtitle' | transloco }}
              </p>
            </div>
            <div class="px-4 py-4">
              <oequ-help-contact-form
                (cancelled)="panel.backToHub()"
                (submitted)="panel.close()"
              />
            </div>
          </div>
        } @else {
          <div class="flex flex-1 flex-col overflow-y-auto">
            <hlm-sheet-header class="border-border space-y-1 border-b px-4 py-4 text-start">
              <p class="text-primary text-xs font-medium tracking-wide uppercase">
                {{ 'help.hub.eyebrow' | transloco }}
              </p>
              <h2 hlmSheetTitle class="text-lg">
                {{ 'help.hub.title' | transloco }}
              </h2>
              <p hlmSheetDescription>
                {{ 'help.hub.description' | transloco }}
              </p>
            </hlm-sheet-header>

            <div class="flex flex-1 flex-col gap-6 px-4 py-4">
              <section class="space-y-2">
                <h3
                  class="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  {{ 'help.hub.forThisPage' | transloco }}
                </h3>
                <ul class="space-y-1">
                  @for (topic of pageTopics(); track topic.id) {
                    <li>
                      <button
                        type="button"
                        class="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors"
                        (click)="openTopic(topic)"
                      >
                        <span
                          class="bg-muted text-muted-foreground grid size-8 shrink-0 place-content-center rounded-md"
                        >
                          <ng-icon
                            [name]="iconForCategory(topic.category)"
                            class="size-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block text-sm font-medium">{{
                            topic.title
                          }}</span>
                          <span
                            class="text-muted-foreground block truncate text-xs"
                            >{{ topic.summary }}</span
                          >
                        </span>
                        <ng-icon
                          name="lucideChevronRight"
                          class="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  }
                </ul>
              </section>

              <section class="space-y-2">
                <h3
                  class="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  {{ 'help.hub.browseTopics' | transloco }}
                </h3>
                <ul class="space-y-1">
                  @for (topic of browseTopics(); track topic.id) {
                    <li>
                      <button
                        type="button"
                        class="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors"
                        (click)="openTopic(topic)"
                      >
                        <span
                          class="bg-muted text-muted-foreground grid size-8 shrink-0 place-content-center rounded-md"
                        >
                          <ng-icon
                            [name]="iconForCategory(topic.category)"
                            class="size-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block text-sm font-medium">{{
                            topic.title
                          }}</span>
                          <span
                            class="text-muted-foreground block truncate text-xs"
                            >{{ topic.summary }}</span
                          >
                        </span>
                        <ng-icon
                          name="lucideChevronRight"
                          class="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  }
                </ul>
              </section>
            </div>

            <div class="border-border mt-auto space-y-3 border-t px-4 py-4">
              <button
                type="button"
                class="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg px-2 py-2 text-start"
                (click)="panel.toggleStatusExpanded()"
                [attr.aria-expanded]="panel.statusExpanded()"
              >
                <span class="flex items-center gap-2 text-sm">
                  <span
                    class="bg-emerald-500 size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                  ></span>
                  {{ 'help.hub.statusOperational' | transloco }}
                </span>
                <span class="text-muted-foreground text-xs">
                  {{
                    panel.statusExpanded()
                      ? ('help.hub.statusHide' | transloco)
                      : ('help.hub.statusDetails' | transloco)
                  }}
                </span>
              </button>
              @if (panel.statusExpanded()) {
                <ul class="space-y-2 pb-1">
                  @for (item of systemComponents(); track item.name) {
                    <li
                      class="border-border flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <p class="text-sm font-medium">{{ item.name }}</p>
                        <p class="text-muted-foreground text-xs">
                          {{ item.detail }}
                        </p>
                      </div>
                      <span
                        class="text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                        >{{ 'help.hub.statusOk' | transloco }}</span
                      >
                    </li>
                  }
                </ul>
              }
              <button
                hlmBtn
                type="button"
                variant="outline"
                class="w-full"
                (click)="panel.openContact()"
              >
                {{ 'help.hub.contactSupport' | transloco }}
              </button>
            </div>
          </div>
        }
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class HelpPanelComponent {
  protected readonly panel = inject(HelpPanelService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly selectedTopic = computed(() => {
    const ref = this.panel.selectedTopic();
    return ref ? resolveHelpTopic(ref, this.transloco) : null;
  });

  protected readonly pageTopics = computed(() =>
    topicsForRoute(this.currentUrl() ?? '').map((ref) =>
      resolveHelpTopic(ref, this.transloco),
    ),
  );

  protected readonly browseTopics = computed(() =>
    HELP_BROWSE_TOPICS.map((ref) => resolveHelpTopic(ref, this.transloco)),
  );

  protected readonly systemComponents = computed(() =>
    HELP_SYSTEM_COMPONENTS.map((component) =>
      resolveHelpSystemComponent(component.id, this.transloco),
    ),
  );

  protected iconForCategory(category: HelpTopicCategory): string {
    return CATEGORY_ICONS[category];
  }

  protected openTopic(topic: { readonly id: string; readonly category: HelpTopicCategory }): void {
    this.panel.openTopic({ id: topic.id, category: topic.category });
  }

  protected onSheetStateChanged(state: 'open' | 'closed'): void {
    this.panel.onSheetStateChanged(state);
  }
}
