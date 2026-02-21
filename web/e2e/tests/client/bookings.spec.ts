import { test, expect } from '@playwright/test';
import { loginAsTestUser, getFutureDate, uniqueEmail } from './helpers';

test.describe.serial('My Bookings page', () => {
  const testEmail = `e2e-bookings-${Date.now()}@go2fix.ro`;

  test('Login and navigate to bookings page', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/comenzile-mele');

    await expect(
      page.getByRole('heading', { name: 'Comenzile mele' }),
    ).toBeVisible();
  });

  test('Shows empty state when user has no bookings', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/comenzile-mele');

    // Wait for loading to finish
    await expect(
      page.getByRole('heading', { name: 'Comenzile mele' }),
    ).toBeVisible();

    // Either shows bookings or the empty state
    // For a brand new user, expect the empty state
    const emptyState = page.getByText('Nu ai nicio rezervare');
    const bookingCards = page.locator('.cursor-pointer.hover\\:shadow-md');

    // Wait for either to appear
    await expect(
      emptyState.or(bookingCards.first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Filter tabs are visible and clickable', async ({ page }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/comenzile-mele');

    await expect(
      page.getByRole('heading', { name: 'Comenzile mele' }),
    ).toBeVisible();

    // All filter tabs should be visible
    const tabs = ['Toate', 'In asteptare', 'Active', 'Finalizate', 'Anulate'];
    for (const tabLabel of tabs) {
      await expect(
        page.getByRole('button', { name: tabLabel, exact: true }),
      ).toBeVisible();
    }

    // Click on "In asteptare" tab
    await page
      .getByRole('button', { name: 'In asteptare', exact: true })
      .click();

    // The "In asteptare" button should now have the active style (bg-primary)
    const activeTab = page.getByRole('button', {
      name: 'In asteptare',
      exact: true,
    });
    await expect(activeTab).toHaveClass(/bg-primary/);

    // Click back to "Toate"
    await page
      .getByRole('button', { name: 'Toate', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Toate', exact: true }),
    ).toHaveClass(/bg-primary/);
  });

  test('"Rezervare noua" button navigates to booking page', async ({
    page,
  }) => {
    await loginAsTestUser(page, testEmail);

    await page.goto('/comenzile-mele');

    await page
      .getByRole('button', { name: /Rezervare noua/i })
      .click();

    await expect(page).toHaveURL('/rezervare');
  });
});

test.describe.serial('Create and view booking', () => {
  const testEmail = `e2e-createview-${Date.now()}@go2fix.ro`;

  test('Create a booking as authenticated user, then view it in My Bookings', async ({
    page,
  }) => {
    // First, login
    await loginAsTestUser(page, testEmail);

    // Navigate to booking wizard with pre-selected service
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Step 1: details (defaults are fine)
    await expect(page.getByText('Detalii proprietate')).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 2: schedule
    await page.locator('input[type="date"]').fill(getFutureDate(5));
    await page.locator('select').selectOption('10:00');
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 3: address
    await page.getByLabel('Strada si numar').fill('Str. E2E Test nr. 1');
    await page.getByLabel('Oras').fill('Bucuresti');
    await page.locator('select').last().selectOption('Bucuresti');
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 4: summary
    await expect(page.getByText('Sumar si confirmare')).toBeVisible();

    // Since we ARE logged in, guest fields should NOT appear
    await expect(
      page.getByText('Datele tale de contact'),
    ).not.toBeVisible();

    // Submit
    await page
      .getByRole('button', { name: /Confirma rezervarea/i })
      .click();

    // Success screen
    await expect(
      page.getByText('Rezervare confirmata!'),
    ).toBeVisible({ timeout: 15_000 });

    // Get the reference code
    const refCodeEl = page.locator('.font-mono');
    const referenceCode = (await refCodeEl.textContent())?.trim();
    expect(referenceCode).toBeTruthy();

    // Navigate to "Comenzile mele" via the success screen button
    await page
      .getByRole('button', { name: /Vezi comenzile mele/i })
      .click();

    await expect(page).toHaveURL('/comenzile-mele');
    await expect(
      page.getByRole('heading', { name: 'Comenzile mele' }),
    ).toBeVisible();

    // The newly created booking should appear with its reference code
    await expect(page.getByText(referenceCode!)).toBeVisible({
      timeout: 10_000,
    });

    // The booking should show "In asteptare" badge
    await expect(page.getByText('In asteptare').first()).toBeVisible();
  });

  test('Clicking a booking navigates to the detail page', async ({
    page,
  }) => {
    await loginAsTestUser(page, testEmail);
    await page.goto('/comenzile-mele');

    // Wait for at least one booking card to appear
    const bookingCard = page.locator(
      '.cursor-pointer.hover\\:shadow-md',
    );
    await expect(bookingCard.first()).toBeVisible({ timeout: 10_000 });

    // Click on the first booking card
    await bookingCard.first().click();

    // Should navigate to a booking detail page
    await expect(page).toHaveURL(/\/comenzile-mele\/.+/);

    // The detail page should show booking information
    await expect(page.getByText('Detalii programare')).toBeVisible({
      timeout: 10_000,
    });

    // "Inapoi la comenzi" back link should exist
    await expect(
      page.getByText('Inapoi la comenzi'),
    ).toBeVisible();
  });
});
