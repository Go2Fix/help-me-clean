import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '@/context/PlatformContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function Footer() {
  const { t } = useTranslation('common');
  const { lang } = useLanguage();
  const currentYear = new Date().getFullYear();
  const { isPreRelease } = usePlatform();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/icon.png" alt="Go2Fix" className="w-8 h-8 rounded-lg brightness-110" />
              <span className="text-2xl font-bold text-white">Go2Fix</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">{t('footer.nav')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/#servicii" className="hover:text-white transition">
                  {t('footer.services')}
                </a>
              </li>
              {!isPreRelease && (
                <li>
                  <Link to={ROUTE_MAP.booking[lang]} className="hover:text-white transition">
                    {t('footer.bookCleaning')}
                  </Link>
                </li>
              )}
              {!isPreRelease && (
                <li>
                  <Link to="/cont/comenzi" className="hover:text-white transition">
                    {t('footer.myOrders')}
                  </Link>
                </li>
              )}
              <li>
                <Link to={ROUTE_MAP.blog[lang]} className="hover:text-white transition">
                  {t('footer.blog')}
                </Link>
              </li>
              <li>
                <Link to={ROUTE_MAP.about[lang]} className="hover:text-white transition">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to={ROUTE_MAP.contact[lang]} className="hover:text-white transition">
                  {t('footer.contactLink')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Pentru Firme */}
          <div>
            <h4 className="text-white font-semibold mb-3">{t('footer.forCompanies')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={ROUTE_MAP.forCompanies[lang]} className="hover:text-white transition">
                  {t('footer.becomePartner')}
                </Link>
              </li>
              {!isPreRelease && (
                <li>
                  <Link to="/firma" className="hover:text-white transition">
                    {t('footer.companyDashboard')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-3">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={`mailto:${t('footer.email')}`} className="hover:text-white transition">
                  {t('footer.email')}
                </a>
              </li>
              <li>
                <a href={`tel:${t('footer.phone').replace(/\s/g, '')}`} className="hover:text-white transition">
                  {t('footer.phone')}
                </a>
              </li>
              <li>{t('footer.city')}</li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-3">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to={ROUTE_MAP.terms[lang]} className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to={ROUTE_MAP.privacy[lang]} className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Comparații */}
          <div>
            <h4 className="font-semibold text-white mb-3">{t('footer.compare')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={ROUTE_MAP.vsHomerun[lang]} className="hover:text-white transition">
                  Go2Fix vs Homerun
                </Link>
              </li>
              <li>
                <Link to={ROUTE_MAP.vsNecesit[lang]} className="hover:text-white transition">
                  Go2Fix vs Necesit
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {currentYear} Go2Fix. {t('footer.rights')}</p>
          <LanguageSwitcher variant="dark" />
        </div>
      </div>
    </footer>
  );
}
