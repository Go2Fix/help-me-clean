import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROUTE_MAP } from '@/i18n/routes';
import EmailOtpModal from '@/components/auth/EmailOtpModal';
import type { AuthUser } from '@/services/AuthService';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/cont',
  COMPANY_ADMIN: '/firma',
  WORKER: '/worker',
  GLOBAL_ADMIN: '/admin',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, isAuthenticated, loading, user } = useAuth();

  const [error, setError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  const from = (location.state as { from?: string })?.from;

  // While auth is resolving, show a spinner rather than flashing the login form
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Already authenticated → redirect immediately
  if (isAuthenticated && user) {
    return <Navigate to={from || ROLE_HOME[user.role] || '/'} replace />;
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError(t('errors.googleFailed'));
      return;
    }
    setError('');
    try {
      const authUser = await loginWithGoogle(response.credential);
      navigate(from || ROLE_HOME[authUser.role] || '/', { replace: true });
    } catch {
      setError(t('errors.generic'));
    }
  };

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
            {t('hero.badge')}
          </p>
          <h2 className="text-4xl font-black text-white leading-tight mb-6">
            {t('hero.headline')}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-8">
          <div>
            <p className="text-3xl font-black text-white">500+</p>
            <p className="text-white/50 text-sm mt-0.5">{t('hero.stat1')}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-secondary">50+</p>
            <p className="text-white/50 text-sm mt-0.5">{t('hero.stat2')}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">4.9★</p>
            <p className="text-white/50 text-sm mt-0.5">{t('hero.stat3')}</p>
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
          <div className="flex flex-col items-end gap-1">
            <p className="text-sm text-gray-500">
              {t('form.isCompany')}{' '}
              <Link
                to={ROUTE_MAP.registerFirm.ro}
                className="text-primary font-semibold hover:underline"
              >
                {t('form.register')}
              </Link>
            </p>
          </div>
        </div>

        {/* Form — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              {t('form.title')}
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {t('form.subtitle')}
            </p>

            <div className="flex flex-col items-start gap-3">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError(t('errors.googleFailed'))}
                useOneTap
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
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <EmailOtpModal
              open={showOtpModal}
              onClose={() => setShowOtpModal(false)}
              onSuccess={(authUser: AuthUser) =>
                navigate(from || ROLE_HOME[authUser.role] || '/', { replace: true })
              }
              role="CLIENT"
            />

            <p className="mt-8 text-xs text-gray-400 leading-relaxed">
              {t('form.privacy')}{' '}
              <span className="text-gray-500 font-medium">{t('form.terms')}</span>{' '}
              {t('form.and')}{' '}
              <span className="text-gray-500 font-medium">{t('form.privacyPolicy')}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
