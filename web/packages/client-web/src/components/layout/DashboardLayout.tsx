import { type ReactNode } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import NotificationBell from '@/components/notifications/NotificationBell';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  logoIcon: LucideIcon;
  logoIconColor?: string;
  subtitle: string;
  homeRoute: string;
  logoutRoute?: string;
  ctaButton?: ReactNode;
  wrapper?: (children: ReactNode) => ReactNode;
}

export default function DashboardLayout({
  navItems,
  logoIcon: LogoIcon,
  logoIconColor = 'text-primary',
  subtitle,
  homeRoute,
  logoutRoute = '/autentificare',
  ctaButton,
  wrapper,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile } =
    useSidebar();

  const handleLogout = () => {
    logout();
    navigate(logoutRoute);
  };

  function renderSidebar(forMobile: boolean) {
    const collapsed = isCollapsed && !forMobile;

    return (
      <>
        {/* Close button (mobile only) */}
        {forMobile && (
          <button
            onClick={closeMobile}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Logo */}
        <div className={cn('p-6', collapsed && 'p-4 flex justify-center')}>
          <NavLink to={homeRoute} className="flex items-center gap-2">
            <LogoIcon className={cn('h-7 w-7 shrink-0', logoIconColor)} />
            {!collapsed && (
              <div>
                <span className="text-lg font-bold text-primary block leading-tight">
                  Go2Fix
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {subtitle}
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-1 overflow-y-auto', collapsed ? 'px-2' : 'px-4')}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === homeRoute}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2' : 'px-4',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}

          {/* CTA button (e.g., "Rezervare noua" in ClientSidebar) */}
          {ctaButton && !collapsed && <div className="pt-3">{ctaButton}</div>}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!forMobile && (
          <div className={cn('px-4 py-2', collapsed && 'px-2 flex justify-center')}>
            <button
              onClick={toggleCollapse}
              className={cn(
                'flex items-center gap-3 w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-pointer',
                collapsed ? 'justify-center px-2' : 'px-4',
              )}
              title={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-5 w-5 shrink-0" />
                  {t('nav.collapseMenu')}
                </>
              )}
            </button>
          </div>
        )}

        {/* User / Logout */}
        <div
          className={cn('border-t border-gray-200', collapsed ? 'p-2' : 'p-4')}
        >
          {user && !collapsed && (
            <div className="px-4 py-2 mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? t('nav.logout') : undefined}
            className={cn(
              'flex items-center gap-3 w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-danger transition-colors cursor-pointer',
              collapsed ? 'justify-center px-2' : 'px-4',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && t('nav.logout')}
          </button>
        </div>
      </>
    );
  }

  const content = (
    <div className="flex min-h-screen bg-[#FAFBFC]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-gray-200 sticky top-0 h-screen transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {renderSidebar(false)}
      </aside>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar overlay */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col md:hidden transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {renderSidebar(true)}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={toggleMobile}
            className="md:hidden p-1.5 rounded-xl text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <NavLink to={homeRoute} className="md:hidden flex items-center gap-2">
            <LogoIcon className={cn('h-6 w-6', logoIconColor)} />
            <span className="text-lg font-bold text-primary">Go2Fix</span>
          </NavLink>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );

  return wrapper ? <>{wrapper(content)}</> : content;
}
