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
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  colorBg: string;
  colorText: string;
  valueColor?: string;
}

function KpiCard({ icon: Icon, label, value, colorBg, colorText, valueColor }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', colorBg)}>
          <Icon className={cn('h-6 w-6', colorText)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={cn('text-2xl font-bold', valueColor ?? 'text-gray-900')}>
            {value}
          </p>
        </div>
      </div>
    </Card>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Stripe Connect</p>
            {onboardingStatus === 'COMPLETE' ? (
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">Stripe activ</span>
                {connectStatus?.chargesEnabled && (
                  <Badge variant="success">Plati activate</Badge>
                )}
              </div>
            ) : onboardingStatus === 'PENDING' ? (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600">Inregistrare incompleta</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Neconectat</span>
              </div>
            )}
          </div>
        </div>

        <div>
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
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
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
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-sm text-gray-500">Nu exista detalii disponibile.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Detalii rezervari</p>
      <div className="space-y-2">
        {lineItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-gray-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Hash className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.booking.referenceCode} - {item.booking.serviceName}
                </p>
                <p className="text-xs text-gray-500">{formatDate(item.booking.scheduledDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4 text-sm">
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

export default function PayoutsPage() {
  const defaultRange = useMemo(getMonthRange, []);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);

  // Earnings query for date range
  const { data: earningsData, loading: earningsLoading } = useQuery(MY_COMPANY_EARNINGS, {
    variables: { from: dateFrom, to: dateTo },
  });

  // Payouts list
  const { data: payoutsData, loading: payoutsLoading } = useQuery(MY_PAYOUTS, {
    variables: { first: 50 },
  });

  const earnings = earningsData?.myCompanyEarnings;
  const payouts = payoutsData?.myPayouts ?? [];

  const toggleExpand = (payoutId: string) => {
    setExpandedPayoutId((prev) => (prev === payoutId ? null : payoutId));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plati si Castiguri</h1>
        <p className="text-gray-500 mt-1">
          Gestioneaza castigurile, platile si contul Stripe Connect.
        </p>
      </div>

      {/* Stripe Connect Status */}
      <div className="mb-6">
        <StripeConnectCard />
      </div>

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          label="De la"
          className="w-auto"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          label="Pana la"
          className="w-auto"
        />
      </div>

      {/* Earnings Summary KPI Cards */}
      {earningsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-xl" />
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-7 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : earnings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            icon={TrendingUp}
            label="Venit brut"
            value={formatRON(earnings.totalGross ?? 0)}
            colorBg="bg-blue-600/10"
            colorText="text-blue-600"
            valueColor="text-blue-600"
          />
          <KpiCard
            icon={Receipt}
            label="Comision platforma"
            value={formatRON(earnings.totalCommission ?? 0)}
            colorBg="bg-amber-500/10"
            colorText="text-amber-500"
            valueColor="text-amber-600"
          />
          <KpiCard
            icon={Wallet}
            label="Venit net"
            value={formatRON(earnings.totalNet ?? 0)}
            colorBg="bg-emerald-500/10"
            colorText="text-emerald-500"
            valueColor="text-emerald-600"
          />
          <KpiCard
            icon={Hash}
            label="Rezervari"
            value={String(earnings.bookingCount ?? 0)}
            colorBg="bg-gray-100"
            colorText="text-gray-600"
          />
        </div>
      ) : null}

      {/* Payouts Table */}
      <Card padding={false}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Istoricul platilor</h2>
          <p className="text-sm text-gray-500 mt-1">
            Platile periodice catre contul tau Stripe.
          </p>
        </div>

        {payoutsLoading ? (
          <LoadingSpinner text="Se incarca platile..." />
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio plata</h3>
            <p className="text-gray-500">
              Nu exista plati inregistrate inca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Perioada
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Suma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Rezervari
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Data platii
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payouts.map(
                  (payout: {
                    id: string;
                    amount: number;
                    periodFrom: string;
                    periodTo: string;
                    bookingCount: number;
                    status: PayoutStatus;
                    paidAt: string | null;
                    createdAt: string;
                  }) => {
                    const isExpanded = expandedPayoutId === payout.id;
                    return (
                      <tr key={payout.id} className="group">
                        <td colSpan={6} className="p-0">
                          <div
                            onClick={() => toggleExpand(payout.id)}
                            className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="px-6 py-4 flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                {formatDate(payout.periodFrom)} - {formatDate(payout.periodTo)}
                              </div>
                            </div>
                            <div className="px-6 py-4 text-right">
                              <span className="text-sm font-bold text-gray-900">
                                {formatRON(payout.amount)}
                              </span>
                            </div>
                            <div className="px-6 py-4 text-right">
                              <span className="text-sm text-gray-600">
                                {payout.bookingCount}
                              </span>
                            </div>
                            <div className="px-6 py-4">
                              <Badge
                                variant={payoutStatusBadge[payout.status] ?? 'default'}
                              >
                                {payoutStatusLabel[payout.status] ?? payout.status}
                              </Badge>
                            </div>
                            <div className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {payout.paidAt ? formatDate(payout.paidAt) : '--'}
                              </span>
                            </div>
                            <div className="px-6 py-4">
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
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
