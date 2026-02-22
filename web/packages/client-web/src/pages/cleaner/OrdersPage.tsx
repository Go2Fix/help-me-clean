import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ClipboardList, Repeat } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SEARCH_CLEANER_BOOKINGS } from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMIT = 20;

const tabs: Array<{ label: string; value: string }> = [
  { label: 'Toate', value: '' },
  { label: 'Confirmate', value: 'confirmed' },
  { label: 'In desfasurare', value: 'in_progress' },
  { label: 'Finalizate', value: 'completed' },
  { label: 'Anulate', value: 'cancelled' },
];

const statusLabel: Record<string, string> = {
  ASSIGNED: 'Asignata',
  CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizata',
  CANCELLED_BY_CLIENT: 'Anulata de client',
  CANCELLED_BY_COMPANY: 'Anulata de firma',
  CANCELLED_BY_ADMIN: 'Anulata de admin',
};

const statusColor: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, activeTab, dateFrom, dateTo]);

  const { data, loading } = useQuery(SEARCH_CLEANER_BOOKINGS, {
    variables: {
      query: debouncedQuery || undefined,
      status: activeTab || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: LIMIT,
      offset: page * LIMIT,
    },
  });

  const bookings = data?.searchCleanerBookings?.edges ?? [];
  const hasNextPage: boolean = data?.searchCleanerBookings?.pageInfo?.hasNextPage ?? false;
  const totalCount: number = data?.searchCleanerBookings?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / LIMIT)), [totalCount]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Comenzile mele</h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0 mb-6 overflow-x-auto border-b border-gray-200">
        {tabs.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px',
              activeTab === value
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cauta dupa cod referinta..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            label="De la"
            className="w-auto"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            label="Pana la"
            className="w-auto"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Se incarca comenzile..." />
      ) : bookings.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio comanda gasita</h3>
            <p className="text-gray-500">Nu exista comenzi pentru filtrul selectat.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Booking cards */}
          <div className="space-y-3">
            {bookings.map((booking: Record<string, unknown>) => {
              const status = (booking.status as string) || 'CONFIRMED';
              const client = booking.client as Record<string, unknown> | null;
              const address = booking.address as Record<string, unknown> | null;

              return (
                <Link
                  key={booking.id as string}
                  to={`/worker/comenzi/${booking.id}`}
                  className="block"
                >
                  <Card className="hover:border-[#2563EB]/30 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-gray-900">
                            #{booking.referenceCode as string}
                          </p>
                          <Badge variant={statusColor[status] ?? 'default'}>
                            {statusLabel[status] ?? status}
                          </Badge>
                          {!!booking.recurringGroupId && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Repeat className="h-3 w-3" />
                              Recurent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {booking.serviceName as string} &middot;{' '}
                          {booking.scheduledDate as string} la{' '}
                          {booking.scheduledStartTime as string}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {client?.fullName as string}
                          {address?.city ? ` \u2022 ${address.city as string}` : ''}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                        {booking.estimatedTotal as string} RON
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                page === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 cursor-pointer',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Pagina {page + 1} din {totalPages}
            </span>
            <button
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                !hasNextPage
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 cursor-pointer',
              )}
            >
              Urmator
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
