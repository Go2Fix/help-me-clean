import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Building2,
  CalendarDays,
  Banknote,
  TrendingUp,
  TrendingDown,
  Star,
  FileText,
  UserPlus,
  ArrowRight,
  ChevronRight,
  Repeat,
  Inbox,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  PLATFORM_STATS,
  BOOKINGS_BY_STATUS,
  REVENUE_BY_MONTH,
  PENDING_COMPANY_APPLICATIONS,
  PENDING_COMPANY_DOCUMENTS,
  PENDING_WORKER_DOCUMENTS,
  PENDING_REVIEW_COUNT,
  SUBSCRIPTION_STATS,
} from '@/graphql/operations';

// ─── Status Maps ────────────────────────────────────────────────────────────

const statusDotColor: Record<string, string> = {
  ASSIGNED: 'bg-blue-400',
  CONFIRMED: 'bg-blue-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
};

// ─── Trend Badge ────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Metric Item ────────────────────────────────────────────────────────────

function Metric({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      className={`flex items-center gap-3 py-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>
      </div>
    </Wrapper>
  );
}

// ─── Attention Row ───────────────────────────────────────────────────────────

interface AttentionItem {
  id: string;
  primary: string;
  secondary: string;
  date: string;
  href: string;
}

function AttentionRow({
  icon: Icon,
  label,
  count,
  linkTo,
  items,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  linkTo: string;
  items: AttentionItem[];
}) {
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
      <Link
        to={linkTo}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <Icon className="h-4 w-4 text-gray-500 shrink-0" />
        <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          {count}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
      </Link>
      {items.length > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-blue-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.primary}</p>
                {item.secondary && (
                  <p className="text-xs text-gray-400 truncate">{item.secondary}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDate(item.date)}
              </span>
              <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'admin']);

  const { data: statsData, loading: statsLoading } = useQuery(PLATFORM_STATS, {
    pollInterval: 30000,
  });
  const { data: statusData } = useQuery(BOOKINGS_BY_STATUS);
  const { data: revenueData } = useQuery(REVENUE_BY_MONTH, {
    variables: { months: 6 },
  });
  const { data: pendingData } = useQuery(PENDING_COMPANY_APPLICATIONS, { pollInterval: 30000 });
  const { data: pendingCompanyDocsData } = useQuery(PENDING_COMPANY_DOCUMENTS, { pollInterval: 30000 });
  const { data: pendingWorkerDocsData } = useQuery(PENDING_WORKER_DOCUMENTS, { pollInterval: 30000 });
  const { data: reviewCountData } = useQuery(PENDING_REVIEW_COUNT, { pollInterval: 30000 });
  const { data: subStatsData } = useQuery(SUBSCRIPTION_STATS);

  const stats = statsData?.platformStats;
  const subStats = subStatsData?.subscriptionStats;
  const bookingStatuses = statusData?.bookingsByStatus ?? [];
  const revenueMonths = revenueData?.revenueByMonth ?? [];
  const pendingApps = pendingData?.pendingCompanyApplications ?? [];
  const pendingCompanyDocs = pendingCompanyDocsData?.pendingCompanyDocuments ?? [];
  const pendingWorkerDocs = pendingWorkerDocsData?.pendingWorkerDocuments ?? [];
  const reviewCount = reviewCountData?.pendingReviewCount;
  const categoryRequestsCount = reviewCount?.categoryRequests ?? 0;
  const pendingCount = (reviewCount?.total ?? (pendingApps.length + pendingCompanyDocs.length + pendingWorkerDocs.length));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:dashboard.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin:dashboard.subtitle')}</p>
      </div>

      {/* Key Metrics */}
      {statsLoading ? (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="space-y-1">
              <Metric icon={Users} label={t('admin:dashboard.metrics.clients')} value={stats.totalClients} />
              <Metric
                icon={UserPlus}
                label={t('admin:dashboard.metrics.newThisMonth')}
                value={
                  <span className="flex items-center gap-1.5">
                    {stats.newClientsThisMonth}
                    <TrendBadge
                      current={stats.newClientsThisMonth}
                      previous={stats.newClientsLastMonth ?? 0}
                    />
                  </span>
                }
              />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={Building2} label={t('admin:dashboard.metrics.companies')} value={stats.totalCompanies} />
              <Metric
                icon={Star}
                label={t('admin:dashboard.metrics.averageRating')}
                value={stats.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
              />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={CalendarDays} label={t('admin:dashboard.metrics.bookings')} value={stats.totalBookings} />
              <Metric
                icon={CalendarDays}
                label={t('admin:dashboard.metrics.thisMonth')}
                value={
                  <span className="flex items-center gap-1.5">
                    {stats.bookingsThisMonth}
                    <TrendBadge
                      current={stats.bookingsThisMonth}
                      previous={stats.bookingsLastMonth ?? 0}
                    />
                  </span>
                }
              />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={Banknote} label={t('admin:dashboard.metrics.totalRevenue')} value={formatCurrency(stats.totalRevenue)} />
              <Metric
                icon={TrendingUp}
                label={t('admin:dashboard.metrics.revenueThisMonth')}
                value={
                  <span className="flex items-center gap-1.5">
                    {formatCurrency(stats.revenueThisMonth ?? 0)}
                    <TrendBadge
                      current={stats.revenueThisMonth ?? 0}
                      previous={stats.revenueLastMonth ?? 0}
                    />
                  </span>
                }
              />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={Repeat} label={t('admin:dashboard.metrics.activeSubscriptions')} value={subStats?.activeCount ?? 0} />
              <Metric icon={Repeat} label={t('admin:dashboard.metrics.mrr')} value={`${((subStats?.monthlyRecurringRevenue ?? 0) / 100).toFixed(2)} RON`} />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Necesită atenție */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <Inbox className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{t('admin:dashboard.attention.title')}</h3>
            {pendingCount > 0 ? (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {pendingCount}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t('admin:dashboard.attention.allUpToDate')}
              </span>
            )}
          </div>
          <Link
            to="/admin/aprobari"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {t('admin:dashboard.attention.viewAll')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {pendingCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-300" />
            <p className="text-sm">{t('admin:dashboard.attention.noPendingActions')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Row: Company Applications */}
            <AttentionRow
              icon={Building2}
              label={t('admin:dashboard.attention.companyApplications')}
              count={pendingApps.length}
              linkTo="/admin/aprobari"
              items={pendingApps.slice(0, 2).map((a: { id: string; companyName: string; city: string; county: string; createdAt: string }) => ({
                id: a.id,
                primary: a.companyName,
                secondary: `${a.city}, ${a.county}`,
                date: a.createdAt,
                href: `/admin/companii/${a.id}?tab=documente`,
              }))}
            />
            {/* Row: Company Documents */}
            <AttentionRow
              icon={FileText}
              label={t('admin:dashboard.attention.companyDocuments')}
              count={pendingCompanyDocs.length}
              linkTo="/admin/aprobari?tab=documente-companie"
              items={pendingCompanyDocs.slice(0, 2).map((d: { id: string; fileName: string; company?: { id: string; companyName: string }; uploadedAt: string }) => ({
                id: d.id,
                primary: d.fileName,
                secondary: d.company?.companyName ?? '',
                date: d.uploadedAt,
                href: d.company ? `/admin/companii/${d.company.id}?tab=documente` : '/admin/aprobari?tab=documente-companie',
              }))}
            />
            {/* Row: Worker Documents */}
            <AttentionRow
              icon={Users}
              label={t('admin:dashboard.attention.workerDocuments')}
              count={pendingWorkerDocs.length}
              linkTo="/admin/aprobari?tab=documente-angajat"
              items={pendingWorkerDocs.slice(0, 2).map((d: { id: string; fileName: string; worker?: { fullName: string; company?: { companyName: string } }; uploadedAt: string }) => ({
                id: d.id,
                primary: d.fileName,
                secondary: d.worker ? `${d.worker.fullName}${d.worker.company ? ` · ${d.worker.company.companyName}` : ''}` : '',
                date: d.uploadedAt,
                href: '/admin/aprobari?tab=documente-angajat',
              }))}
            />
            {/* Row: Category Requests */}
            <AttentionRow
              icon={Tag}
              label={t('admin:dashboard.attention.categoryRequests')}
              count={categoryRequestsCount}
              linkTo="/admin/aprobari?tab=categorii"
              items={[]}
            />
          </div>
        )}
      </Card>

      {/* Charts + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart — 2 cols */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">{t('admin:dashboard.charts.revenueByMonth')}</h3>
          {revenueMonths.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" name={t('admin:dashboard.charts.revenueBarLabel')} fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name={t('admin:dashboard.charts.commissionBarLabel')} fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
              {t('admin:dashboard.charts.noChartData')}
            </div>
          )}
        </Card>

        {/* Bookings by Status — 1 col */}
        <Card>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">{t('admin:dashboard.charts.bookingsByStatus')}</h3>
          {bookingStatuses.length > 0 ? (
            <div className="space-y-2">
              {bookingStatuses.map((item: { status: string; count: number }) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDotColor[item.status] ?? 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700">
                      {t(`admin:dashboard.statusLabels.${item.status}`, { defaultValue: item.status })}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
              {t('admin:dashboard.charts.noData')}
            </div>
          )}
        </Card>
      </div>


      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/companii')}>
          <Building2 className="h-4 w-4" /> {t('admin:dashboard.quickLinks.companies')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/comenzi')}>
          <CalendarDays className="h-4 w-4" /> {t('admin:dashboard.quickLinks.bookings')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/plati')}>
          <Banknote className="h-4 w-4" /> {t('admin:dashboard.quickLinks.payments')}
        </Button>
      </div>
    </div>
  );
}
