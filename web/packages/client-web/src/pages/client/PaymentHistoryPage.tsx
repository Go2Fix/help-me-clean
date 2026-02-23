import { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { Receipt, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MY_PAYMENT_HISTORY } from '@/graphql/operations';

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
      endCursor: string | null;
    };
    totalCount: number;
  };
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentHistoryPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ─── Query ──────────────────────────────────────────────────────────────

  const { data, loading, fetchMore } = useQuery<PaymentHistoryData>(
    MY_PAYMENT_HISTORY,
    {
      variables: { first: PAGE_SIZE },
      skip: !isAuthenticated,
    },
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (!data?.myPaymentHistory.pageInfo.endCursor) return;

    fetchMore({
      variables: {
        first: PAGE_SIZE,
        after: data.myPaymentHistory.pageInfo.endCursor,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          myPaymentHistory: {
            ...fetchMoreResult.myPaymentHistory,
            edges: [
              ...prev.myPaymentHistory.edges,
              ...fetchMoreResult.myPaymentHistory.edges,
            ],
          },
        };
      },
    });
  }, [data, fetchMore]);

  const handleRowClick = useCallback(
    (bookingId: string) => {
      navigate(`/cont/comenzi/${bookingId}`);
    },
    [navigate],
  );

  const payments = data?.myPaymentHistory.edges ?? [];
  const hasMore = data?.myPaymentHistory.pageInfo.hasNextPage ?? false;
  const totalCount = data?.myPaymentHistory.totalCount ?? 0;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Istoric plati</h1>
          <p className="text-gray-500 mt-1">
            Toate platile efectuate pentru rezervarile tale.
            {totalCount > 0 && (
              <span className="ml-1 font-medium text-gray-700">
                ({totalCount} {totalCount === 1 ? 'tranzactie' : 'tranzactii'})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && <LoadingSpinner text="Se incarca istoricul platilor..." />}

      {/* Payments Table */}
      {!loading && payments.length > 0 && (
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
                {payments.map((payment) => {
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

          {/* Load More */}
          {hasMore && (
            <div className="px-3 md:px-6 py-4 border-t border-gray-100 text-center">
              <Button variant="ghost" onClick={handleLoadMore}>
                Incarca mai multe
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Empty State */}
      {!loading && payments.length === 0 && (
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
    </div>
  );
}
