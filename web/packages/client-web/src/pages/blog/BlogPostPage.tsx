import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import SEOHead from '@/components/seo/SEOHead';
import {
  getPostBySlug,
  getRelatedPosts,
  getLinkedPost,
  CATEGORY_COLORS,
} from '@/data/blog';
import { useLanguage } from '@/context/LanguageContext';
import { usePageAlternate } from '@/context/PageAlternateContext';
import { ROUTE_MAP } from '@/i18n/routes';
import type { BlogCategory } from '@/data/blog';

// ─── Markdown custom components ──────────────────────────────────────────────

const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4 pb-3 border-b border-gray-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-5 text-[1.0625rem]">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-2.5 mb-6 ml-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-2.5 mb-6 ml-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2.5 text-gray-700 leading-relaxed">
      <span className="text-blue-500 mt-[6px] shrink-0 text-xs">●</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 rounded-r-2xl px-6 py-4 my-6 text-gray-700 not-italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-8 rounded-2xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left px-5 py-3 font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }) => <td className="px-5 py-3 text-gray-600">{children}</td>,
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2 accent-blue-600 w-4 h-4 rounded"
    />
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  code: ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BlogPostPage() {
  const { t } = useTranslation('blog');
  const { lang } = useLanguage();
  const { setAlternateUrl } = usePageAlternate();
  const { slug } = useParams<{ slug: string }>();
  const post = getPostBySlug(slug ?? '');

  const linkedPost = post ? getLinkedPost(post) : undefined;
  const roSlug = post?.lang === 'ro' ? post.slug : linkedPost?.slug;
  const enSlug = post?.lang === 'en' ? post.slug : linkedPost?.slug;

  useEffect(() => {
    const ro = roSlug ? `/blog/${roSlug}` : ROUTE_MAP.blog.ro;
    const en = enSlug ? `/en/blog/${enSlug}` : ROUTE_MAP.blog.en;
    setAlternateUrl({ ro, en });
    return () => setAlternateUrl(null);
  }, [roSlug, enSlug, setAlternateUrl]);

  if (!post) return <Navigate to={ROUTE_MAP.blog[lang]} replace />;

  const related = getRelatedPosts(post.slug, 2, lang);
  const dateLocale = lang === 'en' ? 'en-GB' : 'ro-RO';
  const canonicalPath = post.lang === 'en' ? `/en/blog/${post.slug}` : `/blog/${post.slug}`;

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: `https://go2fix.ro/og-image.jpg`,
    author: { '@type': 'Organization', name: 'Go2Fix', url: 'https://go2fix.ro' },
    publisher: {
      '@type': 'Organization',
      name: 'Go2Fix',
      url: 'https://go2fix.ro',
      logo: { '@type': 'ImageObject', url: 'https://go2fix.ro/logo.png' },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: `https://go2fix.ro${canonicalPath}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://go2fix.ro${canonicalPath}` },
    keywords: post.tags.join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Blog',
        item: post.lang === 'en' ? 'https://go2fix.ro/en/blog' : 'https://go2fix.ro/blog',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.title,
        item: `https://go2fix.ro${canonicalPath}`,
      },
    ],
  };

  const handleShareClick = () => {
    void navigator.clipboard.writeText(window.location.href);
  };

  return (
    <>
      <SEOHead
        title={post.metaTitle}
        description={post.metaDescription}
        canonicalUrl={canonicalPath}
        lang={lang}
        ogType="article"
        articleMeta={{
          publishedTime: post.publishedAt,
          author: post.author,
          tags: post.tags,
        }}
        structuredData={[blogPostingSchema, breadcrumbSchema]}
      />

      <div className="bg-white">
        {/* Hero strip */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 pt-8 pb-10">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm text-gray-400 mb-6"
            >
              <Link to={ROUTE_MAP.home[lang]} className="hover:text-gray-700 transition-colors">
                {lang === 'en' ? 'Home' : 'Acasă'}
              </Link>
              <span aria-hidden="true">/</span>
              <Link to={ROUTE_MAP.blog[lang]} className="hover:text-gray-700 transition-colors">
                Blog
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-gray-600 truncate max-w-[180px] sm:max-w-none">
                {post.title}
              </span>
            </nav>

            {/* Category badge */}
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[post.category as BlogCategory]}`}
            >
              {t(`categories.${post.category}`)}
            </span>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-5 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-lg text-gray-500 mb-6 leading-relaxed">{post.excerpt}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {new Date(post.publishedAt).toLocaleDateString(dateLocale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {post.readTimeMinutes} {t('readTime')}
              </span>
              <span className="text-gray-500 font-medium">{post.author}</span>
              <button
                onClick={handleShareClick}
                className="flex items-center gap-1.5 ml-auto hover:text-gray-700 transition-colors"
                aria-label={lang === 'en' ? 'Copy article link' : 'Copiază link-ul articolului'}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {lang === 'en' ? 'Copy link' : 'Copiază link'}
              </button>
            </div>
          </div>
        </div>

        {/* Article body */}
        <div className="max-w-3xl mx-auto px-4 py-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {post.content}
          </ReactMarkdown>

          {/* Tags */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-400 mb-3">{lang === 'en' ? 'Tags:' : 'Etichete:'}</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA box */}
        <div className="max-w-3xl mx-auto px-4 pb-12">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-8 text-center shadow-lg shadow-blue-200">
            <div className="text-3xl mb-3">✨</div>
            <h2 className="text-2xl font-bold mb-2">{t('ctaTitle')}</h2>
            <p className="text-blue-100 mb-6 max-w-sm mx-auto">{t('ctaSubtitle')}</p>
            <Link
              to={ROUTE_MAP.waitlist[lang]}
              className="inline-block bg-white text-blue-600 font-semibold px-7 py-3 rounded-xl hover:bg-blue-50 transition shadow"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="bg-gray-50 py-12 px-4 border-t border-gray-100">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('relatedTitle')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    to={`${ROUTE_MAP.blog[lang]}/${p.slug}`}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group"
                  >
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[p.category as BlogCategory]}`}
                    >
                      {t(`categories.${p.category}`)}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-3 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{p.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            to={ROUTE_MAP.blog[lang]}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('backToBlog')}
          </Link>
        </div>
      </div>
    </>
  );
}
