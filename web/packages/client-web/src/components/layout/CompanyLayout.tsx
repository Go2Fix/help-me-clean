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

const navItems = [
  { to: '/firma', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/firma/comenzi', icon: ClipboardList, label: 'Comenzi' },
  { to: '/firma/abonamente', icon: Repeat, label: 'Abonamente' },
  { to: '/firma/program', icon: CalendarDays, label: 'Program' },
  { to: '/firma/mesaje', icon: MessageSquare, label: 'Mesaje' },
  { to: '/firma/echipa', icon: Users, label: 'Echipa mea' },
  { to: '/firma/recenzii', icon: Star, label: 'Recenzii' },
  { to: '/firma/plati', icon: Wallet, label: 'Plati & Castiguri' },
  { to: '/firma/facturi', icon: FileText, label: 'Facturi' },
  { to: '/firma/setari', icon: Settings, label: 'Setari' },
];

export default function CompanyLayout() {
  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={Building2}
      subtitle="Company Dashboard"
      homeRoute="/firma"
      wrapper={(children) => <CompanyStatusGate>{children}</CompanyStatusGate>}
    />
  );
}
