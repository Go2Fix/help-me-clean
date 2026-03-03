import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { MessageCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { REQUEST_PHONE_VERIFICATION, VERIFY_PHONE } from '@/graphql/operations';

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_COUNTDOWN_SECONDS = 600; // 10 minutes

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhoneVerificationWidgetProps {
  phone: string;
  onVerified: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhoneVerificationWidget({ phone, onVerified }: PhoneVerificationWidgetProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const [verifyError, setVerifyError] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [requestVerification, { loading: requesting }] = useMutation(REQUEST_PHONE_VERIFICATION);
  const [verifyPhone, { loading: verifying }] = useMutation(VERIFY_PHONE);

  // ─── Countdown timer ─────────────────────────────────────────────────────

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(OTP_COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleRequestOtp = async () => {
    setVerifyError('');
    try {
      await requestVerification({ variables: { phone } });
      setOtpSent(true);
      setCode('');
      startCountdown();
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch {
      setVerifyError('Nu s-a putut trimite codul. Incearca din nou.');
    }
  };

  const handleVerify = async () => {
    setVerifyError('');
    try {
      await verifyPhone({ variables: { phone, code } });
      if (timerRef.current) clearInterval(timerRef.current);
      onVerified();
    } catch {
      setVerifyError('Cod invalid sau expirat. Incearca din nou.');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!otpSent) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleRequestOtp}
          loading={requesting}
          className="w-full sm:w-auto text-white font-semibold"
          style={{ backgroundColor: '#25D366' }}
        >
          {!requesting && <MessageCircle className="h-4 w-4" />}
          Verifica numarul via WhatsApp
        </Button>
        {verifyError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {verifyError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20">
        <p className="text-sm text-gray-700">
          Ti-am trimis un cod de 6 cifre pe WhatsApp la{' '}
          <span className="font-semibold">{phone}</span>.
        </p>
        {countdown > 0 ? (
          <p className="text-xs text-gray-500 mt-1">
            Codul expira in{' '}
            <span className="font-mono font-semibold">{formatCountdown(countdown)}</span>
          </p>
        ) : (
          <p className="text-xs text-red-500 mt-1">Codul a expirat.</p>
        )}
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            ref={codeInputRef}
            label="Codul primit pe WhatsApp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setCode(val);
            }}
            className="text-center text-lg tracking-[0.4em] font-mono"
          />
        </div>
        <Button
          type="button"
          onClick={handleVerify}
          loading={verifying}
          disabled={code.length !== 6 || countdown === 0}
          className="mb-0.5"
        >
          Confirma codul
        </Button>
      </div>

      {verifyError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {verifyError}
        </div>
      )}

      {countdown === 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={handleRequestOtp}
          loading={requesting}
          className="w-full"
        >
          {!requesting && <MessageCircle className="h-4 w-4" />}
          Retrimite codul
        </Button>
      )}
    </div>
  );
}
