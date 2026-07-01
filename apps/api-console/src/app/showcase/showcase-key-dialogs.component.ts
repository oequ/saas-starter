import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

import { SHOWCASE_NEW_KEY_SECRET } from './showcase.data';

@Component({
  selector: 'ac-showcase-key-dialogs',
  imports: [HlmButtonImports, HlmInput],
  templateUrl: './showcase-key-dialogs.component.html',
  styleUrl: './showcase-key-dialogs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseKeyDialogsComponent {
  readonly createOpen = input(false);
  readonly secretOpen = input(false);
  readonly secretClosing = input(false);
  readonly keyName = input('');
  readonly submitting = input(false);
  readonly secret = input(SHOWCASE_NEW_KEY_SECRET);
  readonly highlightTarget = input<string | null>(null);

  protected isHighlighted(target: string): boolean {
    return this.highlightTarget() === target;
  }
}
