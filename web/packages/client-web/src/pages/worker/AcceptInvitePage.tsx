import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { CheckCircle, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { authService, type AuthUser } from '@/services/AuthService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import EmailOtpModal from '@/components/auth/EmailOtpModal';
import { ACCEPT_INVITATION } from '@/graphql/operations';

// Public landing page for invited workers.
// Accessible at /invitare?token=inv-xxx or /invitare (manual token entry).
// When a token is present in the URL, the invitation is automatically accepted
// after authentication — no manual code entry needed.
export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') ?? '';

  const { isAuthenticated, loginWithGoogle, refreshToken, loading: authLoading } = useAuth();
  const [acceptInvitation, { loading: accepting }] = useMutation(ACCEPT_INVITATION);

  const [token, setToken] = useState(urlToken);
  const [step, setStep] = useState<'auth' | 'processing' | 'invite' | 'done'>(
    isAuthenticated ? (urlToken ? 'processing' : 'invite') : 'auth',
  );
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const acceptAttempted = useRef(false);

  // Auto-accept when authenticated + token in URL
  useEffect(() => {
    if (isAuthenticated && urlToken && step === 'auth') {
      setStep('processing');
    }
  }, [isAuthenticated, urlToken, step]);

  useEffect(() => {
    if (isAuthenticated && !urlToken && step === 'auth') {
      setStep('invite');
    }
  }, [isAuthenticated, urlToken, step]);

  // Process auto-accept when in processing step
  useEffect(() => {
    if (step !== 'processing' || acceptAttempted.current) return;
    acceptAttempted.current = true;

    acceptInvitation({ variables: { token: urlToken } })
      .then(async ({ data }) => {
        setCompanyName(data?.acceptInvitation?.company?.companyName ?? '');
        setStep('done');
        await refreshToken();
        setTimeout(() => navigate('/worker'), 2000);
      })
      .catch(() => {
        setError('Codul de invitație nu este valid sau a expirat.');
        setStep('invite');
        setToken(urlToken);
      });
  }, [step, urlToken, acceptInvitation, refreshToken, navigate]);

  const handleAccept = async () => {
    if (!token.trim()) {
      setError('Introdu codul de invitație.');
      return;
    }
    setError('');
    try {
      const { data } = await acceptInvitation({ variables: { token: token.trim() } });
      setCompanyName(data?.acceptInvitation?.company?.companyName ?? '');
      setStep('done');
      await refreshToken();
      setTimeout(() => navigate('/worker'), 2000);
    } catch {
      setError('Codul de invitație nu este valid sau a expirat.');
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) { setError('Autentificarea Google a eșuat.'); return; }
    setError('');
    try {
      await loginWithGoogle(response.credential, 'WORKER');
      // Effects above will auto-advance: if urlToken → processing → auto-accept
    } catch {
      setError('Autentificarea a eșuat. Încearcă din nou.');
    }
  };

  const handleOtpSuccess = (_user: AuthUser) => {
    // authService emits state → useAuth reflects new user → effects advance step.
    // For URL token: effect will move to 'processing' and auto-accept.
    // For no token: effect will move to 'invite'.
    if (authService.getToken() && urlToken) {
      setStep('processing');
      acceptAttempted.current = false; // allow the processing effect to run
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* ── Left panel — decorative, desktop only ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -right-12 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-56 h-56 bg-secondary/20 rounded-full blur-3xl" />

        {/* Logo */}
        <Link to="/" className="relative z-10">
          <span className="text-2xl font-black text-white tracking-tight">
            Go2<span className="text-secondary">Fix</span>
          </span>
        </Link>

        {/* Central message */}
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
            Echipa Go2Fix
          </p>
          <h2 className="text-4xl font-black text-white leading-tight mb-6">
            Alătură-te echipei și începe să lucrezi.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            Ai primit o invitație de la o companie de curățenie. Autentifică-te pentru a-ți activa profilul.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-8">
          <div>
            <p className="text-3xl font-black text-white">500+</p>
            <p className="text-white/50 text-sm mt-0.5">Clienți</p>
          </div>
          <div>
            <p className="text-3xl font-black text-secondary">50+</p>
            <p className="text-white/50 text-sm mt-0.5">Companii</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">4.9★</p>
            <p className="text-white/50 text-sm mt-0.5">Rating mediu</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          {/* Mobile-only logo */}
          <Link to="/" className="lg:hidden">
            <span className="text-lg font-black text-gray-900 tracking-tight">
              Go2<span className="text-primary">Fix</span>
            </span>
          </Link>
          <div className="hidden lg:block" />
          <p className="text-sm text-gray-500">
            Ai deja cont?{' '}
            <Link to="/autentificare" className="text-primary font-semibold hover:underline">
              Autentifică-te
            </Link>
          </p>
        </div>

        {/* Content — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">

            {/* ── Step: Authentication ── */}
            {step === 'auth' && (
              <>
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                  Acceptă invitația
                </h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  {urlToken
                    ? 'Autentifică-te pentru a te alătura echipei.'
                    : 'Autentifică-te pentru a-ți activa profilul de curățitor.'}
                </p>

                <div className="flex flex-col items-start gap-3">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Autentificarea Google a eșuat.')}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="360"
                  />

                  {/* Divider */}
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">sau</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(true)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Continuă cu email
                  </button>

                  {error && (
                    <div className="w-full p-3 rounded-xl bg-red-50 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}
                </div>

                <EmailOtpModal
                  open={showOtpModal}
                  onClose={() => setShowOtpModal(false)}
                  onSuccess={handleOtpSuccess}
                  role="WORKER"
                  title="Creează cont de curățitor"
                />

                <p className="mt-8 text-xs text-gray-400 leading-relaxed">
                  Prin autentificare, ești de acord cu{' '}
                  <span className="text-gray-500 font-medium">Termenii și condițiile</span>{' '}
                  și{' '}
                  <span className="text-gray-500 font-medium">Politica de confidențialitate</span>.
                </p>
              </>
            )}

            {/* ── Step: Processing (auto-accept) ── */}
            {step === 'processing' && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Se procesează invitația...
                </h2>
                <p className="text-gray-500">Te conectăm la echipă.</p>
              </div>
            )}

            {/* ── Step: Enter invite token (fallback / no URL token) ── */}
            {step === 'invite' && (
              <>
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                  Introdu codul
                </h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Introdu codul de invitație primit de la companie.
                </p>

                <div className="flex flex-col gap-4">
                  <Input
                    label="Cod de invitație"
                    placeholder="inv-xxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccept()}
                    error={error}
                    autoFocus={!token}
                  />
                  <Button onClick={handleAccept} disabled={accepting} className="w-full">
                    {accepting ? 'Se procesează...' : 'Acceptă invitația'}
                  </Button>
                </div>
              </>
            )}

            {/* ── Step: Success ── */}
            {step === 'done' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Invitație acceptată!
                </h2>
                <p className="text-gray-500">
                  {companyName
                    ? `Ai fost adăugat la ${companyName}.`
                    : 'Profilul tău de curățitor a fost activat.'}
                  {' '}Vei fi redirecționat...
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
