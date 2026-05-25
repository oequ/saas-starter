import { describe, expect, it } from 'vitest';

import type { BillingSummary } from './models/billing.model';
import {
  checkoutBillableSeatCount,
  needsStripeSeatBumpBeforeInvite,
  seatsLimitFromStripeQuantity,
  targetSeatQuantityForInvite,
  TEAM_PLAN_MAX_SEATS,
} from './billing.utils';

function summary(
  partial: Partial<BillingSummary> & Pick<BillingSummary, 'seatsUsed' | 'seatsLimit'>,
): BillingSummary {
  return {
    organizationId: 'org-1',
    planId: partial.planId ?? 'team',
    planName: 'Team',
    status: 'active',
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    seatsUsed: partial.seatsUsed,
    seatsLimit: partial.seatsLimit,
    meters: [],
    ...partial,
  };
}

describe('checkoutBillableSeatCount', () => {
  it('returns 1 for Pro (flat price)', () => {
    expect(checkoutBillableSeatCount('pro', 7)).toBe(1);
  });

  it('bills Team by seats used, min 1', () => {
    expect(checkoutBillableSeatCount('team', 0)).toBe(1);
    expect(checkoutBillableSeatCount('team', 4)).toBe(4);
  });

  it('caps Team quantity at catalog max', () => {
    expect(checkoutBillableSeatCount('team', 99, TEAM_PLAN_MAX_SEATS)).toBe(
      TEAM_PLAN_MAX_SEATS,
    );
  });
});

describe('seatsLimitFromStripeQuantity', () => {
  it('returns null for Pro', () => {
    expect(seatsLimitFromStripeQuantity('pro', 5)).toBeNull();
  });

  it('maps Team subscription quantity to seats_limit', () => {
    expect(seatsLimitFromStripeQuantity('team', 12)).toBe(12);
    expect(seatsLimitFromStripeQuantity('team', 200)).toBe(TEAM_PLAN_MAX_SEATS);
  });
});

describe('needsStripeSeatBumpBeforeInvite', () => {
  it('is false for mock provider', () => {
    expect(
      needsStripeSeatBumpBeforeInvite(
        summary({ seatsUsed: 5, seatsLimit: 5 }),
        'mock',
      ),
    ).toBe(false);
  });

  it('is true for Team stripe when at capacity', () => {
    expect(
      needsStripeSeatBumpBeforeInvite(
        summary({ planId: 'team', seatsUsed: 3, seatsLimit: 3 }),
        'stripe',
      ),
    ).toBe(true);
  });

  it('is false when seats remain', () => {
    expect(
      needsStripeSeatBumpBeforeInvite(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 5 }),
        'stripe',
      ),
    ).toBe(false);
  });
});

describe('targetSeatQuantityForInvite', () => {
  it('returns seats_used + 1 for Team', () => {
    expect(
      targetSeatQuantityForInvite(
        summary({ planId: 'team', seatsUsed: 5, seatsLimit: 5 }),
      ),
    ).toBe(6);
  });
});
