import { type Page, expect } from '@playwright/test';

/**
 * Logs in as a test user by mocking the Google OAuth flow.
 *
 * This function intercepts the GraphQL signInWithGoogle mutation and returns
 * a mocked response with a test user. The backend auth cookie is set automatically
 * by the mocked response.
 */
export async function loginAsTestUser(
  page: Page,
  email = 'test-e2e@go2fix.ro',
  role: 'CLIENT' | 'COMPANY_ADMIN' | 'WORKER' | 'GLOBAL_ADMIN' = 'CLIENT',
): Promise<void> {
  // Mock the signInWithGoogle mutation
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postData();

    // Check if this is a signInWithGoogle mutation
    if (postData?.includes('signInWithGoogle')) {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Mock the auth cookie that backend would set
          'Set-Cookie': 'auth_token=mock-jwt-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          data: {
            signInWithGoogle: {
              token: 'mock-jwt-token',
              user: {
                id: `test-user-${role.toLowerCase()}`,
                email,
                fullName: 'Test E2E User',
                role,
                status: 'ACTIVE',
                preferredLanguage: 'ro',
                createdAt: new Date().toISOString(),
              },
              isNewUser: false,
            },
          },
        }),
      });
    } else {
      // Let all other requests pass through
      await route.continue();
    }
  });

  // Navigate to login page
  await page.goto('/autentificare');

  // Simulate Google OAuth success by triggering the GoogleLogin component's callback
  // We'll click the Google button and intercept the network call
  await page.evaluate(() => {
    // Find the Google OAuth iframe and simulate success
    // This is a workaround since we can't actually click the real Google button in tests
    const googleCallback = (window as any).__mockGoogleCallback;
    if (googleCallback) {
      googleCallback({ credential: 'mock-google-id-token' });
    }
  });

  // Alternatively, directly call the loginWithGoogle function
  await page.evaluate(({ mockEmail, mockRole }) => {
    // Trigger the auth mutation by calling the login function
    // This simulates what happens after Google OAuth succeeds
    const mockCredential = `mock-google-token-${mockEmail}`;

    // Create a custom event to trigger auth
    const event = new CustomEvent('test-auth-login', {
      detail: { credential: mockCredential },
    });
    window.dispatchEvent(event);
  }, { mockEmail: email, mockRole: role });

  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/autentificare'), {
    timeout: 10_000,
  });
}

/**
 * Returns a future date string in YYYY-MM-DD format, offset by the given
 * number of days from today.
 */
export function getFutureDate(daysFromNow = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Generates a unique email address for test isolation.
 */
export function uniqueEmail(): string {
  const ts = Date.now();
  return `e2e-${ts}@go2fix.ro`;
}
