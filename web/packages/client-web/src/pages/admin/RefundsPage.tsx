import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  RotateCcw,
  Plus,
  Check,
  X,
  Search,
  CreditCard,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ALL_REFUND_REQUESTS,
  PROCESS_REFUND,
  ADMIN_ISSUE_REFUND,
  SEARCH_BOOKINGS,
} from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: string;
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    referenceCode: string;
    serviceName: string;
  } | null;
  requestedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  approvedBy: {
    id: string;
    fullName: string;
  } | null;
}

interface BookingSearchResult {
  id: string;
  referenceCode: string;
  serviceName: string;
}

// ─── Status Maps ────────────────────────────────────────────────────────────

type StatusTab = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

const tabs: { key: StatusTab; label: string }[] = [
  { key: 'REQUESTED', label: 'Solicitate' },
  { key: 'APPROVED', label: 'Aprobate' },
  { key: 'PROCESSED', label: 'Procesate' },
  { key: 'REJECTED', label: 'Respinse' },
];

const refundStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PROCESSED: 'success',
  REJECTED: 'danger',
};

const refundStatusLabel: Record<string, string> = {
  REQUESTED: 'Solicitata',
  APPROVED: 'Aprobata',
  PROCESSED: 'Procesata',
  REJECTED: 'Respinsa',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('REQUESTED');
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [directModalOpen, setDirectModalOpen] = useState(false);

  // Direct refund modal form state
  const [directBookingId, setDirectBookingId] = useState('');
  const [directBookingLabel, setDirectBookingLabel] = useState('');
  const [directAmount, setDirectAmount] = useState('');
  const [directReason, setDirectReason] = useState('');

  // Booking search in modal
  const [bookingSearchInput, setBookingSearchInput] = useState('');
  const [showBookingDropdown, setShowBookingDropdown] = useState(false);
  const debouncedBookingSearch = useDebounce(bookingSearchInput, 300);
  const bookingDropdownRef = useRef<HTMLDivElement>(null);

  // Reset page when tab changes
  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(0);
    setSearchQuery('');
  };

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data, loading, refetch } = useQuery(ALL_REFUND_REQUESTS, {
    variables: {
      status: activeTab,
    },
  });

  const [searchBookings, { data: bookingSearchData, loading: bookingSearchLoading }] =
    useLazyQuery(SEARCH_BOOKINGS);

  // Trigger booking search when debounced value changes
  useEffect(() => {
    if (debouncedBookingSearch.length >= 2) {
      searchBookings({
        variables: { query: debouncedBookingSearch, limit: 8 },
      });
      setShowBookingDropdown(true);
    } else {
      setShowBookingDropdown(false);
    }
  }, [debouncedBookingSearch, searchBookings]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        bookingDropdownRef.current &&
        !bookingDropdownRef.current.contains(e.target as Node)
      ) {
        setShowBookingDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Mutations ──────────────────────────────────────────────────────────

  const [processRefund, { loading: processing }] = useMutation(PROCESS_REFUND, {
    onCompleted: () => refetch(),
  });

  const [issueRefund, { loading: issuing }] = useMutation(ADMIN_ISSUE_REFUND, {
    onCompleted: () => {
      setDirectModalOpen(false);
      resetDirectForm();
      refetch();
    },
  });

  // ─── Derived Data ───────────────────────────────────────────────────────

  const allRefunds: RefundRequest[] = data?.allRefundRequests ?? [];

  // Client-side filter by booking reference code
  const filteredRefunds = useMemo(() => {
    if (!searchQuery.trim()) return allRefunds;
    const q = searchQuery.trim().toLowerCase();
    return allRefunds.filter(
      (r) => r.booking?.referenceCode?.toLowerCase().includes(q),
    );
  }, [allRefunds, searchQuery]);

  // Pagination
  const totalCount = filteredRefunds.length;
  const paginatedRefunds = useMemo(
    () => filteredRefunds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredRefunds, page],
  );

  const bookingResults: BookingSearchResult[] =
    bookingSearchData?.searchBookings?.edges ?? [];

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleApprove = (refundRequestId: string) => {
    processRefund({ variables: { refundRequestId, approved: true } });
  };

  const handleReject = (refundRequestId: string) => {
    processRefund({ variables: { refundRequestId, approved: false } });
  };

  const handleProcess = (refundRequestId: string) => {
    processRefund({ variables: { refundRequestId, approved: true } });
  };

  const handleSelectBooking = (booking: BookingSearchResult) => {
    setDirectBookingId(booking.id);
    setDirectBookingLabel(`${booking.referenceCode} - ${booking.serviceName}`);
    setBookingSearchInput('');
    setShowBookingDropdown(false);
  };

  const resetDirectForm = () => {
    setDirectBookingId('');
    setDirectBookingLabel('');
    setDirectAmount('');
    setDirectReason('');
    setBookingSearchInput('');
    setShowBookingDropdown(false);
  };

  const handleDirectRefund = () => {
    if (!directBookingId || !directAmount || !directReason) return;
    issueRefund({
      variables: {
        bookingId: directBookingId,
        amount: Math.round(parseFloat(directAmount) * 100),
        reason: directReason,
      },
    });
  };

  const handleCloseModal = () => {
    setDirectModalOpen(false);
    resetDirectForm();
  };

  // Does this tab show action buttons?
  const showActions = activeTab === 'REQUESTED' || activeTab === 'APPROVED';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rambursari</h1>
            <p className="text-gray-500 mt-1">
              Gestioneaza cererile de rambursare de pe platforma.
            </p>
          </div>
          <Button onClick={() => setDirectModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Rambursare directa
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Refunds List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <RotateCcw className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {tabs.find((t) => t.key === activeTab)?.label ?? 'Rambursari'}
            </h3>
            {totalCount > 0 && (
              <Badge variant="info">{totalCount}</Badge>
            )}
          </div>

          {/* Search by reference code */}
          <div className="relative sm:ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Cauta dupa cod rezervare..."
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Se incarca rambursarile..." />
        ) : paginatedRefunds.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            {searchQuery.trim()
              ? 'Nu s-au gasit rambursari pentru aceasta cautare.'
              : `Nu exista rambursari ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Cod Rezervare</th>
                  <th className="pb-3 font-medium">Serviciu</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Utilizator</th>
                  <th className="pb-3 font-medium text-right">Suma</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Motiv</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                  {showActions && (
                    <th className="pb-3 font-medium text-right">Actiuni</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(refund.createdAt)}
                    </td>
                    <td className="py-3 font-medium text-gray-900 whitespace-nowrap">
                      {refund.booking?.referenceCode ?? '-'}
                    </td>
                    <td className="py-3 text-gray-600 max-w-[160px] truncate">
                      {refund.booking?.serviceName ?? '-'}
                    </td>
                    <td className="py-3 text-gray-600 hidden md:table-cell">
                      {refund.requestedBy?.fullName ?? '-'}
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCents(refund.amount)}
                    </td>
                    <td className="py-3 text-gray-600 max-w-[200px] truncate hidden md:table-cell">
                      {refund.reason}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant={refundStatusVariant[refund.status] ?? 'default'}>
                        {refundStatusLabel[refund.status] ?? refund.status}
                      </Badge>
                    </td>
                    {activeTab === 'REQUESTED' && (
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApprove(refund.id)}
                            disabled={processing}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Aproba
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(refund.id)}
                            disabled={processing}
                          >
                            <X className="h-3.5 w-3.5" />
                            Respinge
                          </Button>
                        </div>
                      </td>
                    )}
                    {activeTab === 'APPROVED' && (
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleProcess(refund.id)}
                          disabled={processing}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Proceseaza
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun="rambursari"
        />
      </Card>

      {/* Direct Refund Modal */}
      <Modal
        open={directModalOpen}
        onClose={handleCloseModal}
        title="Rambursare directa"
      >
        <div className="space-y-4">
          {/* Booking search */}
          <div className="relative" ref={bookingDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Rezervare
            </label>

            {directBookingId ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm">
                <span className="flex-1 text-gray-900 truncate">
                  {directBookingLabel}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDirectBookingId('');
                    setDirectBookingLabel('');
                  }}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bookingSearchInput}
                    onChange={(e) => setBookingSearchInput(e.target.value)}
                    onFocus={() => {
                      if (bookingResults.length > 0 && debouncedBookingSearch.length >= 2) {
                        setShowBookingDropdown(true);
                      }
                    }}
                    placeholder="Cauta dupa cod rezervare..."
                    className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {showBookingDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {bookingSearchLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        Se cauta...
                      </div>
                    ) : bookingResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        Nicio rezervare gasita.
                      </div>
                    ) : (
                      bookingResults.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => handleSelectBooking(booking)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                        >
                          <span className="font-medium text-gray-900">
                            {booking.referenceCode}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {booking.serviceName}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <Input
            label="Suma (lei)"
            type="number"
            step="0.01"
            min="0"
            value={directAmount}
            onChange={(e) => setDirectAmount(e.target.value)}
            placeholder="ex. 150.00"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motiv
            </label>
            <textarea
              value={directReason}
              onChange={(e) => setDirectReason(e.target.value)}
              rows={3}
              placeholder="Descrie motivul rambursarii..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={handleCloseModal}>
              Anuleaza
            </Button>
            <Button
              onClick={handleDirectRefund}
              loading={issuing}
              disabled={!directBookingId || !directAmount || !directReason}
            >
              Emite rambursare
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
