import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardList,
  Repeat,
  MessageCircle,
  MapPin,
  CreditCard,
  FileText,
  Settings,
  Sparkles,
  User,
  LifeBuoy,
} from 'lucide-react';
import DashboardLayout, { NavGroup } from './DashboardLayout';
import Button from '@/components/ui/Button';

export default function ClientLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation('client');

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        items: [
          { to: '/cont', icon: LayoutDashboard, label: t('nav.dashboard') },
        ],
      },
      {
        label: t('nav.groupServices'),
        items: [
          { to: '/cont/comenzi', icon: ClipboardList, label: t('nav.bookings') },
          { to: '/cont/abonamente', icon: Repeat, label: t('nav.subscriptions') },
          { to: '/cont/mesaje', icon: MessageCircle, label: t('nav.chat') },
        ],
      },
      {
        label: t('nav.groupFinancial'),
        items: [
          { to: '/cont/plati', icon: CreditCard, label: t('nav.payments') },
          { to: '/cont/facturi', icon: FileText, label: t('nav.invoices') },
        ],
      },
      {
        label: t('nav.groupAccount'),
        items: [
          { to: '/cont/adrese', icon: MapPin, label: t('nav.addresses') },
          { to: '/cont/setari', icon: Settings, label: t('nav.settings') },
          { to: '/cont/ajutor', icon: LifeBuoy, label: t('nav.help') },
        ],
      },
    ],
    [t],
  );

  return (
    <DashboardLayout
      navItems={[]}
      navGroups={navGroups}
      logoIcon={User}
      subtitle={t('nav.subtitle')}
      homeRoute="/cont"
      ctaButton={
        <Button onClick={() => navigate('/rezervare')} className="w-full" size="md">
          <Sparkles className="h-4 w-4" />
          {t('nav.newBooking')}
        </Button>
      }
    />
  );
}
