import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, Search, Repeat } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { SEARCH_COMPANY_BOOKINGS } from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMIT = 20;

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

const statusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  ASSIGNED: 'Asignata',
  CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizata',
  CANCELLED_BY_CLIENT: 'Anulata de client',
  CANCELLED_BY_COMPANY: 'Anulata de firma',
  CANCELLED_BY_ADMIN: 'Anulata de admin',
};

const tabs: Array<{ label: string; value: string | undefined }> = [
  { label: 'Toate', value: undefined },
  { label: 'In asteptare', value: 'PENDING' },
  { label: 'Confirmate', value: 'CONFIRMED' },
  { label: 'In desfasurare', value: 'IN_PROGRESS' },
  { label: 'Finalizate', value: 'COMPLETED' },
  { label: 'Anulate', value: 'CANCELLED' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
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

  // Reset page when any filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, activeTab, dateFrom, dateTo]);

  const { data, loading } = useQuery(SEARCH_COMPANY_BOOKINGS, {
    variables: {
      query: debouncedQuery || undefined,
      status: activeTab,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: LIMIT,
      offset: page * LIMIT,
    },
  });

  const bookings = data?.searchCompanyBookings?.edges ?? [];
  const totalCount: number = data?.searchCompanyBookings?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
        <p className="text-gray-500 mt-1">Gestioneaza comenzile firmei tale.</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveTab(value)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
              activeTab === value
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search and date filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
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

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-4">{totalCount} comenzi gasite</p>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio comanda</h3>
            <p className="text-gray-500">Nu exista comenzi pentru filtrul selectat.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Booking cards */}
          <div className="space-y-3">
            {bookings.map((booking: Record<string, unknown>) => (
              <Card
                key={booking.id as string}
                className="hover:border-[#2563EB]/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/firma/comenzi/${booking.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">
                        #{booking.referenceCode as string}
                      </p>
                      <Badge variant={statusBadgeVariant[(booking.status as string) || 'PENDING']}>
                        {statusLabel[(booking.status as string) || 'PENDING'] || (booking.status as string)}
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
                      {booking.scheduledDate as string} la {booking.scheduledStartTime as string}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Client: {(booking.client as Record<string, unknown>)?.fullName as string}
                      {(booking.cleaner as Record<string, unknown>)?.fullName
                        ? ` | Cleaner: ${(booking.cleaner as Record<string, unknown>).fullName as string}`
                        : ' | Neasignat'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                      {booking.estimatedTotal as string} RON
                    </p>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Pagina {page + 1} din {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Urmator
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
