import { type Page, expect } from '@playwright/test';

export async function loginAsAdmin(
  page: Page,
  email = 'admin@go2fix.ro',
): Promise<void> {
  await page.goto('/autentificare');
  await page.getByLabel('Adresa de email').fill(email);
  await page.getByRole('button', { name: 'Conecteaza-te' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/autentificare'), {
    timeout: 10_000,
  });
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
}
