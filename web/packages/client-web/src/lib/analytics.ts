import { posthog } from './posthog';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export function identifyUser(
  userId: string,
  properties: { email?: string; role?: string; name?: string },
) {
  posthog.identify(userId, properties);
  if (typeof window.gtag === 'function') {
    window.gtag('set', 'user_properties', { user_role: properties.role });
  }
}

export function resetUser() {
  posthog.reset();
}

// ─── Generic event ────────────────────────────────────────────────────────────

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  posthog.capture(eventName, params);
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export function trackWaitlistSignup(type: 'CLIENT' | 'COMPANY') {
  const userType = type.toLowerCase();
  trackEvent('waitlist_submitted', { type: userType });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'sign_up', { method: 'waitlist', user_type: userType });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', { content_name: `waitlist_${userType}` });
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function trackAuthInitiated(method: 'google' | 'email_otp') {
  trackEvent('auth_initiated', { method });
}

export function trackAuthCompleted(
  method: 'google' | 'email_otp',
  role: string,
  isNewUser: boolean,
) {
  trackEvent(isNewUser ? 'user_signed_up' : 'user_logged_in', { method, role });
  if (typeof window.gtag === 'function') {
    window.gtag('event', isNewUser ? 'sign_up' : 'login', { method });
  }
  if (isNewUser && typeof window.fbq === 'function') {
    window.fbq('track', 'CompleteRegistration', { method });
  }
}

export function trackAuthLogout(role: string) {
  trackEvent('user_logged_out', { role });
}

// ─── Booking funnel ───────────────────────────────────────────────────────────

export function trackBookingStarted(source: string = 'direct') {
  trackEvent('booking_started', { source });
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'InitiateCheckout');
  }
}

export function trackBookingStepCompleted(
  step: number,
  stepName: string,
  extra?: Record<string, unknown>,
) {
  trackEvent('booking_step_completed', { step, step_name: stepName, ...extra });
}

export function trackBookingCompleted(
  bookingId: string,
  amount: number,
  companyId?: string,
) {
  trackEvent('booking_completed', { booking_id: bookingId, amount, company_id: companyId });
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: bookingId,
      value: amount,
      currency: 'RON',
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', { value: amount, currency: 'RON' });
  }
}

export function trackBookingAbandoned(lastStep: number, timeSpentSec: number) {
  trackEvent('booking_abandoned', { last_step: lastStep, time_spent_sec: timeSpentSec });
}

export function trackPromoApplied(promoCode: string, discountAmount: number) {
  trackEvent('booking_promo_applied', {
    promo_code: promoCode,
    discount_amount: discountAmount,
  });
}

// ─── Company ──────────────────────────────────────────────────────────────────

export function trackCompanyRegistrationStarted() {
  trackEvent('company_registration_started');
}

export function trackCompanyRegistrationCompleted() {
  trackEvent('company_registration_completed');
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function trackPaymentMethodAdded() {
  trackEvent('payment_method_added');
}

export function trackSubscriptionCreated(plan: string, interval: string) {
  trackEvent('subscription_created', { plan, interval });
}

// ─── Engagement ───────────────────────────────────────────────────────────────

export function trackReviewSubmitted(rating: number, bookingId: string) {
  trackEvent('review_submitted', { rating, booking_id: bookingId });
}

export function trackDisputeOpened(bookingId: string) {
  trackEvent('dispute_opened', { booking_id: bookingId });
}
