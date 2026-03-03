import { test, expect, type Page } from '@playwright/test';
import { getFutureDate, uniqueEmail } from './helpers';

// ─── Helper: navigate to summary step ─────────────────────────────────────────

async function navigateToSummaryStep(page: Page) {
  await page.goto('/rezervare?service=STANDARD_CLEANING');
  await expect(page.getByText('Detalii proprietate')).toBeVisible({ timeout: 10_000 });

  // Step 1 → Step 2
  await page.getByRole('button', { name: /Continua/i }).click();
  await expect(page.getByText('Alege data si ora')).toBeVisible();
  await page.locator('input[type="date"]').fill(getFutureDate(5));
  await page.locator('select').selectOption('10:00');

  // Step 2 → Step 3
  await page.getByRole('button', { name: /Continua/i }).click();
  await expect(page.getByText('Adresa de curatenie')).toBeVisible();
  await page.getByLabel('Strada si numar').fill('Str. Victoriei nr. 42');
  await page.getByLabel('Oras').fill('Bucuresti');
  await page.locator('select').last().selectOption('Bucuresti');

  // Step 3 → Step 4 (summary)
  await page.getByRole('button', { name: /Continua/i }).click();
  await expect(page.getByText('Sumar si confirmare')).toBeVisible();
}

test.describe('Booking wizard flow', () => {
  test('Full booking flow as guest (not logged in)', async ({ page }) => {
    await page.goto('/rezervare');

    await expect(
      page.getByRole('heading', { name: /Rezerva o curatenie/i }),
    ).toBeVisible();

    // ── Step 0: Select a service ──────────────────────────────────────────────
    await expect(
      page.getByText('Alege tipul de serviciu'),
    ).toBeVisible({ timeout: 10_000 });

    // Wait for services to load, then click on the first service card
    const serviceCards = page.locator(
      '.grid .cursor-pointer',
    );
    await expect(serviceCards.first()).toBeVisible({ timeout: 10_000 });
    await serviceCards.first().click();

    // The "Continua" button should become enabled
    const continueButton = page.getByRole('button', { name: /Continua/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // ── Step 1: Property Details ──────────────────────────────────────────────
    await expect(
      page.getByText('Detalii proprietate'),
    ).toBeVisible();

    // The property type select should default to "Apartament"
    await expect(page.locator('select')).toHaveValue('Apartament');

    // Rooms and bathrooms default to 2 and 1 respectively
    await expect(page.getByText('Numar camere')).toBeVisible();
    await expect(page.getByText('Numar bai')).toBeVisible();

    // Increase rooms by clicking the "+" button for rooms
    // Rooms +/- are the first counter, bathrooms the second
    await continueButton.click();

    // ── Step 2: Schedule ──────────────────────────────────────────────────────
    await expect(page.getByText('Alege data si ora')).toBeVisible();

    // Fill in date (a future date)
    const futureDate = getFutureDate(5);
    await page.locator('input[type="date"]').fill(futureDate);

    // Select a time slot
    await page.locator('select').selectOption('10:00');

    await continueButton.click();

    // ── Step 3: Address ───────────────────────────────────────────────────────
    await expect(page.getByText('Adresa de curatenie')).toBeVisible();

    // Fill in address fields
    await page.getByLabel('Strada si numar').fill('Str. Victoriei nr. 42');
    await page.getByLabel('Oras').fill('Bucuresti');

    // Select county from the dropdown
    const countySelect = page.locator('select').last();
    await countySelect.selectOption('Bucuresti');

    await continueButton.click();

    // ── Step 4: Summary and Guest Info ────────────────────────────────────────
    await expect(page.getByText('Sumar si confirmare')).toBeVisible();

    // Since we are not logged in, guest contact fields should be visible
    await expect(
      page.getByText('Datele tale de contact'),
    ).toBeVisible();

    // Fill guest fields
    const guestEmail = uniqueEmail();
    await page.getByLabel('Nume complet').fill('Ion Popescu E2E');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Telefon').fill('+40 712 345 678');

    // Submit the booking
    const confirmButton = page.getByRole('button', {
      name: /Confirma rezervarea/i,
    });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // ── Success Screen ────────────────────────────────────────────────────────
    await expect(
      page.getByText('Rezervare confirmata!'),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText('Comanda ta a fost plasata cu succes.'),
    ).toBeVisible();

    // A reference code should be displayed (alphanumeric)
    const refCodeEl = page.locator('.font-mono');
    await expect(refCodeEl).toBeVisible();
    const refCode = await refCodeEl.textContent();
    expect(refCode).toBeTruthy();
    expect(refCode!.trim().length).toBeGreaterThanOrEqual(4);

    // "Inapoi la pagina principala" button should be visible
    await expect(
      page.getByRole('button', { name: /Inapoi la pagina principala/i }),
    ).toBeVisible();
  });

  test('Pre-selected service via URL param skips step 0', async ({
    page,
  }) => {
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Should start at step 1 (details) since the service is pre-selected
    await expect(page.getByText('Detalii proprietate')).toBeVisible({
      timeout: 10_000,
    });

    // "Alege tipul de serviciu" (step 0) should NOT be visible
    await expect(
      page.getByText('Alege tipul de serviciu'),
    ).not.toBeVisible();
  });

  test('Step navigation - back button returns to previous step', async ({
    page,
  }) => {
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Start at step 1 (details)
    await expect(page.getByText('Detalii proprietate')).toBeVisible({
      timeout: 10_000,
    });

    // Click continue to go to step 2
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page.getByText('Alege data si ora')).toBeVisible();

    // Click back to return to step 1
    await page.getByRole('button', { name: /Inapoi/i }).click();
    await expect(page.getByText('Detalii proprietate')).toBeVisible();
  });

  test('Continue button is disabled when required fields are empty', async ({
    page,
  }) => {
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Navigate to step 2 (schedule)
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page.getByText('Alege data si ora')).toBeVisible();

    // Continue should be disabled because date and time are not filled
    const continueButton = page.getByRole('button', { name: /Continua/i });
    await expect(continueButton).toBeDisabled();

    // Fill date only
    await page.locator('input[type="date"]').fill(getFutureDate(3));

    // Still disabled because time is not selected
    await expect(continueButton).toBeDisabled();

    // Select a time
    await page.locator('select').selectOption('09:00');

    // Now it should be enabled
    await expect(continueButton).toBeEnabled();
  });

  test('Address step requires street, city, and county', async ({
    page,
  }) => {
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Step 1: details - just continue (defaults are valid)
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 2: schedule
    await page.locator('input[type="date"]').fill(getFutureDate(3));
    await page.locator('select').selectOption('10:00');
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 3: address
    await expect(page.getByText('Adresa de curatenie')).toBeVisible();

    const continueButton = page.getByRole('button', { name: /Continua/i });

    // Continue should be disabled initially (empty address)
    await expect(continueButton).toBeDisabled();

    // Fill street only
    await page.getByLabel('Strada si numar').fill('Str. Libertatii 10');
    await expect(continueButton).toBeDisabled();

    // Fill city
    await page.getByLabel('Oras').fill('Cluj-Napoca');
    await expect(continueButton).toBeDisabled();

    // Select county
    await page.locator('select').last().selectOption('Cluj');

    // Now all required fields are filled
    await expect(continueButton).toBeEnabled();
  });

  test('Summary step shows correct details', async ({ page }) => {
    await page.goto('/rezervare?service=STANDARD_CLEANING');

    // Step 1: details
    await expect(page.getByText('Detalii proprietate')).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 2: schedule
    const futureDate = getFutureDate(7);
    await page.locator('input[type="date"]').fill(futureDate);
    await page.locator('select').selectOption('14:00');
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 3: address
    await page.getByLabel('Strada si numar').fill('Bd. Unirii nr. 5');
    await page.getByLabel('Oras').fill('Timisoara');
    await page.locator('select').last().selectOption('Timis');
    await page.getByRole('button', { name: /Continua/i }).click();

    // Step 4: summary
    await expect(page.getByText('Sumar si confirmare')).toBeVisible();

    // Verify address appears in summary
    await expect(page.getByText('Bd. Unirii nr. 5')).toBeVisible();
    await expect(page.getByText('Timisoara')).toBeVisible();

    // Verify schedule
    await expect(page.getByText(futureDate)).toBeVisible();
    await expect(page.getByText('14:00')).toBeVisible();

    // Verify property details
    await expect(page.getByText('Apartament')).toBeVisible();

    // Verify price estimate section exists
    await expect(page.getByText('Estimare pret')).toBeVisible();
  });
});

