import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Users,
  Building2,
  ClipboardList,
  Percent,
  BarChart3,
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
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import StatCard from '@/components/admin/StatCard';
import { formatCurrency } from '@/utils/format';
import {
  PLATFORM_TOTALS,
  REVENUE_BY_DATE_RANGE,
  REVENUE_BY_SERVICE_TYPE,
  TOP_COMPANIES_BY_REVENUE,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

type DatePreset = 'this_month' | 'last_month' | '3_months' | '6_months' | '1_year';

interface PresetOption {
  key: DatePreset;
  label: string;
}

const presets: PresetOption[] = [
  { key: 'this_month', label: 'Luna aceasta' },
  { key: 'last_month', label: 'Luna trecuta' },
  { key: '3_months', label: '3 Luni' },
  { key: '6_months', label: '6 Luni' },
  { key: '1_year', label: '1 An' },
];

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

const serviceTypeLabels: Record<string, string> = {
  STANDARD: 'Standard',
  DEEP: 'Curatenie Profunda',
  POST_CONSTRUCTION: 'Post-Constructie',
  OFFICE: 'Birouri',
  MOVE_IN_OUT: 'Mutare',
};

// ─── Skeleton Components ────────────────────────────────────────────────────

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-200 rounded-xl" />
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

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
        <p className="text-sm text-gray-500 mt-1">Rezervari: {bookingCount}</p>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState<DatePreset>('this_month');

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

  const totals = totalsData?.platformTotals;
  const revenueByDate = revenueData?.revenueByDateRange ?? [];
  const revenueByService = serviceData?.revenueByServiceType ?? [];
  const topCompanies = companiesData?.topCompaniesByRevenue ?? [];

  // Map service types to Romanian labels for bar chart
  const serviceChartData = revenueByService.map((entry) => ({
    ...entry,
    label: serviceTypeLabels[entry.serviceType] ?? entry.serviceType,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Rapoarte Financiare</h1>
        <p className="text-gray-500 mt-1">
          Analiza veniturilor si performantei platformei.
        </p>
      </div>

      {/* Date Range Selector — dropdown on mobile, pills on desktop */}
      <div className="mb-8">
        <div className="md:hidden">
          <Select
            options={presets.map((p) => ({ value: p.key, label: p.label }))}
            value={activePreset}
            onChange={(e) => setActivePreset(e.target.value as DatePreset)}
          />
        </div>
        <div className="hidden md:flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setActivePreset(preset.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
                activePreset === preset.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Totals Cards */}
      {totalsLoading ? (
        <SkeletonCards count={6} />
      ) : totals ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={ClipboardList}
            label="Rezervari Finalizate"
            value={totals.totalCompleted}
            color="primary"
          />
          <StatCard
            icon={Calendar}
            label="Total Rezervari"
            value={totals.totalBookings}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Venit Total"
            value={formatCurrency(totals.totalRevenue)}
            color="secondary"
          />
          <StatCard
            icon={Percent}
            label="Comision Total"
            value={formatCurrency(totals.totalCommission)}
            color="accent"
          />
          <StatCard
            icon={Users}
            label="Clienti Unici"
            value={totals.uniqueClients}
            color="purple"
          />
          <StatCard
            icon={Building2}
            label="Companii Active"
            value={totals.activeCompanies}
            color="indigo"
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Revenue Line Chart */}
        {revenueLoading ? (
          <SkeletonChart />
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">Evolutie Venituri</h3>
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
                    name="Venit"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    name="Comision"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                Nu exista date pentru perioada selectata
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
              <h3 className="text-lg font-semibold text-gray-900">Venituri pe Tip Serviciu</h3>
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
                    name="Venit"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                Nu exista date pentru perioada selectata
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Top Companies Table */}
      <div className="mt-8">
        {companiesLoading ? (
          <SkeletonTable />
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Top Companii dupa Venit
              </h3>
            </div>
            {topCompanies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                        #
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                        Companie
                      </th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                        Rezervari
                      </th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                        Venit
                      </th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
                        Comision
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCompanies.map((company, index) => (
                      <tr
                        key={company.id}
                        onClick={() => navigate(`/admin/companii/${company.id}`)}
                        className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-sm text-gray-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-900">
                          {company.companyName}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-600 text-right">
                          {company.bookingCount}
                        </td>
                        <td className="py-3 pr-4 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(company.revenue)}
                        </td>
                        <td className="py-3 text-sm text-gray-600 text-right">
                          {formatCurrency(company.commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                Nu exista date pentru perioada selectata.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
