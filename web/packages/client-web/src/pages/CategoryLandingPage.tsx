import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
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
  CheckCircle2,
  Clock,
  Star,
  Sparkles,
  Stars,
  Truck,
  Hammer,
  Building2,
  AppWindow,
  Home,
  Package,
  type LucideIcon,
} from 'lucide-react';

// Map DB-stored Lucide icon name strings → actual components
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  stars:    Stars,
  star:     Star,
  truck:    Truck,
  hammer:   Hammer,
  building: Building2,
  building2: Building2,
  window:   AppWindow,
  appwindow: AppWindow,
  home:     Home,
  package:  Package,
};

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

// ─── Animation constants ─────────────────────────────────────────────────────

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
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

  const minPrice = activeServices.length > 0
    ? Math.min(...activeServices.map((s) => s.basePricePerHour))
    : null;
  const maxPrice = activeServices.length > 0
    ? Math.max(...activeServices.map((s) => s.basePricePerHour))
    : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: category.nameRo,
    description:
      category.descriptionRo ||
      `Servicii profesionale de ${category.nameRo.toLowerCase()} in Romania`,
    provider: {
      '@type': 'Organization',
      name: 'Go2Fix',
      url: 'https://go2fix.ro',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Romania',
    },
    ...(minPrice !== null && {
      priceRange: minPrice === maxPrice ? `${minPrice} RON/h` : `${minPrice}-${maxPrice} RON/h`,
    }),
    ...(activeServices.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: category.nameRo,
        itemListElement: activeServices.map((service) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: service.nameRo,
            description: service.descriptionRo,
          },
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: service.basePricePerHour,
            priceCurrency: 'RON',
            unitText: 'HOUR',
          },
        })),
      },
    }),
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
      <section className="relative bg-gradient-to-br from-slate-50 via-blue-50/40 to-white overflow-hidden py-16 md:py-24">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[image:radial-gradient(circle,#dbeafe_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-50/80 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left: text content */}
            <motion.div
              className="flex-1 text-center md:text-left"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {category.icon && (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-400 text-3xl mb-6 shadow-lg shadow-blue-200">
                  {category.icon}
                </div>
              )}

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-4">
                {name}
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-6 max-w-xl">
                {description ||
                  (lang === 'en'
                    ? `Professional ${name.toLowerCase()} services. Book online with transparent pricing and verified teams.`
                    : `Servicii profesionale de ${name.toLowerCase()}. Rezerva online cu preturi transparente si echipe verificate.`)}
              </p>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-8">
                <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  ⭐ 4.9/5 {lang === 'en' ? 'rating' : 'rating'}
                </span>
                <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {lang === 'en' ? 'Verified companies' : 'Firme verificate'}
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {lang === 'en' ? 'Free cancellation' : 'Anulare gratuita'}
                </span>
              </div>

              <Link to={bookingUrl}>
                <Button size="lg" className="gap-2 shadow-lg shadow-blue-200/50">
                  {lang === 'en' ? 'Book now' : 'Rezerva acum'}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            {/* Right: image or stats card */}
            <motion.div
              className="flex-1 max-w-md w-full"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={name}
                  className="rounded-2xl shadow-xl w-full object-cover"
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-400 text-4xl mb-4 shadow-md shadow-blue-200">
                      {category.icon || '🏠'}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {lang === 'en' ? 'Starting from' : 'Pret de pornire'}
                    </p>
                    <p className="text-3xl font-black text-primary">60 lei/h</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        icon: '✅',
                        text:
                          lang === 'en'
                            ? 'Verified & insured team'
                            : 'Echipa verificata si asigurata',
                      },
                      {
                        icon: '⏱️',
                        text:
                          lang === 'en'
                            ? 'Same-day availability'
                            : 'Disponibilitate in aceeasi zi',
                      },
                      {
                        icon: '🧾',
                        text:
                          lang === 'en'
                            ? 'Invoice included'
                            : 'Factura inclusa automat',
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-sm text-gray-700"
                      >
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      {activeServices.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 mb-10">
              {lang === 'en' ? 'Available services' : 'Servicii disponibile'}
            </h2>
            <motion.div
              variants={staggerContainer}
              whileInView="visible"
              initial="hidden"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activeServices.map((service, index) => {
                const svcName =
                  lang === 'en' ? service.nameEn : service.nameRo;
                const svcDesc =
                  lang === 'en'
                    ? service.descriptionEn || service.descriptionRo || ''
                    : service.descriptionRo || '';
                // icon can be a Lucide name ("sparkles") or an emoji ("✨")
                const rawIcon = service.icon || SERVICE_ICONS[service.serviceType] || '🔧';
                const LucideIconComp = LUCIDE_ICON_MAP[rawIcon.toLowerCase()];

                return (
                  <motion.div key={service.id} variants={fadeUpItem}>
                    <Card className="relative p-6 hover:shadow-lg transition-shadow border-t-4 border-t-primary flex flex-col h-full">
                      {/* "Most popular" badge on first service */}
                      {index === 0 && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {lang === 'en'
                              ? '⭐ Most popular'
                              : '⭐ Cel mai popular'}
                          </span>
                        </div>
                      )}

                      {/* Service icon — renders Lucide component if icon is a name string, else emoji */}
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                        {LucideIconComp
                          ? <LucideIconComp className="h-6 w-6 text-primary" />
                          : <span className="text-2xl">{rawIcon}</span>
                        }
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {svcName}
                      </h3>
                      {svcDesc && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                          {svcDesc}
                        </p>
                      )}

                      {/* Pricing row */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-600">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {lang === 'en' ? 'From' : 'De la'}{' '}
                            {service.minHours}h
                          </span>
                        </div>
                        <div className="bg-primary/8 rounded-lg px-3 py-1.5">
                          <span className="text-base font-bold text-primary">
                            {service.pricingModel === 'PER_SQM'
                              ? `${service.pricePerSqm ?? service.basePricePerHour} lei/m²`
                              : `${service.basePricePerHour} lei/h`}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Trust / Why Go2Fix Section ── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Quality guarantee banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-8 text-white flex items-start gap-5 mb-8"
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">
                {lang === 'en' ? 'Quality guaranteed' : 'Calitate garantata'}
              </h3>
              <p className="text-blue-100 leading-relaxed max-w-2xl">
                {lang === 'en'
                  ? "If you're not satisfied with the result, the team comes back and redoes the job for free. No questions asked."
                  : 'Daca nu esti multumit de rezultat, echipa revine si reface lucrarea gratuit. Fara intrebari, fara birocratie.'}
              </p>
            </div>
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 mb-8">
            {lang === 'en' ? 'Why Go2Fix?' : 'De ce Go2Fix?'}
          </h2>

          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
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
              <motion.div key={badge.labelRo} variants={fadeUpItem}>
                <Card className="p-6 text-center h-full">
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative py-16 bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden">
        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 bg-[image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative container mx-auto px-4 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Social proof row */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-blue-100 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-amber-300 text-amber-300"
                />
              ))}
              <span className="ml-1">
                {lang === 'en'
                  ? 'Join 500+ happy clients'
                  : 'Alatura-te celor 500+ clienti multumiti'}
              </span>
            </div>

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

            <div className="mt-4">
              <Link
                to="/#cum-functioneaza"
                className="text-blue-200 hover:text-white text-sm underline underline-offset-2 transition-colors"
              >
                {lang === 'en' ? 'How does it work? →' : 'Cum functioneaza? →'}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
