import { test, expect } from '@playwright/test';

import {
  completeActivationViaOnboarding,
  createWorkspaceViaOnboarding,
  DEMO_ACTIVATION_HEADING,
  resetMockDemoState,
  setZeroOrganizations,
  signInAsDemo,
  waitForMembersPageLoaded,
} from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('onboarding', () => {
  test('redirects to onboarding when user has no workspaces', async ({
    page,
  }) => {
    await setZeroOrganizations(page);
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: 'Create your workspace' }),
    ).toBeVisible();
  });

  test('create workspace stays on activation UI', async ({ page }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await createWorkspaceViaOnboarding(page, 'Activation Test Co');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: DEMO_ACTIVATION_HEADING }),
    ).toBeVisible();
  });

  test('completing activation navigates to metrics', async ({ page }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await createWorkspaceViaOnboarding(page, 'Activation Complete Co');
    await completeActivationViaOnboarding(page);
    await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
  });

  test('workspace root redirects to onboarding while activation pending', async ({
    page,
  }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await createWorkspaceViaOnboarding(page, 'Pending Root Co');
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: DEMO_ACTIVATION_HEADING }),
    ).toBeVisible();
  });

  test('demo sign-in lands on Parcel activation onboarding', async ({ page }) => {
    await signInAsDemo(page);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: DEMO_ACTIVATION_HEADING }),
    ).toBeVisible();
  });

  test('pre-activated workspace can open onboarding from sidebar', async ({
    page,
  }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/metrics');
    await page.getByRole('link', { name: 'Onboarding' }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: DEMO_ACTIVATION_HEADING }),
    ).toBeVisible();
  });

  test('deep link to settings while activation pending is allowed', async ({
    page,
  }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await createWorkspaceViaOnboarding(page, 'Deep Link Co');
    await page.goto('/workspace/settings/members');
    await expect(page).toHaveURL(/\/workspace\/settings\/members$/);
    await waitForMembersPageLoaded(page);
  });
});
