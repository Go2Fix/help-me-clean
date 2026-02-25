import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useLanguage } from '@/context/LanguageContext';
import { usePlatform } from '@/context/PlatformContext';
import { ROUTE_MAP } from '@/i18n/routes';
import SEOHead from '@/components/seo/SEOHead';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { SERVICE_CATEGORY_BY_SLUG } from '@/graphql/operations';
import {
  ArrowRight,
  Shield,
  CreditCard,
  Receipt,
  BadgeCheck,
  Clock,
  Star,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceDef {
  id: string;
  serviceType: string;
  nameRo: string;
  nameEn: string;
  descriptionRo: string;
  descriptionEn: string;
  basePricePerHour: number;
  minHours: number;
  icon: string;
  isActive: boolean;
  pricingModel: string;
  pricePerSqm: number | null;
}

interface CategoryData {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  descriptionRo: string | null;
  descriptionEn: string | null;
  icon: string | null;
  imageUrl: string | null;
  isActive: boolean;
  services: ServiceDef[];
}

// ─── Service card icons ──────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '🏠',
  DEEP_CLEANING: '✨',
  OFFICE_CLEANING: '🏢',
  POST_CONSTRUCTION: '🔨',
  MOVE_IN_OUT_CLEANING: '📦',
  WINDOW_CLEANING: '🪟',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CategoryLandingPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { lang } = useLanguage();
  const { isPreRelease } = usePlatform();

  const { data, loading, error } = useQuery(SERVICE_CATEGORY_BY_SLUG, {
    variables: { slug: categorySlug },
    skip: !categorySlug,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data?.serviceCategoryBySlug) {
    return <Navigate to="/404" replace />;
  }

  const category: CategoryData = data.serviceCategoryBySlug;
  const activeServices = category.services.filter((s) => s.isActive);
  const name = lang === 'en' ? category.nameEn : category.nameRo;
  const description =
    lang === 'en'
      ? category.descriptionEn || category.descriptionRo || ''
      : category.descriptionRo || '';

  const bookingUrl = isPreRelease
    ? ROUTE_MAP.waitlist[lang]
    : `${ROUTE_MAP.booking[lang]}?category=${category.slug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: category.nameRo,
    description: category.descriptionRo || `Servicii profesionale de ${category.nameRo.toLowerCase()} in Romania`,
    provider: {
      '@type': 'Organization',
      name: 'Go2Fix',
      url: 'https://go2fix.ro',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Romania',
    },
  };

  return (
    <>
      <SEOHead
        title={`${name} - Servicii profesionale`}
        description={
          description ||
          `Servicii profesionale de ${name.toLowerCase()}. Rezerva online, pret transparent, echipe verificate.`
        }
        canonicalUrl={`/servicii/${category.slug}`}
        lang={lang}
        alternateUrl={{
          ro: `/servicii/${category.slug}`,
          en: `/en/services/${category.slug}`,
        }}
        structuredData={structuredData}
      />

      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              {category.icon && (
                <span className="text-5xl mb-4 block">{category.icon}</span>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {name}
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                {description ||
                  (lang === 'en'
                    ? `Professional ${name.toLowerCase()} services. Book online with transparent pricing and verified teams.`
                    : `Servicii profesionale de ${name.toLowerCase()}. Rezerva online cu preturi transparente si echipe verificate.`)}
              </p>
              <Link to={bookingUrl}>
                <Button size="lg" className="gap-2">
                  {lang === 'en' ? 'Book now' : 'Rezerva acum'}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            {category.imageUrl && (
              <div className="flex-1 max-w-md">
                <img
                  src={category.imageUrl}
                  alt={name}
                  className="rounded-2xl shadow-lg w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      {activeServices.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-10">
              {lang === 'en' ? 'Available services' : 'Servicii disponibile'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeServices.map((service) => {
                const svcName =
                  lang === 'en' ? service.nameEn : service.nameRo;
                const svcDesc =
                  lang === 'en'
                    ? service.descriptionEn || service.descriptionRo || ''
                    : service.descriptionRo || '';
                const iconEmoji =
                  service.icon ||
                  SERVICE_ICONS[service.serviceType] ||
                  '🔧';

                return (
                  <Card
                    key={service.id}
                    className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-primary"
                  >
                    <div className="text-3xl mb-3">{iconEmoji}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {svcName}
                    </h3>
                    {svcDesc && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                        {svcDesc}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {lang === 'en' ? 'From' : 'De la'}{' '}
                        {service.minHours}h
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {service.pricingModel === 'PER_SQM'
                          ? `${service.pricePerSqm ?? service.basePricePerHour} lei/m²`
                          : `${service.basePricePerHour} lei/h`}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust Badges ── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-10">
            {lang === 'en' ? 'Why Go2Fix?' : 'De ce Go2Fix?'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BadgeCheck,
                color: 'text-primary',
                bg: 'bg-blue-50',
                labelRo: 'Echipe verificate',
                labelEn: 'Verified teams',
                descRo: 'Toti lucratorii sunt verificati si evaluati',
                descEn: 'All workers are verified and assessed',
              },
              {
                icon: CreditCard,
                color: 'text-secondary',
                bg: 'bg-emerald-50',
                labelRo: 'Plata sigura',
                labelEn: 'Secure payment',
                descRo: 'Platesti online, rapid si in siguranta',
                descEn: 'Pay online quickly and securely',
              },
              {
                icon: Receipt,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
                labelRo: 'Factura inclusa',
                labelEn: 'Invoice included',
                descRo: 'Primesti factura electronica automat',
                descEn: 'Receive electronic invoice automatically',
              },
              {
                icon: Shield,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                labelRo: 'Garantie calitate',
                labelEn: 'Quality guarantee',
                descRo: 'Refacere gratuita daca nu esti multumit',
                descEn: 'Free redo if you are not satisfied',
              },
            ].map((badge) => (
              <Card key={badge.labelRo} className="p-6 text-center">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${badge.bg} ${badge.color} mb-4`}
                >
                  <badge.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {lang === 'en' ? badge.labelEn : badge.labelRo}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'en' ? badge.descEn : badge.descRo}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Star className="h-10 w-10 mx-auto mb-4 text-amber-300" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {lang === 'en'
              ? `Ready for professional ${name.toLowerCase()}?`
              : `Pregatit pentru ${name.toLowerCase()} profesional${name.endsWith('e') ? 'a' : ''}?`}
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            {lang === 'en'
              ? 'Book in under 2 minutes. Choose your preferred date, time and team.'
              : 'Rezerva in mai putin de 2 minute. Alege data, ora si echipa preferata.'}
          </p>
          <Link to={bookingUrl}>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary hover:bg-blue-50 gap-2"
            >
              {lang === 'en' ? 'Book now' : 'Rezerva acum'}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
