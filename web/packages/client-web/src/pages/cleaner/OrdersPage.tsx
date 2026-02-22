import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, Search, Repeat } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SEARCH_CLEANER_BOOKINGS } from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMIT = 20;

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

const statusLabel: Record<string, string> = {
  ASSIGNED: 'Asignata',
  CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizata',
  CANCELLED_BY_CLIENT: 'Anulata de client',
  CANCELLED_BY_COMPANY: 'Anulata de firma',
  CANCELLED_BY_ADMIN: 'Anulata de admin',
};

const statusFilterOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'confirmed', label: 'Confirmata' },
  { value: 'in_progress', label: 'In desfasurare' },
  { value: 'completed', label: 'Finalizata' },
  { value: 'cancelled', label: 'Anulata' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('');
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
  }, [debouncedQuery, statusFilter, dateFrom, dateTo]);

  const { data, loading } = useQuery(SEARCH_CLEANER_BOOKINGS, {
    variables: {
      query: debouncedQuery || undefined,
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: LIMIT,
      offset: page * LIMIT,
    },
  });

  const bookings = data?.searchCleanerBookings?.edges ?? [];
  const totalCount: number = data?.searchCleanerBookings?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Comenzile mele</h1>
        <p className="text-gray-500 mt-1">Gestioneaza comenzile asignate tie.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
        <div className="w-full sm:w-64">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filtreaza dupa status"
          />
        </div>
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cauta dupa cod referinta..."
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-end gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              label="De la"
              className="appearance-none px-2 sm:px-4"
            />
          </div>
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              label="Pana la"
              className="appearance-none px-2 sm:px-4"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card padding={false}>
        {loading ? (
          <LoadingSpinner text="Se incarca comenzile..." />
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 px-6">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio comanda</h3>
            <p className="text-gray-500">Nu exista comenzi pentru filtrul selectat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cod</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Data</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Client</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-2 md:px-6 py-3 w-8 md:w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking: Record<string, unknown>) => {
                  const status = (booking.status as string) || 'CONFIRMED';
                  const client = booking.client as Record<string, unknown> | null;
                  const address = booking.address as Record<string, unknown> | null;

                  return (
                    <tr
                      key={booking.id as string}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/worker/comenzi/${booking.id}`)}
                    >
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="font-semibold text-gray-900 text-xs md:text-sm">
                            #{booking.referenceCode as string}
                          </span>
                          {!!booking.recurringGroupId && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Repeat className="h-3 w-3" />
                              <span className="hidden md:inline">Recurent</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden sm:table-cell">
                        {booking.scheduledDate
                          ? `${formatDate(booking.scheduledDate as string)}${booking.scheduledStartTime ? ` la ${booking.scheduledStartTime as string}` : ''}`
                          : '--'}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                        <div>
                          <p className="text-gray-900 text-sm">{(client?.fullName as string) || '--'}</p>
                          {address?.city ? (
                            <p className="text-gray-500 text-xs">{address.city as string}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <Badge variant={statusBadgeVariant[status] ?? 'default'}>
                          {statusLabel[status] ?? status}
                        </Badge>
                      </td>
                      <td className="px-2 md:px-6 py-3 md:py-4">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <span className="text-sm text-gray-500">
          Pagina {page + 1} din {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Urmator
          </Button>
        </div>
      </div>
    </div>
  );
}
