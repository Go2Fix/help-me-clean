import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  AlertOctagon,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { ALL_DISPUTES, RESOLVE_DISPUTE } from '@/graphql/operations';
import { formatDateTime } from '@/utils/format';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type DisputeStatusFilter =
  | 'ALL'
  | 'OPEN'
  | 'COMPANY_RESPONDED'
  | 'UNDER_REVIEW'
  | 'RESOLVED_REFUND_FULL'
  | 'RESOLVED_REFUND_PARTIAL'
  | 'RESOLVED_NO_REFUND'
  | 'RESOLVED_REMEDIATION'
  | 'AUTO_CLOSED';

const STATUS_BADGE_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  OPEN: 'warning',
  COMPANY_RESPONDED: 'info',
  UNDER_REVIEW: 'info',
  RESOLVED_REFUND_FULL: 'success',
  RESOLVED_REFUND_PARTIAL: 'success',
  RESOLVED_NO_REFUND: 'default',
  RESOLVED_REMEDIATION: 'info',
  AUTO_CLOSED: 'default',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface DisputeUser {
  id: string;
  fullName: string;
}

interface DisputeBooking {
  id: string;
  referenceCode: string;
  serviceName: string;
}

interface Dispute {
  id: string;
  bookingId: string;
  status: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  companyResponse: string | null;
  companyRespondedAt: string | null;
  resolutionNotes: string | null;
  refundAmount: number | null;
  autoCloseAt: string | null;
  createdAt: string;
  openedBy: DisputeUser | null;
  resolvedBy: DisputeUser | null;
  booking: DisputeBooking | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface DisputeRowProps {
  dispute: Dispute;
  onResolve: (dispute: Dispute) => void;
}

function DisputeRow({ dispute, onResolve }: DisputeRowProps) {
  const { t } = useTranslation(['dashboard', 'admin']);
  const [expanded, setExpanded] = useState(false);

  const statusVariant = STATUS_BADGE_VARIANT[dispute.status] ?? 'default';
  const statusLabel = t(`admin:disputes.statusLabels.${dispute.status}`, {
    defaultValue: dispute.status,
  });
  const isResolved =
    dispute.status.startsWith('RESOLVED') || dispute.status === 'AUTO_CLOSED';

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Booking ref */}
        <span className="text-sm font-semibold text-gray-900 w-28 shrink-0 truncate">
          {dispute.booking?.referenceCode ?? dispute.bookingId.slice(0, 8)}
        </span>

        {/* Reason */}
        <span className="text-sm text-gray-700 w-40 shrink-0 truncate">
          {t(`admin:disputes.reasonLabels.${dispute.reason}`, { defaultValue: dispute.reason })}
        </span>

        {/* Client */}
        <span className="text-sm text-gray-500 flex-1 truncate min-w-0 hidden md:block">
          {dispute.openedBy?.fullName ?? '—'}
        </span>

        {/* Status badge */}
        <Badge variant={statusVariant} className="shrink-0">
          {statusLabel}
        </Badge>

