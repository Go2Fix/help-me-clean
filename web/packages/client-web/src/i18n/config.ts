import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const SUPPORTED_LANGUAGES = ['ro', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: 'ro',
    defaultNS: 'common',
    ns: ['common', 'home', 'waitlist', 'about', 'contact', 'companies', 'blog', 'legal', 'auth', 'vs'],

    detection: {
      // Detect language from URL path (/en/... → 'en', else 'ro')
      // Our LanguageContext also calls i18n.changeLanguage() on navigation
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
