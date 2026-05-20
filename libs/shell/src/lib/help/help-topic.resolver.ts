import { TranslocoService } from '@oequ/i18n';

import type { HelpTopic, HelpTopicRef } from './help-context.config';

interface HelpTopicTranslation {
  readonly title?: string;
  readonly summary?: string;
  readonly paragraphs?: readonly string[];
}

export function resolveHelpTopic(
  ref: HelpTopicRef,
  transloco: TranslocoService,
): HelpTopic {
  const raw = transloco.translateObject(
    `help.topics.${ref.id}`,
  ) as HelpTopicTranslation;

  return {
    id: ref.id,
    category: ref.category,
    title: raw.title ?? ref.id,
    summary: raw.summary ?? '',
    paragraphs: raw.paragraphs ?? [],
  };
}

export function resolveHelpSystemComponent(
  id: string,
  transloco: TranslocoService,
): { readonly name: string; readonly detail: string } {
  return {
    name: transloco.translate(`help.system.${id}.name`),
    detail: transloco.translate(`help.system.${id}.detail`),
  };
}
