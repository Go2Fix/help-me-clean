import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Search, Repeat, Calendar, User, Building2, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate, exportToCSV } from '@/utils/format';
import { SEARCH_BOOKINGS, ALL_SERVICES, SEARCH_COMPANIES } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | 'PENDING' | 'ASSIGNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusOptions = [
  { value: 'ALL', label: 'Toate statusurile' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'ASSIGNED', label: 'Asignate' },
  { value: 'CONFIRMED', label: 'Confirmate' },
  { value: 'IN_PROGRESS', label: 'In desfasurare' },
  { value: 'COMPLETED', label: 'Finalizate' },
  { value: 'CANCELLED', label: 'Anulate' },
];

const statusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ASSIGNED: 'bg-blue-400',
  CONFIRMED: 'bg-blue-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
  CANCELLED_BY_CLIENT: 'bg-red-400',
  CANCELLED_BY_COMPANY: 'bg-red-400',
  CANCELLED_BY_ADMIN: 'bg-red-400',
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
  category: { id: string; slug: string; nameRo: string; nameEn: string; icon: string } | null;
  client: { id: string; fullName: string; email: string } | null;
  company: { id: string; companyName: string } | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');

  const debouncedQuery = useDebounce(searchInput, 300);

  // Reset page when filter changes
  const handleFilterChange = (newFilter: StatusFilter) => {
    setFilter(newFilter);
    setPage(0);
  };

  // Filter dropdown data
  const { data: servicesData } = useQuery(ALL_SERVICES);
  const { data: companiesFilterData } = useQuery(SEARCH_COMPANIES, {
    variables: { limit: 200 },
  });

  const { data, loading } = useQuery(SEARCH_BOOKINGS, {
    variables: {
      query: debouncedQuery || undefined,
      status: filter !== 'ALL' ? filter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      companyId: companyFilter || undefined,
      serviceType: serviceTypeFilter || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
  });

  const bookings: BookingEdge[] = data?.searchBookings?.edges ?? [];
  const totalCount: number = data?.searchBookings?.totalCount ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
          <p className="text-gray-500 mt-1">Gestioneaza toate comenzile de pe platforma.</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => {
            const rows = (data?.searchBookings?.edges ?? []).map((b: BookingEdge) => ({
              'Cod': b.referenceCode,
              'Serviciu': b.serviceName,
              'Data': b.scheduledDate,
              'Ora': b.scheduledStartTime,
              'Client': b.client?.fullName ?? '',
              'Companie': b.company?.companyName ?? '',
              'Pret (RON)': (b.estimatedTotal / 100).toFixed(2),
              'Status': statusLabel[b.status] ?? b.status,
              'Plata': b.paymentStatus,
            }));
            exportToCSV(rows, `comenzi-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-900 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporta CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Cauta dupa cod referinta, client, companie..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <Select
          options={statusOptions}
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as StatusFilter)}
        />
      </div>

      {/* Advanced Filters Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Select
          options={[
            { value: '', label: 'Toate companiile' },
            ...(companiesFilterData?.searchCompanies?.edges ?? []).map(
              (c: { id: string; companyName: string }) => ({
                value: c.id,
                label: c.companyName,
              }),
            ),
          ]}
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setPage(0); }}
          className="w-48"
        />
        <Select
          options={[
            { value: '', label: 'Toate serviciile' },
            ...(servicesData?.allServices ?? []).map(
              (s: { serviceType: string; nameRo: string }) => ({
                value: s.serviceType,
                label: s.nameRo,
              }),
            ),
          ]}
          value={serviceTypeFilter}
          onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(0); }}
          className="w-44"
        />
        {(dateFrom || dateTo || companyFilter || serviceTypeFilter) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setCompanyFilter('');
              setServiceTypeFilter('');
              setPage(0);
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
          >
            Reseteaza filtre
          </button>
        )}
      </div>

      {/* List */}
      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="hidden md:block h-4 bg-gray-200 rounded w-24" />
                <div className="flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Nu exista comenzi.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => navigate(`/admin/comenzi/${booking.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Status dot */}
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColor[booking.status] ?? 'bg-gray-300'}`} />

                {/* Reference code */}
                <span className="text-sm font-semibold text-gray-900 w-20 shrink-0">
                  {booking.referenceCode}
                </span>

                {/* Recurring icon */}
                {booking.recurringGroupId && (
                  <Repeat className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                )}

                {/* Category badge */}
                {booking.category && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium shrink-0">
                    {booking.category.icon} {booking.category.nameRo}
                  </span>
                )}

                {/* Service name — main title */}
                <span className="text-sm text-gray-700 truncate min-w-0">
                  {booking.serviceName}
                </span>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Metadata — desktop */}
                <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <User className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{booking.client?.fullName || '—'}</span>
                </span>
                <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Building2 className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{booking.company?.companyName || '—'}</span>
                </span>
                <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {formatDate(booking.scheduledDate)}
                  {booking.scheduledStartTime ? `, ${booking.scheduledStartTime}` : ''}
                </span>

                {/* Price */}
                <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                  {formatCurrency(booking.estimatedTotal)}
                </span>

                {/* Status label */}
                <span className="text-xs text-gray-500 shrink-0 w-24 text-right hidden sm:block">
                  {statusLabel[booking.status] ?? booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun="comenzi"
        />
      )}
    </div>
  );
}
