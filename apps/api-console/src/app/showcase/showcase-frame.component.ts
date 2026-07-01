import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideBookOpen,
  lucideKeyRound,
  lucideLayoutDashboard,
  lucideTerminal,
} from '@ng-icons/lucide';

import { API_CONSOLE_NAV_SECTIONS } from '../shell/api-console-nav.model';
import { ShowcaseKeyDialogsComponent } from './showcase-key-dialogs.component';
import { ShowcaseScenesComponent } from './showcase-scenes.component';
import { SHOWCASE_STEPS } from './showcase.data';
import {
  SHOWCASE_TOUR_CLICK_MS,
  SHOWCASE_TOUR_MOVE_MS,
  SHOWCASE_TOUR_SCENE_TRANSITION_MS,
  SHOWCASE_TOUR_SCROLL_MS,
  SHOWCASE_SECRET_DIALOG_CLOSE_MS,
  SHOWCASE_TOUR_SEQUENCES,
  type ShowcaseTourAction,
  type ShowcaseTourTarget,
} from './showcase-tour';

@Component({
  selector: 'ac-showcase-frame',
  imports: [ShowcaseScenesComponent, ShowcaseKeyDialogsComponent, NgIcon],
  templateUrl: './showcase-frame.component.html',
  styleUrl: './showcase-frame.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideKeyRound,
      lucideTerminal,
      lucideActivity,
      lucideBookOpen,
    }),
  ],
  host: {
    class: 'block',
  },
})
export class ShowcaseFrameComponent implements AfterViewInit, OnDestroy {
  readonly activeScene = input.required<number>();
  readonly paused = input(false);
  readonly manualScene = input<number | null>(null);
  readonly captureMode = input(false);

  readonly sceneChange = output<number>();

  private readonly tourLayer = viewChild.required<ElementRef<HTMLElement>>('tourLayer');
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  protected readonly navSections = API_CONSOLE_NAV_SECTIONS;
  protected readonly steps = SHOWCASE_STEPS;

  protected readonly cursorX = signal(24);
  protected readonly cursorY = signal(24);
  protected readonly cursorVisible = signal(false);
  protected readonly clickRipple = signal(false);
  protected readonly highlightTarget = signal<ShowcaseTourTarget | null>(null);
  protected readonly showResponse = signal(false);
  protected readonly copyHint = signal('');
  protected readonly createDialogOpen = signal(false);
  protected readonly secretDialogOpen = signal(false);
  protected readonly secretDialogClosing = signal(false);
  protected readonly dialogKeyName = signal('');
  protected readonly playgroundApiKey = signal('');
  protected readonly dialogSubmitting = signal(false);
  protected readonly stagingKeyCreated = signal(false);
  protected readonly playgroundRequestSent = signal(false);
  protected readonly usageViewed = signal(false);
  protected readonly tourUsageOccurredAt = signal<string | null>(null);

  private tourScene = 0;
  private tourActionIndex = 0;
  private tourGeneration = 0;
  private tourRunning = false;
  private tourStopped = false;
  private resumeWaiter: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastManualScene: number | null = null;
  private reducedMotion = false;
  private scrollGeneration = 0;

