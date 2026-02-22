import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, Search, Repeat } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SEARCH_COMPANY_BOOKINGS } from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingEdge {
  id: string;
  referenceCode: string;
  scheduledDate: string | null;
  estimatedTotal: string;
  status: string;
  recurringGroupId: string | null;
}

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

const tabs: Array<{ label: string; value: string | undefined }> = [
  { label: 'Toate', value: undefined },
  { label: 'Confirmate', value: 'CONFIRMED' },
  { label: 'In desfasurare', value: 'IN_PROGRESS' },
  { label: 'Finalizate', value: 'COMPLETED' },
  { label: 'Anulate', value: 'CANCELLED' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRON(amount: string): string {
  return amount + ' lei';
}

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

  const bookings: BookingEdge[] = data?.searchCompanyBookings?.edges ?? [];
  const totalCount: number = data?.searchCompanyBookings?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
        <p className="text-gray-500 mt-1">Gestioneaza comenzile firmei tale.</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 max-w-full overflow-x-auto">
        {tabs.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveTab(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
              activeTab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search and date filters */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
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
        {/* Card header */}
        {!loading && (
          <div className="flex items-center gap-3 px-3 md:px-6 pt-5 pb-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Comenzi</h3>
            {totalCount > 0 && <Badge variant="info">{totalCount}</Badge>}
          </div>
        )}

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
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pret</th>
                  <th className="px-2 md:px-6 py-3 w-8 md:w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/firma/comenzi/${booking.id}`)}
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="font-semibold text-gray-900 text-xs md:text-sm">
                          #{booking.referenceCode}
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
                      {booking.scheduledDate ? formatDate(booking.scheduledDate) : '--'}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <Badge variant={statusBadgeVariant[booking.status || 'CONFIRMED']}>
                        {statusLabel[booking.status || 'CONFIRMED'] || booking.status}
                      </Badge>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-right font-bold text-gray-900 text-xs md:text-sm whitespace-nowrap">
                      {formatRON(booking.estimatedTotal)}
                    </td>
                    <td className="px-2 md:px-6 py-3 md:py-4">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
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
