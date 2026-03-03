import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { CreditCard, Loader2, Check, X } from 'lucide-react';
import {
  CREATE_SETUP_INTENT,
  ATTACH_PAYMENT_METHOD,
  MY_PAYMENT_METHODS,
} from '@/graphql/operations';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null);

interface AddCardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function AddCardForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [createSetupIntent] = useMutation(CREATE_SETUP_INTENT);
  const [attachPaymentMethod] = useMutation(ATTACH_PAYMENT_METHOD, {
    refetchQueries: [{ query: MY_PAYMENT_METHODS }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Create a SetupIntent on the backend.
      const { data } = await createSetupIntent();
      const clientSecret = data.createSetupIntent.clientSecret;

      // Confirm the SetupIntent with the card element.
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Elementul cardului nu a fost gasit.');
        setProcessing(false);
        return;
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: { card: cardElement },
        },
      );

      if (stripeError) {
        setError(stripeError.message || 'Nu am putut salva cardul.');
        setProcessing(false);
        return;
      }

      if (setupIntent?.payment_method) {
        // Attach the payment method to the user.
        await attachPaymentMethod({
          variables: {
            stripePaymentMethodId:
              typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent.payment_method.id,
          },
        });
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare necunoscuta';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-8 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-semibold text-gray-900">Card adaugat cu succes!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-xl">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#111827',
                '::placeholder': { color: '#9CA3AF' },
              },
            },
            hidePostalCode: true,
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger text-sm bg-red-50 px-4 py-3 rounded-xl">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Anuleaza
        </Button>
        <Button type="submit" disabled={!stripe || processing} className="flex-1">
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Se salveaza...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Salvează cardul
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Datele cardului sunt procesate securizat prin Stripe. Nu stocam datele complete ale cardului.
      </p>
    </form>
  );
}

export default function AddCardModal({ open, onClose, onSuccess }: AddCardModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Adauga un card nou">
      <Elements stripe={stripePromise} options={{ locale: 'ro' }}>
        <AddCardForm onClose={onClose} onSuccess={onSuccess} />
      </Elements>
    </Modal>
  );
}
