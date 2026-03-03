import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
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
  | 'AUTO_CLOSED';

const STATUS_TABS: { key: DisputeStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Toate' },
  { key: 'OPEN', label: 'Deschise' },
  { key: 'COMPANY_RESPONDED', label: 'Răspuns primit' },
  { key: 'UNDER_REVIEW', label: 'În analiză' },
  { key: 'RESOLVED_REFUND_FULL', label: 'Refund integral' },
  { key: 'RESOLVED_REFUND_PARTIAL', label: 'Refund parțial' },
  { key: 'RESOLVED_NO_REFUND', label: 'Respinse' },
  { key: 'AUTO_CLOSED', label: 'Închise auto' },
];

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  OPEN: { label: 'Deschisă', variant: 'warning' },
  COMPANY_RESPONDED: { label: 'Răspuns primit', variant: 'info' },
  UNDER_REVIEW: { label: 'În analiză', variant: 'info' },
  RESOLVED_REFUND_FULL: { label: 'Refund integral', variant: 'success' },
  RESOLVED_REFUND_PARTIAL: { label: 'Refund parțial', variant: 'success' },
  RESOLVED_NO_REFUND: { label: 'Respinsă', variant: 'default' },
  AUTO_CLOSED: { label: 'Închisă automat', variant: 'default' },
};

const REASON_LABELS: Record<string, string> = {
  POOR_QUALITY: 'Calitate slabă',
  NO_SHOW: 'Lucrătorul absent',
  PROPERTY_DAMAGE: 'Daune proprietate',
  INCOMPLETE_JOB: 'Job nefinalizat',
  OVERCHARGE: 'Supratarifat',
  OTHER: 'Altele',
};

const RESOLVE_OPTIONS = [
  { value: 'RESOLVED_REFUND_FULL', label: 'Refund integral' },
  { value: 'RESOLVED_REFUND_PARTIAL', label: 'Refund parțial' },
  { value: 'RESOLVED_NO_REFUND', label: 'Respins — fără refund' },
];

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
  const [expanded, setExpanded] = useState(false);

  const statusConfig = STATUS_BADGE[dispute.status] ?? {
    label: dispute.status,
    variant: 'default' as const,
  };
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
          {REASON_LABELS[dispute.reason] ?? dispute.reason}
        </span>

        {/* Client */}
        <span className="text-sm text-gray-500 flex-1 truncate min-w-0 hidden md:block">
          {dispute.openedBy?.fullName ?? '—'}
        </span>

        {/* Status badge */}
        <Badge variant={statusConfig.variant} className="shrink-0">
          {statusConfig.label}
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
            Detalii
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
              Rezolvă
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
              Descriere reclamație
            </p>
            <p className="text-sm text-gray-800">{dispute.description}</p>
          </div>

          {/* Evidence */}
          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Dovezi ({dispute.evidenceUrls.length})
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
                    Dovadă {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Company response */}
          {dispute.companyResponse && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Răspuns companie
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
                Rezoluție
                {dispute.resolvedBy && (
                  <span className="ml-2 font-normal normal-case text-gray-400">
                    de {dispute.resolvedBy.fullName}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-800">{dispute.resolutionNotes}</p>
              {dispute.refundAmount != null && dispute.refundAmount > 0 && (
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  Refund: {(dispute.refundAmount / 100).toFixed(2)} RON
                </p>
              )}
            </div>
          )}

          {/* Auto close notice */}
          {dispute.status === 'OPEN' && dispute.autoCloseAt && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
              Disputa se va închide automat pe {formatDateTime(dispute.autoCloseAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DisputesPage() {
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
      setResolveError(err.message || 'A apărut o eroare. Încearcă din nou.');
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
      setResolveError('Notele de rezoluție sunt obligatorii.');
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
        <h1 className="text-2xl font-bold text-gray-900">Dispute &amp; reclamații</h1>
        <p className="text-gray-500 mt-1">
          Gestionează disputele deschise de clienți pe platformă.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {STATUS_TABS.map((tab) => (
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
            Ref. comandă
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-40 shrink-0">
            Motiv
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1 hidden md:block">
            Client
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            Status
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 hidden lg:block w-32 text-right">
            Deschisă la
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 w-28 text-right">
            Acțiuni
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-20">
            <Scale className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nu există dispute pentru filtrul selectat.</p>
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
          noun="dispute"
        />
      )}

      {/* Resolve dispute modal */}
      <Modal
        open={!!resolveTarget}
        onClose={() => {
          setResolveTarget(null);
          setResolveError('');
        }}
        title="Rezolvă disputa"
      >
        {resolveTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Comandă:</span>{' '}
                {resolveTarget.booking?.referenceCode ?? resolveTarget.bookingId.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Motiv:</span>{' '}
                {REASON_LABELS[resolveTarget.reason] ?? resolveTarget.reason}
              </p>
              <p className="text-sm text-gray-600 mt-2">{resolveTarget.description}</p>
            </div>

            <Select
              label="Tip rezoluție"
              options={RESOLVE_OPTIONS}
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value)}
            />

            {resolveStatus === 'RESOLVED_REFUND_PARTIAL' && (
              <Input
                label="Sumă refund (RON)"
                type="number"
                placeholder="ex: 50.00"
                value={resolveRefund}
                onChange={(e) => setResolveRefund(e.target.value)}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Note rezoluție <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Descrie decizia luată și motivele..."
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
                Anulează
              </Button>
              <Button
                onClick={handleResolveSubmit}
                loading={resolving}
                disabled={!resolveNotes.trim()}
              >
                <Scale className="h-4 w-4" />
                Confirmă rezoluția
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
