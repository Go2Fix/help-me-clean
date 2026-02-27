import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { Link } from 'react-router-dom';
import { CheckCircle, Users, TrendingUp, Shield, ArrowRight, Quote } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import { motion } from 'framer-motion';

// ─── Animation constants ──────────────────────────────────────────────────────

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Value card config ────────────────────────────────────────────────────────

const VALUE_STYLES = [
  { iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',   iconColor: 'text-white', pill: 'bg-blue-100 text-blue-700'    },
  { iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', iconColor: 'text-white', pill: 'bg-emerald-100 text-emerald-700' },
  { iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500', iconColor: 'text-white', pill: 'bg-amber-100 text-amber-700'   },
  { iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600', iconColor: 'text-white', pill: 'bg-purple-100 text-purple-700' },
];

export default function AboutPage() {
  const { t } = useTranslation('about');
  const { lang } = useLanguage();

  const values = [
    { icon: Shield,      title: t('values.transparency.title'), desc: t('values.transparency.desc') },
    { icon: CheckCircle, title: t('values.quality.title'),      desc: t('values.quality.desc')      },
    { icon: Users,       title: t('values.community.title'),    desc: t('values.community.desc')    },
    { icon: TrendingUp,  title: t('values.growth.title'),       desc: t('values.growth.desc')       },
  ];

  const stats = [
    { value: '2M+',    label: t('stats.households') },
    { value: '5.000+', label: t('stats.companies')  },
    { value: '80%',    label: t('stats.informal')   },
    { value: '2024',   label: t('stats.founded')    },
  ];

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.about[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.about.ro, en: ROUTE_MAP.about.en }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-50/70 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-blue-100 text-primary text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-5">
              Despre noi
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
              {t('hero.title').split('Go2Fix').map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                      Go2Fix
                    </span>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </h1>

            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </motion.div>

          {/* Stat pills row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mt-10"
          >
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm rounded-full px-5 py-2.5"
              >
                <span className="text-sm font-black text-primary">{value}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
          >
            <motion.div variants={fadeUpItem}>
              <span className="inline-block bg-blue-100 text-primary text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                Misiunea noastră
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 leading-tight">
                {t('mission.title')}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                <span className="text-xl font-black text-gray-900">
                  {t('mission.p1').split(' ').slice(0, 1).join(' ')}{' '}
                </span>
                {t('mission.p1').split(' ').slice(1).join(' ')}
              </p>
              <p className="text-gray-600 leading-relaxed">
                {t('mission.p2')}
              </p>
            </motion.div>

            <motion.div variants={fadeUpItem}>
              <div className="bg-blue-50 border-l-4 border-primary rounded-2xl p-8">
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="text-gray-700 text-lg italic leading-relaxed">
                  {t('mission.p2')}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-xs font-black text-white">
                    G2F
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Echipa Go2Fix</p>
                    <p className="text-xs text-gray-400">go2fix.ro</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden bg-gradient-to-r from-[#1e3a8a] to-[#1d4ed8]">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map(({ value, label }) => (
              <motion.div key={label} variants={fadeUpItem} className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-white mb-1">{value}</p>
                <p className="text-sm font-medium text-white/60">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-100 text-primary text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
              Ce ne definește
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              {t('values.title')}
            </h2>
          </div>

          <motion.div
            variants={staggerContainer}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {values.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUpItem}
                className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className={`w-12 h-12 rounded-xl ${VALUE_STYLES[i].iconBg} flex items-center justify-center mb-5`}>
                  <Icon className={`h-6 w-6 ${VALUE_STYLES[i].iconColor}`} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Founder quote ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-7xl font-serif text-gray-200 leading-none select-none block mb-2">"</span>
            <p className="text-xl sm:text-2xl font-medium text-gray-700 italic leading-relaxed mb-8">
              Am creat Go2Fix pentru că nu am găsit o firmă de curățenie de încredere când aveam nevoie de una.
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-sm font-black text-white">
                VM
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Fondator Go2Fix</p>
                <p className="text-xs text-gray-400">București, 2024</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 to-emerald-800 py-20 px-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block bg-emerald-800 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-5">
              Acces timpuriu
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-emerald-100/80 mb-8 text-lg">
              {t('cta.subtitle')}
            </p>
            <Link
              to={ROUTE_MAP.waitlist[lang]}
              className="inline-flex items-center gap-2 bg-white text-emerald-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors duration-200"
            >
              {t('cta.button')} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
