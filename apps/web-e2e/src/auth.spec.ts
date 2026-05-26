import { test, expect } from '@playwright/test';

import {
  createWorkspaceViaOnboarding,
  registerUser,
  signInUser,
  signOutViaMenu,
  uniqueEmail,
} from './web.helpers';

test.describe('auth (Supabase) @web', () => {
  test('register shows validation errors on empty submit', async ({ page }) => {
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

  test('forgot password shows success after submit', async ({ page }) => {
    const email = uniqueEmail('auth-forgot');
    await registerUser(page, email);
    await createWorkspaceViaOnboarding(page, `Forgot ${Date.now()}`);
    await signOutViaMenu(page);

    await page.goto('/auth/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(
      page.getByText(
        `If an account exists for ${email}, you will receive instructions shortly.`,
      ),
    ).toBeVisible();
  });

  test('change password while signed in', async ({ page }) => {
    const email = uniqueEmail('auth-chpass');
    const oldPassword = 'password123';
    const newPassword = 'newpassword456';
    await registerUser(page, email, oldPassword);
    await createWorkspaceViaOnboarding(page, `ChPass ${Date.now()}`);

    await page.goto('/account/security');
    await page.getByPlaceholder('Current password').fill(oldPassword);
    await page.getByPlaceholder('New password').fill(newPassword);
    await page.getByPlaceholder('Confirm new password').fill(newPassword);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Password updated.')).toBeVisible();

    await signOutViaMenu(page);
    await signInUser(page, email, newPassword);
    await expect(page).not.toHaveURL(/\/auth\/login$/);
  });

  test('login rejects wrong password', async ({ page }) => {
    const email = uniqueEmail('auth-wrong-pass');
    await registerUser(page, email);
    await createWorkspaceViaOnboarding(page, `Wrong Pass ${Date.now()}`);
    await signOutViaMenu(page);

    await signInUser(page, email, 'not-the-password');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});
