import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Building2,
  CalendarDays,
  Banknote,
  TrendingUp,
  Star,
  AlertCircle,
  FileText,
  UserPlus,
  ArrowRight,
  ChevronRight,
  Repeat,
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
import { useNavigate, Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import {
  PLATFORM_STATS,
  BOOKINGS_BY_STATUS,
  REVENUE_BY_MONTH,
  PENDING_COMPANY_APPLICATIONS,
  PENDING_COMPANY_DOCUMENTS,
  PENDING_WORKER_DOCUMENTS,
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
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'admin']);

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const { data: statsData, loading: statsLoading } = useQuery(PLATFORM_STATS, {
    pollInterval: 30000,
  });
  const { data: statusData } = useQuery(BOOKINGS_BY_STATUS);
  const { data: revenueData } = useQuery(REVENUE_BY_MONTH, {
    variables: { months: 6 },
  });
  const { data: pendingData } = useQuery(PENDING_COMPANY_APPLICATIONS);
  const { data: pendingCompanyDocsData } = useQuery(PENDING_COMPANY_DOCUMENTS);
  const { data: pendingWorkerDocsData } = useQuery(PENDING_WORKER_DOCUMENTS);
  const { data: subStatsData } = useQuery(SUBSCRIPTION_STATS);

  const stats = statsData?.platformStats;
  const subStats = subStatsData?.subscriptionStats;
  const bookingStatuses = statusData?.bookingsByStatus ?? [];
  const revenueMonths = revenueData?.revenueByMonth ?? [];
  const pendingApps = pendingData?.pendingCompanyApplications ?? [];
  const pendingCompanyDocs = pendingCompanyDocsData?.pendingCompanyDocuments ?? [];
  const pendingWorkerDocs = pendingWorkerDocsData?.pendingWorkerDocuments ?? [];

  const pendingCount = pendingApps.length + pendingCompanyDocs.length + pendingWorkerDocs.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
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

      {/* Alerts Row */}
      {pendingCount > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {pendingApps.length > 0 && (
            <Link
              to="/admin/companii"
              className="flex items-center gap-3 flex-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-800 flex-1">
                {t('admin:dashboard.alerts.newApplication', { count: pendingApps.length })}
              </span>
              <ChevronRight className="h-4 w-4 text-amber-400" />
            </Link>
          )}
          {pendingCompanyDocs.length > 0 && (
            <Link
              to="/admin/companii"
              className="flex items-center gap-3 flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-sm font-medium text-blue-800 flex-1">
                {t('admin:dashboard.alerts.companyDocs', { count: pendingCompanyDocs.length })}
              </span>
              <ChevronRight className="h-4 w-4 text-blue-400" />
            </Link>
          )}
          {pendingWorkerDocs.length > 0 && (
            <Link
              to="/admin/companii"
              className="flex items-center gap-3 flex-1 px-4 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
            >
              <FileText className="h-4 w-4 text-red-600 shrink-0" />
              <span className="text-sm font-medium text-red-800 flex-1">
                {t('admin:dashboard.alerts.workerDocs', { count: pendingWorkerDocs.length })}
              </span>
              <ChevronRight className="h-4 w-4 text-red-400" />
            </Link>
          )}
        </div>
      )}

      {/* Charts + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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

      {/* Pending Applications */}
      {pendingApps.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {t('admin:dashboard.pendingApplications.title')}
            </h3>
            <button
              onClick={() => navigate('/admin/companii')}
              className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              {t('admin:dashboard.pendingApplications.viewAll')} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingApps.slice(0, 5).map((app: {
              id: string;
              companyName: string;
              cui: string;
              city: string;
              county: string;
              createdAt: string;
            }) => (
              <div
                key={app.id}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/companii/${app.id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{app.companyName}</p>
                  <p className="text-xs text-gray-500">CUI: {app.cui} &middot; {app.city}, {app.county}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(app.createdAt).toLocaleDateString(locale)}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/companii" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-900 transition-colors">
          <Building2 className="h-4 w-4" /> {t('admin:dashboard.quickLinks.companies')}
        </Link>
        <Link to="/admin/comenzi" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-900 transition-colors">
          <CalendarDays className="h-4 w-4" /> {t('admin:dashboard.quickLinks.bookings')}
        </Link>
        <Link to="/admin/plati" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-900 transition-colors">
          <Banknote className="h-4 w-4" /> {t('admin:dashboard.quickLinks.payments')}
        </Link>
      </div>
    </div>
  );
}
