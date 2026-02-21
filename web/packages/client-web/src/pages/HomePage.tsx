import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import SEOHead from '@/components/seo/SEOHead';
import {
  Sparkles,
  CalendarCheck,
  Smile,
  ArrowRight,
  Star,
  Shield,
  CreditCard,
  Eye,
  Headphones,
  Building2,
  Users,
  TrendingUp,
  FileText,
  CheckCircle2,
  BadgeCheck,
  Banknote,
  CalendarX2,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AVAILABLE_SERVICES } from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceDefinition {
  id: string;
  serviceType: string;
  nameRo: string;
  descriptionRo: string;
  basePricePerHour: number;
  minHours: number;
  icon: string;
}

// ─── Static (icon/style only) data ───────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '🏠',
  DEEP_CLEANING: '✨',
  OFFICE_CLEANING: '🏢',
  POST_CONSTRUCTION: '🔨',
  MOVE_IN_OUT_CLEANING: '📦',
  WINDOW_CLEANING: '🪟',
  CARPET_CLEANING: '🧹',
  UPHOLSTERY_CLEANING: '🛋️',
};

const SERVICE_COLORS: Record<string, string> = {
  STANDARD_CLEANING: 'border-t-primary',
  DEEP_CLEANING: 'border-t-secondary',
  OFFICE_CLEANING: 'border-t-blue-400',
  POST_CONSTRUCTION: 'border-t-amber-500',
  MOVE_IN_OUT_CLEANING: 'border-t-purple-500',
  WINDOW_CLEANING: 'border-t-sky-400',
  CARPET_CLEANING: 'border-t-emerald-400',
  UPHOLSTERY_CLEANING: 'border-t-rose-400',
};

