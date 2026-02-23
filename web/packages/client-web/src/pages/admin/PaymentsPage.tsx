import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import AdminPayoutsPage from '@/pages/admin/AdminPayoutsPage';
import RefundsPage from '@/pages/admin/RefundsPage';
import {
  Banknote,
  TrendingUp,
  ArrowDownRight,
  Clock,
  RotateCcw,
  Calendar,
  Building2,
  Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import AdminPagination from '@/components/admin/AdminPagination';
import Button from '@/components/ui/Button';
import { formatCents, formatDate, exportToCSV } from '@/utils/format';
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

const paymentStatusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  PROCESSING: 'bg-blue-400',
  SUCCEEDED: 'bg-emerald-500',
  FAILED: 'bg-red-400',
  REFUNDED: 'bg-gray-400',
  PARTIALLY_REFUNDED: 'bg-amber-400',
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

const tabOptions = [
  { value: 'summary', label: 'Sumar tranzactii' },
  { value: 'payouts', label: 'Plati companii' },
  { value: 'refunds', label: 'Rambursari' },
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

      {/* Tab Selector */}
      <div className="mb-6 w-56">
        <Select
          options={tabOptions}
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as PaymentsTab)}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <>
          {/* Date Range Presets + Inputs */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-gray-400 pb-2.5">&mdash;</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {datePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Summary */}
          {revenueLoading ? (
            <Card className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
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
          ) : report ? (
            <Card className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {[
                  { icon: Banknote, label: 'Venit total', value: formatCents(report.totalRevenue) },
                  { icon: TrendingUp, label: 'Comision platforma', value: formatCents(report.totalCommission) },
                  { icon: ArrowDownRight, label: 'Plati companii', value: formatCents(report.totalPayouts) },
                  { icon: Clock, label: 'In asteptare', value: formatCents(report.pendingPayouts) },
                  { icon: RotateCcw, label: 'Rambursari', value: formatCents(report.totalRefunds) },
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-3 py-3 ${idx > 0 ? 'md:pl-6' : ''}`}>
                    <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <item.icon className="h-4.5 w-4.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 leading-tight">{item.label}</p>
                      <p className="text-lg font-semibold text-gray-900 leading-tight">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Transactions — filter + flat list */}
          <div className="mb-4 flex items-center gap-3">
            <div className="w-48">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={handleStatusChange}
              />
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(
                allTransactions.map((t: any) => ({
                  'ID Tranzactie': t.id,
                  'Cod Rezervare': t.booking?.referenceCode ?? '',
                  'Serviciu': t.booking?.serviceName ?? '',
                  'Companie': t.booking?.company?.companyName ?? '',
                  'Suma Totala (lei)': (t.amountTotal / 100).toFixed(2),
                  'Comision (lei)': (t.amountPlatformFee / 100).toFixed(2),
                  'Suma Companie (lei)': (t.amountCompany / 100).toFixed(2),
                  'Status': t.status,
                  'Data': new Date(t.createdAt).toLocaleDateString('ro-RO'),
                })),
                `tranzactii-${new Date().toISOString().slice(0, 10)}.csv`
              )}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card padding={false}>
            {txLoading ? (
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
            ) : paginatedTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nu exista tranzactii.</p>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {paginatedTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (tx.booking?.id) navigate(`/admin/comenzi/${tx.booking.id}`);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${paymentStatusDotColor[tx.status] ?? 'bg-gray-300'}`} />
                      <span className="text-sm font-semibold text-gray-900 w-20 shrink-0">
                        {tx.booking?.referenceCode ?? '-'}
                      </span>
                      <span className="text-sm text-gray-700 truncate min-w-0">
                        {tx.booking?.serviceName ?? '-'}
                      </span>
                      <span className="flex-1" />
                      <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                        <Building2 className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">{tx.booking?.company?.companyName ?? '-'}</span>
                      </span>
                      <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tx.createdAt)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                        {formatCents(tx.amountTotal)}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 w-24 text-right hidden sm:block">
                        {paymentStatusLabel[tx.status] ?? tx.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4">
                  <AdminPagination
                    page={page}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    noun="tranzactii"
                  />
                </div>
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
