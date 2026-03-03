import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { useLanguage } from '@/context/LanguageContext';
import { usePlatform } from '@/context/PlatformContext';
import { ROUTE_MAP } from '@/i18n/routes';

interface ComparisonRow {
  feature: string;
  go2fix: boolean;
  competitor: boolean;
}

interface Reason {
  title: string;
  desc: string;
}

export default function VsHomerunPage() {
  const { t } = useTranslation('vs');
  const { lang } = useLanguage();
  const { isPreRelease } = usePlatform();

  const rows = t('homerun.features.rows', { returnObjects: true }) as ComparisonRow[];
  const reasons = t('homerun.reasons', { returnObjects: true }) as Reason[];

  return (
    <>
      <SEOHead
        title={t('homerun.meta.title')}
        description={t('homerun.meta.description')}
        canonicalUrl={ROUTE_MAP.vsHomerun[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.vsHomerun.ro, en: ROUTE_MAP.vsHomerun.en }}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t('homerun.hero.title'),
          description: t('homerun.meta.description'),
          url: `https://go2fix.ro${ROUTE_MAP.vsHomerun[lang]}`,
        }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-100 rounded-full px-3 py-1 mb-4">
            {t('homerun.hero.badge')}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {t('homerun.hero.title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('homerun.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {t('homerun.tableTitle')}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 w-1/2">
                    {t('homerun.features.col_feature')}
                  </th>
                  <th className="text-center px-6 py-4 font-semibold text-blue-600">
                    {t('homerun.features.col_go2fix')}
                  </th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-500">
                    {t('homerun.features.col_competitor')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-700">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.go2fix ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.competitor ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Go2Fix */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            {t('homerun.whyTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reasons.map((reason, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{reason.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('homerun.ctaTitle')}
          </h2>
          <p className="text-gray-500 mb-8">{t('homerun.ctaSubtitle')}</p>
          {isPreRelease ? (
            <Link
              to={ROUTE_MAP.waitlist[lang]}
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              {t('homerun.ctaButtonWaitlist')}
            </Link>
          ) : (
            <Link
              to={ROUTE_MAP.booking[lang]}
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              {t('homerun.ctaButton')}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
