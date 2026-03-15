import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ChevronRight, Search, Repeat } from 'lucide-react';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SEARCH_COMPANY_BOOKINGS } from '@/graphql/operations';
import { formatDate, formatCurrency } from '@/utils/format';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon: string;
}

interface BookingEdge {
  id: string;
  referenceCode: string;
  scheduledDate: string | null;
  estimatedTotal: string;
  status: string;
  recurringGroupId: string | null;
  category: BookingCategory | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMIT = 20;


// ─── Component ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'company']);

  const statusFilterOptions = [
    { value: '', label: t('company:orders.allStatuses') },
    { value: 'CONFIRMED', label: t('bookingStatus.CONFIRMED') },
    { value: 'IN_PROGRESS', label: t('bookingStatus.IN_PROGRESS') },
    { value: 'COMPLETED', label: t('bookingStatus.COMPLETED') },
    { value: 'CANCELLED', label: t('bookingStatus.CANCELLED') },
  ];

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

  // Reset page when any filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, statusFilter, dateFrom, dateTo]);

  const { data, loading } = useQuery(SEARCH_COMPANY_BOOKINGS, {
    variables: {
      query: debouncedQuery || undefined,
      status: statusFilter || undefined,
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
        <h1 className="text-2xl font-bold text-gray-900">{t('company:orders.title')}</h1>
        <p className="text-gray-500 mt-1">{t('company:orders.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
        <div className="w-full sm:w-64">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label={t('company:orders.filterStatus')}
          />
        </div>
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('company:orders.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-end gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              label={t('company:orders.dateFrom')}
              className="appearance-none px-2 sm:px-4"
            />
          </div>
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              label={t('company:orders.dateTo')}
              className="appearance-none px-2 sm:px-4"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card padding={false}>
        {loading && !data ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 px-6">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('company:orders.empty')}</h3>
            <p className="text-gray-500">{t('company:orders.emptyFilter')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('company:orders.colCode')}</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t('company:orders.colDate')}</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('company:orders.colStatus')}</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('company:orders.colPrice')}</th>
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
                            <span className="hidden md:inline">{t('company:orders.recurring')}</span>
                          </span>
                        )}
                        {booking.category && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            {booking.category.icon} {i18n.language === 'en' ? booking.category.nameEn : booking.category.nameRo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden sm:table-cell">
                      {booking.scheduledDate ? formatDate(booking.scheduledDate) : '--'}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <StatusBadge status={booking.status || 'CONFIRMED'} label={t(`bookingStatus.${booking.status || 'CONFIRMED'}`)} />
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-right font-bold text-gray-900 text-xs md:text-sm whitespace-nowrap">
                      {formatCurrency(parseFloat(booking.estimatedTotal))}
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
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
          <span className="text-sm text-gray-500">
            {t('company:orders.pagination', {
              total: totalCount,
              noun: totalCount === 1 ? t('company:orders.orderNoun') : t('company:orders.ordersNoun'),
              page: page + 1,
              totalPages,
            })}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('pagination.next')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
