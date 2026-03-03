import { Helmet } from 'react-helmet-async';

interface ArticleMeta {
  publishedTime: string;
  author: string;
  tags: string[];
}

interface AlternateUrl {
  ro: string;
  en: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  articleMeta?: ArticleMeta;
  structuredData?: object | object[];
  noIndex?: boolean;
  /** Current page language — drives og:locale */
  lang?: 'ro' | 'en';
  /** Alternate language paths for hreflang — relative paths (e.g. { ro: '/despre-noi', en: '/en/about-us' }) */
  alternateUrl?: AlternateUrl;
}

const BASE_URL = 'https://go2fix.ro';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;
const TWITTER_HANDLE = '@go2fix';

export default function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  articleMeta,
  structuredData,
  noIndex = false,
  lang = 'ro',
  alternateUrl,
}: SEOHeadProps) {
  const fullTitle = title.includes('Go2Fix') ? title : `${title} | Go2Fix`;
  const canonical = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : undefined;
  const ogLocale = lang === 'en' ? 'en_US' : 'ro_RO';
  const schemas = structuredData
    ? Array.isArray(structuredData) ? structuredData : [structuredData]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* hreflang — signals language variants to Google */}
      {alternateUrl && (
        <>
          <link rel="alternate" hrefLang="ro" href={`${BASE_URL}${alternateUrl.ro}`} />
          <link rel="alternate" hrefLang="en" href={`${BASE_URL}${alternateUrl.en}`} />
          <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${alternateUrl.ro}`} />
        </>
      )}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:site_name" content="Go2Fix" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {articleMeta && (
        <>
          <meta property="article:published_time" content={articleMeta.publishedTime} />
          <meta property="article:author" content={articleMeta.author} />
          {articleMeta.tags.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
