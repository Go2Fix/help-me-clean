import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@go2fix/shared';
import AdminPayoutsPage from '@/pages/admin/AdminPayoutsPage';
import RefundsPage from '@/pages/admin/RefundsPage';
import {
  Banknote,
  TrendingUp,
  ArrowDownRight,
  Clock,
  RotateCcw,
  CreditCard,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatCard from '@/components/admin/StatCard';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents } from '@/utils/format';
import {
  PLATFORM_REVENUE_REPORT,
  ALL_PAYMENT_TRANSACTIONS,
} from '@/graphql/operations';

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

// ─── Date Presets ──────────────────────────────────────────────────────────

interface DatePreset {
  label: string;
  getRange: () => { from: string; to: string };
}

const datePresets: DatePreset[] = [
  {
    label: 'Luna aceasta',
    getRange: () => {
      const now = new Date();
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: 'Luna trecuta',
    getRange: () => {
      const now = new Date();
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: '3 Luni',
    getRange: () => {
      const now = new Date();
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: '6 Luni',
    getRange: () => {
      const now = new Date();
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    },
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

interface PaymentTransaction {
  id: string;
  bookingId: string;
  stripePaymentIntentId: string;
  amountTotal: number;
  amountCompany: number;
  amountPlatformFee: number;
  currency: string;
  status: string;
  failureReason: string | null;
  refundAmount: number;
  createdAt: string;
  booking: {
    id: string;
    referenceCode: string;
    serviceName: string;
    company: {
      id: string;
      companyName: string;
    } | null;
  } | null;
}

interface RevenueReport {
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalRefunds: number;
  netRevenue: number;
  bookingCount: number;
}

// ─── Status Maps ───────────────────────────────────────────────────────────

const paymentStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  REFUNDED: 'default',
  PARTIALLY_REFUNDED: 'warning',
};

const paymentStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  PROCESSING: 'Se proceseaza',
  SUCCEEDED: 'Reusita',
  FAILED: 'Esuata',
  REFUNDED: 'Rambursata',
  PARTIALLY_REFUNDED: 'Rambursata partial',
};

const statusOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'PROCESSING', label: 'Se proceseaza' },
  { value: 'SUCCEEDED', label: 'Reusita' },
  { value: 'FAILED', label: 'Esuata' },
  { value: 'REFUNDED', label: 'Rambursata' },
];

// ─── Sub-Tabs ──────────────────────────────────────────────────────────────

type PaymentsTab = 'summary' | 'payouts' | 'refunds';

const subTabs: { key: PaymentsTab; label: string }[] = [
  { key: 'summary', label: 'Sumar' },
  { key: 'payouts', label: 'Plati companii' },
  { key: 'refunds', label: 'Rambursari' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PaymentsTab>('summary');
  const defaults = getMonthRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Revenue report
  const { data: revenueData, loading: revenueLoading } = useQuery(PLATFORM_REVENUE_REPORT, {
    variables: { from: dateFrom, to: dateTo },
  });

  // Payment transactions -- fetch larger batch, paginate client-side
  const { data: txData, loading: txLoading } = useQuery(ALL_PAYMENT_TRANSACTIONS, {
    variables: {
      status: statusFilter || undefined,
      first: PAGE_SIZE,
    },
  });

  const report: RevenueReport | null = revenueData?.platformRevenueReport ?? null;
  const allTransactions: PaymentTransaction[] = txData?.allPaymentTransactions ?? [];

  // Client-side pagination
  const totalCount = allTransactions.length;
  const paginatedTransactions = useMemo(
    () => allTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [allTransactions, page],
  );

  // Reset to page 0 when filter changes
  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(0);
  }

  function applyPreset(preset: DatePreset) {
    const range = preset.getRange();
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plati si Venituri</h1>
        <p className="text-gray-500 mt-1">
          Raport financiar si tranzactii pe platforma.
        </p>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-gray-200">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <>
          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-600 hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-end gap-4 mb-6">
            <Input
              label="De la"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Pana la"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Revenue Summary Cards */}
          {revenueLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : report ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <StatCard
                icon={Banknote}
                label="Venit Total"
                value={formatCents(report.totalRevenue)}
                color="primary"
              />
              <StatCard
                icon={TrendingUp}
                label="Comision Platforma"
                value={formatCents(report.totalCommission)}
                color="secondary"
              />
              <StatCard
                icon={ArrowDownRight}
                label="Plati catre companii"
                value={formatCents(report.totalPayouts)}
                color="accent"
              />
              <StatCard
                icon={Clock}
                label="In asteptare"
                value={formatCents(report.pendingPayouts)}
                color="accent"
              />
              <StatCard
                icon={RotateCcw}
                label="Rambursari"
                value={formatCents(report.totalRefunds)}
                color="danger"
              />
            </div>
          ) : null}

          {/* Transactions Section */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Tranzactii</h3>
              </div>
              <div className="w-48">
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={handleStatusChange}
                  placeholder="Filtreaza"
                />
              </div>
            </div>

            {txLoading ? (
              <LoadingSpinner text="Se incarca tranzactiile..." />
            ) : paginatedTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nu exista tranzactii.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Data</th>
                        <th className="pb-3 font-medium">Cod Rezervare</th>
                        <th className="pb-3 font-medium hidden md:table-cell">Serviciu</th>
                        <th className="pb-3 font-medium">Companie</th>
                        <th className="pb-3 font-medium text-right">Total</th>
                        <th className="pb-3 font-medium text-right hidden md:table-cell">Companie primeste</th>
                        <th className="pb-3 font-medium text-right hidden md:table-cell">Comision platforma</th>
                        <th className="pb-3 font-medium text-right">Status</th>
                        <th className="pb-3 font-medium text-right">Rambursare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (tx.booking?.id) {
                              navigate(`/admin/comenzi/${tx.booking.id}`);
                            }
                          }}
                        >
                          <td className="py-3 text-gray-600 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString('ro-RO')}
                          </td>
                          <td className="py-3 font-medium text-gray-900 whitespace-nowrap">
                            {tx.booking?.referenceCode ?? '-'}
                          </td>
                          <td className="py-3 text-gray-600 hidden md:table-cell">
                            {tx.booking?.serviceName ?? '-'}
                          </td>
                          <td className="py-3 text-gray-600">
                            {tx.booking?.company?.companyName ?? '-'}
                          </td>
                          <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                            {formatCents(tx.amountTotal)}
                          </td>
                          <td className="py-3 text-right text-gray-600 whitespace-nowrap hidden md:table-cell">
                            {formatCents(tx.amountCompany)}
                          </td>
                          <td className="py-3 text-right text-gray-600 whitespace-nowrap hidden md:table-cell">
                            {formatCents(tx.amountPlatformFee)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge variant={paymentStatusVariant[tx.status] ?? 'default'}>
                              {paymentStatusLabel[tx.status] ?? tx.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-gray-600 whitespace-nowrap">
                            {tx.refundAmount > 0 ? formatCents(tx.refundAmount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AdminPagination
                  page={page}
                  totalCount={totalCount}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  noun="tranzactii"
                />
              </>
            )}
          </Card>
        </>
      )}

      {activeTab === 'payouts' && <AdminPayoutsPage />}
      {activeTab === 'refunds' && <RefundsPage />}
    </div>
  );
}
