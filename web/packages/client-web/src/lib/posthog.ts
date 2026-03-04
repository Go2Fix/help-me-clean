import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';

export function initPostHog() {
  if (!posthogKey) return;
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
    },
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing(); // don't pollute dev data by default
      }
    },
  });
}

export { posthog };
