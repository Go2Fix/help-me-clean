import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { Link } from 'react-router-dom';
import { Laptop, CreditCard, BarChart2, TrendingUp, FileCheck, CheckCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import AppComingSoonSection from '@/components/common/AppComingSoonSection';

export default function ForCompaniesPage() {
  const { t } = useTranslation('companies');
  const { lang } = useLanguage();

  const benefits = [
    { icon: Laptop, title: t('benefits.b1Title'), desc: t('benefits.b1Desc') },
    { icon: CreditCard, title: t('benefits.b2Title'), desc: t('benefits.b2Desc') },
    { icon: BarChart2, title: t('benefits.b3Title'), desc: t('benefits.b3Desc') },
    { icon: TrendingUp, title: t('benefits.b4Title'), desc: t('benefits.b4Desc') },
  ];

  const steps = [
    { step: t('howToJoin.s1Step'), title: t('howToJoin.s1Title'), desc: t('howToJoin.s1Desc') },
    { step: t('howToJoin.s2Step'), title: t('howToJoin.s2Title'), desc: t('howToJoin.s2Desc') },
    { step: t('howToJoin.s3Step'), title: t('howToJoin.s3Title'), desc: t('howToJoin.s3Desc') },
  ];

  const requirements = [
    { icon: FileCheck, title: t('requirements.r1Title'), desc: t('requirements.r1Desc') },
    { icon: CheckCircle, title: t('requirements.r2Title'), desc: t('requirements.r2Desc') },
    { icon: FileCheck, title: t('requirements.r3Title'), desc: t('requirements.r3Desc') },
  ];

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.forCompanies[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.forCompanies.ro, en: ROUTE_MAP.forCompanies.en }}
      />
      <div className="bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={ROUTE_MAP.registerFirm[lang]}
                className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition"
              >
                {t('hero.ctaApply')}
              </Link>
              <Link
                to={ROUTE_MAP.waitlist[lang]}
                className="inline-block bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-400 transition border border-blue-400"
              >
                {t('hero.ctaWaitlist')}
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              {t('benefits.title')}
            </h2>
            <p className="text-gray-500 text-center mb-12">
              {t('benefits.subtitle')}
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to join */}
        <section className="bg-gray-50 py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              {t('howToJoin.title')}
            </h2>
            <p className="text-gray-500 text-center mb-12">{t('howToJoin.subtitle')}</p>
            <div className="space-y-6">
              {steps.map(({ step, title, desc }) => (
                <div key={step} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {step}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{title}</h3>
                    <p className="text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              {t('requirements.title')}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {requirements.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center p-6 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-600 text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* App Coming Soon */}
        <AppComingSoonSection />

        {/* CTA */}
        <section className="bg-blue-600 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-blue-100 mb-8 text-lg">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={ROUTE_MAP.registerFirm[lang]}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition"
              >
                {t('cta.ctaApply')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={ROUTE_MAP.waitlist[lang]}
                className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-400 transition border border-blue-400"
              >
                {t('cta.ctaWaitlist')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
