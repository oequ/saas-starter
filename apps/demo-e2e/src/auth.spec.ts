import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

async function signOutViaMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
}

test.describe('auth', () => {
  test('signs out and signs back in with demo credentials', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/workspace\/settings\/general$/);

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in', level: 1 }),
    ).toBeVisible();

    await page.locator('#login-password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/workspace\/settings\/general$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Workspace settings',
    );
  });

  test('rejects invalid password', async ({ page }) => {
    await resetMockDemoState(page);
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.locator('#login-password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('redirects unauthenticated users from workspace to login', async ({
    page,
  }) => {
    await resetMockDemoState(page);
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('register', () => {
  test('creates account and opens onboarding', async ({ page }) => {
    await resetMockDemoState(page);
    await signOutViaMenu(page);

    await page.goto('/auth/register');
    await expect(
      page.getByRole('heading', { name: 'Sign up', level: 1 }),
    ).toBeVisible();

    const email = `new-${Date.now()}@example.com`;
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('password123');
    await page.locator('#register-accept-terms').click();
    await page.locator('#register-accept-privacy').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: 'Create your workspace' }),
    ).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await resetMockDemoState(page);
    await signOutViaMenu(page);

    await page.goto('/auth/register');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(
      page.getByText('Password must be at least 8 characters.'),
    ).toBeVisible();
    await expect(
      page.getByText('You must accept the Terms of Service.'),
    ).toBeVisible();
    await expect(
      page.getByText('You must accept the Privacy Policy.'),
    ).toBeVisible();
  });

  test('rejects duplicate demo email', async ({ page }) => {
    await resetMockDemoState(page);
    await signOutViaMenu(page);

    await page.goto('/auth/register');
    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('password123');
    await page.locator('#register-accept-terms').click();
    await page.locator('#register-accept-privacy').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(
      page.getByText('An account with this email already exists.'),
    ).toBeVisible();
  });

  test('redirects authenticated users away from register', async ({ page }) => {
    await resetMockDemoState(page);

    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/workspace/);
  });
});
