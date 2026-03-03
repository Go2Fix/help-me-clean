import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { MessageCircle, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneVerificationWidget from '@/components/PhoneVerificationWidget';
import { UPDATE_PROFILE } from '@/graphql/operations';
import { usePlatform } from '@/context/PlatformContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhoneGateProps {
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhoneGate({ children }: PhoneGateProps) {
  const { user, loading: authLoading, refetchUser } = useAuth();
  const { supportPhone } = usePlatform();

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE);

  // ─── Guard conditions ─────────────────────────────────────────────────────

  // While auth is loading — render nothing to avoid flash
  if (authLoading || !user) {
    return null;
  }

  // Phone is set — render children normally
  if (user.phone) {
    return <>{children}</>;
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setSaveError('');

    if (!phone.trim()) {
      setPhoneError('Numarul de telefon este obligatoriu.');
      return;
    }
    if (!phone.startsWith('+')) {
      setPhoneError('Formatul trebuie sa fie +40...');
      return;
    }

    try {
      await updateProfile({ variables: { input: { phone: phone.trim() } } });
      setSaved(true);
      refetchUser();
    } catch {
      setSaveError('Eroare la salvare. Incearca din nou.');
    }
  };

  const handleVerified = () => {
    refetchUser();
  };

  // ─── Gate overlay ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Adauga numarul tau de telefon
              </h2>
              <p className="text-xs text-gray-500">Necesar pentru comenzile tale</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              Numarul de telefon este necesar pentru a te putea contacta prin
              WhatsApp in legatura cu comenzile tale si pentru suport direct.
            </p>

            {!saved ? (
              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="Numar de telefon"
                  type="tel"
                  placeholder="+40 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                  }}
                  error={phoneError}
                  required
                />

                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}

                <Button
                  type="submit"
                  loading={saving}
                  className="w-full"
                >
                  Salveaza numarul
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                  Numarul a fost salvat cu succes.
                </div>
                {supportPhone && (
                  <PhoneVerificationWidget
                    phone={phone}
                    onVerified={handleVerified}
                  />
                )}
              </div>
            )}

            {/* GDPR notice */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <Shield className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                Numarul tau va fi folosit exclusiv pentru comunicare cu echipa Go2Fix.{' '}
                <Link
                  to="/confidentialitate"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Citeste Politica de confidentialitate &rarr;
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Children are rendered behind the overlay but blocked visually */}
      {children}
    </>
  );
}