// ─── Promo code scenarios ──────────────────────────────────────────────────────

test.describe('Booking wizard – promo code', () => {
  test('Promo code input is visible in summary step', async ({ page }) => {
    await navigateToSummaryStep(page);

    // The promo code field should be visible in the summary/payment step
    await expect(
      page.getByPlaceholder(/cod promo/i).or(page.getByLabel(/cod promo/i)),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Invalid promo code shows validation error', async ({ page }) => {
    await navigateToSummaryStep(page);

    // Type an invalid code and apply it
    const promoInput = page.getByPlaceholder(/cod promo/i).or(page.getByLabel(/cod promo/i));
    await promoInput.fill('INVALID999');
    await page.getByRole('button', { name: /aplica|verifica/i }).click();

    // An error message should appear
    await expect(
      page.getByText(/invalid|expirat|nu exista|negasit/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Valid promo code reflects discount in price summary', async ({
    page,
  }) => {
    await navigateToSummaryStep(page);

    // Capture the initial estimated price
    const priceEl = page.getByText(/RON/i).first();
    const initialPrice = await priceEl.textContent();

    // Apply a valid promo code (TEST10 is seeded in dev environment)
    const promoInput = page.getByPlaceholder(/cod promo/i).or(page.getByLabel(/cod promo/i));
    await promoInput.fill('TEST10');
    await page.getByRole('button', { name: /aplica|verifica/i }).click();

    // Success: discount text should appear
    await expect(
      page.getByText(/reducere|discount|aplicat/i),
    ).toBeVisible({ timeout: 10_000 });

    // Price shown should differ from original (discount applied)
    const discountedPrice = await priceEl.textContent();
    expect(discountedPrice).not.toBe(initialPrice);
  });
});
