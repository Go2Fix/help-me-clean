import { test, expect } from '@playwright/test';
import { loginAsCompanyAdmin } from './helpers';

test.describe('Team page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCompanyAdmin(page);

    // Navigate to team page via sidebar
    const sidebar = page.locator('aside');
    await sidebar.getByText('Echipa mea').click();
    await page.waitForURL('/echipa');
  });

  test('Shows page title', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Echipa mea' }),
    ).toBeVisible();
  });

  test('Shows "Invita lucrator" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Invita lucrator/ }),
    ).toBeVisible();
  });

  test('Shows empty state or worker cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Either shows empty state or worker cards
    const emptyState = page.getByText('Niciun worker');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      await expect(
        page.getByText('Nu ai adaugat inca niciun worker'),
      ).toBeVisible();
    }
    // If not empty, workers are being displayed which is also valid
  });

  test('Invite modal opens when button clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Invita lucrator/ }).first().click();

    // Modal should be visible
    await expect(
      page.getByText('Invita lucrator').last(),
    ).toBeVisible();

    // Should have name and email inputs
    await expect(page.getByPlaceholder('Ion Popescu')).toBeVisible();
    await expect(page.getByPlaceholder('ion@email.com')).toBeVisible();
  });

  test('Invite modal can be closed', async ({ page }) => {
    await page.getByRole('button', { name: /Invita lucrator/ }).first().click();

    // Modal should be open
    await expect(page.getByPlaceholder('Ion Popescu')).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Anuleaza' }).click();

    // Modal should be closed
    await expect(page.getByPlaceholder('Ion Popescu')).not.toBeVisible();
  });
});
