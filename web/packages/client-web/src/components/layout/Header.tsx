import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogOut, Building2, Shield, User, ChevronDown } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import Button from '@/components/ui/Button';

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-gray-200"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
      {initials || '?'}
    </div>
  );
}

export default function Header() {
  const { t } = useTranslation('common');
  const { lang } = useLanguage();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { isPreRelease } = usePlatform();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isClient = isAuthenticated && user?.role === 'CLIENT';
  const isCompany = isAuthenticated && user?.role === 'COMPANY_ADMIN';
  const isCleaner = isAuthenticated && user?.role === 'CLEANER';
  const isAdmin = isAuthenticated && user?.role === 'GLOBAL_ADMIN';

  const dashboardPath = isClient
    ? '/cont'
    : isCompany
      ? '/firma'
      : isCleaner
        ? '/worker'
        : '/admin';

  const dashboardLabel = isClient
    ? t('nav.myAccount')
    : isCompany
      ? t('nav.companyPanel')
      : isCleaner
        ? t('nav.myPanel')
        : t('nav.adminPanel');

  const dashboardIcon = isCompany || isCleaner
    ? <Building2 className="h-4 w-4" />
    : isAdmin
      ? <Shield className="h-4 w-4" />
      : <User className="h-4 w-4" />;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo — wordmark style */}
          <Link to="/" className="flex items-center group">
            <span className="text-xl font-black tracking-tight text-gray-900 group-hover:opacity-80 transition-opacity">
              Go2<span className="text-primary">Fix</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {authLoading ? (
              <div className="w-28 h-8 bg-gray-100 rounded-lg animate-pulse" />
            ) : isAuthenticated ? (
              <>
                {/* All authenticated roles — unified avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-primary font-medium transition cursor-pointer"
                  >
                    <UserAvatar name={user!.fullName || ''} avatarUrl={user?.avatarUrl} />
                    <span className="max-w-[140px] truncate text-sm">{user!.fullName || t('nav.myAccount')}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', dropdownOpen && 'rotate-180')} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{user!.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{user!.email}</p>
                      </div>
                      <Link
                        to={dashboardPath}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        {dashboardIcon}
                        {dashboardLabel}
                      </Link>
                      <div className="h-px bg-gray-100 mx-2" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Public / landing page nav */}
                <a
                  href="/#servicii"
                  className="text-sm text-gray-500 hover:text-gray-900 font-medium transition"
                >
                  {t('nav.services')}
                </a>
                <a
                  href="/#cum-functioneaza"
                  className="text-sm text-gray-500 hover:text-gray-900 font-medium transition"
                >
                  {t('nav.howItWorks')}
                </a>
                <Link to={ROUTE_MAP.blog[lang]} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {t('nav.blog')}
                </Link>
                <Link to={ROUTE_MAP.about[lang]} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {t('nav.about')}
                </Link>
                <Link to={ROUTE_MAP.contact[lang]} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {t('nav.contact')}
                </Link>
                {!isPreRelease && (
                  <Link
                    to={ROUTE_MAP.login[lang]}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-xl"
                  >
                    {t('nav.login')}
                  </Link>
                )}
                {isPreRelease ? (
                  <Button size="md" onClick={() => navigate(ROUTE_MAP.waitlist[lang])}>
                    {t('nav.waitlist')}
                  </Button>
                ) : (
                  <Button size="md" onClick={() => navigate(ROUTE_MAP.booking[lang])}>
                    {t('nav.bookNow')}
                  </Button>
                )}
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            mobileMenuOpen ? 'max-h-[32rem] pb-4' : 'max-h-0',
          )}
        >
          <nav className="flex flex-col gap-1">
            {authLoading ? (
              <div className="px-3 py-3">
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <>
                {/* All authenticated roles — unified mobile nav */}
                <div className="flex items-center gap-3 px-3 py-3 mb-1 border-b border-gray-100">
                  <UserAvatar name={user!.fullName || ''} avatarUrl={user?.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user!.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{user!.email}</p>
                  </div>
                </div>
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {dashboardIcon}
                  {dashboardLabel}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-danger hover:bg-red-50 font-medium cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                {/* Public / landing page mobile nav */}
                <a
                  href="/#servicii"
                  className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.services')}
                </a>
                <a
                  href="/#cum-functioneaza"
                  className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.howItWorks')}
                </a>
                <Link
                  to={ROUTE_MAP.blog[lang]}
                  className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.blog')}
                </Link>
                <Link
                  to={ROUTE_MAP.about[lang]}
                  className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to={ROUTE_MAP.contact[lang]}
                  className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.contact')}
                </Link>
                {!isPreRelease && (
                  <Link
                    to={ROUTE_MAP.login[lang]}
                    className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.login')}
                  </Link>
                )}
                {!isPreRelease && (
                  <Link
                    to={ROUTE_MAP.registerFirm[lang]}
                    className="px-3 py-2.5 rounded-xl text-secondary hover:bg-emerald-50 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.forCompanies')}
                  </Link>
                )}
                <div className="pt-2">
                  {isPreRelease ? (
                    <Button
                      size="md"
                      className="w-full"
                      onClick={() => {
                        navigate(ROUTE_MAP.waitlist[lang]);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {t('nav.waitlist')}
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      className="w-full"
                      onClick={() => {
                        navigate(ROUTE_MAP.booking[lang]);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {t('nav.bookNow')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
