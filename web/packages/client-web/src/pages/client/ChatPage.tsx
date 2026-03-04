import { useTranslation } from 'react-i18next';
import { MessageCircle, Phone, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';

export default function SupportWhatsAppPage() {
  const { t } = useTranslation(['dashboard', 'client']);
  const { user } = useAuth();
  const { buildWhatsAppUrl } = usePlatform();

  const personalizedMessage = user?.fullName
    ? `Buna ziua, sunt ${user.fullName} si am nevoie de ajutor cu contul meu Go2Fix.`
    : 'Buna ziua, am nevoie de ajutor cu contul meu Go2Fix.';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('client:chat.title')}</h1>
        <p className="text-gray-500 mt-1">{t('client:chat.subtitle')}</p>
      </div>

      <div className="max-w-lg">
        {/* Main card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('client:chat.chatTitle')}</h2>
              <p className="text-sm text-gray-500">{t('client:chat.chatSubtitle')}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t('client:chat.chatDescription')}
          </p>

          <a
            href={buildWhatsAppUrl(personalizedMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="h-4 w-4" />
            {t('client:chat.openWhatsApp')}
          </a>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('client:chat.supportHours')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>
                {t('client:chat.supportHoursValue')}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('client:chat.responseTime')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>
                {t('client:chat.responseTimeValue')}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('client:chat.confidential')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>
                {t('client:chat.confidentialDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
