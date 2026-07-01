import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ShowcaseFrameComponent } from './showcase-frame.component';

@Component({
  selector: 'ac-showcase-page',
  imports: [ShowcaseFrameComponent],
  templateUrl: './showcase.page.html',
  styleUrl: './showcase.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcasePageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly captureMode = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('capture') === '1')),
    { initialValue: false },
  );
  protected readonly activeScene = signal(0);
  protected readonly paused = signal(false);
  protected readonly manualScene = signal<number | null>(null);

  protected onSceneChange(index: number): void {
    this.activeScene.set(index);
  }

  protected onFrameEnter(): void {
    if (this.captureMode()) {
      return;
    }
    this.paused.set(true);
  }

  protected onFrameLeave(): void {
    if (this.captureMode()) {
      return;
    }
    this.paused.set(false);
  }
}
