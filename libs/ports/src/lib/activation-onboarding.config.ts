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

/** Demo-only timeline step (metrics simulation, member impersonation, …). */
export type ActivationDemoStepAction =
  | 'metrics-retrospective'
  | 'member-impersonation';

export interface ActivationDemoStepConfig {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly action: ActivationDemoStepAction;
}

export interface ActivationOnboardingConfig {
  readonly title: string;
  readonly subtitle: string;
  /** Production activation checklist (API key, send email, …). */
  readonly steps?: readonly ActivationStepConfig[];
  /** Demo timeline steps; rendered like `steps` with the vertical rail. */
  readonly demoSteps?: readonly ActivationDemoStepConfig[];
}

export const ACTIVATION_ONBOARDING_CONFIG =
  new InjectionToken<ActivationOnboardingConfig>(
    'ACTIVATION_ONBOARDING_CONFIG',
  );
