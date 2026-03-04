import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import './i18n/config'; // initialise i18next (side-effect import)
import App from './App';
import { initPostHog } from './lib/posthog';

// ─── PostHog ──────────────────────────────────────────────────────────────────
initPostHog();

// ─── Sentry ───────────────────────────────────────────────────────────────────
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
    ],
    // 20% of transactions sampled — stays under 10K/mo free limit
    tracesSampleRate: 0.2,
    // 10% session replays on errors only
    replaysOnErrorSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    ignoreErrors: [
      // Vercel Analytics script returns HTML on non-Vercel envs — not a real error
      /Unexpected token '<'/,
    ],
    denyUrls: [
      // Suppress errors originating from Vercel-injected scripts
      /\/_vercel\//,
    ],
  });
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            }
          >
            <App />
          </Suspense>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </HelmetProvider>
    <Analytics />
  </StrictMode>,
);
