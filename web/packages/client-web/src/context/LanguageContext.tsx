import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { detectLanguageFromPath, type SupportedLanguage } from '@/i18n/routes';
import { useAuth } from '@/context/AuthContext';

interface LanguageContextValue {
  lang: SupportedLanguage;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'ro' });

const DASHBOARD_PREFIXES = ['/cont', '/firma', '/worker', '/admin'];

function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // For dashboard routes, use user's saved preference. For public pages, detect from URL path.
  const lang: SupportedLanguage =
    isDashboardRoute(pathname) && user?.preferredLanguage
      ? (user.preferredLanguage as SupportedLanguage)
      : detectLanguageFromPath(pathname);

  useEffect(() => {
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  return (
    <LanguageContext.Provider value={{ lang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

// Re-export the type for convenience
export type { SupportedLanguage };
