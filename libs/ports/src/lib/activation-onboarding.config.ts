import { InjectionToken } from '@angular/core';

/** Prerequisite steps must be done before the final complete step. */
export type ActivationStepKind = 'prerequisite' | 'complete';

export interface ActivationStepConfig {
  readonly id: string;
  readonly kind: ActivationStepKind;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly codeSnippet?: string;
  readonly codeLanguageLabel?: string;
  readonly completeLabel?: string;
}

export interface ActivationExploreCardConfig {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly badge?: string;
}

export interface ActivationRetrospectiveBlockConfig {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
}

export interface ActivationOnboardingConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly steps: readonly ActivationStepConfig[];
  /** Optional first-block CTA: simulate historical sends and open Metrics. */
  readonly retrospective?: ActivationRetrospectiveBlockConfig;
  readonly exploreTitle?: string;
  readonly exploreSubtitle?: string;
  readonly exploreCards?: readonly ActivationExploreCardConfig[];
}

export const ACTIVATION_ONBOARDING_CONFIG =
  new InjectionToken<ActivationOnboardingConfig>(
    'ACTIVATION_ONBOARDING_CONFIG',
  );
