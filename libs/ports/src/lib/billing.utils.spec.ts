import { describe, expect, it } from 'vitest';

import type { BillingSummary } from './models/billing.model';
import {
  billingStatusBanner,
  isAllowedStripeRedirectUrl,
  isBillingPaymentBlocked,
  checkoutBillableSeatCount,
  effectiveTeamSeatsLimitFromSnapshot,
  needsPerSeatSeatSyncAfterRemove,
  needsPerSeatSeatSyncBeforeInvite,
  needsStripeSeatBumpBeforeInvite,
  needsStripeSeatChargeConfirmBeforeInvite,
  seatsLimitFromStripeQuantity,
  targetSeatQuantityAfterMemberRemoved,
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

describe('isAllowedStripeRedirectUrl', () => {
  it('accepts checkout.stripe.com', () => {
    expect(
      isAllowedStripeRedirectUrl('https://checkout.stripe.com/c/pay_abc123'),
    ).toBe(true);
  });

  it('accepts billing.stripe.com', () => {
    expect(
      isAllowedStripeRedirectUrl('https://billing.stripe.com/p/session_xyz'),
    ).toBe(true);
  });

  it('rejects non-stripe domains', () => {
    expect(isAllowedStripeRedirectUrl('https://evil.com/checkout')).toBe(false);
    expect(isAllowedStripeRedirectUrl('https://stripe.com.evil.com')).toBe(false);
  });

  it('rejects http stripe URLs', () => {
    expect(
      isAllowedStripeRedirectUrl('http://checkout.stripe.com/pay'),
    ).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(isAllowedStripeRedirectUrl('')).toBe(false);
    expect(isAllowedStripeRedirectUrl('not a url')).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(isAllowedStripeRedirectUrl('javascript:alert(1)')).toBe(false);
  });
});

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

describe('effectiveTeamSeatsLimitFromSnapshot', () => {
  it('uses seats_used when Postgres still has catalog Team cap', () => {
    expect(effectiveTeamSeatsLimitFromSnapshot('team', 1, 50)).toBe(1);
  });

  it('keeps explicit subscription quantity below catalog max', () => {
    expect(effectiveTeamSeatsLimitFromSnapshot('team', 2, 3)).toBe(3);
  });

  it('returns Postgres limit for Pro', () => {
    expect(effectiveTeamSeatsLimitFromSnapshot('pro', 5, 10)).toBe(10);
  });
});

describe('needsPerSeatSeatSyncBeforeInvite', () => {
  it('is true for Team when at capacity', () => {
    expect(
      needsPerSeatSeatSyncBeforeInvite(
        summary({ planId: 'team', seatsUsed: 3, seatsLimit: 3 }),
      ),
    ).toBe(true);
  });

  it('is false when seats remain', () => {
    expect(
      needsPerSeatSeatSyncBeforeInvite(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 5 }),
      ),
    ).toBe(false);
  });

  it('is false for Pro', () => {
    expect(
      needsPerSeatSeatSyncBeforeInvite(
        summary({ planId: 'pro', seatsUsed: 10, seatsLimit: 10 }),
      ),
    ).toBe(false);
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
});

describe('needsStripeSeatChargeConfirmBeforeInvite', () => {
  it('matches stripe bump gate', () => {
    const atCap = summary({ planId: 'team', seatsUsed: 2, seatsLimit: 2 });
    expect(needsStripeSeatChargeConfirmBeforeInvite(atCap, 'stripe')).toBe(true);
    expect(needsStripeSeatChargeConfirmBeforeInvite(atCap, 'mock')).toBe(false);
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

describe('targetSeatQuantityAfterMemberRemoved', () => {
  it('returns seats_used for Team after remove', () => {
    expect(
      targetSeatQuantityAfterMemberRemoved(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 3 }),
      ),
    ).toBe(2);
  });
});

describe('needsPerSeatSeatSyncAfterRemove', () => {
  it('is true when limit exceeds usage after remove', () => {
    expect(
      needsPerSeatSeatSyncAfterRemove(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 3 }),
        'stripe',
      ),
    ).toBe(true);
    expect(
      needsPerSeatSeatSyncAfterRemove(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 3 }),
        'mock',
      ),
    ).toBe(true);
  });

  it('is false when limit matches usage', () => {
    expect(
      needsPerSeatSeatSyncAfterRemove(
        summary({ planId: 'team', seatsUsed: 2, seatsLimit: 2 }),
        'stripe',
      ),
    ).toBe(false);
  });

  it('is false for custom provider', () => {
    expect(
      needsPerSeatSeatSyncAfterRemove(
        summary({ planId: 'team', seatsUsed: 1, seatsLimit: 3 }),
        'custom',
      ),
    ).toBe(false);
  });
});

describe('isBillingPaymentBlocked', () => {
  it('returns true for past_due and unpaid', () => {
    expect(
      isBillingPaymentBlocked(
        summary({ status: 'past_due', seatsUsed: 1, seatsLimit: 3 }),
      ),
    ).toBe(true);
    expect(
      isBillingPaymentBlocked(
        summary({ status: 'unpaid', seatsUsed: 1, seatsLimit: 3 }),
      ),
    ).toBe(true);
  });

  it('returns false for active and when summary is missing', () => {
    expect(
      isBillingPaymentBlocked(
        summary({ status: 'active', seatsUsed: 1, seatsLimit: 3 }),
      ),
    ).toBe(false);
    expect(isBillingPaymentBlocked(null)).toBe(false);
    expect(isBillingPaymentBlocked(undefined)).toBe(false);
  });
});

describe('billingStatusBanner', () => {
  it('returns critical banner for past_due', () => {
    const banner = billingStatusBanner(
      summary({ status: 'past_due', seatsUsed: 1, seatsLimit: 3 }),
    );
    expect(banner).toEqual({
      tone: 'critical',
      messageKey: 'paywall.banner.past_due.message',
      messageParams: undefined,
      ctaLabelKey: 'paywall.banner.past_due.cta',
      ctaPath: '/workspace/settings/billing',
    });
  });

  it('returns null for active subscription', () => {
    expect(
      billingStatusBanner(
        summary({ status: 'active', seatsUsed: 1, seatsLimit: 3 }),
      ),
    ).toBeNull();
  });
});
