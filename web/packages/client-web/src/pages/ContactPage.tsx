import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { Mail, Phone, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

export default function ContactPage() {
  const { t } = useTranslation('contact');
  const { lang } = useLanguage();

  const CONTACT_INFO = [
    {
      icon: Mail,
      label: t('info.email'),
      value: 'contact@go2fix.ro',
      href: 'mailto:contact@go2fix.ro',
    },
    {
      icon: Phone,
      label: t('info.phone'),
      value: '+40 700 000 000',
      href: 'tel:+40700000000',
    },
    {
      icon: MapPin,
      label: t('info.city'),
      value: t('info.cityValue'),
      href: undefined,
    },
    {
      icon: Clock,
      label: t('info.schedule'),
      value: t('info.scheduleValue'),
      href: undefined,
    },
  ];

  const SUBJECTS = t('form.subjects', { returnObjects: true }) as string[];

  const FAQS = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: SUBJECTS[0] ?? '',
    message: '',
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(
      `Nume: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`,
    );
    const subject = encodeURIComponent(`[Go2Fix] ${formData.subject}`);
    window.location.href = `mailto:contact@go2fix.ro?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.contact[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.contact.ro, en: ROUTE_MAP.contact.en }}
      />
      <div className="bg-white">
        {/* Header */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">{t('hero.title')}</h1>
            <p className="text-blue-100 text-lg">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        {/* Contact grid */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Left: Contact info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('info.title')}</h2>
              <div className="space-y-5">
                {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
                      {href ? (
                        <a href={href} className="text-gray-900 font-medium hover:text-blue-600 transition">
                          {value}
                        </a>
                      ) : (
                        <p className="text-gray-900 font-medium">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Contact form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.name')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t('form.placeholder_name')}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t('form.placeholder_email')}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.subject')}
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.message')}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
                    placeholder={t('form.placeholder_message')}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('form.submit')}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              {t('faq.title')}
            </h2>
            <div className="space-y-4">
              {FAQS.map(({ question, answer }, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900">{question}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 text-sm leading-relaxed">{answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
