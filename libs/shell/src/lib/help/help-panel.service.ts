import { Injectable, signal } from '@angular/core';
import type { HelpPanelPort, HelpPanelView } from '@oequ/ports';

import type { HelpTopic } from './help-context.config';

export type HelpPanelContentView = HelpPanelView | 'article';

@Injectable({ providedIn: 'root' })
export class HelpPanelService implements HelpPanelPort {
  readonly sheetState = signal<'open' | 'closed'>('closed');
  readonly view = signal<HelpPanelContentView>('hub');
  readonly selectedTopic = signal<HelpTopic | null>(null);
  readonly statusExpanded = signal(false);

  open(view: HelpPanelView = 'hub'): void {
    this.view.set(view);
    this.selectedTopic.set(null);
    this.statusExpanded.set(false);
    this.sheetState.set('open');
  }

  close(): void {
    this.sheetState.set('closed');
  }

  onSheetStateChanged(state: 'open' | 'closed'): void {
    this.sheetState.set(state);
    if (state === 'closed') {
      this.view.set('hub');
      this.selectedTopic.set(null);
      this.statusExpanded.set(false);
    }
  }

  openTopic(topic: HelpTopic): void {
    this.selectedTopic.set(topic);
    this.view.set('article');
  }

  backToHub(): void {
    this.view.set('hub');
    this.selectedTopic.set(null);
  }

  openContact(): void {
    this.view.set('contact');
    this.selectedTopic.set(null);
  }

  toggleStatusExpanded(): void {
    this.statusExpanded.update((expanded) => !expanded);
  }
}
