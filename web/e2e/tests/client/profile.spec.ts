import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Profile page', () => {
  const testEmail = `e2e-profile-${Date.now()}@go2fix.ro`;

  test('Shows user info after login', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    await expect(
      page.getByRole('heading', { name: 'Profilul meu' }),
    ).toBeVisible();

    // Should display the user email
    await expect(page.getByText(testEmail)).toBeVisible();

    // Personal info section should be visible
    await expect(
      page.getByText('Informatii personale'),
    ).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel('Nume complet')).toBeVisible();
    await expect(page.getByLabel('Numar de telefon')).toBeVisible();
    await expect(page.getByLabel('Limba preferata')).toBeVisible();
  });

  test('Can edit name and phone', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    await expect(
      page.getByRole('heading', { name: 'Profilul meu' }),
    ).toBeVisible();

    // Clear and fill the name field
    const nameInput = page.getByLabel('Nume complet');
    await nameInput.clear();
    await nameInput.fill('Test User E2E');

    // Fill in the phone field
    const phoneInput = page.getByLabel('Numar de telefon');
    await phoneInput.clear();
    await phoneInput.fill('+40 711 222 333');

    // The "Salveaza modificarile" button should be present
    const saveButton = page.getByRole('button', {
      name: /Salveaza modificarile/i,
    });
    await expect(saveButton).toBeVisible();
  });

  test('Can save changes and shows success message', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    await expect(
      page.getByRole('heading', { name: 'Profilul meu' }),
    ).toBeVisible();

    // Edit the name to trigger the dirty state
    const nameInput = page.getByLabel('Nume complet');
    await nameInput.clear();
    await nameInput.fill('Updated E2E User');

    // Click save
    const saveButton = page.getByRole('button', {
      name: /Salveaza modificarile/i,
    });
    await saveButton.click();

    // Should show "Salvat cu succes" confirmation message
    await expect(page.getByText('Salvat cu succes')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Saved addresses section is visible', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    await expect(page.getByText('Adresele mele')).toBeVisible();

    // Either shows saved addresses or the "no addresses" empty state
    const emptyState = page.getByText('Nu ai nicio adresa salvata');
    const addressItems = page.locator('.rounded-xl.bg-gray-50');

    await expect(
      emptyState.or(addressItems.first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Deconectare section is visible', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    // The Deconectare card should be visible
    await expect(
      page.getByRole('heading', { name: 'Deconectare' }),
    ).toBeVisible();

    await expect(
      page.getByText('Te vei deconecta din contul tau.'),
    ).toBeVisible();

    await expect(
      page.getByRole('main').getByRole('button', { name: /Deconectare/i }),
    ).toBeVisible();
  });

  test('Logout button works and redirects to home', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/profil');

    // Click the Deconectare button in the profile page card
    // (Not the header one - get the one inside the profile page content)
    const logoutButton = page
      .locator('main, [class*="py-10"]')
      .getByRole('button', { name: /Deconectare/i });
    await logoutButton.click();

    // Should redirect to home or login page
    await page.waitForURL((url) => !url.pathname.includes('/profil'), {
      timeout: 5_000,
    });

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();

    // Header should show "Autentificare" link (not authenticated)
    const header = page.locator('header');
    await expect(
      header.getByRole('link', { name: 'Autentificare' }),
    ).toBeVisible();
  });

  test('Profile page redirects to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/profil');

    await expect(page).toHaveURL(/\/autentificare/);
  });
});
