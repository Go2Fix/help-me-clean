import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardList,
  Repeat,
  Users,
  Star,
  Wallet,
  FileText,
  Settings,
  Building2,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
import DashboardLayout, { NavGroup } from './DashboardLayout';
import CompanyStatusGate from '@/components/company/CompanyStatusGate';

export default function CompanyLayout() {
  const { t } = useTranslation('company');

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        items: [
          { to: '/firma', icon: LayoutDashboard, label: t('nav.dashboard') },
        ],
      },
      {
        label: t('nav.groupOperations'),
        items: [
          { to: '/firma/comenzi', icon: ClipboardList, label: t('nav.orders') },
          { to: '/firma/program', icon: CalendarDays, label: t('nav.calendar') },
          { to: '/firma/mesaje', icon: MessageSquare, label: t('nav.messages') },
        ],
      },
      {
        label: t('nav.groupTeam'),
        items: [
          { to: '/firma/echipa', icon: Users, label: t('nav.team') },
          { to: '/firma/recenzii', icon: Star, label: t('nav.reviews') },
        ],
      },
      {
        label: t('nav.groupFinancial'),
        items: [
          { to: '/firma/abonamente', icon: Repeat, label: t('nav.subscriptions') },
          { to: '/firma/plati', icon: Wallet, label: t('nav.payouts') },
          { to: '/firma/facturi', icon: FileText, label: t('nav.invoices') },
          { to: '/firma/setari', icon: Settings, label: t('nav.settings') },
        ],
      },
    ],
    [t],
  );

  return (
    <DashboardLayout
      navItems={[]}
      navGroups={navGroups}
      logoIcon={Building2}
      subtitle={t('nav.subtitle')}
      homeRoute="/firma"
      wrapper={(children) => <CompanyStatusGate>{children}</CompanyStatusGate>}
    />
  );
}
