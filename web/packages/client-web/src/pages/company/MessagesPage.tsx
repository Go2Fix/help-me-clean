import { MessageCircle, Phone, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useTranslation } from 'react-i18next';

export default function CompanySupportPage() {
  const { user } = useAuth();
  const { buildWhatsAppUrl } = usePlatform();
  const { t } = useTranslation('company');

  const message = user?.fullName
    ? `Buna ziua, sunt ${user.fullName} (admin firma) si am nevoie de ajutor cu contul companiei mele pe Go2Fix.`
    : 'Buna ziua, am nevoie de ajutor cu contul companiei mele pe Go2Fix.';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('company:messages.title')}</h1>
        <p className="text-gray-500 mt-1">{t('company:messages.subtitle')}</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('company:messages.chatTitle')}</h2>
              <p className="text-sm text-gray-500">{t('company:messages.chatVia')}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t('company:messages.chatDesc')}
          </p>

          <a
            href={buildWhatsAppUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="h-4 w-4" />
            {t('company:messages.openWhatsApp')}
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('company:messages.supportHours')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>{t('company:messages.supportHoursValue')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('company:messages.responseTime')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>{t('company:messages.responseTimeValue')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{t('company:messages.confidential')}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ whiteSpace: 'pre-line' }}>{t('company:messages.confidentialDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
