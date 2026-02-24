import { test, expect } from '@playwright/test';

test.describe('Landing page loading experience', () => {
  test('Header shows nav links immediately on load', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header');

    // Static nav links should be visible immediately — not behind a loading state
    await expect(header.getByText('Go2Fix')).toBeVisible();
    await expect(
      header.getByRole('link', { name: /Servicii/i }),
    ).toBeVisible();
  });

  test('No loading spinner text visible on the landing page', async ({
    page,
  }) => {
    await page.goto('/');

    // The old loading spinner showed "Se incarca serviciile..."
    // After our fix, skeleton cards are shown instead — no spinner text
    await expect(
      page.getByText('Se încarcă serviciile...'),
    ).not.toBeVisible();
  });

  test('Services section shows skeleton cards then real content', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for service cards to appear (with price text as indicator)
    await expect(page.locator('text=/\\d+ lei/').first()).toBeVisible({
      timeout: 15_000,
    });

    // Skeleton should be gone
    await expect(page.getByTestId('services-skeleton')).not.toBeVisible();
  });

  test('Hero section shows CTA buttons after loading', async ({ page }) => {
    await page.goto('/');

    // Wait for the hero CTA buttons to appear (pulse skeletons should resolve)
    const ctaButton = page.getByRole('button', {
      name: /Rezervă o curățenie|Înscrie-te pe lista|Listă de așteptare/i,
    });
    await expect(ctaButton.first()).toBeVisible({ timeout: 15_000 });
  });

  test('Header shows action buttons after loading', async ({ page }) => {
    await page.goto('/');

    // Wait for the auth-dependent area to resolve: either login+book buttons or user avatar
    const actionArea = page.locator('header').getByRole('button').or(
      page.locator('header').getByRole('link', { name: /Autentificare/i }),
    );
    await expect(actionArea.first()).toBeVisible({ timeout: 15_000 });

    // Pulse skeleton should be gone
    await expect(
      page.locator('header .animate-pulse'),
    ).not.toBeVisible();
  });

  test('For Companies section is visible for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/');

    // Scroll to the bottom area and wait for the "For Companies" section
    // It should fade in smoothly for unauthenticated users
    await expect(
      page.getByRole('heading', { name: /firmă de curățenie/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Full page loads without layout shifts', async ({ page }) => {
    await page.goto('/');

    // Wait for services to be loaded (fully rendered page)
    await expect(page.locator('text=/\\d+ lei/').first()).toBeVisible({
      timeout: 15_000,
    });

    // Verify key sections are all present
    await expect(
      page.getByRole('heading', { name: /Casă curată/i }),
    ).toBeVisible();
    await expect(page.getByText('Cum funcționează?')).toBeVisible();
    await expect(page.getByText('De ce Go2Fix?')).toBeVisible();
    await expect(
      page.getByText('Ce spun clienții noștri'),
    ).toBeVisible();

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(
      footer.getByText(`${new Date().getFullYear()} Go2Fix`),
    ).toBeVisible();
  });
});
