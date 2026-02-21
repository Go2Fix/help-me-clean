import { type Page, expect } from '@playwright/test';

/**
 * Logs in as a company admin test user via the UI login page.
 * The company dashboard uses role COMPANY_ADMIN for dev auth.
 */
export async function loginAsCompanyAdmin(
  page: Page,
  email = 'company-admin@go2fix.ro',
): Promise<void> {
  await page.goto('/autentificare');
  await page.getByLabel('Adresa de email').fill(email);
  await page.getByRole('button', { name: 'Conecteaza-te' }).click();

  // Wait for the redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/autentificare'), {
    timeout: 10_000,
  });

  // Verify the token was stored
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
}

/**
 * Generates a unique email address for test isolation.
 */
export function uniqueEmail(): string {
  const ts = Date.now();
  return `company-e2e-${ts}@go2fix.ro`;
}
