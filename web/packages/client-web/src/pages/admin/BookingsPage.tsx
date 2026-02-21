import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Building2, User, Search, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { SEARCH_BOOKINGS } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Toate' },
  { key: 'PENDING', label: 'In asteptare' },
  { key: 'CONFIRMED', label: 'Confirmate' },
  { key: 'IN_PROGRESS', label: 'In desfasurare' },
  { key: 'COMPLETED', label: 'Finalizate' },
  { key: 'CANCELLED', label: 'Anulate' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

const statusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  ASSIGNED: 'Asignat',
  CONFIRMED: 'Confirmat',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
  CANCELLED_BY_CLIENT: 'Anulat de client',
  CANCELLED_BY_COMPANY: 'Anulat de companie',
  CANCELLED_BY_ADMIN: 'Anulat de admin',
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
  paymentStatus: string;
  recurringGroupId?: string;
  occurrenceNumber?: number | null;
  createdAt: string;
  client: { id: string; fullName: string; email: string } | null;
  company: { id: string; companyName: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);

  // Debounce the search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Reset page when filter changes
  const handleFilterChange = (newFilter: StatusFilter) => {
    setFilter(newFilter);
    setPage(0);
  };

  const variables = {
    query: debouncedQuery || undefined,
    status: filter === 'ALL' ? undefined : filter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, loading } = useQuery(SEARCH_BOOKINGS, { variables });

  const bookings: BookingEdge[] = data?.searchBookings?.edges ?? [];
  const totalCount: number = data?.searchBookings?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
            <p className="text-gray-500 mt-1">Gestioneaza toate comenzile de pe platforma.</p>
          </div>
          {totalCount > 0 && (
            <Badge variant="info">{totalCount} comenzi</Badge>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cauta dupa cod referinta..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-28" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bookings List */}
      {!loading && bookings.length === 0 && (
        <Card>
          <p className="text-center text-gray-400 py-12">Nu exista comenzi.</p>
        </Card>
      )}

      {!loading && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/admin/comenzi/${booking.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{booking.referenceCode}</h3>
                      <Badge variant={statusVariant[booking.status] ?? 'default'}>
                        {statusLabel[booking.status] ?? booking.status}
                      </Badge>
                      {booking.recurringGroupId && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          Recurent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{booking.serviceName}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(booking.scheduledDate).toLocaleDateString('ro-RO')}
                      </span>
                      {booking.client && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {booking.client.fullName}
                        </span>
                      )}
                      {booking.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {booking.company.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">{formatCurrency(booking.estimatedTotal)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{booking.paymentStatus}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'comanda gasita' : 'comenzi gasite'}
          </p>
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
            <span className="text-sm text-gray-700">
              Pagina {page + 1} din {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Urmator
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
