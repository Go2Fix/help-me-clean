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
          { to: '/firma', icon: LayoutDashboard, label: t('company:nav.dashboard') },
        ],
      },
      {
        label: 'Operațiuni',
        items: [
          { to: '/firma/comenzi', icon: ClipboardList, label: t('company:nav.orders') },
          { to: '/firma/program', icon: CalendarDays, label: t('company:nav.calendar') },
          { to: '/firma/mesaje', icon: MessageSquare, label: t('company:nav.messages') },
        ],
      },
      {
        label: 'Echipă',
        items: [
          { to: '/firma/echipa', icon: Users, label: t('company:nav.team') },
          { to: '/firma/recenzii', icon: Star, label: t('company:nav.reviews') },
        ],
      },
      {
        label: 'Financiar',
        items: [
          { to: '/firma/abonamente', icon: Repeat, label: t('company:nav.subscriptions') },
          { to: '/firma/plati', icon: Wallet, label: t('company:nav.payouts') },
          { to: '/firma/facturi', icon: FileText, label: t('company:nav.invoices') },
        ],
      },
      {
        items: [
          { to: '/firma/setari', icon: Settings, label: 'Cont' },
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
      subtitle={t('company:nav.subtitle')}
      homeRoute="/firma"
      wrapper={(children) => <CompanyStatusGate>{children}</CompanyStatusGate>}
    />
  );
}
