import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Calendar,
  Users,
  Building2,
  ClipboardList,
  Percent,
  BarChart3,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { formatCurrency, exportToCSV } from '@/utils/format';
import {
  PLATFORM_TOTALS,
  REVENUE_BY_DATE_RANGE,
  REVENUE_BY_SERVICE_TYPE,
  TOP_COMPANIES_BY_REVENUE,
  BOOKING_DEMAND_HEATMAP,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlatformTotalsData {
  platformTotals: {
    totalCompleted: number;
    totalBookings: number;
    totalRevenue: number;
    totalCommission: number;
    uniqueClients: number;
    activeCompanies: number;
  };
}

interface RevenueByDateEntry {
  date: string;
  bookingCount: number;
  revenue: number;
  commission: number;
}

interface RevenueByDateRangeData {
  revenueByDateRange: RevenueByDateEntry[];
}

interface RevenueByServiceEntry {
  serviceType: string;
  bookingCount: number;
  revenue: number;
}

interface RevenueByServiceTypeData {
  revenueByServiceType: RevenueByServiceEntry[];
}

interface TopCompanyEntry {
  id: string;
  companyName: string;
  bookingCount: number;
  revenue: number;
  commission: number;
}

interface TopCompaniesByRevenueData {
  topCompaniesByRevenue: TopCompanyEntry[];
}

interface HeatmapSlot {
  dayOfWeek: number;
  hour: number;
  count: number;
}

interface BookingDemandHeatmapData {
  bookingDemandHeatmap: HeatmapSlot[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type DatePreset = 'this_month' | 'last_month' | '3_months' | '6_months' | '1_year';

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'this_month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatDate(from), to: formatDate(today) };
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(from), to: formatDate(to) };
    }
    case '3_months': {
      const from = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      return { from: formatDate(from), to: formatDate(today) };
    }
    case '6_months': {
      const from = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      return { from: formatDate(from), to: formatDate(today) };
    }
    case '1_year': {
      const from = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      return { from: formatDate(from), to: formatDate(today) };
    }
  }
}

// ─── Skeleton Components ────────────────────────────────────────────────────

function SkeletonChart() {
  return (
    <Card>
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
        <div className="h-[300px] bg-gray-100 rounded-xl" />
      </div>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <Card>
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
  payload?: RevenueByDateEntry;
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  const { t } = useTranslation(['dashboard', 'admin']);

  if (!active || !payload || payload.length === 0) return null;

  const bookingCount = payload[0]?.payload?.bookingCount;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
      {bookingCount != null && (
        <p className="text-sm text-gray-500 mt-1">
          {t('admin:reports.charts.bookings', { count: bookingCount })}
        </p>
      )}
    </div>
  );
}

// ─── Demand Heatmap ─────────────────────────────────────────────────────────

