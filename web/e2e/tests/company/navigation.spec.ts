import { test, expect } from '@playwright/test';
import { loginAsCompanyAdmin } from './helpers';

test.describe('Navigation', () => {
  test('Unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/autentificare/);
  });

  test('Sidebar navigation works - Dashboard to Comenzi', async ({ page }) => {
    await loginAsCompanyAdmin(page);

    const sidebar = page.locator('aside');
    await sidebar.getByText('Comenzi').click();

    await expect(page).toHaveURL('/comenzi');
    await expect(page.getByRole('heading', { name: 'Comenzi' })).toBeVisible();
  });

  test('Sidebar navigation works - Dashboard to Echipa mea', async ({ page }) => {
    await loginAsCompanyAdmin(page);

    const sidebar = page.locator('aside');
    await sidebar.getByText('Echipa mea').click();

    await expect(page).toHaveURL('/echipa');
    await expect(page.getByRole('heading', { name: 'Echipa mea' })).toBeVisible();
  });

  test('Sidebar navigation works - Dashboard to Setari', async ({ page }) => {
    await loginAsCompanyAdmin(page);

    const sidebar = page.locator('aside');
    await sidebar.getByText('Setari').click();

    await expect(page).toHaveURL('/setari');
  });

  test('Sidebar shows user info when authenticated', async ({ page }) => {
    await loginAsCompanyAdmin(page);

    const sidebar = page.locator('aside');
    // Should show user email
    await expect(
      sidebar.getByText('company-admin@go2fix.ro'),
    ).toBeVisible();
  });

  test('Unknown routes redirect to dashboard', async ({ page }) => {
    await loginAsCompanyAdmin(page);
    await page.goto('/some-unknown-route');

    await expect(page).toHaveURL('/');
  });
});
