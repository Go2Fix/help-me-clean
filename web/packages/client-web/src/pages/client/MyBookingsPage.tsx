import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Calendar,
  Hash,
  Clock,
  Repeat,
  ChevronRight,
  ChevronLeft,
  CalendarX2,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
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
  recurringGroupId?: string;
  occurrenceNumber?: number;
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

interface RecurringGroup {
  id: string;
  recurrenceType: string;
  serviceName: string;
  isActive: boolean;
  cancelledAt: string | null;
  estimatedTotalPerOccurrence: number;
  totalOccurrences: number;
  completedOccurrences: number;
  preferredWorker: { fullName: string } | null;
  upcomingOccurrences: { scheduledDate: string }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { value: '', label: 'Toate comenzile' },
  { value: 'CONFIRMED', label: 'Confirmate' },
  { value: 'IN_PROGRESS', label: 'In desfasurare' },
  { value: 'COMPLETED', label: 'Finalizate' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Anulate' },
  { value: 'RECURRING', label: 'Recurente' },
];

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '\u{1F9F9}',
  DEEP_CLEANING: '\u2728',
  MOVE_IN_OUT_CLEANING: '\u{1F4E6}',
  POST_CONSTRUCTION: '\u{1F3D7}\uFE0F',
  OFFICE_CLEANING: '\u{1F3E2}',
  WINDOW_CLEANING: '\u{1FA9F}',
};

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
  return timeStr.slice(0, 5);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Server-side filtered + paginated query
  const isRecurring = statusFilter === 'RECURRING';
  const { data, loading, error } = useQuery<BookingsData>(MY_BOOKINGS, {
    variables: {
      status: statusFilter || undefined,
      first: PAGE_SIZE,
      after: page > 0 ? String(page * PAGE_SIZE) : undefined,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || isRecurring,
  });

  const { data: recurringData, loading: recurringLoading } = useQuery(MY_RECURRING_GROUPS, {
    skip: !isAuthenticated || !isRecurring,
    fetchPolicy: 'cache-and-network',
  });
  const recurringGroups: RecurringGroup[] = recurringData?.myRecurringGroups ?? [];

  // Auth guard
  if (authLoading) {
    return <LoadingSpinner text="Se verifica autentificarea..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: '/cont/comenzi' }} replace />;
  }

  const bookings = data?.myBookings?.edges ?? [];
  const totalCount = data?.myBookings?.totalCount ?? 0;
  const hasNextPage = data?.myBookings?.pageInfo?.hasNextPage ?? false;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Comenzile mele
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Istoricul si starea rezervarilor tale.
            </p>
          </div>
          <Button onClick={() => navigate('/rezervare')}>
            Rezervare noua
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-6 sm:w-64">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          />
        </div>

        {/* ── Booking cards ── */}
        {!isRecurring && (
          <>
            {/* Loading skeleton */}
            {loading && !data && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <div className="animate-pulse flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 bg-gray-200 rounded w-36" />
                          <div className="h-5 w-20 bg-gray-200 rounded-full" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-24 mb-1.5" />
                        <div className="flex gap-3">
                          <div className="h-3 bg-gray-200 rounded w-28" />
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                      </div>
                      <div className="h-5 w-16 bg-gray-200 rounded shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
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
            {!loading && !error && bookings.length > 0 && (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.99] transition-all duration-150"
                    onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Service Icon */}
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-xl select-none">
                        {SERVICE_ICONS[booking.serviceType] ?? '\u{1F9F9}'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {booking.serviceName}
                          </h3>
                          <Badge status={booking.status} />
                          {booking.recurringGroupId && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Repeat className="h-3 w-3" />
                              Recurent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{booking.referenceCode}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(booking.scheduledDate)}
                          </span>
                          {booking.scheduledStartTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(booking.scheduledStartTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + Chevron */}
                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {booking.estimatedTotal} lei
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <CalendarX2 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {statusFilter === ''
                    ? 'Nu ai nicio rezervare'
                    : 'Nicio rezervare in aceasta categorie'}
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                  {statusFilter === ''
                    ? 'Rezerva primul tau serviciu de curatenie acum.'
                    : 'Schimba filtrul sau creeaza o noua rezervare.'}
                </p>
                {statusFilter === '' && (
                  <Button onClick={() => navigate('/rezervare')}>
                    Rezerva o curatenie
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!error && totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                <p className="text-sm text-gray-500">
                  {totalCount} {totalCount === 1 ? 'comanda' : 'comenzi'} &middot; Pagina {page + 1} din {totalPages}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Urmator
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Recurring groups ── */}
        {isRecurring && (
          <>
            {/* Loading skeleton */}
            {recurringLoading && !recurringData && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <div className="animate-pulse flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 bg-gray-200 rounded w-40" />
                          <div className="h-5 w-16 bg-gray-200 rounded-full" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-32" />
                      </div>
                      <div className="h-5 w-20 bg-gray-200 rounded shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Recurring groups list */}
            {!recurringLoading && recurringGroups.length > 0 && (
              <div className="space-y-3">
                {recurringGroups.map((group) => {
                  const nextDate = group.upcomingOccurrences[0]?.scheduledDate;
                  const freqLabel =
                    group.recurrenceType === 'WEEKLY'
                      ? 'Saptamanal'
                      : group.recurrenceType === 'BIWEEKLY'
                        ? 'Bisaptamanal'
                        : 'Lunar';

                  return (
                    <Card
                      key={group.id}
                      className="cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.99] transition-all duration-150"
                      onClick={() => navigate(`/cont/recurente/${group.id}`)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Repeat className="h-6 w-6 text-blue-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {group.serviceName}
                            </h3>
                            <span
                              className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded-full',
                                group.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : group.cancelledAt
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-gray-100 text-gray-500',
                              )}
                            >
                              {group.isActive ? 'Activa' : group.cancelledAt ? 'Anulata' : 'Pauza'}
                            </span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {freqLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>
                              {group.completedOccurrences}/{group.totalOccurrences} finalizate
                            </span>
                            {nextDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Urmatoarea: {formatDate(nextDate)}
                              </span>
                            )}
                            {group.preferredWorker && (
                              <span>Curatator: {group.preferredWorker.fullName}</span>
                            )}
                          </div>
                        </div>

                        {/* Price + Chevron */}
                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                              {group.estimatedTotalPerOccurrence} lei
                            </div>
                            <div className="text-xs text-gray-400">/ sesiune</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Recurring empty state */}
            {!recurringLoading && recurringGroups.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Repeat className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nu ai serii recurente
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                  Programeaza o curatenie recurenta pentru a o vedea aici.
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
