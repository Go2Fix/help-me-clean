import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Pause,
  AlertTriangle,
  TrendingUp,
  Calendar,
  User,
  Building2,
  XCircle,
  Repeat,
  Search,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import AdminPagination from '@/components/admin/AdminPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  ALL_SUBSCRIPTIONS,
  SUBSCRIPTION_STATS,
  ADMIN_CANCEL_SUBSCRIPTION,
} from '../../graphql/operations';

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'CANCELLED';

const statusDotColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  PAUSED: 'bg-amber-400',
  PAST_DUE: 'bg-red-400',
  CANCELLED: 'bg-gray-300',
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  recurrenceType: string;
  serviceType: string;
  serviceName: string;
  status: string;
  monthlyAmount: number;
  perSessionDiscounted: number;
  sessionsPerMonth: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  cancelledAt: string | null;
  client: { id: string; fullName: string; email: string } | null;
  company: { id: string; companyName: string } | null;
  worker: { id: string; fullName: string } | null;
  totalBookings: number;
  completedBookings: number;
}

interface SubscriptionStats {
  activeCount: number;
  pausedCount: number;
  pastDueCount: number;
  cancelledCount: number;
  monthlyRecurringRevenue: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'admin']);

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const statusOptions = [
    { value: 'ALL', label: t('admin:subscriptions.allStatuses') },
    { value: 'ACTIVE', label: t('admin:subscriptions.statusLabels.ACTIVE') },
    { value: 'PAUSED', label: t('admin:subscriptions.statusLabels.PAUSED') },
    { value: 'PAST_DUE', label: t('admin:subscriptions.statusLabels.PAST_DUE') },
    { value: 'CANCELLED', label: t('admin:subscriptions.statusLabels.CANCELLED') },
  ];

  // Filter & pagination
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const debouncedQuery = useDebounce(searchInput, 300);

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSubId, setCancelSubId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Stats query
  const { data: statsData, loading: statsLoading } = useQuery(SUBSCRIPTION_STATS);

  // Subscriptions list query
  const { data, loading, error, refetch } = useQuery(ALL_SUBSCRIPTIONS, {
    variables: {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
  });

  // Cancel mutation
  const [cancelSubscription, { loading: cancelling }] = useMutation(ADMIN_CANCEL_SUBSCRIPTION, {
    onCompleted: () => {
      setCancelModalOpen(false);
      setCancelSubId(null);
      setCancelReason('');
      refetch();
    },
  });

  const stats: SubscriptionStats | null = statsData?.subscriptionStats ?? null;
  const allSubscriptions: Subscription[] = data?.allSubscriptions?.edges ?? [];
  const totalCount: number = data?.allSubscriptions?.totalCount ?? 0;

  // Client-side search filtering (backend doesn't support search yet)
  const subscriptions = debouncedQuery
    ? allSubscriptions.filter((sub) => {
        const q = debouncedQuery.toLowerCase();
        return (
          sub.client?.fullName?.toLowerCase().includes(q) ||
          sub.client?.email?.toLowerCase().includes(q) ||
          sub.company?.companyName?.toLowerCase().includes(q) ||
          sub.worker?.fullName?.toLowerCase().includes(q) ||
          sub.serviceName?.toLowerCase().includes(q)
        );
      })
    : allSubscriptions;

  // Handlers
  const handleFilterChange = (newFilter: StatusFilter) => {
    setStatusFilter(newFilter);
    setPage(0);
  };

  const handleOpenCancel = (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    setCancelSubId(subId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelSubId) return;
    try {
      await cancelSubscription({
        variables: {
          id: cancelSubId,
          reason: cancelReason || undefined,
        },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const formatMRR = (bani: number): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(bani / 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:subscriptions.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin:subscriptions.subtitle')}</p>
      </div>

      {/* Key Metrics */}
      {statsLoading ? (
        <Card className="mb-6">
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
      ) : stats ? (
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{t('admin:subscriptions.metrics.active')}</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{stats.activeCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 pt-3 md:pt-3 md:pl-6">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Pause className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{t('admin:subscriptions.metrics.paused')}</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{stats.pausedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 pt-3 md:pt-3 md:pl-6">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{t('admin:subscriptions.metrics.pastDue')}</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{stats.pastDueCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 pt-3 md:pt-3 md:pl-6">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{t('admin:subscriptions.metrics.mrr')}</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{formatMRR(stats.monthlyRecurringRevenue)}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Filter Bar */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder={t('admin:subscriptions.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value as StatusFilter)}
        />
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              {t('admin:subscriptions.errorLoading')}
            </p>
          </div>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="hidden md:block h-4 bg-gray-200 rounded w-24" />
                <div className="flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-center text-gray-400 py-16">{t('admin:subscriptions.empty')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/admin/abonamente/${sub.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Status dot */}
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColor[sub.status] ?? 'bg-gray-300'}`} />

                {/* Service name */}
                <span className="text-sm font-semibold text-gray-900 truncate min-w-0 max-w-[140px]">
                  {sub.serviceName}
                </span>

                {/* Recurrence badge */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-blue-600 shrink-0">
                  <Repeat className="h-3 w-3" />
                  {t(`admin:subscriptions.recurrenceLabels.${sub.recurrenceType}`, { defaultValue: sub.recurrenceType })}
                </span>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Client — desktop */}
                <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <User className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{sub.client?.fullName || '—'}</span>
                </span>

                {/* Company — desktop */}
                <span className="hidden lg:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Building2 className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{sub.company?.companyName || '—'}</span>
                </span>

                {/* Created date — desktop */}
                <span className="hidden lg:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {formatDate(sub.createdAt)}
                </span>

                {/* Monthly amount */}
                <span className="text-sm font-medium text-gray-900 shrink-0 w-24 text-right">
                  {formatCurrency(sub.monthlyAmount)}/{t('admin:subscriptions.monthSuffix')}
                </span>

                {/* Status label */}
                <span className="text-xs text-gray-500 shrink-0 w-16 text-right hidden sm:block">
                  {t(`admin:subscriptions.statusLabels.${sub.status}`, { defaultValue: sub.status })}
                </span>

                {/* Cancel button */}
                {sub.status !== 'CANCELLED' && (
                  <button
                    onClick={(e) => handleOpenCancel(e, sub.id)}
                    className="hidden sm:flex items-center p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t('admin:subscriptions.cancelTitle')}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun={t('admin:subscriptions.noun')}
        />
      )}

      {/* Cancel Subscription Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelSubId(null);
          setCancelReason('');
        }}
        title={t('admin:subscriptions.cancelModal.title')}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              {t('admin:subscriptions.cancelModal.warning')}
            </p>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('admin:subscriptions.cancelModal.reasonLabel')}
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder={t('admin:subscriptions.cancelModal.reasonPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelSubId(null);
                setCancelReason('');
              }}
            >
              {t('admin:subscriptions.cancelModal.dismiss')}
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling}>
              <XCircle className="h-4 w-4" />
              {t('admin:subscriptions.cancelModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
