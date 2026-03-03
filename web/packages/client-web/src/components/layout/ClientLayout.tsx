import { useNavigate } from 'react-router-dom';
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
import DashboardLayout from './DashboardLayout';
import Button from '@/components/ui/Button';

const navItems = [
  { to: '/cont', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cont/comenzi', icon: ClipboardList, label: 'Comenzile mele' },
  { to: '/cont/abonamente', icon: Repeat, label: 'Abonamente' },
  { to: '/cont/mesaje', icon: MessageCircle, label: 'Contact Suport' },
  { to: '/cont/adrese', icon: MapPin, label: 'Adresele mele' },
  { to: '/cont/plati', icon: CreditCard, label: 'Plati' },
  { to: '/cont/facturi', icon: FileText, label: 'Facturi' },
  { to: '/cont/setari', icon: Settings, label: 'Profil & Setari' },
  { to: '/cont/ajutor', icon: LifeBuoy, label: 'Ajutor' },
];

export default function ClientLayout() {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      navItems={navItems}
      logoIcon={User}
      subtitle="Contul meu"
      homeRoute="/cont"
      ctaButton={
        <Button onClick={() => navigate('/rezervare')} className="w-full" size="md">
          <Sparkles className="h-4 w-4" />
          Rezervare noua
        </Button>
      }
    />
  );
}
