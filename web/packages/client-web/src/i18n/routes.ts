import type { SupportedLanguage } from './config';
export type { SupportedLanguage };

/**
 * Central path-mapping table.
 * RO paths have no prefix. EN paths have /en/ prefix.
 * Add new languages here when ready.
 */
export const ROUTE_MAP: Record<string, Record<SupportedLanguage, string>> = {
  home:         { ro: '/',                    en: '/en/' },
  about:        { ro: '/despre-noi',          en: '/en/about-us' },
  forCompanies: { ro: '/pentru-firme',        en: '/en/for-companies' },
  contact:      { ro: '/contact',             en: '/en/contact' },
  waitlist:     { ro: '/lista-asteptare',     en: '/en/waitlist' },
  blog:         { ro: '/blog',                en: '/en/blog' },
  terms:        { ro: '/termeni',             en: '/en/terms' },
  privacy:      { ro: '/confidentialitate',   en: '/en/privacy' },
  gdpr:         { ro: '/confidentialitate',   en: '/en/privacy' },
  booking:      { ro: '/rezervare',           en: '/en/booking' },
  // Auth stays RO-only
  login:        { ro: '/autentificare',       en: '/autentificare' },
  registerFirm: { ro: '/inregistrare-firma',  en: '/inregistrare-firma' },
  // SEO comparison pages
  vsHomerun:    { ro: '/vs/homerun',          en: '/en/vs/homerun' },
  vsNecesit:    { ro: '/vs/necesit',          en: '/en/vs/necesit' },
};

/**
 * Detects current language from pathname.
 */
export function detectLanguageFromPath(pathname: string): SupportedLanguage {
  if (pathname.startsWith('/en/') || pathname === '/en') return 'en';
  return 'ro';
}

/**
 * Given a current path and target language, returns the equivalent path.
 * For blog posts with different slugs, use PageAlternateContext instead.
 */
export function getAlternatePath(currentPath: string, targetLang: SupportedLanguage): string {
  for (const key of Object.keys(ROUTE_MAP)) {
    const entry = ROUTE_MAP[key];
    if (currentPath === entry.ro || currentPath === entry.en) {
      return entry[targetLang];
    }
  }

  // Generic fallback: add or strip /en/ prefix
  if (targetLang === 'en' && !currentPath.startsWith('/en/')) {
    return `/en${currentPath === '/' ? '/' : currentPath}`;
  }
  if (targetLang === 'ro' && currentPath.startsWith('/en/')) {
    const stripped = currentPath.replace(/^\/en/, '');
    return stripped || '/';
  }
  return currentPath;
}
