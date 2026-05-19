import { Injectable, signal } from '@angular/core';
import type { CommercialPlanId } from '@oequ/ports';

export type PaywallResult = 'success' | 'dismissed';

export interface PaywallOpenOptions {
  readonly suggestedPlanId?: CommercialPlanId;
}

@Injectable({ providedIn: 'root' })
export class PaywallDialogService {
  readonly open = signal(false);
  readonly suggestedPlanId = signal<CommercialPlanId | null>(null);

  private pendingResolve: ((result: PaywallResult) => void) | null = null;

  requestOpen(options?: PaywallOpenOptions): Promise<PaywallResult> {
    this.suggestedPlanId.set(options?.suggestedPlanId ?? null);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.open.set(true);
    });
  }

  completeSuccess(): void {
    this.finish('success');
  }

  close(): void {
    this.finish('dismissed');
  }

  private finish(result: PaywallResult): void {
    this.open.set(false);
    this.suggestedPlanId.set(null);
    this.pendingResolve?.(result);
    this.pendingResolve = null;
  }
}
