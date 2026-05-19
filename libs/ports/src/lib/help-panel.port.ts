import { InjectionToken } from '@angular/core';

export type HelpPanelView = 'hub' | 'contact';

export interface HelpPanelPort {
  open(view?: HelpPanelView): void;
  close(): void;
}

export const HELP_PANEL_PORT = new InjectionToken<HelpPanelPort>(
  'HELP_PANEL_PORT',
);
