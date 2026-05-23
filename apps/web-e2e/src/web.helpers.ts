import { expect, type Page } from '@playwright/test';

export async function registerUser(
  page: Page,
  email: string,
  password = 'password123',
): Promise<void> {
  await page.goto('/auth/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.locator('#register-accept-terms').click();
  await page.locator('#register-accept-privacy').click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

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
    page.getByRole('heading', { name: 'Welcome to your demo workspace' }),
  ).toBeVisible();
}

export async function openWorkspaceSwitcher(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Switch workspace' }).click();
}
