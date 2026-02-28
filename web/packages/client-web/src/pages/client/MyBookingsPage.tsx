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
  User,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
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
  { value: '', label: 'Toate' },
  { value: 'CONFIRMED', label: 'Confirmate' },
  { value: 'IN_PROGRESS', label: 'In desfasurare' },
  { value: 'COMPLETED', label: 'Finalizate' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Anulate' },
  { value: 'RECURRING', label: 'Recurente' },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }
> = {
  PENDING:             { label: 'In asteptare',   variant: 'warning' },
  ASSIGNED:            { label: 'Alocata',         variant: 'info' },
  CONFIRMED:           { label: 'Confirmata',      variant: 'info' },
  IN_PROGRESS:         { label: 'In desfasurare',  variant: 'warning' },
  COMPLETED:           { label: 'Finalizata',      variant: 'success' },
  CANCELLED_BY_CLIENT: { label: 'Anulata',         variant: 'danger' },
  CANCELLED_BY_COMPANY:{ label: 'Anulata',         variant: 'danger' },
  CANCELLED_BY_ADMIN:  { label: 'Anulata',         variant: 'danger' },
};

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING:    '\u{1F9F9}',
  DEEP_CLEANING:        '\u2728',
  MOVE_IN_OUT_CLEANING: '\u{1F4E6}',
  POST_CONSTRUCTION:    '\u{1F3D7}\uFE0F',
  OFFICE_CLEANING:      '\u{1F3E2}',
  WINDOW_CLEANING:      '\u{1FA9F}',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
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

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="h-5 w-20 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-5 w-40 bg-gray-200 rounded-lg mb-2" />
      <div className="h-8 w-24 bg-gray-200 rounded-lg mb-4" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-36 bg-gray-200 rounded-lg" />
        <div className="h-4 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comenzile mele</h1>
          <p className="text-gray-500 mt-1">
            Istoricul si starea rezervarilor tale.
          </p>
        </div>
        <Button onClick={() => navigate('/rezervare')}>
          Rezervare noua
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFilterChange(opt.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
              statusFilter === opt.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Booking cards ── */}
      {!isRecurring && (
        <>
          {/* Loading skeleton */}
          {loading && !data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="text-center py-12">
              <p className="text-red-500 mb-4">
                Nu am putut incarca comenzile. Te rugam sa incerci din nou.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reincearca
              </Button>
            </Card>
          )}

          {/* Bookings Grid */}
          {!loading && !error && bookings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map((booking) => {
                const statusCfg = STATUS_CONFIG[booking.status] ?? {
                  label: booking.status,
                  variant: 'default' as const,
                };
                return (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                    onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                  >
                    {/* Top: emoji + status */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl select-none leading-none">
                        {SERVICE_ICONS[booking.serviceType] ?? '\u{1F9F9}'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        {booking.recurringGroupId && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Repeat className="h-3 w-3" />
                            Recurent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Service name */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {booking.serviceName}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        {booking.estimatedTotal}
                      </span>
                      <span className="text-sm text-gray-500">lei</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{formatDate(booking.scheduledDate)}</span>
                        {booking.scheduledStartTime && (
                          <>
                            <Clock className="h-4 w-4 text-gray-400 shrink-0 ml-1" />
                            <span>{formatTime(booking.scheduledStartTime)}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Hash className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-mono text-xs">{booking.referenceCode}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Rezervat: {formatDateShort(booking.createdAt)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Card>
                );
              })}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Recurring groups grid */}
          {!recurringLoading && recurringGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringGroups.map((group) => {
                const nextDate = group.upcomingOccurrences[0]?.scheduledDate;
                const freqLabel =
                  group.recurrenceType === 'WEEKLY'
                    ? 'Saptamanal'
                    : group.recurrenceType === 'BIWEEKLY'
                      ? 'Bi-saptamanal'
                      : 'Lunar';
                const statusVariant: 'success' | 'danger' | 'default' = group.isActive
                  ? 'success'
                  : group.cancelledAt
                    ? 'danger'
                    : 'default';
                const statusLabel = group.isActive
                  ? 'Activa'
                  : group.cancelledAt
                    ? 'Anulata'
                    : 'Pauza';

                return (
                  <Card
                    key={group.id}
                    className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                    onClick={() => navigate(`/cont/recurente/${group.id}`)}
                  >
                    {/* Top: icon + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Repeat className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                        <span className="inline-flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {freqLabel}
                        </span>
                      </div>
                    </div>

                    {/* Service name */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {group.serviceName}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        {group.estimatedTotalPerOccurrence}
                      </span>
                      <span className="text-sm text-gray-500">lei / sesiune</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      {nextDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>
                            Urmatoarea:{' '}
                            <span className="font-medium text-gray-900">
                              {formatDate(nextDate)}
                            </span>
                          </span>
                        </div>
                      )}
                      {group.preferredWorker && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>{group.preferredWorker.fullName}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {group.totalOccurrences > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500">
                            {group.completedOccurrences} din {group.totalOccurrences} finalizate
                          </span>
                          <span className="text-xs font-medium text-gray-700">
                            {Math.round((group.completedOccurrences / group.totalOccurrences) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((group.completedOccurrences / group.totalOccurrences) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {group.completedOccurrences}/{group.totalOccurrences} sedinte
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
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
  );
}
