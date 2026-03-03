import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  TrendingUp,
  Wallet,
  Receipt,
  Star,
  MapPin,
  ChevronRight,
  Repeat,
  Image,
  AlignLeft,
  Phone,
  ShieldCheck,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProfileSetupChecklist from '@/components/ProfileSetupChecklist';
import type { SetupItem } from '@/components/ProfileSetupChecklist';
import {
  MY_COMPANY,
  MY_COMPANY_FINANCIAL_SUMMARY,
  COMPANY_REVENUE_BY_DATE_RANGE,
  COMPANY_BOOKINGS,
  COMPANY_SUBSCRIPTIONS,
  MY_CONNECT_STATUS,
  MY_COMPANY_SERVICE_AREAS,
} from '@/graphql/operations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const statusLabel: Record<string, string> = {
  CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizata',
  CANCELLED: 'Anulata',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

interface ChartPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.dataKey === 'revenue' ? 'Venit' : 'Comision'}: {Number(entry.value).toFixed(2)} RON
        </p>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  // Date range for chart: last 30 days
  const { from, to } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      from: toYYYYMMDD(thirtyDaysAgo),
      to: toYYYYMMDD(now),
    };
  }, []);

  // Queries
  const { data: companyData, loading: companyLoading } = useQuery(MY_COMPANY);
  const { data: financialData, loading: financialLoading } = useQuery(MY_COMPANY_FINANCIAL_SUMMARY);
  const { data: revenueData, loading: revenueLoading } = useQuery(COMPANY_REVENUE_BY_DATE_RANGE, {
    variables: { from, to },
  });
  const { data: bookingsData, loading: bookingsLoading } = useQuery(COMPANY_BOOKINGS, {
    variables: { first: 5 },
  });
  const { data: subsData, loading: subsLoading } = useQuery(COMPANY_SUBSCRIPTIONS, {
    variables: { limit: 5 },
  });
  const { data: connectData } = useQuery(MY_CONNECT_STATUS);
  const { data: serviceAreasData } = useQuery(MY_COMPANY_SERVICE_AREAS);

  const company = companyData?.myCompany;
  const financial = financialData?.myCompanyFinancialSummary;
  const revenuePoints = revenueData?.companyRevenueByDateRange ?? [];
  const recentBookings = bookingsData?.companyBookings?.edges ?? [];

  const subsEdges: { id: string; serviceName: string; status: string; monthlyAmount: number; recurrenceType: string; client?: { fullName: string } | null }[] =
    subsData?.companySubscriptions?.edges ?? [];
  const activeSubsCount = subsEdges.filter((s) => s.status === 'ACTIVE').length;
  const monthlyRecurring = subsEdges
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (s.monthlyAmount ?? 0), 0);

  const isKpiLoading = companyLoading || financialLoading;

  // Setup checklist
  const REQUIRED_COMPANY_DOC_TYPES = ['certificat_constatator', 'asigurare_raspundere_civila', 'cui_document'];
  const companyDocs: { documentType: string; status: string }[] = company?.documents ?? [];
  const approvedCompanyDocTypes = new Set(companyDocs.filter((d) => d.status === 'APPROVED').map((d) => d.documentType));
  const hasAllCompanyDocs = REQUIRED_COMPANY_DOC_TYPES.every((t) => approvedCompanyDocTypes.has(t));

  const setupItems: SetupItem[] = [
    { key: 'logo', label: 'Adaugă logo-ul firmei', description: 'Apare pe profil și pe facturi', done: !!company?.logoUrl, to: '/firma/setari', icon: Image },
    { key: 'description', label: 'Completează descrierea firmei', description: 'Ajută clienții să înțeleagă oferta', done: !!company?.description?.trim(), to: '/firma/setari', icon: AlignLeft },
    { key: 'phone', label: 'Adaugă telefon de contact', description: 'Necesar pentru comunicarea cu clienții', done: !!company?.contactPhone?.trim(), to: '/firma/setari', icon: Phone },
    { key: 'docs', label: 'Încarcă documentele obligatorii', description: 'Certificat constatator, RCA, document CUI', done: hasAllCompanyDocs, to: '/firma/documente-obligatorii', icon: ShieldCheck },
    { key: 'stripe', label: 'Configurează plățile Stripe', description: 'Necesare pentru a primi bani de la clienți', done: connectData?.myConnectStatus?.onboardingStatus === 'COMPLETE', to: '/firma/setari', icon: CreditCard },
    { key: 'categories', label: 'Selectează categoriile de servicii', description: 'Definește ce servicii oferă firma ta', done: (company?.serviceCategories?.length ?? 0) > 0, to: '/firma/setari', icon: Briefcase },
    { key: 'areas', label: 'Configurează zonele de lucru', description: 'Definește în ce zone poate lucra firma', done: (serviceAreasData?.myCompanyServiceAreas?.length ?? 0) > 0, to: '/firma/setari', icon: MapPin },
  ];

  // Chart data formatted for display
  const chartData = useMemo(
    () =>
      revenuePoints.map((point: { date: string; revenue: number; commission: number; bookingCount: number }) => ({
        date: formatDate(point.date),
        revenue: Number(point.revenue),
        commission: Number(point.commission),
      })),
    [revenuePoints],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bun venit{company ? `, ${company.companyName}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">
          Iata o privire de ansamblu asupra activitatii tale.
        </p>
      </div>

      {/* Setup Checklist */}
      {company && (
        <div className="mb-8">
          <ProfileSetupChecklist
            items={setupItems}
            title="Configurare firmă"
            subtitle="Completează toți pașii pentru a primi comenzi"
          />
        </div>
      )}

      {/* Key Metrics */}
      {isKpiLoading ? (
        <Card className="mb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
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
      ) : (
        <Card className="mb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="space-y-1">
              <Metric icon={ClipboardList} label="Comenzi finalizate" value={financial?.completedBookings ?? company?.totalJobsCompleted ?? 0} />
              <Metric icon={Star} label="Rating mediu" value={company?.ratingAvg ? Number(company.ratingAvg).toFixed(1) : '--'} />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={TrendingUp} label="Venit total" value={`${Number(financial?.totalRevenue ?? 0).toFixed(2)} RON`} />
              <Metric icon={Wallet} label="Venit net" value={`${Number(financial?.netPayout ?? 0).toFixed(2)} RON`} />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={Receipt} label="Comision platforma" value={`${Number(financial?.totalCommission ?? 0).toFixed(2)} RON`} />
            </div>
            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <Metric icon={Repeat} label="Abonamente active" value={activeSubsCount} />
              <Metric icon={Repeat} label="Venit lunar recurent" value={`${(monthlyRecurring / 100).toFixed(2)} RON`} />
            </div>
          </div>
        </Card>
      )}

      {/* Revenue Chart */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Venituri ultimele 30 zile</h2>

          {revenueLoading ? (
            <div className="animate-pulse">
              <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Nu exista date de venit pentru aceasta perioada.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v} RON`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  name="Venit"
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#commissionGradient)"
                  name="Comision"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Comenzi recente</h2>

          {bookingsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio comanda</h3>
              <p className="text-gray-500">Nu ai comenzi recente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking: Record<string, unknown>) => (
                <div
                  key={booking.id as string}
                  onClick={() => navigate(`/firma/comenzi/${booking.id}`)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-600/30 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">
                        #{booking.referenceCode as string}
                      </p>
                      <Badge variant={statusBadgeVariant[(booking.status as string) || 'CONFIRMED']}>
                        {statusLabel[(booking.status as string) || 'CONFIRMED'] || (booking.status as string)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {booking.serviceName as string} &middot; {booking.scheduledDate as string}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                      {Number(booking.estimatedTotal ?? 0).toFixed(2)} RON
                    </p>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Subscription List */}
      <div className="mt-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900">Abonamente recente</h2>
            </div>
            <button
              onClick={() => navigate('/firma/abonamente')}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Vezi toate &rarr;
            </button>
          </div>

          {subsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : subsEdges.length === 0 ? (
            <div className="text-center py-8">
              <Repeat className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Niciun abonament</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subsEdges.map((sub) => {
                const isActive = sub.status === 'ACTIVE';
                return (
                  <div
                    key={sub.id}
                    onClick={() => navigate(`/firma/abonamente/${sub.id}`)}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-600/30 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {sub.serviceName}
                        </p>
                        <Badge variant={isActive ? 'success' : sub.status === 'PAUSED' ? 'warning' : sub.status === 'CANCELLED' ? 'danger' : 'default'}>
                          {sub.status === 'ACTIVE' ? 'Activ' : sub.status === 'PAUSED' ? 'In pauza' : sub.status === 'CANCELLED' ? 'Anulat' : sub.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {sub.client?.fullName ?? '--'} &middot; {sub.recurrenceType === 'WEEKLY' ? 'Saptamanal' : sub.recurrenceType === 'BIWEEKLY' ? 'La 2 sapt.' : 'Lunar'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                        {(sub.monthlyAmount / 100).toFixed(0)} RON/luna
                      </p>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
