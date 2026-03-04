import { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

// Lazy-load sub-tab components (code-split)
const AdminPayoutsPage = lazy(() => import('@/pages/admin/AdminPayoutsPage'));
const RefundsPage = lazy(() => import('@/pages/admin/RefundsPage'));

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

// ─── Sub-Tabs ──────────────────────────────────────────────────────────────

type PaymentsTab = 'summary' | 'payouts' | 'refunds';

// ─── Tab loading fallback ──────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <Card padding={false}>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
            <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="flex-1" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'admin']);

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const tabOptions = [
    { value: 'summary', label: t('admin:payments.tabs.summary') },
    { value: 'payouts', label: t('admin:payments.tabs.payouts') },
    { value: 'refunds', label: t('admin:payments.tabs.refunds') },
  ];

  const statusOptions = [
    { value: '', label: t('admin:payments.allStatuses') },
    { value: 'PENDING', label: t('admin:payments.statusLabels.PENDING') },
    { value: 'PROCESSING', label: t('admin:payments.statusLabels.PROCESSING') },
    { value: 'SUCCEEDED', label: t('admin:payments.statusLabels.SUCCEEDED') },
    { value: 'FAILED', label: t('admin:payments.statusLabels.FAILED') },
    { value: 'REFUNDED', label: t('admin:payments.statusLabels.REFUNDED') },
  ];

  const datePresets = [
    {
      label: t('admin:payments.presets.thisMonth'),
      getRange: () => {
        const now = new Date();
        return {
          from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
      },
    },
    {
      label: t('admin:payments.presets.lastMonth'),
      getRange: () => {
        const now = new Date();
        return {
          from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          to: toDateStr(new Date(now.getFullYear(), now.getMonth(), 0)),
        };
      },
    },
    {
      label: t('admin:payments.presets.threeMonths'),
      getRange: () => {
        const now = new Date();
        return {
          from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
          to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
      },
    },
    {
      label: t('admin:payments.presets.sixMonths'),
      getRange: () => {
        const now = new Date();
        return {
          from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
          to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
      },
    },
  ];

  const [activeTab, setActiveTab] = useState<PaymentsTab>('summary');
  const defaults = getMonthRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Track which tabs have been visited (for keeping state alive)
  const [visitedTabs, setVisitedTabs] = useState<Set<PaymentsTab>>(new Set(['summary']));

  function handleTabChange(tab: PaymentsTab) {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set(prev).add(tab));
  }

  // Revenue report — skip when not on summary tab
  const { data: revenueData, loading: revenueLoading } = useQuery(PLATFORM_REVENUE_REPORT, {
    variables: { from: dateFrom, to: dateTo },
    skip: activeTab !== 'summary',
  });

  // Payment transactions — skip when not on summary tab
  const { data: txData, loading: txLoading } = useQuery(ALL_PAYMENT_TRANSACTIONS, {
    variables: {
      status: statusFilter || undefined,
      first: PAGE_SIZE,
    },
    skip: activeTab !== 'summary',
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

  function applyPreset(preset: { label: string; getRange: () => { from: string; to: string } }) {
    const range = preset.getRange();
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  const metricsItems = report ? [
    { icon: Banknote, label: t('admin:payments.metrics.totalRevenue'), value: formatCents(report.totalRevenue) },
    { icon: TrendingUp, label: t('admin:payments.metrics.platformCommission'), value: formatCents(report.totalCommission) },
    { icon: ArrowDownRight, label: t('admin:payments.metrics.companyPayouts'), value: formatCents(report.totalPayouts) },
    { icon: Clock, label: t('admin:payments.metrics.pending'), value: formatCents(report.pendingPayouts) },
    { icon: RotateCcw, label: t('admin:payments.metrics.refunds'), value: formatCents(report.totalRefunds) },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:payments.title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('admin:payments.subtitle')}
        </p>
      </div>

      {/* Tab Selector */}
      <div className="mb-6 w-56">
        <Select
          options={tabOptions}
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value as PaymentsTab)}
        />
      </div>

      {/* Summary tab — hidden instead of unmounted to preserve state */}
      <div className={activeTab === 'summary' ? '' : 'hidden'}>
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
              {metricsItems.map((item, idx) => (
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
              allTransactions.map((tx) => ({
                [t('admin:payments.csvColumns.transactionId')]: tx.id,
                [t('admin:payments.csvColumns.bookingCode')]: tx.booking?.referenceCode ?? '',
                [t('admin:payments.csvColumns.service')]: tx.booking?.serviceName ?? '',
                [t('admin:payments.csvColumns.company')]: tx.booking?.company?.companyName ?? '',
                [t('admin:payments.csvColumns.totalAmount')]: (tx.amountTotal / 100).toFixed(2),
                [t('admin:payments.csvColumns.commission')]: (tx.amountPlatformFee / 100).toFixed(2),
                [t('admin:payments.csvColumns.companyAmount')]: (tx.amountCompany / 100).toFixed(2),
                [t('admin:payments.csvColumns.status')]: tx.status,
                [t('admin:payments.csvColumns.date')]: new Date(tx.createdAt).toLocaleDateString(locale),
              })),
              `tranzactii-${new Date().toISOString().slice(0, 10)}.csv`
            )}
          >
            <Download className="h-4 w-4" />
            {t('admin:payments.exportCsv')}
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
            <p className="text-center text-gray-400 py-12">{t('admin:payments.empty')}</p>
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
                      {t(`admin:payments.statusLabels.${tx.status}`, { defaultValue: tx.status })}
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
                  noun={t('admin:payments.noun')}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Payouts tab — lazy-loaded, kept alive once visited */}
      {visitedTabs.has('payouts') && (
        <div className={activeTab === 'payouts' ? '' : 'hidden'}>
          <Suspense fallback={<TabSkeleton />}>
            <AdminPayoutsPage />
          </Suspense>
        </div>
      )}

      {/* Refunds tab — lazy-loaded, kept alive once visited */}
      {visitedTabs.has('refunds') && (
        <div className={activeTab === 'refunds' ? '' : 'hidden'}>
          <Suspense fallback={<TabSkeleton />}>
            <RefundsPage />
          </Suspense>
        </div>
      )}
    </div>
  );
}
