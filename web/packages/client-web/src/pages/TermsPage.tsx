import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

export default function TermsPage() {
  const { t } = useTranslation('legal');
  const { lang } = useLanguage();

  const definitions = [
    { term: t('terms.s1.platform'), def: t('terms.s1.platformDef') },
    { term: t('terms.s1.user'), def: t('terms.s1.userDef') },
    { term: t('terms.s1.client'), def: t('terms.s1.clientDef') },
    { term: t('terms.s1.partner'), def: t('terms.s1.partnerDef') },
    { term: t('terms.s1.service'), def: t('terms.s1.serviceDef') },
    { term: t('terms.s1.account'), def: t('terms.s1.accountDef') },
  ];

  const obligations = [
    t('terms.s3.o1'),
    t('terms.s3.o2'),
    t('terms.s3.o3'),
    t('terms.s3.o4'),
    t('terms.s3.o5'),
    t('terms.s3.o6'),
    t('terms.s3.o7'),
  ];

  return (
    <>
      <SEOHead
        title={t('terms.meta.title')}
        description={t('terms.meta.description')}
        canonicalUrl={ROUTE_MAP.terms[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.terms.ro, en: ROUTE_MAP.terms.en }}
        noIndex={true}
      />
      <div className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('terms.title')}</h1>
            <p className="text-gray-500">
              <time dateTime="2024-01-01">{t('terms.lastUpdated')}</time>
            </p>
            <p className="text-gray-600 mt-4 leading-relaxed">
              {t('terms.intro')}
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-10 text-gray-700">
            {/* 1. Definiții */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s1.title')}</h2>
              <p className="leading-relaxed mb-4">
                {t('terms.s1.intro')}
              </p>
              <ul className="space-y-3">
                {definitions.map(({ term, def }) => (
                  <li key={term} className="flex gap-2">
                    <span className="font-semibold text-gray-900 shrink-0">&bdquo;{term}&rdquo;</span>
                    <span>&mdash; {def};</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 2. Utilizarea platformei */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s2.title')}</h2>
              <p className="leading-relaxed mb-4">{t('terms.s2.p1')}</p>
              <p className="leading-relaxed mb-4">{t('terms.s2.p2')}</p>
              <p className="leading-relaxed">{t('terms.s2.p3')}</p>
            </section>

            {/* 3. Obligațiile utilizatorului */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s3.title')}</h2>
              <p className="leading-relaxed mb-4">{t('terms.s3.intro')}</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {obligations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </section>

            {/* 4. Prețuri și plăți */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s4.title')}</h2>
              <p className="leading-relaxed mb-4">{t('terms.s4.p1')}</p>
              <p className="leading-relaxed mb-4">{t('terms.s4.p2')}</p>
              <p className="leading-relaxed">{t('terms.s4.p3')}</p>
            </section>

            {/* 5. Anulare, reprogramare și rambursare */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s5.title')}</h2>
              <p className="leading-relaxed mb-4">{t('terms.s5.p1')}</p>
              <p className="leading-relaxed mb-4">{t('terms.s5.p2')}</p>
              <p className="leading-relaxed">{t('terms.s5.p3')}</p>
            </section>

            {/* 6. Răspundere */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s6.title')}</h2>
              <p className="leading-relaxed mb-4">{t('terms.s6.p1')}</p>
              <p className="leading-relaxed">{t('terms.s6.p2')}</p>
            </section>

            {/* 7. Modificări */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s7.title')}</h2>
              <p className="leading-relaxed">{t('terms.s7.p1')}</p>
            </section>

            {/* 8. Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms.s8.title')}</h2>
              <p className="leading-relaxed">{t('terms.s8.p1')}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
