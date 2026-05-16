import { Injectable } from '@angular/core';
import {
  BILLING_PORT,
  type BillingPort,
  type BillingSummary,
  type OrganizationId,
  portOk,
  type PortResult,
} from '@oequ/ports';
import { BehaviorSubject, type Observable } from 'rxjs';

@Injectable()
export class MockBillingAdapter implements BillingPort {
  private readonly summarySubject = new BehaviorSubject<BillingSummary | null>({
    organizationId: '00000000-0000-4000-8000-000000000001',
    status: 'trialing',
    planId: 'starter',
    seatsUsed: 1,
    seatsLimit: 5,
  });

  readonly summary$: Observable<BillingSummary | null> =
    this.summarySubject.asObservable();

  async getSummary(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSummary>> {
    return portOk({
      organizationId,
      status: 'trialing',
      planId: 'starter',
      seatsUsed: 1,
      seatsLimit: 5,
    });
  }
}

export const MOCK_BILLING_PROVIDER = {
  provide: BILLING_PORT,
  useClass: MockBillingAdapter,
};