  constructor() {
    effect(() => {
      if (!this.paused() && this.resumeWaiter) {
        const resume = this.resumeWaiter;
        this.resumeWaiter = null;
        resume();
      }
    });

    effect(() => {
      const manual = this.manualScene();
      if (manual === null || manual === this.lastManualScene) {
        return;
      }
      this.lastManualScene = manual;
      void this.jumpToScene(manual);
    });

    effect(() => {
      const scene = this.activeScene();
      this.cancelActiveScroll();
      if (scene !== 2) {
        this.resetScrollInstant();
      }
    });
  }

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) {
      this.cursorVisible.set(false);
      return;
    }

    const layer = this.tourLayer().nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      const target = this.highlightTarget();
      if (target) {
        void this.moveCursorTo(target, false);
      }
    });
    this.resizeObserver.observe(layer);

    void this.startTour();
  }

  ngOnDestroy(): void {
    this.tourStopped = true;
    this.resizeObserver?.disconnect();
    this.resumeWaiter?.();
  }

  protected navTourId(path: string): ShowcaseTourTarget | null {
    switch (path) {
      case '/overview':
        return 'nav-overview';
      case '/keys':
        return 'nav-keys';
      case '/playground':
        return 'nav-playground';
      case '/metered-usage':
        return 'nav-usage';
      default:
        return null;
    }
  }

  protected isNavActive(path: string): boolean {
    return this.steps[this.activeScene()]?.navPath === path;
  }

  protected chromeUrl(): string {
    const path = this.steps[this.activeScene()]?.navPath ?? '/overview';
    return `console.oequ.io${path}`;
  }

  protected isTargetHighlighted(target: ShowcaseTourTarget): boolean {
    return this.highlightTarget() === target;
  }

  private async startTour(): Promise<void> {
    if (this.tourRunning) {
      return;
    }
    this.tourRunning = true;
    this.positionCursorAt('nav-overview');
    this.cursorVisible.set(true);

    while (!this.tourStopped) {
      await this.waitWhilePaused();
      const generation = this.tourGeneration;
      const sequence = SHOWCASE_TOUR_SEQUENCES[this.tourScene];
      if (!sequence) {
        this.tourScene = 0;
        continue;
      }

      while (this.tourActionIndex < sequence.length) {
        if (generation !== this.tourGeneration) {
          break;
        }
        await this.waitWhilePaused();
        if (generation !== this.tourGeneration) {
          break;
        }
        const action = sequence[this.tourActionIndex];
        this.tourActionIndex += 1;
        await this.runAction(action, generation);
      }

      if (generation !== this.tourGeneration) {
        continue;
      }

      this.tourActionIndex = 0;
    }
  }

  private async jumpToScene(scene: number): Promise<void> {
    this.tourGeneration += 1;
    this.tourScene = scene;
    this.tourActionIndex = 0;
    this.highlightTarget.set(null);
    if (scene === 0) {
      this.stagingKeyCreated.set(false);
      this.playgroundApiKey.set('');
      this.playgroundRequestSent.set(false);
      this.tourUsageOccurredAt.set(null);
      this.usageViewed.set(false);
    }
    if (scene === 3) {
      this.usageViewed.set(true);
    }
    if (scene !== 2) {
      this.showResponse.set(false);
    }
    if (scene !== 0) {
      this.copyHint.set('');
    }
    if (scene !== 1) {
      this.resetKeyDialogs();
    }
    if (scene === 2) {
      this.playgroundApiKey.set('');
      this.playgroundRequestSent.set(false);
      this.tourUsageOccurredAt.set(null);
      this.resetScrollInstant();
    }
    this.cancelActiveScroll();
    this.sceneChange.emit(scene);
    await this.delay(SHOWCASE_TOUR_SCENE_TRANSITION_MS);
    const firstMove = SHOWCASE_TOUR_SEQUENCES[scene]?.find((a) => a.kind === 'move');
    if (firstMove?.kind === 'move') {
      await this.moveCursorTo(firstMove.target, true);
      this.highlightTarget.set(firstMove.target);
    }
  }

  private async runAction(
    action: ShowcaseTourAction,
    generation: number,
  ): Promise<void> {
    if (generation !== this.tourGeneration) {
      return;
    }
    switch (action.kind) {
      case 'wait':
        await this.delay(action.ms);
        return;
      case 'move':
        this.highlightTarget.set(action.target);
        await this.moveCursorTo(action.target, true);
        return;
      case 'type':
        await this.performType(action, generation);
        return;
      case 'click':
        await this.performClick(action, generation);
        return;
    }
  }

  private async performClick(
    action: Extract<ShowcaseTourAction, { kind: 'click' }>,
    generation: number,
  ): Promise<void> {
    if (generation !== this.tourGeneration) {
      return;
    }
    this.highlightTarget.set(action.target);
    await this.moveCursorTo(action.target, true);
    await this.delay(120);

    this.clickRipple.set(true);
    await this.delay(SHOWCASE_TOUR_CLICK_MS);
    this.clickRipple.set(false);

    if (action.effect === 'copy') {
      this.copyHint.set('Copied');
      await this.delay(700);
      this.copyHint.set('');
    }

    if (action.effect === 'open-create-dialog') {
      this.resetKeyDialogs();
      this.createDialogOpen.set(true);
      await this.delay(200);
    }

    if (action.effect === 'submit-create-key') {
      this.dialogSubmitting.set(true);
      await this.delay(450);
      this.dialogSubmitting.set(false);
      this.createDialogOpen.set(false);
      this.secretDialogOpen.set(true);
      this.stagingKeyCreated.set(true);
    }

    if (action.effect === 'close-secret-dialog') {
      await this.closeSecretDialogAnimated();
    }

    if (action.effect === 'send-request') {
      this.tourUsageOccurredAt.set(new Date().toISOString());
      this.playgroundRequestSent.set(true);
      this.showResponse.set(true);
      await this.delay(80);
      const container = this.scrollContainer()?.nativeElement;
      if (container) {
        await this.smoothScrollTo(container, container.scrollHeight, 480);
      }
    }

    if (action.goto !== undefined) {
      this.cancelActiveScroll();
      this.tourScene = action.goto;
      if (action.goto === 0) {
        this.stagingKeyCreated.set(false);
        this.playgroundApiKey.set('');
        this.playgroundRequestSent.set(false);
        this.tourUsageOccurredAt.set(null);
        this.usageViewed.set(false);
        this.copyHint.set('');
      } else if (action.goto !== 0) {
        this.copyHint.set('');
      }
      if (action.goto === 3) {
        this.usageViewed.set(true);
      }
      if (action.goto === 2) {
        this.showResponse.set(false);
        this.playgroundApiKey.set('');
        this.playgroundRequestSent.set(false);
        this.tourUsageOccurredAt.set(null);
        this.resetKeyDialogs();
        this.resetScrollInstant();
      }
      this.sceneChange.emit(action.goto);
      await this.delay(SHOWCASE_TOUR_SCENE_TRANSITION_MS);
    }
  }

  private async performType(
    action: Extract<ShowcaseTourAction, { kind: 'type' }>,
    generation: number,
  ): Promise<void> {
    if (generation !== this.tourGeneration) {
      return;
    }
    const field = this.typeTargetField(action.target);
    if (!field) {
      return;
    }

    this.highlightTarget.set(action.target);
    await this.moveCursorTo(action.target, true);
    field.set('');
    for (const char of action.text) {
      if (generation !== this.tourGeneration) {
        return;
      }
      field.update((value) => value + char);
      await this.delay(action.charMs ?? 50);
    }
  }

  private typeTargetField(
    target: ShowcaseTourTarget,
  ): ReturnType<typeof signal<string>> | null {
    switch (target) {
      case 'dialog-key-name':
        return this.dialogKeyName;
      case 'api-key-field':
        return this.playgroundApiKey;
      default:
        return null;
    }
  }

  private resetKeyDialogs(): void {
    this.createDialogOpen.set(false);
    this.secretDialogOpen.set(false);
    this.secretDialogClosing.set(false);
    this.dialogKeyName.set('');
    this.dialogSubmitting.set(false);
  }

  private async closeSecretDialogAnimated(): Promise<void> {
    if (!this.secretDialogOpen() || this.secretDialogClosing()) {
      return;
    }
    this.secretDialogClosing.set(true);
    await this.delay(SHOWCASE_SECRET_DIALOG_CLOSE_MS);
    this.secretDialogOpen.set(false);
    this.secretDialogClosing.set(false);
    this.dialogKeyName.set('');
  }

  private positionCursorAt(target: ShowcaseTourTarget): void {
    const point = this.getTargetPoint(target);
    if (!point) {
      return;
    }

    this.cursorX.set(point.x);
    this.cursorY.set(point.y);
    this.highlightTarget.set(target);
  }

  private async moveCursorTo(
    target: ShowcaseTourTarget,
    animate: boolean,
  ): Promise<void> {
    const layer = this.tourLayer().nativeElement;
    const el = layer.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (el) {
      await this.scrollTargetIntoView(el);
    }

    const point = this.getTargetPoint(target);
    if (!point) {
      return;
    }

    if (!animate) {
      this.cursorX.set(point.x);
      this.cursorY.set(point.y);
      return;
    }

    this.cursorX.set(point.x);
    this.cursorY.set(point.y);
    await this.delay(SHOWCASE_TOUR_MOVE_MS);
  }

  private cancelActiveScroll(): void {
    this.scrollGeneration += 1;
  }

  private resetScrollInstant(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) {
      return;
    }

    container.style.setProperty('scroll-behavior', 'auto', 'important');
    container.scrollTop = 0;
    container.style.removeProperty('scroll-behavior');
  }

  private async scrollTargetIntoView(el: HTMLElement): Promise<void> {
    if (this.activeScene() !== 2) {
      return;
    }

    const container = this.scrollContainer()?.nativeElement;
    if (!container) {
      return;
    }

    const padding = 12;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    let targetScroll = container.scrollTop;

    if (elRect.top < containerRect.top + padding) {
      targetScroll -= containerRect.top + padding - elRect.top;
    } else if (elRect.bottom > containerRect.bottom - padding) {
      targetScroll += elRect.bottom - containerRect.bottom + padding;
    } else {
      return;
    }

    await this.smoothScrollTo(container, targetScroll, SHOWCASE_TOUR_SCROLL_MS);
  }

  private smoothScrollTo(
    container: HTMLElement,
    top: number,
    duration = SHOWCASE_TOUR_SCROLL_MS,
  ): Promise<void> {
    const generation = ++this.scrollGeneration;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(top, maxTop));
    const startTop = container.scrollTop;
    const delta = targetTop - startTop;

    if (Math.abs(delta) < 2 || this.reducedMotion) {
      container.scrollTop = targetTop;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const startTime = performance.now();

      const tick = (now: number): void => {
        if (generation !== this.scrollGeneration || this.tourStopped) {
          resolve();
          return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        container.scrollTop = startTop + delta * eased;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(tick);
    });
  }

  private getTargetPoint(target: ShowcaseTourTarget): { x: number; y: number } | null {
    const layer = this.tourLayer().nativeElement;
    const el = layer.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      return null;
    }

    const layerRect = layer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      x: elRect.left - layerRect.left + elRect.width / 2 - 4,
      y: elRect.top - layerRect.top + elRect.height / 2 - 4,
    };
  }

  private async waitWhilePaused(): Promise<void> {
    if (!this.paused() || this.tourStopped) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.resumeWaiter = resolve;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.tourStopped) {
        resolve();
        return;
      }
      setTimeout(resolve, ms);
    });
  }
}
