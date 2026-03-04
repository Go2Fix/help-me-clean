import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardList,
  Repeat,
  Users,
  Wallet,
  Banknote,
  RefreshCw,
  FileText,
  Settings,
  Building2,
  Shield,
  Star,
  BarChart3,
  Tag,
  Scale,
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

export default function AdminLayout() {
  const { t } = useTranslation('admin');

  const navItems = useMemo(() => [
    { to: '/admin', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/admin/companii', icon: Building2, label: t('nav.companies') },
    { to: '/admin/comenzi', icon: ClipboardList, label: t('nav.bookings') },
    { to: '/admin/abonamente', icon: Repeat, label: t('nav.subscriptions') },
    { to: '/admin/plati', icon: Wallet, label: t('nav.payments') },
    { to: '/admin/viramente', icon: Banknote, label: t('nav.payouts') },
    { to: '/admin/rambursari', icon: RefreshCw, label: t('nav.refunds') },
    { to: '/admin/facturi', icon: FileText, label: t('nav.invoices') },
    { to: '/admin/utilizatori', icon: Users, label: t('nav.users') },
    { to: '/admin/rapoarte', icon: BarChart3, label: t('nav.reports') },
    { to: '/admin/recenzii', icon: Star, label: t('nav.reviews') },
    { to: '/admin/promo-coduri', icon: Tag, label: t('nav.promoCodes') },
    { to: '/admin/dispute', icon: Scale, label: t('nav.disputes') },
    { to: '/admin/setari', icon: Settings, label: t('nav.settings') },
  ], [t]);

  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={Shield}
      subtitle={t('nav.subtitle')}
      homeRoute="/admin"
    />
  );
}
