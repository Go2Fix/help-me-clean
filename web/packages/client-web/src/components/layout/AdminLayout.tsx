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
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/companii', icon: Building2, label: 'Companii' },
  { to: '/admin/comenzi', icon: ClipboardList, label: 'Comenzi' },
  { to: '/admin/abonamente', icon: Repeat, label: 'Abonamente' },
  { to: '/admin/plati', icon: Wallet, label: 'Plati' },
  { to: '/admin/viramente', icon: Banknote, label: 'Viramente' },
  { to: '/admin/rambursari', icon: RefreshCw, label: 'Rambursari' },
  { to: '/admin/facturi', icon: FileText, label: 'Facturi' },
  { to: '/admin/utilizatori', icon: Users, label: 'Utilizatori' },
  { to: '/admin/rapoarte', icon: BarChart3, label: 'Rapoarte' },
  { to: '/admin/recenzii', icon: Star, label: 'Recenzii' },
  { to: '/admin/promo-coduri', icon: Tag, label: 'Coduri promo' },
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
