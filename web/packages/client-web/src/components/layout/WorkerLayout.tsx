import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  User,
  Briefcase,
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import WorkerStatusGate from '@/components/worker/WorkerStatusGate';

export default function WorkerLayout() {
  const { t } = useTranslation('worker');

  const navItems = useMemo(
    () => [
      { to: '/worker', icon: LayoutDashboard, label: t('nav.dashboard') },
      { to: '/worker/comenzi', icon: ClipboardList, label: t('nav.jobs') },
      { to: '/worker/program', icon: CalendarDays, label: t('nav.schedule') },
      { to: '/worker/mesaje', icon: MessageSquare, label: t('nav.messages') },
      { to: '/worker/profil', icon: User, label: t('nav.settings') },
    ],
    [t],
  );

  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={Briefcase}
      logoIconColor="text-accent"
      subtitle={t('nav.subtitle')}
      homeRoute="/worker"
      wrapper={(children) => <WorkerStatusGate>{children}</WorkerStatusGate>}
    />
  );
}
