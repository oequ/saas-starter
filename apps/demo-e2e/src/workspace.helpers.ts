import { expect, type Page } from '@playwright/test';

/** Default mock workspace (Parcel, Team plan). */
export const PARCEL_WORKSPACE = 'Parcel';

/** Trialing workspace for upgrade funnel and trial banner. */
export const NOVA_WORKSPACE = 'Nova';

/** Free-plan workspace for usage limits demo. */
export const LUMEN_WORKSPACE = 'Lumen';

const WORKSPACE_SLUG_BY_NAME: Record<string, string> = {
  [PARCEL_WORKSPACE]: 'parcel',
  [NOVA_WORKSPACE]: 'nova',
  [LUMEN_WORKSPACE]: 'lumen',
};

export async function signInAsDemo(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function resetMockDemoState(page: Page): Promise<void> {
  await signInAsDemo(page);
  await page.evaluate(() => window.__oequResetMock?.());
  await page.reload();
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/workspace\/settings\/general$/);
}

export async function setZeroOrganizations(page: Page): Promise<void> {
  await signInAsDemo(page);
  await page.goto('/account/profile');
  await page.evaluate(() => {
    sessionStorage.setItem('oequ-demo-zero-orgs', '1');
    window.__oequSetZeroOrgs?.();
  });
  await page.reload();
  await page.waitForFunction(() => window.__oequOrganizationCount?.() === 0);
}

export async function switchWorkspace(
  page: Page,
  workspaceName: string,
): Promise<void> {
  const slug = WORKSPACE_SLUG_BY_NAME[workspaceName] ?? workspaceName;
  await page.evaluate(async (workspaceSlug) => {
    await window.__oequSelectWorkspace?.(workspaceSlug);
  }, slug);
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    workspaceName,
  );
}

export async function waitForBillingLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Billing', level: 1 })).toBeVisible();
  await page.getByText('Loading subscription…').waitFor({ state: 'hidden' });
}

export async function waitForUsageLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Usage', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Usage Summary' })).toBeVisible();
}

export async function waitForIntegrationsLoaded(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Integrations', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Supabase', level: 2 })).toBeVisible();
}

export async function waitForMembersPageLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
}

/** Creates a workspace from the zero-org onboarding form and waits for activation UI. */
export async function createWorkspaceViaOnboarding(
  page: Page,
  workspaceName: string,
): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Create your workspace' }),
  ).toBeVisible();
  await page.getByLabel('Workspace name').fill(workspaceName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(
    page.getByRole('heading', { name: DEMO_ACTIVATION_HEADING }),
  ).toBeVisible();
}

export const DEMO_ACTIVATION_HEADING = 'Try the demo workspace';

/** Mock activation: run metrics retrospective simulation, land on Metrics. */
export async function completeActivationViaOnboarding(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Simulate send history' }).click();
  await expect(
    page.getByRole('heading', { name: 'Simulate send history' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await expect(page).toHaveURL(/\/workspace\/metrics$/);
}
