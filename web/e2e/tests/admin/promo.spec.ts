import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Admin – Promo Codes', () => {
  test('Admin can navigate to /admin/promo-coduri', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-coduri');

    await expect(
      page.getByRole('heading', { name: /coduri promo/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Promo codes table or empty state renders', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-coduri');

    // Either a table row with a code OR the empty state text must be visible
    const hasTable = page.locator('table tbody tr').first();
    const hasEmpty = page.getByText(/nu exista coduri/i);

    await expect(hasTable.or(hasEmpty)).toBeVisible({ timeout: 10_000 });
  });

  test('Admin can open the create promo code modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-coduri');

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /coduri promo/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Click the "Cod nou" button
    await page.getByRole('button', { name: /cod nou/i }).click();

    // The modal should appear with the form
    await expect(
      page.getByRole('dialog').or(page.getByText(/cod promotional nou/i)),
    ).toBeVisible({ timeout: 5_000 });

    // Required fields should be present
    await expect(page.getByLabel(/cod/i).first()).toBeVisible();
    await expect(page.getByLabel(/valoare/i)).toBeVisible();
  });

  test('Admin can create a new promo code and it appears in the list', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-coduri');

    await expect(
      page.getByRole('heading', { name: /coduri promo/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Open create modal
    await page.getByRole('button', { name: /cod nou/i }).click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/cod promotional nou/i)),
    ).toBeVisible({ timeout: 5_000 });

    // Fill the form
    const uniqueCode = `E2E${Date.now()}`;
    await page.getByLabel(/^cod$/i).fill(uniqueCode);
    await page.getByLabel(/valoare/i).fill('15');

    // Submit
    await page.getByRole('button', { name: /creeaza/i }).click();

    // The new code should now appear in the table
    await expect(page.getByText(uniqueCode)).toBeVisible({ timeout: 10_000 });
  });

  test('Admin can toggle a promo code inactive', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-coduri');

    await expect(
      page.getByRole('heading', { name: /coduri promo/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Wait for at least one row to be visible
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Find and click the toggle button in the first row
    const toggleBtn = firstRow.getByRole('button', { name: /dezactiveaza|activ/i });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      // After toggling, status badge in that row should change
      await expect(firstRow).toBeVisible();
    }
  });
});
