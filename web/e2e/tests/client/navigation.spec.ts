import { test, expect } from '@playwright/test';

test.describe('Navigation and page rendering', () => {
  test('Home page loads with hero text', async ({ page }) => {
    await page.goto('/');

    // The hero h1 contains "Curatenie profesionala" split across lines
    await expect(
      page.getByRole('heading', { name: /Curatenie profesionala/i }),
    ).toBeVisible();
  });

  test('Navigate to Services page via header nav link', async ({ page }) => {
    await page.goto('/');

    // Desktop nav: click on "Servicii" link in the header
    await page
      .locator('header')
      .getByRole('link', { name: 'Servicii' })
      .click();

    await expect(page).toHaveURL('/servicii');
    await expect(
      page.getByRole('heading', { name: 'Serviciile noastre' }),
    ).toBeVisible();
  });

  test('Navigate to Booking page via hero CTA button', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /Rezerva o curatenie/i })
      .click();

    await expect(page).toHaveURL('/rezervare');
    await expect(
      page.getByRole('heading', { name: /Rezerva o curatenie/i }),
    ).toBeVisible();
  });

  test('Navigate to Login page via header link', async ({ page }) => {
    await page.goto('/');

    await page
      .locator('header')
      .getByRole('link', { name: 'Autentificare' })
      .click();

    await expect(page).toHaveURL('/autentificare');
    await expect(
      page.getByRole('heading', { name: 'Autentificare' }),
    ).toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/pagina-inexistenta');

    await expect(page.getByText('404')).toBeVisible();
    await expect(
      page.getByText('Pagina nu a fost gasita'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Inapoi la pagina principala/i }),
    ).toBeVisible();
  });

  test('Header shows correct links when not authenticated', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.locator('header');

    // Logo
    await expect(header.getByText('Go2Fix')).toBeVisible();

    // Desktop nav links
    await expect(
      header.getByRole('link', { name: 'Servicii' }),
    ).toBeVisible();
    await expect(
      header.getByRole('link', { name: 'Autentificare' }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: /Rezerva acum/i }),
    ).toBeVisible();
  });

  test('Footer shows copyright text', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const currentYear = new Date().getFullYear();

    await expect(
      footer.getByText(`${currentYear} Go2Fix`),
    ).toBeVisible();
    await expect(
      footer.getByText('Toate drepturile rezervate'),
    ).toBeVisible();
  });

  test('"Incepe acum" CTA navigates to booking', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /Incepe acum/i })
      .click();

    await expect(page).toHaveURL('/rezervare');
  });

  test('"Vezi serviciile" button navigates to services page', async ({
    page,
  }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /Vezi serviciile/i })
      .click();

    await expect(page).toHaveURL('/servicii');
  });
});
