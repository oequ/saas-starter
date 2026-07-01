export type ShowcaseTourTarget =
  | 'nav-overview'
  | 'nav-keys'
  | 'nav-playground'
  | 'nav-usage'
  | 'copy-project-id'
  | 'create-key'
  | 'dialog-key-name'
  | 'dialog-add-key'
  | 'dialog-secret-done'
  | 'api-key-field'
  | 'send-request';

export type ShowcaseTourEffect =
  | 'copy'
  | 'open-create-dialog'
  | 'submit-create-key'
  | 'close-secret-dialog'
  | 'send-request';

export type ShowcaseTourAction =
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'move'; readonly target: ShowcaseTourTarget }
  | {
      readonly kind: 'type';
      readonly target: ShowcaseTourTarget;
      readonly text: string;
      readonly charMs?: number;
    }
  | {
      readonly kind: 'click';
      readonly target: ShowcaseTourTarget;
      readonly goto?: number;
      readonly effect?: ShowcaseTourEffect;
    };

import { SHOWCASE_NEW_KEY_NAME, SHOWCASE_NEW_KEY_SECRET } from './showcase.data';
export const SHOWCASE_TOUR_SEQUENCES: readonly (readonly ShowcaseTourAction[])[] = [
  [
    { kind: 'wait', ms: 1400 },
    { kind: 'move', target: 'copy-project-id' },
    { kind: 'click', target: 'copy-project-id', effect: 'copy' },
    { kind: 'wait', ms: 900 },
    { kind: 'move', target: 'nav-keys' },
    { kind: 'click', target: 'nav-keys', goto: 1 },
  ],
  [
    { kind: 'wait', ms: 500 },
    { kind: 'move', target: 'create-key' },
    { kind: 'click', target: 'create-key', effect: 'open-create-dialog' },
    { kind: 'wait', ms: 400 },
    { kind: 'move', target: 'dialog-key-name' },
    { kind: 'type', target: 'dialog-key-name', text: SHOWCASE_NEW_KEY_NAME, charMs: 55 },
    { kind: 'wait', ms: 280 },
    { kind: 'move', target: 'dialog-add-key' },
    { kind: 'click', target: 'dialog-add-key', effect: 'submit-create-key' },
    { kind: 'wait', ms: 750 },
    { kind: 'move', target: 'dialog-secret-done' },
    { kind: 'click', target: 'dialog-secret-done', effect: 'close-secret-dialog' },
    { kind: 'wait', ms: 450 },
    { kind: 'move', target: 'nav-playground' },
    { kind: 'click', target: 'nav-playground', goto: 2 },
  ],
  [
    { kind: 'wait', ms: 500 },
    { kind: 'move', target: 'api-key-field' },
    { kind: 'click', target: 'api-key-field' },
    {
      kind: 'type',
      target: 'api-key-field',
      text: SHOWCASE_NEW_KEY_SECRET,
      charMs: 14,
    },
    { kind: 'wait', ms: 220 },
    { kind: 'move', target: 'send-request' },
    { kind: 'click', target: 'send-request', effect: 'send-request' },
    { kind: 'wait', ms: 1600 },
    { kind: 'move', target: 'nav-usage' },
    { kind: 'click', target: 'nav-usage', goto: 3 },
  ],
  [
    { kind: 'wait', ms: 1800 },
    { kind: 'move', target: 'nav-overview' },
    { kind: 'click', target: 'nav-overview', goto: 0 },
  ],
];

export const SHOWCASE_TOUR_MOVE_MS = 650;
export const SHOWCASE_TOUR_CLICK_MS = 650;
export const SHOWCASE_TOUR_SCENE_TRANSITION_MS = 360;
export const SHOWCASE_TOUR_SCROLL_MS = 420;
export const SHOWCASE_SECRET_DIALOG_CLOSE_MS = 260;
