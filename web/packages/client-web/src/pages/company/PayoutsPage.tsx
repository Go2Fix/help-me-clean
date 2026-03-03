import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Wallet,
  TrendingUp,
  Receipt,
  CreditCard,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Hash,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MY_COMPANY_EARNINGS,
  MY_PAYOUTS,
  MY_PAYOUT_DETAIL,
  MY_CONNECT_STATUS,
  INITIATE_CONNECT_ONBOARDING,
  REFRESH_CONNECT_ONBOARDING,
} from '@/graphql/operations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRON(amountCents: number): string {
  return (amountCents / 100).toFixed(2) + ' lei';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: toYYYYMMDD(firstDay),
    to: toYYYYMMDD(now),
  };
}

type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';

const payoutStatusBadge: Record<PayoutStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
};

const payoutStatusLabel: Record<PayoutStatus, string> = {
  PENDING: 'In asteptare',
  PROCESSING: 'In procesare',
  PAID: 'Platit',
  FAILED: 'Esuat',
};

const statusFilterOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'PROCESSING', label: 'In procesare' },
  { value: 'PAID', label: 'Platit' },
  { value: 'FAILED', label: 'Esuat' },
];

// ─── Metric ──────────────────────────────────────────────────────────────────

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Stripe Connect Card ──────────────────────────────────────────────────────