        {/* Created at */}
        <span className="text-xs text-gray-400 shrink-0 hidden lg:block w-32 text-right">
          {formatDateTime(dispute.createdAt)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
          >
            {t('admin:disputes.row.details')}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {!isResolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(dispute)}
            >
              <Scale className="h-3.5 w-3.5" />
              {t('admin:disputes.row.resolve')}
            </Button>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-4">
          {/* Description */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t('admin:disputes.row.claimDescription')}
            </p>
            <p className="text-sm text-gray-800">{dispute.description}</p>
          </div>

          {/* Evidence */}
          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('admin:disputes.row.evidence', { count: dispute.evidenceUrls.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 bg-white hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('admin:disputes.row.evidenceLink', { number: idx + 1 })}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Company response */}
          {dispute.companyResponse && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('admin:disputes.row.companyResponse')}
                {dispute.companyRespondedAt && (
                  <span className="ml-2 font-normal normal-case text-gray-400">
                    {formatDateTime(dispute.companyRespondedAt)}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2">
                {dispute.companyResponse}
              </p>
            </div>
          )}

          {/* Resolution */}
          {dispute.resolutionNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('admin:disputes.row.resolution')}
                {dispute.resolvedBy && (
                  <span className="ml-2 font-normal normal-case text-gray-400">
                    {t('admin:disputes.row.resolvedBy', { name: dispute.resolvedBy.fullName })}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-800">{dispute.resolutionNotes}</p>
              {dispute.refundAmount != null && dispute.refundAmount > 0 && (
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  {t('admin:disputes.row.refund', {
                    amount: (dispute.refundAmount / 100).toFixed(2),
                  })}
                </p>
              )}
            </div>
          )}

          {/* Auto close notice */}
          {dispute.status === 'OPEN' && dispute.autoCloseAt && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
              {t('admin:disputes.row.autoClose', {
                date: formatDateTime(dispute.autoCloseAt),
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DisputesPage() {
  const { t } = useTranslation(['dashboard', 'admin']);

  const statusTabs: { key: DisputeStatusFilter; label: string }[] = [
    { key: 'ALL', label: t('admin:disputes.statusTabs.ALL') },
    { key: 'OPEN', label: t('admin:disputes.statusTabs.OPEN') },
    { key: 'COMPANY_RESPONDED', label: t('admin:disputes.statusTabs.COMPANY_RESPONDED') },
    { key: 'UNDER_REVIEW', label: t('admin:disputes.statusTabs.UNDER_REVIEW') },
    { key: 'RESOLVED_REFUND_FULL', label: t('admin:disputes.statusTabs.RESOLVED_REFUND_FULL') },
    { key: 'RESOLVED_REFUND_PARTIAL', label: t('admin:disputes.statusTabs.RESOLVED_REFUND_PARTIAL') },
    { key: 'RESOLVED_NO_REFUND', label: t('admin:disputes.statusTabs.RESOLVED_NO_REFUND') },
    { key: 'RESOLVED_REMEDIATION', label: 'Remediere solicitată' },
    { key: 'AUTO_CLOSED', label: t('admin:disputes.statusTabs.AUTO_CLOSED') },
  ];

  const resolveOptions = [
    { value: 'RESOLVED_REFUND_FULL', label: t('admin:disputes.resolveModal.resolveOptions.RESOLVED_REFUND_FULL') },
    { value: 'RESOLVED_REFUND_PARTIAL', label: t('admin:disputes.resolveModal.resolveOptions.RESOLVED_REFUND_PARTIAL') },
    { value: 'RESOLVED_NO_REFUND', label: t('admin:disputes.resolveModal.resolveOptions.RESOLVED_NO_REFUND') },
    { value: 'RESOLVED_REMEDIATION', label: 'Remediere Gratuită (echipa revine)' },
  ];

  const [statusFilter, setStatusFilter] = useState<DisputeStatusFilter>('ALL');
  const [page, setPage] = useState(0);

  // Resolve modal state
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED_NO_REFUND');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveRefund, setResolveRefund] = useState('');
  const [resolveError, setResolveError] = useState('');

  const { data, loading } = useQuery<{
    allDisputes: { edges: Dispute[]; totalCount: number };
  }>(ALL_DISPUTES, {
    variables: {
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      first: PAGE_SIZE,
      after: page > 0 ? String(page * PAGE_SIZE) : undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const [resolveDispute, { loading: resolving }] = useMutation(RESOLVE_DISPUTE, {
    refetchQueries: [
      {
        query: ALL_DISPUTES,
        variables: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          first: PAGE_SIZE,
        },
      },
    ],
    onCompleted: () => {
      setResolveTarget(null);
      setResolveNotes('');
      setResolveRefund('');
      setResolveError('');
    },
    onError: (err) => {
      setResolveError(err.message || t('admin:disputes.resolveModal.notesRequiredError'));
    },
  });

  const disputes: Dispute[] = data?.allDisputes?.edges ?? [];
  const totalCount: number = data?.allDisputes?.totalCount ?? 0;

  const handleTabChange = (tab: DisputeStatusFilter) => {
    setStatusFilter(tab);
    setPage(0);
  };

  const handleOpenResolveModal = (dispute: Dispute) => {
    setResolveTarget(dispute);
    setResolveStatus('RESOLVED_NO_REFUND');
    setResolveNotes('');
    setResolveRefund('');
    setResolveError('');
  };

  const handleResolveSubmit = async () => {
    if (!resolveTarget) return;
    if (!resolveNotes.trim()) {
      setResolveError(t('admin:disputes.resolveModal.notesRequiredError'));
      return;
    }
    const refundAmountParsed =
      resolveStatus === 'RESOLVED_REFUND_PARTIAL' && resolveRefund
        ? parseFloat(resolveRefund)
        : undefined;
    await resolveDispute({
      variables: {
        disputeId: resolveTarget.id,
        status: resolveStatus,
        resolutionNotes: resolveNotes.trim(),
        refundAmount: refundAmountParsed,
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:disputes.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin:disputes.subtitle')}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding={false}>
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 shrink-0">
            {t('admin:disputes.tableHeaders.bookingRef')}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-40 shrink-0">
            {t('admin:disputes.tableHeaders.reason')}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1 hidden md:block">
            {t('admin:disputes.tableHeaders.client')}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            {t('admin:disputes.tableHeaders.status')}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 hidden lg:block w-32 text-right">
            {t('admin:disputes.tableHeaders.openedAt')}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 w-28 text-right">
            {t('admin:disputes.tableHeaders.actions')}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-20">
            <Scale className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">{t('admin:disputes.empty')}</p>
          </div>
        ) : (
          <div>
            {disputes.map((dispute) => (
              <DisputeRow
                key={dispute.id}
                dispute={dispute}
                onResolve={handleOpenResolveModal}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && totalCount > PAGE_SIZE && (
        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun={t('admin:disputes.noun')}
        />
      )}

      {/* Resolve dispute modal */}
      <Modal
        open={!!resolveTarget}
        onClose={() => {
          setResolveTarget(null);
          setResolveError('');
        }}
        title={t('admin:disputes.resolveModal.title')}
      >
        {resolveTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{t('admin:disputes.resolveModal.order')}</span>{' '}
                {resolveTarget.booking?.referenceCode ?? resolveTarget.bookingId.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{t('admin:disputes.resolveModal.reason')}</span>{' '}
                {t(`admin:disputes.reasonLabels.${resolveTarget.reason}`, {
                  defaultValue: resolveTarget.reason,
                })}
              </p>
              <p className="text-sm text-gray-600 mt-2">{resolveTarget.description}</p>
            </div>

            <Select
              label={t('admin:disputes.resolveModal.resolutionType')}
              options={resolveOptions}
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value)}
            />

            {resolveStatus === 'RESOLVED_REFUND_PARTIAL' && (
              <Input
                label={t('admin:disputes.resolveModal.refundAmount')}
                type="number"
                placeholder={t('admin:disputes.resolveModal.refundPlaceholder')}
                value={resolveRefund}
                onChange={(e) => setResolveRefund(e.target.value)}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('admin:disputes.resolveModal.notesLabel')}{' '}
                <span className="text-red-500">{t('admin:disputes.resolveModal.notesRequired')}</span>
              </label>
              <textarea
                rows={4}
                placeholder={t('admin:disputes.resolveModal.notesPlaceholder')}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>

            {resolveError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {resolveError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setResolveTarget(null);
                  setResolveError('');
                }}
              >
                {t('admin:disputes.resolveModal.cancel')}
              </Button>
              <Button
                onClick={handleResolveSubmit}
                loading={resolving}
                disabled={!resolveNotes.trim()}
              >
                <Scale className="h-4 w-4" />
                {t('admin:disputes.resolveModal.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
