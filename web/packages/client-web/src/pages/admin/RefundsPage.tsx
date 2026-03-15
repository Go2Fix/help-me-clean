import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Check,
  X,
  Search,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  ALL_REFUND_REQUESTS,
  PROCESS_REFUND,
  ADMIN_ISSUE_REFUND,
  SEARCH_BOOKINGS,
} from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const REASON_PREVIEW_LEN = 60;

// ─── Types ──────────────────────────────────────────────────────────────────

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: string;
  stripeRefundId: string | null;
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

// ─── Confirm dialog action type ──────────────────────────────────────────────

type ConfirmAction =
  | { type: 'approve'; refund: RefundRequest }
  | { type: 'reject'; refund: RefundRequest }
  | { type: 'process'; refund: RefundRequest }
  | { type: 'direct' };

// ─── Status Maps ────────────────────────────────────────────────────────────

type StatusTab = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

const refundStatusDotColor: Record<string, string> = {
  REQUESTED: 'bg-amber-400',
  APPROVED: 'bg-blue-400',
  PROCESSED: 'bg-emerald-500',
  REJECTED: 'bg-red-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateReason(reason: string): string {
  if (reason.length <= REASON_PREVIEW_LEN) return reason;
  return reason.slice(0, REASON_PREVIEW_LEN) + '…';
}

// ─── Refund row with expand toggle ───────────────────────────────────────────

