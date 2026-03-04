import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Mail, Clock, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import Card from '@/components/ui/Card';
import { usePlatform } from '@/context/PlatformContext';

export default function SupportPage() {
  const { t } = useTranslation(['dashboard', 'client']);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { buildWhatsAppUrl, supportPhone } = usePlatform();

  const whatsappUrl = buildWhatsAppUrl('Buna! Am nevoie de ajutor cu o comanda Go2Fix.');

  const faqItems = t('client:support.faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('client:support.title')}</h1>
        <p className="text-gray-500 mt-1">{t('client:support.subtitle')}</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{t('client:support.whatsapp.title')}</h3>
          <p className="text-sm text-gray-500">{t('client:support.whatsapp.description')}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-2.5 text-sm transition-all bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-4 w-4" />
            {t('client:support.whatsapp.button')}
          </a>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{t('client:support.email.title')}</h3>
          <p className="text-sm text-gray-500">{t('client:support.email.description')}</p>
          <a
            href="mailto:contact@go2fix.ro"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-2.5 text-sm transition-all border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Mail className="h-4 w-4" />
            contact@go2fix.ro
          </a>
        </Card>
      </div>

      {/* Phone + Hours */}
      {supportPhone && (
        <Card className="p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('client:support.phone.label', { phone: supportPhone })}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-xs text-gray-500">{t('client:support.phone.hours')}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('client:support.faq.title')}</h2>
        <div className="space-y-2">
          {Array.isArray(faqItems) && faqItems.map((item, i) => (
            <Card key={i} className="overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
              >
                <span className="font-medium text-gray-900 text-sm">{item.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-gray-600 -mt-1">{item.a}</div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
