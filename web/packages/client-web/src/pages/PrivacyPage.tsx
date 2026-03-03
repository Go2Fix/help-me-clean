import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

export default function PrivacyPage() {
  const { t } = useTranslation('legal');
  const { lang } = useLanguage();

  // From GDPR page
  const legalBases = t('gdpr.s3.bases', { returnObjects: true }) as string[];
  const processors = t('gdpr.s4.processors', { returnObjects: true }) as Array<{
    name: string;
    role: string;
    details: string;
  }>;
  const retentionPeriods = t('gdpr.s5.periods', { returnObjects: true }) as Array<{
    category: string;
    duration: string;
  }>;
  const rights = [
    { right: t('gdpr.s6.r1'), desc: t('gdpr.s6.r1Desc') },
    { right: t('gdpr.s6.r2'), desc: t('gdpr.s6.r2Desc') },
    { right: t('gdpr.s6.r3'), desc: t('gdpr.s6.r3Desc') },
    { right: t('gdpr.s6.r4'), desc: t('gdpr.s6.r4Desc') },
    { right: t('gdpr.s6.r5'), desc: t('gdpr.s6.r5Desc') },
    { right: t('gdpr.s6.r6'), desc: t('gdpr.s6.r6Desc') },
  ];
  const transferSafeguards = t('gdpr.s7.safeguards', { returnObjects: true }) as string[];
  const userTypes = [
    {
      title: t('gdpr.s2.clientTitle'),
      subtitle: t('gdpr.s2.clientSubtitle'),
      items: t('gdpr.s2.clientItems', { returnObjects: true }) as string[],
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'text-blue-800',
      subtitleColor: 'text-blue-500',
    },
    {
      title: t('gdpr.s2.companyTitle'),
      subtitle: t('gdpr.s2.companySubtitle'),
      items: t('gdpr.s2.companyItems', { returnObjects: true }) as string[],
      color: 'bg-emerald-50 border-emerald-200',
      headerColor: 'text-emerald-800',
      subtitleColor: 'text-emerald-500',
    },
    {
      title: t('gdpr.s2.workerTitle'),
      subtitle: t('gdpr.s2.workerSubtitle'),
      items: t('gdpr.s2.workerItems', { returnObjects: true }) as string[],
      color: 'bg-amber-50 border-amber-200',
      headerColor: 'text-amber-800',
      subtitleColor: 'text-amber-500',
    },
  ];

  // From Privacy page
  const scopes = [
    { scope: t('privacy.s3.scope1'), desc: t('privacy.s3.scope1Desc') },
    { scope: t('privacy.s3.scope2'), desc: t('privacy.s3.scope2Desc') },
    { scope: t('privacy.s3.scope3'), desc: t('privacy.s3.scope3Desc') },
    { scope: t('privacy.s3.scope4'), desc: t('privacy.s3.scope4Desc') },
    { scope: t('privacy.s3.scope5'), desc: t('privacy.s3.scope5Desc') },
    { scope: t('privacy.s3.scope6'), desc: t('privacy.s3.scope6Desc') },
  ];
  const cookies = [
    { type: t('privacy.s6.c1'), desc: t('privacy.s6.c1Desc') },
    { type: t('privacy.s6.c2'), desc: t('privacy.s6.c2Desc') },
    { type: t('privacy.s6.c3'), desc: t('privacy.s6.c3Desc') },
  ];

  return (
    <>
      <SEOHead
        title={t('privacy.meta.title')}
        description={t('privacy.meta.description')}
        canonicalUrl={ROUTE_MAP.privacy[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.privacy.ro, en: ROUTE_MAP.privacy.en }}
        noIndex={true}
      />
      <div className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('privacy.title')}</h1>
            <p className="text-gray-500">
              <time dateTime="2026-03-01">{t('gdpr.lastUpdated')}</time>
            </p>
            <p className="text-gray-600 mt-4 leading-relaxed max-w-3xl">
              {t('gdpr.intro')}
            </p>
          </div>

          <div className="space-y-12 text-gray-700">
            {/* 1. Operatorul de date */}
            <section id="operator">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s1.title')}</h2>
              <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="leading-relaxed">{t('gdpr.s1.p1')}</p>
              </div>
            </section>

            {/* 2. Date colectate pe tip de utilizator */}
            <section id="date-colectate">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s2.title')}</h2>
              <p className="leading-relaxed mb-6 text-gray-600">{t('gdpr.s2.intro')}</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {userTypes.map(({ title, subtitle, items, color, headerColor, subtitleColor }) => (
                  <div key={title} className={`rounded-xl border p-5 ${color}`}>
                    <h3 className={`font-bold text-base mb-0.5 ${headerColor}`}>{title}</h3>
                    <p className={`text-xs font-medium mb-3 ${subtitleColor}`}>{subtitle}</p>
                    <ul className="space-y-1.5">
                      {items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Scopul prelucrării */}
            <section id="scopuri">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('privacy.s3.title')}</h2>
              <p className="leading-relaxed mb-4 text-gray-600">{t('privacy.s3.intro')}</p>
              <ul className="space-y-3">
                {scopes.map(({ scope, desc }) => (
                  <li key={scope} className="flex gap-2">
                    <span className="font-semibold text-gray-900 shrink-0">{scope}:</span>
                    <span>{desc};</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. Temeiul juridic */}
            <section id="temei-juridic">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s3.title')}</h2>
              <p className="leading-relaxed mb-4 text-gray-600">{t('gdpr.s3.intro')}</p>
              <ul className="space-y-3">
                {legalBases.map((base, i) => (
                  <li key={i} className="flex gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm leading-relaxed">
                    <span className="shrink-0 font-bold text-gray-400">{i + 1}.</span>
                    <span>{base}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5. Procesatori terți */}
            <section id="procesatori">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s4.title')}</h2>
              <p className="leading-relaxed mb-5 text-gray-600">{t('gdpr.s4.intro')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processors.map(({ name, role, details }) => (
                  <div key={name} className="p-4 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{name}</span>
                    </div>
                    <span className="inline-block text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 mb-2">
                      {role}
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed">{details}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-600 italic">{t('gdpr.s4.noSale')}</p>
            </section>

            {/* 6. Cookies */}
            <section id="cookies">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('privacy.s6.title')}</h2>
              <p className="leading-relaxed mb-4 text-gray-600">{t('privacy.s6.intro')}</p>
              <div className="space-y-3">
                {cookies.map(({ type, desc }) => (
                  <div key={type} className="flex gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">{type}: </span>
                      <span className="text-sm text-gray-600">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 7. Retenție date */}
            <section id="retentie">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s5.title')}</h2>
              <p className="leading-relaxed mb-5 text-gray-600">{t('gdpr.s5.intro')}</p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-900 w-3/5">Categorie de date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Durată retenție</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {retentionPeriods.map(({ category, duration }) => (
                      <tr key={category} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-700">{category}</td>
                        <td className="px-4 py-3 text-gray-600">{duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 8. Drepturile tale */}
            <section id="drepturi">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s6.title')}</h2>
              <p className="leading-relaxed mb-5 text-gray-600">{t('gdpr.s6.intro')}</p>
              <div className="grid md:grid-cols-2 gap-4">
                {rights.map(({ right, desc }) => (
                  <div key={right} className="p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{right}</h3>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-800 leading-relaxed">{t('gdpr.s6.contact')}</p>
              </div>
            </section>

            {/* 9. Transferuri internaționale */}
            <section id="transferuri">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s7.title')}</h2>
              <p className="leading-relaxed mb-4 text-gray-600">{t('gdpr.s7.p1')}</p>
              <ul className="space-y-2 mb-4">
                {transferSafeguards.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {s}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed">{t('gdpr.s7.p2')}</p>
            </section>

            {/* 10. Contact & reclamații */}
            <section id="contact">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gdpr.s8.title')}</h2>
              <p className="leading-relaxed mb-3">{t('gdpr.s8.p1')}</p>
              <p className="leading-relaxed mb-3 text-gray-600">{t('gdpr.s8.p2')}</p>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="font-semibold text-gray-900 text-sm mb-1">{t('gdpr.s8.authority')}</p>
                <p className="text-sm text-gray-600">{t('gdpr.s8.authorityDetails')}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
