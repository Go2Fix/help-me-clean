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
import DashboardLayout from './DashboardLayout';
import CompanyStatusGate from '@/components/company/CompanyStatusGate';

export default function CompanyLayout() {
  const { t } = useTranslation('company');

  const navItems = useMemo(
    () => [
      { to: '/firma', icon: LayoutDashboard, label: t('company:nav.dashboard') },
      { to: '/firma/comenzi', icon: ClipboardList, label: t('company:nav.orders') },
      { to: '/firma/abonamente', icon: Repeat, label: t('company:nav.subscriptions') },
      { to: '/firma/program', icon: CalendarDays, label: t('company:nav.calendar') },
      { to: '/firma/mesaje', icon: MessageSquare, label: t('company:nav.messages') },
      { to: '/firma/echipa', icon: Users, label: t('company:nav.team') },
      { to: '/firma/recenzii', icon: Star, label: t('company:nav.reviews') },
      { to: '/firma/plati', icon: Wallet, label: t('company:nav.payouts') },
      { to: '/firma/facturi', icon: FileText, label: t('company:nav.invoices') },
      { to: '/firma/setari', icon: Settings, label: t('company:nav.settings') },
    ],
    [t],
  );

  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={Building2}
      subtitle={t('company:nav.subtitle')}
      homeRoute="/firma"
      wrapper={(children) => <CompanyStatusGate>{children}</CompanyStatusGate>}
    />
  );
}
