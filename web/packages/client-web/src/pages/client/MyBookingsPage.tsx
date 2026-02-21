import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Calendar, Hash, Clock, Package, Repeat } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/ClientBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MY_BOOKINGS, MY_RECURRING_GROUPS } from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedTotal: number;
  status: string;
  createdAt: string;
}

interface BookingsData {
  myBookings: {
    edges: Booking[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'ALL', label: 'Toate' },
  { key: 'PENDING', label: 'In asteptare' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Finalizate' },
  { key: 'CANCELLED', label: 'Anulate' },
  { key: 'RECURRING', label: 'Recurente' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS'];
const CANCELLED_STATUSES = ['CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_ADMIN'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  // Handle both "HH:MM" and "HH:MM:SS" formats
  return timeStr.slice(0, 5);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  // Fetch all bookings — backend ignores status param, so we filter client-side
  const { data, loading, error } = useQuery<BookingsData>(MY_BOOKINGS, {
    variables: { first: 50 },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const { data: recurringData } = useQuery(MY_RECURRING_GROUPS, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });
  const recurringGroups = recurringData?.myRecurringGroups ?? [];

  // Auth guard
  if (authLoading) {
    return <LoadingSpinner text="Se verifica autentificarea..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: '/cont/comenzi' }} replace />;
  }

  const allBookings = data?.myBookings?.edges ?? [];

  // Client-side filtering (backend returns all bookings)
  const filteredBookings = allBookings.filter((b) => {
    switch (activeFilter) {
      case 'ALL':
        return true;
      case 'PENDING':
        return b.status === 'PENDING';
      case 'ACTIVE':
        return ACTIVE_STATUSES.includes(b.status);
      case 'COMPLETED':
        return b.status === 'COMPLETED';
      case 'CANCELLED':
        return CANCELLED_STATUSES.includes(b.status);
      default:
        return true;
    }
  });

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Comenzile mele
            </h1>
            <p className="text-gray-500 mt-1">
              Vezi istoricul si starea rezervarilor tale.
            </p>
          </div>
          <Button onClick={() => navigate('/rezervare')}>
            Rezervare noua
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
                activeFilter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recurring Groups */}
        {activeFilter === 'RECURRING' && (
          <>
            {recurringGroups.length > 0 ? (
              <div className="space-y-4">
                {recurringGroups.map((group: { id: string; serviceName: string; recurrenceType: string; isActive: boolean; cancelledAt: string | null; estimatedTotalPerOccurrence: number; totalOccurrences: number; completedOccurrences: number; preferredCleaner: { fullName: string } | null; upcomingOccurrences: { scheduledDate: string }[] }) => {
                  const nextDate = group.upcomingOccurrences[0]?.scheduledDate;
                  const freqLabel = group.recurrenceType === 'WEEKLY' ? 'Saptamanal' : group.recurrenceType === 'BIWEEKLY' ? 'Bisaptamanal' : 'Lunar';

                  return (
                    <Card
                      key={group.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/cont/recurente/${group.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Repeat className="h-5 w-5 text-blue-600 shrink-0" />
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {group.serviceName}
                            </h3>
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              group.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : group.cancelledAt
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-100 text-gray-500',
                            )}>
                              {group.isActive ? 'Activa' : group.cancelledAt ? 'Anulata' : 'Pauza'}
                            </span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {freqLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {group.preferredCleaner && (
                              <span>Curatator: {group.preferredCleaner.fullName}</span>
                            )}
                            {nextDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Urmatoarea: {formatDate(nextDate)}
                              </span>
                            )}
                            <span>
                              {group.completedOccurrences}/{group.totalOccurrences} finalizate
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold text-gray-900">
                            {group.estimatedTotalPerOccurrence} lei/sesiune
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Repeat className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nu ai serii recurente
                </h3>
                <p className="text-gray-500 mb-6">
                  Programeaza o curatenie recurenta pentru a o vedea aici.
                </p>
                <Button onClick={() => navigate('/rezervare')}>
                  Rezerva o curatenie
                </Button>
              </div>
            )}
          </>
        )}

        {activeFilter !== 'RECURRING' && (
          <>
            {/* Loading */}
            {loading && !data && (
              <LoadingSpinner text="Se incarca comenzile..." />
            )}

            {/* Error */}
            {error && (
              <Card className="text-center">
                <p className="text-danger mb-4">
                  Nu am putut incarca comenzile. Te rugam sa incerci din nou.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reincearca
                </Button>
              </Card>
            )}

            {/* Bookings List */}
            {!loading && !error && filteredBookings.length > 0 && (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {booking.serviceName}
                          </h3>
                          <Badge status={booking.status} />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-4 w-4" />
                            <span>{booking.referenceCode}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(booking.scheduledDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(booking.scheduledStartTime)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-gray-900">
                          {booking.estimatedTotal} lei
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredBookings.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeFilter === 'ALL'
                    ? 'Nu ai nicio rezervare'
                    : 'Nicio rezervare in aceasta categorie'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {activeFilter === 'ALL'
                    ? 'Rezerva primul tau serviciu de curatenie acum.'
                    : 'Schimba filtrul sau creeaza o noua rezervare.'}
                </p>
                <Button onClick={() => navigate('/rezervare')}>
                  Rezerva o curatenie
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
