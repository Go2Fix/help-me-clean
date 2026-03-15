import { type ReactNode, useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import Button from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  navGroups?: NavGroup[];
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
  navGroups,
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
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile } =
    useSidebar();

  const getActiveGroupLabel = (pathname: string) => {
    if (!navGroups) return null;
    for (const group of navGroups) {
      if (group.label && group.items.some(item => pathname === item.to || pathname.startsWith(item.to + '/'))) {
        return group.label;
      }
    }
    return null;
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = getActiveGroupLabel(location.pathname);
    return active ? new Set([active]) : new Set();
  });

  useEffect(() => {
    const active = getActiveGroupLabel(location.pathname);
    if (active) {
      setExpandedGroups(prev => prev.has(active) ? prev : new Set([...prev, active]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate(logoutRoute);
  };

  function renderSidebar(forMobile: boolean) {
    const collapsed = isCollapsed && !forMobile;

    return (
      <TooltipProvider>
        {/* Close button (mobile only) */}
        {forMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={closeMobile}
            className="absolute top-4 right-4 p-1.5"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
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
          {navGroups && navGroups.length > 0
            ? navGroups.map((group, i) => {
                const isExpanded = !group.label || expandedGroups.has(group.label);
                return (
                  <div key={group.label ?? i}>
                    {!collapsed && group.label && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroup(group.label!)}
                        className="w-full flex items-center justify-between px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 select-none"
                      >
                        <span>{group.label}</span>
                        <ChevronRight className={cn('h-3 w-3 transition-transform duration-200', isExpanded && 'rotate-90')} />
                      </Button>
                    )}
                    {collapsed && i > 0 && (
                      <div className="my-1 mx-2 border-t border-gray-100" />
                    )}
                    {(collapsed || isExpanded) && group.items.map(({ to, icon: Icon, label, badge }) => {
                      const navLink = (
                        <NavLink
                          key={to}
                          to={to}
                          end={to === homeRoute}
                          className={({ isActive }) =>
                            cn(
                              'relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                              collapsed ? 'justify-center px-2' : 'px-4',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )
                          }
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="flex-1">{label}</span>
                              {badge != null && badge > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                                  {badge > 99 ? '99+' : badge}
                                </span>
                              )}
                            </>
                          )}
                          {collapsed && badge != null && badge > 0 && (
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </NavLink>
                      );
                      return collapsed ? (
                        <Tooltip key={to}>
                          <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      ) : navLink;
                    })}
                  </div>
                );
              })
            : navItems.map(({ to, icon: Icon, label, badge }) => {
                const navLink = (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === homeRoute}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        collapsed ? 'justify-center px-2' : 'px-4',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{label}</span>
                        {badge != null && badge > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badge != null && badge > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </NavLink>
                );
                return collapsed ? (
                  <Tooltip key={to}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                ) : navLink;
              })
          }

          {/* CTA button (e.g., "Rezervare noua" in ClientSidebar) */}
          {ctaButton && !collapsed && <div className="pt-3">{ctaButton}</div>}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!forMobile && (
          <div className={cn('px-4 py-2', collapsed && 'px-2 flex justify-center')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className={cn(
                    'flex items-center gap-3 w-full py-2.5 text-sm font-medium text-gray-400',
                    collapsed ? 'justify-center px-2' : 'px-4',
                  )}
                  aria-label={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-5 w-5 shrink-0" />
                  ) : (
                    <>
                      <PanelLeftClose className="h-5 w-5 shrink-0" />
                      {t('nav.collapseMenu')}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{t('nav.expandMenu')}</TooltipContent>
              )}
            </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-3 w-full py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-danger',
                  collapsed ? 'justify-center px-2' : 'px-4',
                )}
                aria-label={t('nav.logout')}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && t('nav.logout')}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">{t('nav.logout')}</TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobile}
            className="md:hidden p-1.5"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
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