interface RefundRowProps {
  refund: RefundRequest;
  activeTab: StatusTab;
  onApprove: (refund: RefundRequest) => void;
  onReject: (refund: RefundRequest) => void;
  onProcess: (refund: RefundRequest) => void;
  processing: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RefundRow({
  refund,
  activeTab,
  onApprove,
  onReject,
  onProcess,
  processing,
  t,
}: RefundRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const showActions = activeTab === 'REQUESTED' || activeTab === 'APPROVED';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${refundStatusDotColor[refund.status] ?? 'bg-gray-300'}`}
        />
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
        {/* Reason — first 60 chars always visible */}
        <span
          className="hidden md:block text-xs text-gray-500 shrink-0 max-w-[160px] truncate"
          title={refund.reason}
        >
          {truncateReason(refund.reason)}
        </span>
        <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
          {formatCents(refund.amount)}
        </span>
        {activeTab === 'REQUESTED' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onApprove(refund)}
              disabled={processing}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('admin:refunds.actions.approve')}</span>
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onReject(refund)}
              disabled={processing}
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('admin:refunds.actions.reject')}</span>
            </Button>
          </div>
        )}
        {activeTab === 'APPROVED' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onProcess(refund)}
            disabled={processing}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('admin:refunds.actions.process')}</span>
          </Button>
        )}
        {!showActions && (
          <span className="text-xs text-gray-500 shrink-0 w-20 text-right hidden sm:block">
            {t(`admin:refunds.statusLabels.${refund.status}`, { defaultValue: refund.status })}
          </span>
        )}
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-0.5 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 bg-gray-50 border-t border-gray-100 space-y-3">
          {/* Timeline */}
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Solicitat {formatDate(refund.createdAt)}
            </span>
            {refund.status !== 'REQUESTED' && (
              <>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      refund.status === 'REJECTED' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  {refund.status === 'REJECTED' ? 'Respins' : 'Aprobat'}
                  {refund.approvedBy && (
                    <span className="text-gray-400 ml-0.5">de {refund.approvedBy.fullName}</span>
                  )}
                </span>
              </>
            )}
            {refund.status === 'PROCESSED' && (
              <>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Procesat {refund.processedAt ? formatDate(refund.processedAt) : ''}
                </span>
              </>
            )}
          </div>

          {/* Full reason */}
          {refund.reason.length > REASON_PREVIEW_LEN && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Motiv complet
              </p>
              <p className="text-sm text-gray-700">{refund.reason}</p>
            </div>
          )}

          {/* Stripe Refund ID — only on PROCESSED rows */}
          {refund.status === 'PROCESSED' && refund.stripeRefundId && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Stripe Refund ID
              </p>
              <code className="text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">
                {refund.stripeRefundId}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(refund.stripeRefundId!)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copiază"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied && <span className="text-xs text-emerald-600">Copiat!</span>}
            </div>
          )}

          {/* Requester email */}
          {refund.requestedBy?.email && (
            <p className="text-xs text-gray-400">
              Email client: <span className="text-gray-600">{refund.requestedBy.email}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const { t } = useTranslation(['dashboard', 'admin']);

  const tabOptions = [
    { value: 'REQUESTED', label: t('admin:refunds.statusLabels.REQUESTED') },
    { value: 'APPROVED', label: t('admin:refunds.statusLabels.APPROVED') },
    { value: 'PROCESSED', label: t('admin:refunds.statusLabels.PROCESSED') },
    { value: 'REJECTED', label: t('admin:refunds.statusLabels.REJECTED') },
  ];

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

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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

  const handleApprove = (refund: RefundRequest) => {
    setConfirmAction({ type: 'approve', refund });
  };

  const handleReject = (refund: RefundRequest) => {
    setConfirmAction({ type: 'reject', refund });
  };

  const handleProcess = (refund: RefundRequest) => {
    setConfirmAction({ type: 'process', refund });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      processRefund({ variables: { refundRequestId: confirmAction.refund.id, approved: true } });
    } else if (confirmAction.type === 'reject') {
      processRefund({ variables: { refundRequestId: confirmAction.refund.id, approved: false } });
    } else if (confirmAction.type === 'process') {
      processRefund({ variables: { refundRequestId: confirmAction.refund.id, approved: true } });
    } else if (confirmAction.type === 'direct') {
      if (!directBookingId || !directAmount || !directReason) return;
      issueRefund({
        variables: {
          bookingId: directBookingId,
          amount: Math.round(parseFloat(directAmount) * 100),
          reason: directReason,
        },
      });
    }
    setConfirmAction(null);
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

  // Direct refund: show confirmation AlertDialog before firing mutation
  const handleDirectRefundConfirmRequest = () => {
    if (!directBookingId || !directAmount || !directReason) return;
    setConfirmAction({ type: 'direct' });
  };

  const handleCloseModal = () => {
    setDirectModalOpen(false);
    resetDirectForm();
  };

  // ─── Confirm dialog content ───────────────────────────────────────────────

  const confirmDialogProps = useMemo(() => {
    if (!confirmAction) return null;
    if (confirmAction.type === 'approve') {
      const { refund } = confirmAction;
      return {
        title: 'Aprobare rambursare',
        description: `Confirmi aprobarea rambursării de ${formatCents(refund.amount)} pentru rezervarea ${refund.booking?.referenceCode ?? '—'}?`,
        confirmLabel: t('admin:refunds.actions.approve'),
        variant: 'primary' as const,
      };
    }
    if (confirmAction.type === 'reject') {
      const { refund } = confirmAction;
      return {
        title: 'Respingere rambursare',
        description: `Confirmi respingerea cererii de rambursare pentru rezervarea ${refund.booking?.referenceCode ?? '—'}?`,
        confirmLabel: t('admin:refunds.actions.reject'),
        variant: 'danger' as const,
      };
    }
    if (confirmAction.type === 'process') {
      const { refund } = confirmAction;
      return {
        title: 'Procesare rambursare',
        description: `Confirmi procesarea rambursării de ${formatCents(refund.amount)} pentru rezervarea ${refund.booking?.referenceCode ?? '—'}?`,
        confirmLabel: t('admin:refunds.actions.process'),
        variant: 'primary' as const,
      };
    }
    if (confirmAction.type === 'direct') {
      const amountFormatted = directAmount
        ? formatCents(Math.round(parseFloat(directAmount) * 100))
        : '—';
      return {
        title: 'Confirmare rambursare directă',
        description: `Aceasta va rambursa imediat ${amountFormatted} direct prin Stripe și nu poate fi anulat.`,
        confirmLabel: t('admin:refunds.directModal.confirm'),
        variant: 'danger' as const,
      };
    }
    return null;
  }, [confirmAction, directAmount, t]);

  const currentTabLabel = tabOptions.find((opt) => opt.value === activeTab)?.label ?? '';

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
            placeholder={t('admin:refunds.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={() => setDirectModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t('admin:refunds.directRefundButton')}
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
              ? t('admin:refunds.emptySearch')
              : t('admin:refunds.emptyTab', { tab: currentTabLabel.toLowerCase() })}
          </p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedRefunds.map((refund) => (
                <RefundRow
                  key={refund.id}
                  refund={refund}
                  activeTab={activeTab}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onProcess={handleProcess}
                  processing={processing}
                  t={t as (key: string, opts?: Record<string, unknown>) => string}
                />
              ))}
            </div>
            <div className="px-4">
              <AdminPagination
                page={page}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                noun={t('admin:refunds.noun')}
              />
            </div>
          </>
        )}
      </Card>

      {/* Direct Refund Modal */}
      <Modal
        open={directModalOpen}
        onClose={handleCloseModal}
        title={t('admin:refunds.directModal.title')}
      >
        <div className="space-y-4">
          {/* Booking search */}
          <div className="relative" ref={bookingDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('admin:refunds.directModal.bookingLabel')}
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
                    placeholder={t('admin:refunds.directModal.bookingPlaceholder')}
                    className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {showBookingDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {bookingSearchLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {t('admin:refunds.directModal.searching')}
                      </div>
                    ) : bookingResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {t('admin:refunds.directModal.noBookings')}
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
            label={t('admin:refunds.directModal.amountLabel')}
            type="number"
            step="0.01"
            min="0"
            value={directAmount}
            onChange={(e) => setDirectAmount(e.target.value)}
            placeholder={t('admin:refunds.directModal.amountPlaceholder')}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('admin:refunds.directModal.reasonLabel')}
            </label>
            <textarea
              value={directReason}
              onChange={(e) => setDirectReason(e.target.value)}
              rows={3}
              placeholder={t('admin:refunds.directModal.reasonPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={handleCloseModal}>
              {t('admin:refunds.directModal.dismiss')}
            </Button>
            <Button
              onClick={handleDirectRefundConfirmRequest}
              disabled={!directBookingId || !directAmount || !directReason}
            >
              {t('admin:refunds.directModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shared Confirm Dialog */}
      {confirmDialogProps && (
        <ConfirmDialog
          open={confirmAction !== null}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          confirmLabel={confirmDialogProps.confirmLabel}
          variant={confirmDialogProps.variant}
          loading={processing || issuing}
        />
      )}

    </div>
  );
}
