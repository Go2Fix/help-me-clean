import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@go2fix/shared';
import { useLanguage } from '@/context/LanguageContext';
import { usePageAlternate } from '@/context/PageAlternateContext';
import { getAlternatePath, type SupportedLanguage } from '@/i18n/routes';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { alternateUrl } = usePageAlternate();

  function switchTo(targetLang: SupportedLanguage) {
    if (targetLang === lang) return;
    let targetPath: string;
    if (alternateUrl) {
      targetPath = alternateUrl[targetLang];
    } else {
      targetPath = getAlternatePath(pathname, targetLang);
    }
    navigate(targetPath, { replace: true });
  }

  return (
    <div className={cn('flex items-center text-sm font-semibold', className)}>
      <button
        onClick={() => switchTo('ro')}
        className={cn(
          'px-2 py-1 rounded-lg transition-colors cursor-pointer',
          lang === 'ro'
            ? 'bg-primary text-white'
            : 'text-gray-500 hover:text-gray-900',
        )}
        aria-label="Română"
      >
        RO
      </button>
      <span className="text-gray-300 mx-0.5">|</span>
      <button
        onClick={() => switchTo('en')}
        className={cn(
          'px-2 py-1 rounded-lg transition-colors cursor-pointer',
          lang === 'en'
            ? 'bg-primary text-white'
            : 'text-gray-500 hover:text-gray-900',
        )}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