function DemandHeatmap({ slots }: { slots: HeatmapSlot[] }) {
  const { t } = useTranslation(['dashboard', 'admin']);

  const days = [
    t('admin:reports.days.0'),
    t('admin:reports.days.1'),
    t('admin:reports.days.2'),
    t('admin:reports.days.3'),
    t('admin:reports.days.4'),
    t('admin:reports.days.5'),
    t('admin:reports.days.6'),
  ];
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

  const lookup = new Map<string, number>();
  let maxCount = 0;
  slots.forEach((s) => {
    lookup.set(`${s.dayOfWeek}-${s.hour}`, s.count);
    if (s.count > maxCount) maxCount = s.count;
  });

  function getColor(count: number): string {
    if (count === 0 || maxCount === 0) return 'bg-gray-100';
    const intensity = count / maxCount;
    if (intensity < 0.2) return 'bg-blue-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-400';
    if (intensity < 0.8) return 'bg-blue-600';
    return 'bg-blue-800';
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Column headers — days */}
        <div className="flex ml-10 mb-1">
          {days.map((d) => (
            <div key={d} className="flex-1 text-center text-xs text-gray-500 font-medium">
              {d}
            </div>
          ))}
        </div>
        {/* Rows — hours */}
        {hours.map((hour) => (
          <div key={hour} className="flex items-center mb-0.5">
            <div className="w-9 text-right text-xs text-gray-400 pr-1.5">{hour}:00</div>
            {days.map((_, dayIdx) => {
              const count = lookup.get(`${dayIdx}-${hour}`) ?? 0;
              return (
                <div key={dayIdx} className="flex-1 mx-0.5">
                  <div
                    className={`h-5 rounded-sm ${getColor(count)} transition-colors`}
                    title={`${days[dayIdx]} ${hour}:00 — ${count} rez.`}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-1 mt-3 justify-end">
          <span className="text-xs text-gray-400 mr-1">{t('admin:reports.heatmap.less')}</span>
          {['bg-gray-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'].map(
            (c) => (
              <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
            ),
          )}
          <span className="text-xs text-gray-400 ml-1">{t('admin:reports.heatmap.more')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useTranslation(['dashboard', 'admin']);
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState<DatePreset>('this_month');

  const presetOptions = [
    { value: 'this_month', label: t('admin:reports.presets.thisMonth') },
    { value: 'last_month', label: t('admin:reports.presets.lastMonth') },
    { value: '3_months', label: t('admin:reports.presets.3months') },
    { value: '6_months', label: t('admin:reports.presets.6months') },
    { value: '1_year', label: t('admin:reports.presets.1year') },
  ];

  const { from, to } = useMemo(() => getDateRange(activePreset), [activePreset]);

  // Platform totals (no date filter)
  const { data: totalsData, loading: totalsLoading } = useQuery<PlatformTotalsData>(
    PLATFORM_TOTALS,
  );

  // Revenue by date range
  const { data: revenueData, loading: revenueLoading } = useQuery<RevenueByDateRangeData>(
    REVENUE_BY_DATE_RANGE,
    { variables: { from, to } },
  );

  // Revenue by service type
  const { data: serviceData, loading: serviceLoading } = useQuery<RevenueByServiceTypeData>(
    REVENUE_BY_SERVICE_TYPE,
    { variables: { from, to } },
  );

  // Top companies
  const { data: companiesData, loading: companiesLoading } =
    useQuery<TopCompaniesByRevenueData>(TOP_COMPANIES_BY_REVENUE, {
      variables: { from, to, limit: 10 },
    });

  // Demand heatmap
  const { data: heatmapData, loading: heatmapLoading } = useQuery<BookingDemandHeatmapData>(
    BOOKING_DEMAND_HEATMAP,
    { variables: { from, to } },
  );

  const totals = totalsData?.platformTotals;
  const revenueByDate = revenueData?.revenueByDateRange ?? [];
  const revenueByService = serviceData?.revenueByServiceType ?? [];
  const topCompanies = companiesData?.topCompaniesByRevenue ?? [];

  // Map service types to translated labels for bar chart
  const serviceChartData = revenueByService.map((entry) => ({
    ...entry,
    label: t(`admin:reports.serviceTypeLabels.${entry.serviceType}`, {
      defaultValue: entry.serviceType,
    }),
  }));

  return (
    <div>
      {/* Header + Date Selector */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:reports.title')}</h1>
          <p className="text-gray-500 mt-1">{t('admin:reports.subtitle')}</p>
        </div>
        <div className="flex-1" />
        <div className="w-44">
          <Select
            options={presetOptions}
            value={activePreset}
            onChange={(e) => setActivePreset(e.target.value as DatePreset)}
          />
        </div>
        <button
          onClick={() => {
            const rows = revenueByDate.map((d) => ({
              [t('admin:reports.csvColumns.date')]: d.date,
              [t('admin:reports.csvColumns.bookings')]: d.bookingCount,
              [t('admin:reports.csvColumns.revenue')]: (d.revenue / 100).toFixed(2),
              [t('admin:reports.csvColumns.commission')]: (d.commission / 100).toFixed(2),
            }));
            exportToCSV(rows, `raport-${from}-${to}.csv`);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-900 transition-colors"
        >
          <Download className="h-4 w-4" />
          {t('admin:reports.exportCsv')}
        </button>
      </div>

      {/* Platform Totals — compact metrics */}
      {totalsLoading ? (
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
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
      ) : totals ? (
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {[
              { icon: ClipboardList, label: t('admin:reports.metrics.completed'), value: String(totals.totalCompleted) },
              { icon: Calendar, label: t('admin:reports.metrics.totalBookings'), value: String(totals.totalBookings) },
              { icon: TrendingUp, label: t('admin:reports.metrics.totalRevenue'), value: formatCurrency(totals.totalRevenue) },
              { icon: Percent, label: t('admin:reports.metrics.totalCommission'), value: formatCurrency(totals.totalCommission) },
              { icon: Users, label: t('admin:reports.metrics.uniqueClients'), value: String(totals.uniqueClients) },
              { icon: Building2, label: t('admin:reports.metrics.activeCompanies'), value: String(totals.activeCompanies) },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Revenue Line Chart */}
        {revenueLoading ? (
          <SkeletonChart />
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin:reports.charts.revenueEvolution')}
              </h3>
            </div>
            {revenueByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name={t('admin:reports.charts.revenueLabel')}
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    name={t('admin:reports.charts.commissionLabel')}
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                {t('admin:reports.charts.noData')}
              </div>
            )}
          </Card>
        )}

        {/* Revenue by Service Type Bar Chart */}
        {serviceLoading ? (
          <SkeletonChart />
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-secondary" />
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin:reports.charts.revenueByService')}
              </h3>
            </div>
            {serviceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar
                    dataKey="revenue"
                    name={t('admin:reports.charts.revenueLabel')}
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                {t('admin:reports.charts.noData')}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Top Companies */}
      <div className="mt-6">
        {companiesLoading ? (
          <SkeletonTable />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4.5 w-4.5 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('admin:reports.topCompanies.title')}
              </h3>
            </div>
            <Card padding={false}>
              {topCompanies.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {topCompanies.map((company, index) => (
                    <div
                      key={company.id}
                      onClick={() => navigate(`/admin/companii/${company.id}`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-medium text-gray-400 w-5 shrink-0 text-right">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
                        {company.companyName}
                      </span>
                      <span className="flex-1" />
                      <span className="text-xs text-gray-400 shrink-0">
                        {company.bookingCount} {t('admin:reports.topCompanies.bookings')}
                      </span>
                      <span className="hidden sm:block text-xs text-gray-400 shrink-0 w-24 text-right">
                        {t('admin:reports.topCompanies.commission')} {formatCurrency(company.commission)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 shrink-0 w-24 text-right">
                        {formatCurrency(company.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">
                  {t('admin:reports.topCompanies.noData')}
                </p>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Demand Heatmap */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin:reports.heatmap.title')}
          </h3>
          <span className="text-sm text-gray-400 ml-1">
            {t('admin:reports.heatmap.subtitle')}
          </span>
        </div>
        {heatmapLoading ? (
          <div className="h-[300px] bg-gray-100 animate-pulse rounded-xl" />
        ) : (heatmapData?.bookingDemandHeatmap?.length ?? 0) > 0 ? (
          <DemandHeatmap slots={heatmapData!.bookingDemandHeatmap} />
        ) : (
          <div className="flex items-center justify-center h-[200px] text-gray-400">
            {t('admin:reports.heatmap.noData')}
          </div>
        )}
      </Card>
    </div>
  );
}
