import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  Plus,
  Check,
  X,
  Search,
  CreditCard,
  User,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
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

const tabOptions = [
  { value: 'REQUESTED', label: 'Solicitate' },
  { value: 'APPROVED', label: 'Aprobate' },
  { value: 'PROCESSED', label: 'Procesate' },
  { value: 'REJECTED', label: 'Respinse' },
];

const refundStatusDotColor: Record<string, string> = {
  REQUESTED: 'bg-amber-400',
  APPROVED: 'bg-blue-400',
  PROCESSED: 'bg-emerald-500',
  REJECTED: 'bg-red-400',
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
      {/* Filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-48">
          <Select
            options={tabOptions}
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as StatusTab)}
          />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Cauta dupa cod rezervare..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={() => setDirectModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Rambursare directa
        </Button>
      </div>

      {/* Refunds flat list */}
      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : paginatedRefunds.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            {searchQuery.trim()
              ? 'Nu s-au gasit rambursari pentru aceasta cautare.'
              : `Nu exista rambursari ${tabOptions.find((t) => t.value === activeTab)?.label.toLowerCase()}.`}
          </p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${refundStatusDotColor[refund.status] ?? 'bg-gray-300'}`} />
                  <span className="text-sm font-semibold text-gray-900 w-20 shrink-0">
                    {refund.booking?.referenceCode ?? '-'}
                  </span>
                  <span className="text-sm text-gray-700 truncate min-w-0">
                    {refund.booking?.serviceName ?? '-'}
                  </span>
                  <span className="flex-1" />
                  {refund.requestedBy && (
                    <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <User className="h-3 w-3" />
                      <span className="max-w-[100px] truncate">{refund.requestedBy.fullName}</span>
                    </span>
                  )}
                  <span className="hidden md:block text-xs text-gray-400 shrink-0 max-w-[140px] truncate" title={refund.reason}>
                    {refund.reason}
                  </span>
                  <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                    {formatCents(refund.amount)}
                  </span>
                  {activeTab === 'REQUESTED' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApprove(refund.id)}
                        disabled={processing}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Aproba</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleReject(refund.id)}
                        disabled={processing}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Respinge</span>
                      </Button>
                    </div>
                  )}
                  {activeTab === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleProcess(refund.id)}
                      disabled={processing}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Proceseaza</span>
                    </Button>
                  )}
                  {!showActions && (
                    <span className="text-xs text-gray-500 shrink-0 w-20 text-right hidden sm:block">
                      {refundStatusLabel[refund.status] ?? refund.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4">
              <AdminPagination
                page={page}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                noun="rambursari"
              />
            </div>
          </>
        )}
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
