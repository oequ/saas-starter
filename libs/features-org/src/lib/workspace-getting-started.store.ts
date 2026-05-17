import { Injectable } from '@angular/core';

const STORAGE_PREFIX = 'oequ:getting-started:';

export const GETTING_STARTED_STEP_IDS = [
  'customize',
  'invite',
  'billing',
] as const;

export type GettingStartedStepId = (typeof GETTING_STARTED_STEP_IDS)[number];

export interface GettingStartedState {
  dismissed: boolean;
  completedSteps: Partial<Record<GettingStartedStepId, boolean>>;
}

const DEFAULT_STATE: GettingStartedState = {
  dismissed: false,
  completedSteps: {},
};

@Injectable({ providedIn: 'root' })
export class WorkspaceGettingStartedStore {
  read(orgId: string): GettingStartedState {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_STATE };
    }

    try {
      const raw = localStorage.getItem(this.storageKey(orgId));
      if (!raw) {
        return { ...DEFAULT_STATE };
      }
      const parsed = JSON.parse(raw) as GettingStartedState;
      return {
        dismissed: Boolean(parsed.dismissed),
        completedSteps: parsed.completedSteps ?? {},
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  isDismissed(orgId: string): boolean {
    return this.read(orgId).dismissed;
  }

  dismiss(orgId: string): void {
    this.write(orgId, { ...this.read(orgId), dismissed: true });
  }

  isStepComplete(orgId: string, stepId: GettingStartedStepId): boolean {
    return Boolean(this.read(orgId).completedSteps[stepId]);
  }

  setStepComplete(
    orgId: string,
    stepId: GettingStartedStepId,
    complete: boolean,
  ): void {
    const state = this.read(orgId);
    this.write(orgId, {
      ...state,
      completedSteps: {
        ...state.completedSteps,
        [stepId]: complete,
      },
    });
  }

  allStepsComplete(orgId: string): boolean {
    return GETTING_STARTED_STEP_IDS.every((id) =>
      this.isStepComplete(orgId, id),
    );
  }

  private storageKey(orgId: string): string {
    return `${STORAGE_PREFIX}${orgId}`;
  }

  private write(orgId: string, state: GettingStartedState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.storageKey(orgId), JSON.stringify(state));
  }
}
