import { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { Receipt, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MY_PAYMENT_HISTORY, MY_REFUND_REQUESTS } from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentEdge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  booking?: {
    id: string;
    referenceCode: string;
    serviceName: string;
  };
}

interface PaymentHistoryData {
  myPaymentHistory: {
    edges: PaymentEdge[];
    pageInfo: {
      hasNextPage: boolean;
    };
    totalCount: number;
  };
}

type RefundStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    referenceCode: string;
    serviceName: string;
  } | null;
}

interface RefundRequestsData {
  myRefundRequests: RefundRequest[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2) + ' lei';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  SUCCEEDED: { label: 'Platita', variant: 'success' },
  PENDING: { label: 'In asteptare', variant: 'warning' },
  FAILED: { label: 'Esuata', variant: 'danger' },
  REFUNDED: { label: 'Rambursata', variant: 'default' },
};

const REFUND_STATUS_CONFIG: Record<RefundStatus, { label: string; dotColor: string }> = {
  REQUESTED: { label: 'Solicitata', dotColor: 'bg-amber-500' },
  APPROVED: { label: 'Aprobata', dotColor: 'bg-blue-500' },
  PROCESSED: { label: 'Finalizata', dotColor: 'bg-emerald-500' },
  REJECTED: { label: 'Respinsa', dotColor: 'bg-red-500' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentHistoryPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // ─── Query ──────────────────────────────────────────────────────────────

  const { data, loading } = useQuery<PaymentHistoryData>(
    MY_PAYMENT_HISTORY,
    {
      variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      skip: !isAuthenticated,
    },
  );

  const { data: refundData, loading: refundLoading } = useQuery<RefundRequestsData>(
    MY_REFUND_REQUESTS,
    {
      skip: !isAuthenticated,
    },
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleRowClick = useCallback(
    (bookingId: string) => {
      navigate(`/cont/comenzi/${bookingId}`);
    },
    [navigate],
  );

  const payments = data?.myPaymentHistory.edges ?? [];
  const filteredPayments = statusFilter
    ? payments.filter((p) => p.status === statusFilter)
    : payments;
  const totalCount = data?.myPaymentHistory.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const refundRequests = refundData?.myRefundRequests ?? [];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Istoric plati</h1>
          <p className="text-gray-500 mt-1">
            Toate platile efectuate pentru rezervarile tale.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && <LoadingSpinner text="Se incarca istoricul platilor..." />}

      {/* Status Filter */}
      {payments.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Toate platile</option>
            <option value="SUCCEEDED">Reusita</option>
            <option value="PENDING">In asteptare</option>
            <option value="FAILED">Esuata</option>
            <option value="REFUNDED">Rambursata</option>
          </select>
        </div>
      )}

      {/* Payments Table */}
      {!loading && filteredPayments.length > 0 && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">Data</th>
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">Referinta</th>
                  <th className="text-right px-3 md:px-6 py-3 font-medium text-gray-500">Suma (RON)</th>
                  <th className="text-center px-3 md:px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-3 md:px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => {
                  const cfg = STATUS_CONFIG[payment.status] ?? {
                    label: payment.status,
                    variant: 'default' as const,
                  };

                  return (
                    <tr
                      key={payment.id}
                      onClick={() => payment.booking && handleRowClick(payment.booking.id)}
                      className={
                        payment.booking
                          ? 'hover:bg-gray-50 cursor-pointer transition'
                          : ''
                      }
                    >
                      <td className="px-3 md:px-6 py-4 text-gray-900 whitespace-nowrap">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        {payment.booking ? (
                          <div>
                            <span className="font-medium text-gray-900">
                              {payment.booking.referenceCode}
                            </span>
                            <span className="block text-xs text-gray-400">
                              {payment.booking.serviceName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-3 md:px-6 py-4">
                        {payment.booking && (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredPayments.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Receipt className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nicio plata inregistrata
          </h3>
          <p className="text-gray-500">
            Istoricul platilor va aparea aici dupa prima ta rezervare platita.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6">
          <span className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'tranzactie' : 'tranzactii'} &middot; Pagina {page + 1} din {totalPages}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm text-gray-700">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="hidden sm:inline">Urmator</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Refund Requests Section */}
      {!refundLoading && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Cererile mele de rambursare
          </h2>

          {refundRequests.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-sm text-center py-4">
                Nu aveti cereri de rambursare.
              </p>
            </Card>
          ) : (
            <Card padding={false}>
              <ul className="divide-y divide-gray-100">
                {refundRequests.map((refund) => {
                  const cfg = REFUND_STATUS_CONFIG[refund.status];

                  return (
                    <li
                      key={refund.id}
                      className="flex items-center justify-between gap-4 px-4 md:px-6 py-4"
                    >
                      {/* Left: status dot + booking info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 h-2.5 w-2.5 rounded-full ${cfg.dotColor}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          {refund.booking ? (
                            <>
                              <span className="block text-sm font-medium text-gray-900 truncate">
                                {refund.booking.referenceCode}
                              </span>
                              <span className="block text-xs text-gray-400 truncate">
                                {refund.booking.serviceName}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </div>

                      {/* Right: amount, status, date */}
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatAmount(refund.amount)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
                            refund.status === 'REQUESTED'
                              ? 'text-amber-600'
                              : refund.status === 'APPROVED'
                                ? 'text-blue-600'
                                : refund.status === 'PROCESSED'
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                          }`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                          {formatDate(refund.createdAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
