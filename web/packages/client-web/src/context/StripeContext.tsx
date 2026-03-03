import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useLanguage } from '@/context/LanguageContext';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey && import.meta.env.DEV) {
  console.warn('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set — payment features will be disabled.');
}
const stripePromise = loadStripe(stripeKey || null);

interface StripeContextValue {
  stripe: Promise<Stripe | null>;
}

const StripeContext = createContext<StripeContextValue>({
  stripe: stripePromise,
});

export function StripeProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ stripe: stripePromise }), []);
  return (
    <StripeContext.Provider value={value}>{children}</StripeContext.Provider>
  );
}

export function StripeElementsWrapper({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: ReactNode;
}) {
  const { lang } = useLanguage();
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: lang,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2563EB',
            borderRadius: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}

export function useStripeContext() {
  return useContext(StripeContext);
}
