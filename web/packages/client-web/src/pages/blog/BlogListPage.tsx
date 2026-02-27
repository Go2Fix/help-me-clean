import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';
import {
  getPostsByLanguage,
  CATEGORY_COLORS,
  type BlogCategory,
} from '@/data/blog';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ['all', 'sfaturi', 'ghid-orase', 'cum-sa'] as const;
type FilterCategory = (typeof ALL_CATEGORIES)[number];

const CATEGORY_EMOJIS: Record<BlogCategory, string> = {
  sfaturi: '📋',
  'ghid-orase': '🗺️',
  'cum-sa': '✨',
};

const CATEGORY_COVER_GRADIENTS: Record<BlogCategory, string> = {
  sfaturi: 'from-blue-50 to-blue-100',
  'ghid-orase': 'from-emerald-50 to-emerald-100',
  'cum-sa': 'from-amber-50 to-amber-100',
};

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogListPage() {
  const { t } = useTranslation('blog');
  const { lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const posts = getPostsByLanguage(lang);
  const filtered =
    activeCategory === 'all'
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const dateLocale = lang === 'en' ? 'en-GB' : 'ro-RO';

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.blog[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.blog.ro, en: ROUTE_MAP.blog.en }}
      />

      <div className="bg-white">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white pt-16 pb-14 sm:pt-24 sm:pb-20">
          {/* Dot grid overlay */}
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Ambient blobs */}
          <div className="absolute -top-20 -left-20 w-[420px] h-[420px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-50/70 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Section pill label */}
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <span className="text-base leading-none">✍️</span>
                Blog
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.0] tracking-tight mb-5">
                {lang === 'en' ? (
                  <>
                    Tips{' '}
                    <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                      &amp;
                    </span>{' '}
                    guides
                  </>
                ) : (
                  <>
                    Sfaturi{' '}
                    <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                      &amp;
                    </span>{' '}
                    ghiduri
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-6">
                {t('heroSubtitle')}
              </p>

              {/* Social proof count */}
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-gray-700">{posts.length}</span>
                {lang === 'en' ? 'articles published' : 'articole publicate'}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Category filter (sticky pill bar) ────────────────────────────── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex gap-2 py-3 overflow-x-auto">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-sm shadow-blue-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {cat === 'all' ? t('categories.all') : t(`categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Posts grid ───────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          {filtered.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 py-20"
            >
              {t('noArticles')}
            </motion.p>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filtered.map((post, i) => (
                <motion.div
                  key={post.slug}
                  variants={fadeUpItem}
                  custom={i}
                >
                  <Link
                    to={`${ROUTE_MAP.blog[lang]}/${post.slug}`}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
                  >
                    {/* Cover */}
                    <div
                      className={`h-48 bg-gradient-to-br ${CATEGORY_COVER_GRADIENTS[post.category as BlogCategory]} flex items-center justify-center overflow-hidden`}
                    >
                      <span
                        className="text-6xl group-hover:scale-105 transition-transform duration-300 select-none"
                        role="img"
                        aria-label={post.category}
                      >
                        {CATEGORY_EMOJIS[post.category as BlogCategory]}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      {/* Category badge */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start mb-3 ${CATEGORY_COLORS[post.category as BlogCategory]}`}
                      >
                        {t(`categories.${post.category}`)}
                      </span>

                      {/* Title */}
                      <h2 className="text-gray-900 font-bold text-lg leading-snug mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-gray-500 text-sm flex-1 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      {/* Meta bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          {new Date(post.publishedAt).toLocaleDateString(dateLocale, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {post.readTimeMinutes} {t('readTime')}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── CTA section ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 py-20 px-4 text-center">
          {/* Decorative background text */}
          <span className="absolute inset-0 flex items-center justify-center text-white/5 text-[180px] font-black leading-none select-none pointer-events-none">
            Blog
          </span>

          {/* Ambient blobs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative max-w-xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('ctaTitle', 'Vrei să rezervi o curățenie?')}
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              {t('ctaSubtitle', 'Platforma noastră se lansează în curând.')}
            </p>
            <Link
              to={ROUTE_MAP.waitlist[lang]}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-blue-500 text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30"
            >
              {t('ctaButton', 'Înregistrează-te')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>

      </div>
    </>
  );
}
