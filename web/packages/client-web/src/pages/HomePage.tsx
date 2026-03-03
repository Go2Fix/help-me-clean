import { useRef, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import SEOHead from '@/components/seo/SEOHead';
import { motion, useInView } from 'framer-motion';
import {
  CheckCircle2,
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
  BadgeCheck,
  Banknote,
  CalendarX2,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AppComingSoonSection from '@/components/common/AppComingSoonSection';
import { SERVICE_CATEGORIES } from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
}

// ─── Coming-soon placeholder categories (frontend-only) ─────────────────────

const COMING_SOON_CATEGORIES = [
  { slug: 'dezinfectie', icon: '🦠', nameRo: 'Dezinfecție', nameEn: 'Disinfection', descKey: 'disinfectionDesc' },
  { slug: 'instalatii', icon: '🔧', nameRo: 'Instalații sanitare', nameEn: 'Plumbing', descKey: 'plumbingDesc' },
  { slug: 'electrician', icon: '⚡', nameRo: 'Electrician', nameEn: 'Electrical', descKey: 'electricalDesc' },
];

const CATEGORY_DESC_KEYS: Record<string, string> = {
  curatenie: 'cleaningDesc',
};

const CATEGORY_ICONS: Record<string, string> = {
  curatenie: '🧹',
  dezinfectie: '🦠',
  instalatii: '🔧',
  electrician: '⚡',
};

const CATEGORY_COLORS: Record<string, string> = {
  curatenie: 'border-t-primary',
  dezinfectie: 'border-t-secondary',
  instalatii: 'border-t-amber-500',
  electrician: 'border-t-purple-500',
};

const TRUST_ITEM_STYLES = [
  { icon: Shield,     color: 'text-primary',    bg: 'bg-blue-50',    border: 'border-l-primary',    key: 'verified' },
  { icon: CreditCard, color: 'text-secondary',  bg: 'bg-emerald-50', border: 'border-l-secondary',  key: 'payments' },
  { icon: Eye,        color: 'text-accent',      bg: 'bg-amber-50',   border: 'border-l-accent',     key: 'prices'   },
  { icon: Headphones, color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-l-purple-500', key: 'support'  },
  { icon: Receipt,    color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-l-rose-500',   key: 'invoice'  },
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
  { rawValue: 500, suffix: '+', key: 'bookings' },
  { rawValue: 50,  suffix: '+', key: 'companies' },
  { rawValue: 4.9, suffix: '★', key: 'rating'   },
  { rawValue: 100, suffix: '%', key: 'payments' },
];

const TRUST_BADGE_ICONS = [BadgeCheck, Banknote, Receipt, CheckCircle2, CalendarX2, Star, Headphones, Shield, Eye, Building2];
const TRUST_BADGE_KEYS  = ['verified', 'securePay', 'invoice', 'noSubscription', 'freeCancellation', 'rating', 'support', 'guarantee', 'transparent', 'partners'] as const;

const TESTIMONIAL_KEYS = ['t1', 't2', 't3'] as const;

const AVATAR_COLORS   = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
const AVATAR_INITIALS = ['M', 'A', 'E', 'D', 'C'];

// ─── Animation constants ──────────────────────────────────────────────────────

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── StatItem subcomponent ────────────────────────────────────────────────────

interface StatItemProps {
  rawValue: number;
  suffix: string;
  labelKey: string;
  t: (k: string) => string;
}

function StatItem({ rawValue, suffix, labelKey, t }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const frames = Math.round(duration / 16);
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / frames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.min(rawValue * eased, rawValue));
      if (frame >= frames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, rawValue]);

  const display = suffix === '★' ? count.toFixed(1) : Math.floor(count).toString();

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl sm:text-5xl font-black text-white mb-1">
        {display}{suffix}
      </p>
      <p className="text-sm font-medium text-white/60">{t(`stats.${labelKey}`)}</p>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function scrollToServices() {
  document.getElementById('servicii')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { lang } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isPreRelease, loading: platformLoading } = usePlatform();
  const { data: categoriesData, loading: categoriesLoading } = useQuery(SERVICE_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });

  const isClient = isAuthenticated && user?.role === 'CLIENT';
  const isCompanyOrWorker =
    isAuthenticated && (user?.role === 'COMPANY_ADMIN' || user?.role === 'WORKER');
  const isGlobalAdmin = isAuthenticated && user?.role === 'GLOBAL_ADMIN';

  const dashboardPath = isClient
    ? '/cont'
    : isCompanyOrWorker
      ? user?.role === 'COMPANY_ADMIN'
        ? '/firma'
        : '/worker'
      : '/admin';

  const categories: ServiceCategory[] = categoriesData?.serviceCategories ?? [];
  // Filter out any coming-soon slugs that now exist as real categories in the DB
  const realSlugs = new Set(categories.map((c) => c.slug));
  const comingSoon = COMING_SOON_CATEGORIES.filter((c) => !realSlugs.has(c.slug));

  return (
    <div>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        lang={lang}
        canonicalUrl={lang === 'en' ? '/en/' : '/'}
        alternateUrl={{ ro: '/', en: '/en/' }}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Go2Fix',
            url: 'https://go2fix.ro',
            logo: 'https://go2fix.ro/logo.png',
            email: 'contact@go2fix.ro',
            telephone: '+40726433942',
            address: { '@type': 'PostalAddress', addressCountry: 'RO' },
            description: 'Prima platformă marketplace de servicii de curățenie din România',
            areaServed: 'Romania',
            sameAs: [
              'https://www.facebook.com/go2fix',
              'https://www.instagram.com/go2fix',
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              email: 'contact@go2fix.ro',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Go2Fix',
            url: 'https://go2fix.ro',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://go2fix.ro/servicii/{search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      {!platformLoading && isPreRelease && (
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
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white pt-16 pb-12 sm:pt-24 sm:pb-16">
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[image:radial-gradient(circle,#dbeafe_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 pointer-events-none" />
        {/* Top-left blob */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        {/* Bottom-right blob */}
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-50/70 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left — text */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-6"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t('hero.badge')}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.0] tracking-tight mb-6"
              >
                {t('hero.headline1')}<br />
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  {t('hero.headline2')}
                </span>
                {t('hero.headline3') && <><br />{t('hero.headline3')}</>}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg"
              >
                {t('hero.subheadline')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                {authLoading || platformLoading ? (
                  <>
                    <div className="h-11 w-44 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-11 w-36 bg-gray-100 rounded-xl animate-pulse" />
                  </>
                ) : isCompanyOrWorker ? (
                  <Button size="lg" onClick={() => navigate(dashboardPath)}>
                    {t('hero.ctaDashboard')} <ArrowRight className="h-5 w-5" />
                  </Button>
                ) : isGlobalAdmin ? (
                  <>
                    <Button size="lg" onClick={() => navigate('/admin')}>
                      {t('hero.ctaAdmin')} <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={scrollToServices}>
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
                      <Button size="lg" variant="outline" onClick={scrollToServices}>
                        {isPreRelease ? t('hero.ctaDiscover') : t('hero.ctaServices')}
                      </Button>
                    )}
                  </>
                )}
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="flex items-center gap-3"
              >
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
              </motion.div>
            </motion.div>

            {/* Right — decorative booking card mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-70" />
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="relative w-full max-w-sm"
              >
                {/* Main booking card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                        {t('bookingCard.confirmed')}
                      </p>
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

                {/* Team arrival badge */}
                <div className="absolute bottom-16 -right-6 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-md px-3 py-2.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700">{t('bookingCard.teamArrival')}</p>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Trust bar — scrolling marquee ─────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white py-5 overflow-hidden">
        <div className="flex w-max animate-[marquee_28s_linear_infinite]">
          {/* Copy 1 — pr-5 matches gap-5 so both copies have identical width */}
          <div className="flex items-center gap-5 pr-5">
            {TRUST_BADGE_KEYS.map((key, i) => {
              const Icon = TRUST_BADGE_ICONS[i];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-5 py-2 text-sm text-gray-600 font-medium flex-shrink-0"
                >
                  <Icon className="h-4 w-4 text-secondary flex-shrink-0" />
                  {t(`trustBadges.${key}`)}
                </div>
              );
            })}
          </div>
          {/* Copy 2 — identical to copy 1, seamlessly continues the loop */}
          <div className="flex items-center gap-5 pr-5" aria-hidden="true">
            {TRUST_BADGE_KEYS.map((key, i) => {
              const Icon = TRUST_BADGE_ICONS[i];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-5 py-2 text-sm text-gray-600 font-medium flex-shrink-0"
                >
                  <Icon className="h-4 w-4 text-secondary flex-shrink-0" />
                  {t(`trustBadges.${key}`)}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <section id="servicii" className="py-20 sm:py-24 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 relative">
            <span className="absolute right-0 top-0 text-[120px] font-black text-gray-100/80 leading-none select-none hidden lg:block">
              01
            </span>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              {t('categories.sectionLabel')}
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('categories.title')}
            </h2>
            <p className="text-gray-500 max-w-xl text-lg">
              {t('categories.subtitle')}
            </p>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="categories-skeleton">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-t-4 border-t-gray-200 animate-pulse">
                  <div className="h-12 w-12 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
                  <div className="h-4 w-full bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-4" />
                  <div className="h-5 w-28 bg-gray-200 rounded" />
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              whileInView="visible"
              initial="hidden"
              viewport={{ once: true, margin: '-80px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* Active categories from DB */}
              {categories.map((category) => {
                const categoryPath = lang === 'en'
                  ? `/en/services/${category.slug}`
                  : `/servicii/${category.slug}`;
                const descKey = CATEGORY_DESC_KEYS[category.slug] || 'cleaningDesc';
                return (
                  <motion.div key={category.id} variants={fadeUpItem}>
                    <Card
                      className={cn(
                        'border-t-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full',
                        CATEGORY_COLORS[category.slug] ?? 'border-t-primary'
                      )}
                      onClick={() => navigate(categoryPath)}
                    >
                      <div className="text-4xl mb-4">
                        {CATEGORY_ICONS[category.slug] || category.icon || '🏠'}
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-primary transition-colors">
                        {lang === 'en' ? category.nameEn : category.nameRo}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                        {t(`categories.${descKey}`)}
                      </p>
                      <p className="text-xs text-gray-400 mb-4">
                        {t('categories.priceFrom')} 60 lei/h
                      </p>
                      <div className="flex items-center gap-1.5 text-primary font-semibold text-sm group-hover:gap-2.5 transition-all">
                        {t('categories.viewCategory')} <ArrowRight className="h-4 w-4" />
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {/* Coming-soon placeholder categories */}
              {comingSoon.map((placeholder) => (
                <motion.div key={placeholder.slug} variants={fadeUpItem}>
                  <Card
                    className={cn(
                      'border-t-4 opacity-60 relative overflow-hidden cursor-not-allowed h-full',
                      CATEGORY_COLORS[placeholder.slug] ?? 'border-t-gray-300'
                    )}
                  >
                    <div className="absolute top-3 right-3">
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {t('categories.comingSoon')}
                      </span>
                    </div>
                    <div className="blur-sm">
                      <div className="text-4xl mb-4">
                        {placeholder.icon}
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mb-2">
                        {lang === 'en' ? placeholder.nameEn : placeholder.nameRo}
                      </h3>
                      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                        {t(`categories.${placeholder.descKey}`)}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="cum-functioneaza" className="py-20 sm:py-24 bg-gray-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-16 text-center relative">
            <span className="absolute left-0 top-0 text-[120px] font-black text-gray-100/80 leading-none select-none hidden lg:block">
              02
            </span>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              {t('howItWorks.sectionLabel')}
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Step 1 */}
            <motion.div variants={fadeUpItem} className="relative px-8 py-10">
              <span className="absolute inset-0 flex items-center justify-center text-[100px] font-black text-gray-100/60 leading-none select-none pointer-events-none">
                1
              </span>
              <div className="relative">
                <div className="relative w-14 h-14 mx-auto mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center border-2 border-gray-50">
                    1
                  </div>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2 text-center">{t('howItWorks.step1Title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed text-center">
                  {t('howItWorks.step1Desc')}
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeUpItem} className="relative px-8 py-10">
              <span className="absolute inset-0 flex items-center justify-center text-[100px] font-black text-gray-100/60 leading-none select-none pointer-events-none">
                2
              </span>
              <div className="relative">
                <div className="relative w-14 h-14 mx-auto mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <CalendarCheck className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary text-white text-sm font-black flex items-center justify-center border-2 border-gray-50">
                    2
                  </div>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2 text-center">{t('howItWorks.step2Title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed text-center">
                  {t('howItWorks.step2Desc')}
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeUpItem} className="relative px-8 py-10">
              <span className="absolute inset-0 flex items-center justify-center text-[100px] font-black text-gray-100/60 leading-none select-none pointer-events-none">
                3
              </span>
              <div className="relative">
                <div className="relative w-14 h-14 mx-auto mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <Smile className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-white text-sm font-black flex items-center justify-center border-2 border-gray-50">
                    3
                  </div>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2 text-center">{t('howItWorks.step3Title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed text-center">
                  {t('howItWorks.step3Desc')}
                </p>
              </div>
            </motion.div>
          </motion.div>

          <div className="text-center mt-12">
            {isPreRelease ? (
              <Button size="lg" onClick={() => navigate(ROUTE_MAP.waitlist[lang])}>
                {t('howItWorks.ctaWaitlist')} <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate(ROUTE_MAP.booking[lang])}>
                {t('howItWorks.cta')} <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden bg-gradient-to-r from-primary via-blue-600 to-blue-700">
        <div className="absolute inset-0 bg-[image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS_DATA.map((stat) => (
              <StatItem
                key={stat.key}
                rawValue={stat.rawValue}
                suffix={stat.suffix}
                labelKey={stat.key}
                t={t}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Go2Fix ───────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              {t('trust.sectionLabel')}
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('trust.title')}
            </h2>
            <p className="text-gray-500 max-w-xl text-lg">
              {t('trust.subtitle')}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {/* Featured guarantee card — spans full width */}
            <motion.div
              variants={fadeUpItem}
              className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-8 text-white flex items-start gap-5"
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">
                  {t('trust.sectionLabel')}
                </p>
                <h3 className="text-xl font-bold mb-2">{t('trust.guarantee.title')}</h3>
                <p className="text-blue-100 leading-relaxed max-w-2xl">{t('trust.guarantee.desc')}</p>
              </div>
            </motion.div>

            {/* Remaining trust cards */}
            {TRUST_ITEM_STYLES.map((item) => (
              <motion.div
                key={item.key}
                variants={fadeUpItem}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`trust.${item.key}.title`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`trust.${item.key}.desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              {t('testimonials.sectionLabel')}
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {t('testimonials.title')}
            </h2>
          </div>

          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {TESTIMONIAL_KEYS.map((key) => (
              <motion.div
                key={key}
                variants={fadeUpItem}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col"
              >
                <div className="text-7xl text-gray-100 font-serif leading-none mb-1 select-none">"</div>
                <p className="text-gray-700 leading-relaxed text-sm flex-1 mb-4">
                  {t(`testimonials.${key}.text`)}
                </p>
                <div className="flex gap-0.5 mb-5 mt-auto">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-xs font-bold text-white">
                    {t(`testimonials.${key}.name`).split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t(`testimonials.${key}.name`)}</p>
                    <p className="text-xs text-gray-400">{t(`testimonials.${key}.city`)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── App Coming Soon ───────────────────────────────────────────────── */}
      <AppComingSoonSection />

      {/* ── For Companies ────────────────────────────────────────────────────── */}
      {(authLoading || (!isClient && !isCompanyOrWorker)) && (
        <section className={cn(
          'py-20 sm:py-24 relative overflow-hidden transition-opacity duration-300',
          'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900',
          authLoading ? 'opacity-0' : 'opacity-100'
        )}>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-12">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-emerald-300" />
              </div>
              <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">
                {t('partners.sectionLabel')}
              </p>
              <h2 className="text-4xl font-black text-white mb-4">
                {t('partners.title')}
              </h2>
              <p className="text-emerald-100/70 max-w-xl text-lg">
                {t('partners.subtitle')}
              </p>
            </div>

            {/* Partner 3-step flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {PARTNER_STEP_STYLES.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 items-start bg-white/10 border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 font-black text-sm">
                    {step.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-base font-bold text-white">{t(`partners.${step.key}Title`)}</h3>
                    </div>
                    <p className="text-sm text-emerald-100/70 leading-relaxed">{t(`partners.${step.key}Desc`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {PARTNER_BENEFIT_ICONS.map((benefit) => (
                <div
                  key={benefit.key}
                  className="bg-white/8 border border-white/10 rounded-2xl p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-400/15 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-emerald-300" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{t(`partners.${benefit.key}Title`)}</h3>
                  <p className="text-sm text-emerald-100/70 leading-relaxed">{t(`partners.${benefit.key}Desc`)}</p>
                </div>
              ))}
            </div>

            <Link to={ROUTE_MAP.registerFirm[lang]}>
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50">
                {t('partners.cta')} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
