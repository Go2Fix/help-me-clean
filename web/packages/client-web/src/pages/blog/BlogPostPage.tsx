import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';
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
        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-gray-500 mb-6"
          >
            <Link to={ROUTE_MAP.home[lang]} className="hover:text-gray-900 transition-colors">
              {lang === 'en' ? 'Home' : 'Acasă'}
            </Link>
            <span aria-hidden="true">/</span>
            <Link to={ROUTE_MAP.blog[lang]} className="hover:text-gray-900 transition-colors">
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-700 truncate">{post.title}</span>
          </nav>

          {/* Category badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category as BlogCategory]}`}
          >
            {t(`categories.${post.category}`)}
          </span>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-4">
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-gray-200">
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
            <span>{post.author}</span>
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

        {/* Article body */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div
            className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">{lang === 'en' ? 'Tags:' : 'Etichete:'}</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA box */}
        <div className="max-w-3xl mx-auto px-4 pb-12">
          <div className="bg-blue-600 text-white rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">
              {t('ctaTitle')}
            </h2>
            <p className="text-blue-100 mb-6">
              {t('ctaSubtitle')}
            </p>
            <Link
              to={ROUTE_MAP.waitlist[lang]}
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {t('relatedTitle')}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    to={`${ROUTE_MAP.blog[lang]}/${p.slug}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[p.category as BlogCategory]}`}
                    >
                      {t(`categories.${p.category}`)}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-2 mb-1 hover:text-blue-600 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {p.excerpt}
                    </p>
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
