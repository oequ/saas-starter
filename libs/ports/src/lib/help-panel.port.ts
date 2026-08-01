export type HelpPanelView = 'hub' | 'contact';

export interface HelpPanelPort {
  open(view?: HelpPanelView): void;
  close(): void;
}

