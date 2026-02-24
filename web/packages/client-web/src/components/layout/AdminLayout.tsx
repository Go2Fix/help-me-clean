import {
  LayoutDashboard,
  ClipboardList,
  Repeat,
  Users,
  Wallet,
  FileText,
  Settings,
  Building2,
  Shield,
  MessageSquare,
  Star,
  BarChart3,
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/companii', icon: Building2, label: 'Companii' },
  { to: '/admin/comenzi', icon: ClipboardList, label: 'Comenzi' },
  { to: '/admin/abonamente', icon: Repeat, label: 'Abonamente' },
  { to: '/admin/plati', icon: Wallet, label: 'Plati' },
  { to: '/admin/facturi', icon: FileText, label: 'Facturi' },
  { to: '/admin/mesaje', icon: MessageSquare, label: 'Mesaje' },
  { to: '/admin/utilizatori', icon: Users, label: 'Utilizatori' },
  { to: '/admin/rapoarte', icon: BarChart3, label: 'Rapoarte' },
  { to: '/admin/recenzii', icon: Star, label: 'Recenzii' },
  { to: '/admin/setari', icon: Settings, label: 'Setari' },
];

export default function AdminLayout() {
  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={Shield}
      subtitle="Admin Panel"
      homeRoute="/admin"
    />
  );
}