const TRUST_ITEM_STYLES = [
  { icon: Shield,      color: 'text-primary',    bg: 'bg-blue-50',    border: 'border-l-primary',    key: 'verified' },
  { icon: CreditCard,  color: 'text-secondary',  bg: 'bg-emerald-50', border: 'border-l-secondary',  key: 'payments' },
  { icon: Eye,         color: 'text-accent',      bg: 'bg-amber-50',   border: 'border-l-accent',     key: 'prices'   },
  { icon: Headphones,  color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-l-purple-500', key: 'support'  },
  { icon: Receipt,     color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-l-rose-500',   key: 'invoice'  },
];

const PARTNER_STEP_STYLES = [
  { icon: ClipboardList, step: '1', key: 'step1' },
  { icon: CheckCircle2,  step: '2', key: 'step2' },
  { icon: TrendingUp,    step: '3', key: 'step3' },
];

const PARTNER_BENEFIT_ICONS = [
  { icon: Users,      key: 'b1' },
  { icon: CreditCard, key: 'b2' },
  { icon: FileText,   key: 'b3' },
  { icon: TrendingUp, key: 'b4' },
];

const STATS_DATA = [
  { value: '500+', key: 'bookings' },
  { value: '50+',  key: 'companies' },
  { value: '4.9★', key: 'rating'   },
  { value: '100%', key: 'payments' },
];

const TRUST_BADGE_ICONS = [BadgeCheck, Banknote, Receipt, CheckCircle2, CalendarX2];
const TRUST_BADGE_KEYS  = ['verified', 'securePay', 'invoice', 'noSubscription', 'freeCancellation'] as const;

const TESTIMONIAL_KEYS  = ['t1', 't2', 't3'] as const;

const AVATAR_COLORS   = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
const AVATAR_INITIALS = ['M', 'A', 'E', 'D', 'R'];

// ─── Component ───────────────────────────────────────────────────────────────

function scrollToServices() {
  document.getElementById('servicii')?.scrollIntoView({ behavior: 'smooth' });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { lang } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isPreRelease } = usePlatform();
  const { data, loading } = useQuery(AVAILABLE_SERVICES);

  const isClient = isAuthenticated && user?.role === 'CLIENT';
  const isCompanyOrWorker =
    isAuthenticated && (user?.role === 'COMPANY_ADMIN' || user?.role === 'CLEANER');
  const isGlobalAdmin = isAuthenticated && user?.role === 'GLOBAL_ADMIN';

  const dashboardPath = isClient
    ? '/cont'
    : isCompanyOrWorker
      ? user?.role === 'COMPANY_ADMIN'
        ? '/firma'
        : '/worker'
      : '/admin';

  const services: ServiceDefinition[] = data?.availableServices ?? [];

  return (
    <div>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        lang={lang}
        canonicalUrl={lang === 'en' ? '/en/' : '/'}
        alternateUrl={{ ro: '/', en: '/en/' }}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Go2Fix',
          url: 'https://go2fix.ro',
          description: 'Prima platformă marketplace de servicii de curățenie din România',
          areaServed: 'Romania',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'contact@go2fix.ro',
          },
        }}
      />

      {isPreRelease && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 text-center">
          <p className="text-sm font-medium text-amber-800">
            {t('preReleaseBanner')}{' '}
            <Link to={ROUTE_MAP.waitlist[lang]} className="ml-1 underline font-semibold hover:text-amber-900">
              {t('preReleaseBannerLink')}
            </Link>
          </p>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-white pt-16 pb-12 sm:pt-24 sm:pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-4 w-4" />
                {t('hero.badge')}
              </div>

              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
                {t('hero.headline1')}<br />
                <span className="text-primary">{t('hero.headline2')}</span>
                {t('hero.headline3') && <><br />{t('hero.headline3')}</>}
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                {t('hero.subheadline')}
              </p>

              {authLoading ? (
                <div className="flex flex-col sm:flex-row gap-3 mb-10">
                  <div className="h-11 w-44 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-11 w-36 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mb-10">
                  {isCompanyOrWorker ? (
                    <Button size="lg" onClick={() => navigate(dashboardPath)}>
                      {t('hero.ctaDashboard')} <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : isGlobalAdmin ? (
                    <>
                      <Button size="lg" onClick={() => navigate('/admin')}>
                        {t('hero.ctaAdmin')} <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => scrollToServices()}>
                        {t('hero.ctaServices')}
                      </Button>
                    </>
                  ) : (
                    <>
                      {isPreRelease ? (
                        <Button size="lg" onClick={() => navigate(ROUTE_MAP.waitlist[lang])}>
                          {t('hero.ctaWaitlist')} <ArrowRight className="h-5 w-5" />
                        </Button>
                      ) : (
                        <Button size="lg" onClick={() => navigate(ROUTE_MAP.booking[lang])}>
                          {t('hero.ctaBook')} <ArrowRight className="h-5 w-5" />
                        </Button>
                      )}
                      {isClient ? (
                        <Button size="lg" variant="outline" onClick={() => navigate('/cont')}>
                          {t('hero.ctaMyAccount')}
                        </Button>
                      ) : (
                        <Button size="lg" variant="outline" onClick={() => scrollToServices()}>
                          {isPreRelease ? t('hero.ctaDiscover') : t('hero.ctaServices')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Social proof */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {AVATAR_COLORS.map((color, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {AVATAR_INITIALS[i]}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">500+</span> {t('hero.socialProof')}
                </p>
              </div>
            </div>

            {/* Right — decorative booking card mockup */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-70" />
              </div>
              <div className="relative w-full max-w-sm">
                {/* Main booking card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{t('bookingCard.confirmed')}</p>
                      <p className="text-lg font-bold text-gray-900">{t('bookingCard.service')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t('bookingCard.labelDate')}</span>
                      <span className="font-medium text-gray-900">{t('bookingCard.date')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t('bookingCard.labelDuration')}</span>
                      <span className="font-medium text-gray-900">{t('bookingCard.duration')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t('bookingCard.labelCompany')}</span>
                      <span className="font-medium text-gray-900">{t('bookingCard.company')}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{t('bookingCard.labelTotal')}</span>
                      <span className="text-xl font-black text-primary">{t('bookingCard.total')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
                    <p className="text-xs text-secondary font-semibold">{t('bookingCard.securePayment')}</p>
                  </div>
                </div>

                {/* Floating rating badge */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-2.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">4.9/5</p>
                    <p className="text-xs text-gray-400">{t('bookingCard.reviews')}</p>
                  </div>
                </div>

                {/* Floating firm badge */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{t('bookingCard.verifiedFirm')}</p>
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-gray-900">{t('bookingCard.company')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUST_BADGE_ICONS.map((Icon, i) => (
              <div key={TRUST_BADGE_KEYS[i]} className="flex items-center gap-2 text-sm text-gray-500">
                <Icon className="h-4 w-4 text-secondary flex-shrink-0" />
                <span>{t(`trustBadges.${TRUST_BADGE_KEYS[i]}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────────── */}
      <section id="servicii" className="py-20 sm:py-24 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">{t('services.sectionLabel')}</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('services.title')}
            </h2>
            <p className="text-gray-500 max-w-xl text-lg">
              {t('services.subtitle')}
            </p>
          </div>

          {loading ? (
            <LoadingSpinner text={t('services.loading')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`border-t-4 ${SERVICE_COLORS[service.serviceType] ?? 'border-t-gray-200'} hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                  onClick={() => navigate(`${ROUTE_MAP.booking[lang]}?service=${service.serviceType}`)}
                >
                  <div className="text-3xl mb-4">
                    {SERVICE_ICONS[service.serviceType] || service.icon || '🧹'}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    {service.nameRo}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {service.descriptionRo}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-primary">
                      {service.basePricePerHour} lei
                    </span>
                    <span className="text-sm text-gray-400">{t('services.priceUnit')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('services.minHours', { count: service.minHours })}
                  </p>
                </Card>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="cum-functioneaza" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">{t('howItWorks.sectionLabel')}</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-black mb-3">
                1
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{t('howItWorks.step1Title')}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('howItWorks.step1Desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CalendarCheck className="h-7 w-7 text-secondary" />
              </div>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-xs font-black mb-3">
                2
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{t('howItWorks.step2Title')}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('howItWorks.step2Desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <Smile className="h-7 w-7 text-accent" />
              </div>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-black mb-3">
                3
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{t('howItWorks.step3Title')}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('howItWorks.step3Desc')}
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate(ROUTE_MAP.booking[lang])}>
              {t('howItWorks.cta')} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS_DATA.map((stat) => (
              <div key={stat.key}>
                <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-white/60">{t(`stats.${stat.key}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Go2Fix ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">{t('trust.sectionLabel')}</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('trust.title')}
            </h2>
            <p className="text-gray-500 max-w-xl text-lg">
              {t('trust.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_ITEM_STYLES.map((item) => (
              <div
                key={item.key}
                className={`bg-white rounded-2xl p-6 border border-gray-100 border-l-4 ${item.border} shadow-sm`}
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`trust.${item.key}.title`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`trust.${item.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">{t('testimonials.sectionLabel')}</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('testimonials.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIAL_KEYS.map((key) => (
              <div key={key} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed text-sm flex-1 mb-5">
                  "{t(`testimonials.${key}.text`)}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-primary">
                    {t(`testimonials.${key}.name`).split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t(`testimonials.${key}.name`)}</p>
                    <p className="text-xs text-gray-400">{t(`testimonials.${key}.city`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Companies ────────────────────────────────────────────────────── */}
      {!authLoading && !isClient && !isCompanyOrWorker && (
        <section className="py-20 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-12">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-3">{t('partners.sectionLabel')}</p>
              <h2 className="text-4xl font-black text-gray-900 mb-4">
                {t('partners.title')}
              </h2>
              <p className="text-gray-500 max-w-xl text-lg">
                {t('partners.subtitle')}
              </p>
            </div>

            {/* Partner 3-step flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {PARTNER_STEP_STYLES.map((step) => (
                <div key={step.step} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-secondary font-black text-sm">
                    {step.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="h-4 w-4 text-secondary" />
                      <h3 className="text-base font-bold text-gray-900">{t(`partners.${step.key}Title`)}</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{t(`partners.${step.key}Desc`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {PARTNER_BENEFIT_ICONS.map((benefit) => (
                <div key={benefit.key} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{t(`partners.${benefit.key}Title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`partners.${benefit.key}Desc`)}</p>
                </div>
              ))}
            </div>

            <Link to="/inregistrare-firma">
              <Button size="lg">
                {t('partners.cta')} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
