import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  ClipboardList,
  MessageCircle,
  MapPin,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Repeat,
  FileText,
  CreditCard,
  Settings,
  Calendar,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/ClientBadge';
import ProfileSetupChecklist from '@/components/ProfileSetupChecklist';
import type { SetupItem } from '@/components/ProfileSetupChecklist';
import { MY_BOOKINGS, MY_SUBSCRIPTIONS, MY_INVOICES, MY_PAYMENT_METHODS, MY_ADDRESSES } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '\u{1F9F9}',
  DEEP_CLEANING: '\u2728',
  MOVE_IN_OUT_CLEANING: '\u{1F4E6}',
  POST_CONSTRUCTION: '\u{1F3D7}\uFE0F',
  OFFICE_CLEANING: '\u{1F3E2}',
  WINDOW_CLEANING: '\u{1FA9F}',
};

const recurrenceLabel: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'La 2 saptamani',
  MONTHLY: 'Lunar',
};

const subscriptionStatusColor: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  PAST_DUE: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const subscriptionStatusLabel: Record<string, string> = {
  ACTIVE: 'Activ',
  PAUSED: 'In pauza',
  PAST_DUE: 'Restant',
  CANCELLED: 'Anulat',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingEdge {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedTotal: number;
  status: string;
  recurringGroupId?: string;
  occurrenceNumber?: number;
}

interface Subscription {
  id: string;
  recurrenceType: string;
  serviceType: string;
  serviceName: string;
  status: string;
  monthlyAmount: number;
  currentPeriodEnd: string;
  worker?: { id: string; fullName: string } | null;
  company?: { id: string; companyName: string } | null;
}

interface InvoiceEdge {
  id: string;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: allBookingsData, loading: l1 } = useQuery(MY_BOOKINGS, {
    variables: { first: 1 },
  });

  const { data: confirmedData, loading: l2 } = useQuery(MY_BOOKINGS, {
    variables: { status: 'CONFIRMED', first: 5 },
  });

  const { data: assignedData, loading: l3 } = useQuery(MY_BOOKINGS, {
    variables: { status: 'ASSIGNED', first: 5 },
  });

  const { data: subscriptionsData, loading: l4 } = useQuery(MY_SUBSCRIPTIONS);

  const { data: invoicesData, loading: l5 } = useQuery(MY_INVOICES, {
    variables: { first: 20 },
  });

  const { data: paymentMethodsData } = useQuery(MY_PAYMENT_METHODS);
  const { data: addressesData } = useQuery(MY_ADDRESSES);

  const isLoading = l1 || l2 || l3 || l4 || l5;

  // ─── Derived data ──────────────────────────────────────────────────────

  const totalBookings = allBookingsData?.myBookings?.totalCount ?? 0;

  const activeCount =
    (confirmedData?.myBookings?.totalCount ?? 0) +
    (assignedData?.myBookings?.totalCount ?? 0);

  const upcomingBookings = useMemo(() => {
    const confirmed: BookingEdge[] = confirmedData?.myBookings?.edges ?? [];
    const assigned: BookingEdge[] = assignedData?.myBookings?.edges ?? [];
    return [...confirmed, ...assigned]
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 5);
  }, [confirmedData, assignedData]);

  const activeSubscriptions = useMemo(() => {
    const subs: Subscription[] = subscriptionsData?.mySubscriptions ?? [];
    return subs.filter((s) => s.status === 'ACTIVE').slice(0, 3);
  }, [subscriptionsData]);

  const allSubscriptions: Subscription[] = subscriptionsData?.mySubscriptions ?? [];

  const unpaidInvoiceCount = useMemo(() => {
    const invoices: InvoiceEdge[] = invoicesData?.myInvoices?.edges ?? [];
    return invoices.filter(
      (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'CREDIT_NOTE',
    ).length;
  }, [invoicesData]);

  // ─── KPI config ────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: 'Total rezervari',
      value: totalBookings,
      icon: ClipboardList,
      colorBg: 'bg-primary/10',
      colorText: 'text-primary',
      onClick: () => navigate('/cont/comenzi'),
    },
    {
      label: 'Active',
      value: activeCount,
      icon: TrendingUp,
      colorBg: 'bg-secondary/10',
      colorText: 'text-secondary',
      valueColor: 'text-secondary',
      onClick: () => navigate('/cont/comenzi'),
    },
    {
      label: 'Abonamente',
      value: activeSubscriptions.length,
      icon: Repeat,
      colorBg: 'bg-blue-50',
      colorText: 'text-blue-600',
      onClick: () => navigate('/cont/abonamente'),
    },
    {
      label: 'Facturi neplatite',
      value: unpaidInvoiceCount,
      icon: FileText,
      colorBg: 'bg-accent/10',
      colorText: 'text-accent',
      valueColor: unpaidInvoiceCount > 0 ? 'text-accent' : undefined,
      onClick: () => navigate('/cont/facturi'),
    },
  ];

  const quickActions = [
    { label: 'Comenzile mele', icon: ClipboardList, path: '/cont/comenzi' },
    { label: 'Contact Suport', icon: MessageCircle, path: '/cont/mesaje' },
    { label: 'Adresele mele', icon: MapPin, path: '/cont/adrese' },
    { label: 'Facturi', icon: FileText, path: '/cont/facturi' },
    { label: 'Metode de plata', icon: CreditCard, path: '/cont/plati' },
    { label: 'Profil & Setari', icon: Settings, path: '/cont/setari' },
  ];

  const setupItems: SetupItem[] = [
    { key: 'phone', label: 'Verifică numărul de telefon', description: 'Necesar pentru suport via WhatsApp', done: !!user?.phoneVerified, to: '/cont/setari', icon: MessageCircle },
    { key: 'avatar', label: 'Adaugă o fotografie de profil', description: 'Ajută curățătorii să te recunoască', done: !!user?.avatarUrl, to: '/cont/setari', icon: UserCircle },
    { key: 'address', label: 'Adaugă o adresă', description: 'Necesară pentru programarea serviciilor', done: (addressesData?.myAddresses?.length ?? 0) > 0, to: '/cont/adrese', icon: MapPin },
    { key: 'payment', label: 'Adaugă o metodă de plată', description: 'Necesară pentru a plăti serviciile', done: (paymentMethodsData?.myPaymentMethods?.length ?? 0) > 0, to: '/cont/plati', icon: CreditCard },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bun venit{user ? `, ${user.fullName}` : ''}!
          </h1>
          <p className="text-gray-500 mt-1">
            Iata o privire de ansamblu asupra contului tau.
          </p>
        </div>
        <Button onClick={() => navigate('/rezervare')} className="shrink-0 w-full sm:w-auto">
          <Sparkles className="h-4 w-4" />
          Rezervare noua
        </Button>
      </div>

      {/* Setup Checklist */}
      <div className="mb-8">
        <ProfileSetupChecklist
          items={setupItems}
          title="Completează-ți profilul"
          subtitle="Câțiva pași pentru a folosi platforma din plin"
        />
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-7 w-10 bg-gray-200 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={kpi.onClick}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.colorBg} shrink-0`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.colorText}`} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.valueColor ?? 'text-gray-900'}`}>
                    {kpi.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — Upcoming Bookings */}
        <div className="lg:col-span-3">
          <Card padding={false}>
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Urmatoarele comenzi
              </h2>
            </div>

            {isLoading ? (
              <div className="p-4 sm:p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-gray-200 rounded" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">Nu ai comenzi viitoare</p>
                <Button size="sm" onClick={() => navigate('/rezervare')}>
                  <Sparkles className="h-4 w-4" />
                  Rezerva acum
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingBookings.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                    className="w-full flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-lg select-none">
                      {SERVICE_ICONS[booking.serviceType] ?? '\u{1F9F9}'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {booking.serviceName}
                        </span>
                        <Badge status={booking.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(booking.scheduledDate)} · {formatTime(booking.scheduledStartTime)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-gray-900">
                        {booking.estimatedTotal} lei
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {upcomingBookings.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate('/cont/comenzi')}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Vezi toate comenzile &rarr;
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscriptions */}
          <Card padding={false}>
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Abonamente
                </h2>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 sm:p-6 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : allSubscriptions.length === 0 ? (
              <div className="p-4 sm:p-6 text-center">
                <Repeat className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">Niciun abonament activ</p>
                <button
                  type="button"
                  onClick={() => navigate('/rezervare')}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Creeaza un abonament &rarr;
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeSubscriptions.map((sub) => {
                  const statusStyle = subscriptionStatusColor[sub.status] ?? subscriptionStatusColor.ACTIVE;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => navigate(`/cont/abonamente/${sub.id}`)}
                      className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {sub.serviceName}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                            {subscriptionStatusLabel[sub.status] ?? sub.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {recurrenceLabel[sub.recurrenceType] ?? sub.recurrenceType}
                          {' · '}
                          {(sub.monthlyAmount / 100).toFixed(0)} lei/luna
                        </p>
                        {sub.currentPeriodEnd && (
                          <p className="text-xs text-blue-600 mt-1">
                            Urmatoarea facturare: {formatDate(sub.currentPeriodEnd)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {allSubscriptions.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate('/cont/abonamente')}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Vezi toate &rarr;
                </button>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card padding={false}>
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Actiuni rapide
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <action.icon className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {action.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