function StripeConnectCard() {
  const { data, loading } = useQuery(MY_CONNECT_STATUS);
  const [initiateOnboarding, { loading: initiating }] = useMutation(INITIATE_CONNECT_ONBOARDING);
  const [refreshOnboarding, { loading: refreshing }] = useMutation(REFRESH_CONNECT_ONBOARDING);

  const connectStatus = data?.myConnectStatus;
  const onboardingStatus: string = connectStatus?.onboardingStatus ?? 'NOT_STARTED';

  const handleInitiate = async () => {
    try {
      const { data: result } = await initiateOnboarding();
      const url = result?.initiateConnectOnboarding?.url;
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Error handled by Apollo
    }
  };

  const handleRefresh = async () => {
    try {
      const { data: result } = await refreshOnboarding();
      const url = result?.refreshConnectOnboarding?.url;
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Error handled by Apollo
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-200 rounded-xl" />
          <div>
            <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-28" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2.5 md:p-3 rounded-xl bg-purple-100 shrink-0">
            <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm font-medium text-gray-500">Stripe Connect</p>
            {onboardingStatus === 'COMPLETE' ? (
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-emerald-600">Stripe activ</span>
                {connectStatus?.chargesEnabled && (
                  <Badge variant="success">Plati activate</Badge>
                )}
              </div>
            ) : onboardingStatus === 'PENDING' ? (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-semibold text-amber-600">Inregistrare incompleta</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">Neconectat</span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {onboardingStatus === 'NOT_STARTED' && (
            <Button onClick={handleInitiate} loading={initiating} size="sm">
              <ExternalLink className="h-4 w-4" />
              Conecteaza cu Stripe
            </Button>
          )}
          {onboardingStatus === 'PENDING' && (
            <Button onClick={handleRefresh} loading={refreshing} size="sm" variant="outline">
              <ExternalLink className="h-4 w-4" />
              Finalizeaza inregistrarea
            </Button>
          )}
          {onboardingStatus === 'COMPLETE' && (
            <Badge variant="success">Activ</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Payout Detail Row ────────────────────────────────────────────────────────

interface PayoutLineItem {
  id: string;
  amountGross: number;
  amountCommission: number;
  amountNet: number;
  booking: {
    id: string;
    referenceCode: string;
    serviceName: string;
    scheduledDate: string;
  };
}

function PayoutDetailPanel({ payoutId }: { payoutId: string }) {
  const { data, loading } = useQuery(MY_PAYOUT_DETAIL, {
    variables: { id: payoutId },
  });

  const detail = data?.myPayoutDetail;
  const lineItems: PayoutLineItem[] = detail?.lineItems ?? [];

  if (loading) {
    return (
      <div className="px-3 md:px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-56" />
        </div>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="px-3 md:px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-sm text-gray-500">Nu exista detalii disponibile.</p>
      </div>
    );
  }

  return (
    <div className="px-3 md:px-6 py-4 bg-gray-50 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Detalii rezervari</p>
      <div className="space-y-2">
        {lineItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-lg bg-white border border-gray-100 gap-1 sm:gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Hash className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.booking.referenceCode} - {item.booking.serviceName}
                </p>
                <p className="text-xs text-gray-500">{formatDate(item.booking.scheduledDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-6 sm:ml-4 text-xs sm:text-sm">
              <span className="text-gray-500">{formatRON(item.amountGross)}</span>
              <span className="text-amber-600">-{formatRON(item.amountCommission)}</span>
              <span className="font-semibold text-emerald-600">{formatRON(item.amountNet)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Payout {
  id: string;
  amount: number;
  periodFrom: string;
  periodTo: string;
  bookingCount: number;
  status: PayoutStatus;
  paidAt: string | null;
  createdAt: string;
}

export default function PayoutsPage() {
  const defaultRange = useMemo(getMonthRange, []);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Earnings query for date range
  const { data: earningsData, loading: earningsLoading } = useQuery(MY_COMPANY_EARNINGS, {
    variables: { from: dateFrom, to: dateTo },
  });

  // Payouts list
  const { data: payoutsData, loading: payoutsLoading } = useQuery(MY_PAYOUTS, {
    variables: { first: 50 },
  });

  const earnings = earningsData?.myCompanyEarnings;
  const allPayouts: Payout[] = payoutsData?.myPayouts ?? [];

  // Client-side status filtering
  const payouts = statusFilter
    ? allPayouts.filter((p: Payout) => p.status === statusFilter)
    : allPayouts;

  const toggleExpand = (payoutId: string) => {
    setExpandedPayoutId((prev) => (prev === payoutId ? null : payoutId));
  };

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plăți și Câștiguri</h1>
        <p className="text-gray-500 mt-1">
          Gestioneaza castigurile, platile si contul Stripe Connect.
        </p>
      </div>

      {/* Stripe Connect Status */}
      <div className="mb-6">
        <StripeConnectCard />
      </div>

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
        <div className="grid grid-cols-2 sm:flex sm:items-end gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              label="De la"
              className="appearance-none px-2 sm:px-4"
            />
          </div>
          <div className="sm:w-40">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              label="Pana la"
              className="appearance-none px-2 sm:px-4"
            />
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      {earningsLoading ? (
        <Card className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-3">
                <div className="h-9 w-9 bg-gray-200 rounded-lg shrink-0" />
                <div>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : earnings ? (
        <Card className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <Metric icon={TrendingUp} label="Venit brut" value={formatRON(earnings.totalGross ?? 0)} />
            <div className="pt-3 md:pt-0 md:pl-6">
              <Metric icon={Receipt} label="Comision platforma" value={formatRON(earnings.totalCommission ?? 0)} />
            </div>
            <div className="pt-3 md:pt-0 md:pl-6">
              <Metric icon={Wallet} label="Venit net" value={formatRON(earnings.totalNet ?? 0)} />
            </div>
            <div className="pt-3 md:pt-0 md:pl-6">
              <Metric icon={Hash} label="Rezervări" value={earnings.bookingCount ?? 0} />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Status filter */}
      <div className="mb-6">
        <div className="w-full sm:w-64">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filtrează după status"
          />
        </div>
      </div>

      {/* Payouts Table */}
      <Card padding={false}>
        {payoutsLoading ? (
          <LoadingSpinner text="Se incarca platile..." />
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio plata</h3>
            <p className="text-gray-500">
              Nu exista plati {statusFilter ? 'pentru filtrul selectat' : 'inregistrate inca'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Perioada
                  </th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Suma
                  </th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                    Rezervări
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                    Data platii
                  </th>
                  <th className="px-2 md:px-6 py-3 w-8 md:w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payouts.map((payout: Payout) => {
                  const isExpanded = expandedPayoutId === payout.id;
                  return (
                    <tr key={payout.id} className="group">
                      <td colSpan={6} className="p-0">
                        <div
                          onClick={() => toggleExpand(payout.id)}
                          className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="px-3 md:px-6 py-3 md:py-4 flex-1 min-w-0">
                            <span className="text-xs md:text-sm font-medium text-gray-900">
                              {formatDate(payout.periodFrom)} - {formatDate(payout.periodTo)}
                            </span>
                          </div>
                          <div className="px-3 md:px-6 py-3 md:py-4 text-right">
                            <span className="text-xs md:text-sm font-bold text-gray-900 whitespace-nowrap">
                              {formatRON(payout.amount)}
                            </span>
                          </div>
                          <div className="px-3 md:px-6 py-3 md:py-4 text-right hidden sm:block">
                            <span className="text-sm text-gray-600">
                              {payout.bookingCount}
                            </span>
                          </div>
                          <div className="px-3 md:px-6 py-3 md:py-4">
                            <Badge
                              variant={payoutStatusBadge[payout.status] ?? 'default'}
                            >
                              {payoutStatusLabel[payout.status] ?? payout.status}
                            </Badge>
                          </div>
                          <div className="px-3 md:px-6 py-3 md:py-4 hidden md:block">
                            <span className="text-sm text-gray-500">
                              {payout.paidAt ? formatDate(payout.paidAt) : '--'}
                            </span>
                          </div>
                          <div className="px-2 md:px-6 py-3 md:py-4">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && <PayoutDetailPanel payoutId={payout.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
