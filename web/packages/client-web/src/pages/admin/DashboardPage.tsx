import { useQuery } from '@apollo/client';
import {
  Users,
  Building2,
  CalendarDays,
  Banknote,
  TrendingUp,
  Star,
  AlertCircle,
  FileText,
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
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  PLATFORM_STATS,
  BOOKINGS_BY_STATUS,
  REVENUE_BY_MONTH,
  PENDING_COMPANY_APPLICATIONS,
  PENDING_COMPANY_DOCUMENTS,
  PENDING_CLEANER_DOCUMENTS,
} from '@/graphql/operations';
import { useNavigate } from 'react-router-dom';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
    accent: { bg: 'bg-accent/10', text: 'text-accent' },
    danger: { bg: 'bg-danger/10', text: 'text-danger' },
  };
  const colors = colorMap[color] ?? colorMap.primary;

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.text}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  PENDING: 'In asteptare',
  ASSIGNED: 'Asignate',
  CONFIRMED: 'Confirmate',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizate',
  CANCELLED: 'Anulate',
};

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: statsData, loading: statsLoading } = useQuery(PLATFORM_STATS);
  const { data: statusData } = useQuery(BOOKINGS_BY_STATUS);
  const { data: revenueData } = useQuery(REVENUE_BY_MONTH, {
    variables: { months: 6 },
  });
  const { data: pendingData } = useQuery(PENDING_COMPANY_APPLICATIONS);
  const { data: pendingCompanyDocsData } = useQuery(PENDING_COMPANY_DOCUMENTS);
  const { data: pendingCleanerDocsData } = useQuery(PENDING_CLEANER_DOCUMENTS);

  const stats = statsData?.platformStats;
  const bookingStatuses = statusData?.bookingsByStatus ?? [];
  const revenueMonths = revenueData?.revenueByMonth ?? [];
  const pendingApps = pendingData?.pendingCompanyApplications ?? [];
  const pendingCompanyDocs = pendingCompanyDocsData?.pendingCompanyDocuments ?? [];
  const pendingCleanerDocs = pendingCleanerDocsData?.pendingCleanerDocuments ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-1">
          Statistici si date despre platforma Go2Fix.
        </p>
      </div>

      {/* Primary Stats */}
      {statsLoading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Clienti"
            value={stats?.totalClients ?? 0}
            color="primary"
          />
          <StatCard
            icon={Building2}
            label="Total Companii"
            value={stats?.totalCompanies ?? 0}
            color="secondary"
          />
          <StatCard
            icon={CalendarDays}
            label="Total Rezervari"
            value={stats?.totalBookings ?? 0}
            color="accent"
          />
          <StatCard
            icon={Banknote}
            label="Venit Total"
            value={formatCurrency(stats?.totalRevenue ?? 0)}
            color="secondary"
          />
        </div>
      )}

      {/* Secondary Stats */}
      {!statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <StatCard
            icon={CalendarDays}
            label="Rezervari luna aceasta"
            value={stats?.bookingsThisMonth ?? 0}
            color="primary"
          />
          <StatCard
            icon={TrendingUp}
            label="Venit luna aceasta"
            value={formatCurrency(stats?.revenueThisMonth ?? 0)}
            color="secondary"
          />
          <StatCard
            icon={Banknote}
            label="Comision platforma"
            value={formatCurrency(stats?.platformCommissionTotal ?? 0)}
            color="accent"
          />
          <StatCard
            icon={Star}
            label="Rating mediu"
            value={stats?.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
            color="primary"
          />
        </div>
      )}

      {/* Pending Documents & Recurring */}
      {!statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <StatCard
            icon={FileText}
            label="Documente companie in asteptare"
            value={pendingCompanyDocs.length}
            color="accent"
          />
          <StatCard
            icon={FileText}
            label="Documente lucratori in asteptare"
            value={pendingCleanerDocs.length}
            color="danger"
          />
          <StatCard
            icon={Repeat}
            label="Rezervari recurente"
            value={bookingStatuses.length > 0 ? 'Activ' : '--'}
            color="primary"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Revenue Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Venit pe luni</h3>
          {revenueMonths.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueMonths}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" name="Venit" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name="Comision" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              Nu exista date pentru grafic
            </div>
          )}
        </Card>

        {/* Bookings by Status */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rezervari dupa status</h3>
          {bookingStatuses.length > 0 ? (
            <div className="space-y-3">
              {bookingStatuses.map((item: { status: string; count: number }) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50"
                >
                  <Badge variant={statusVariants[item.status] ?? 'default'}>
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                  <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              Nu exista date
            </div>
          )}
        </Card>
      </div>

      {/* Pending Applications */}
      <Card className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-gray-900">Aplicatii in asteptare</h3>
            {pendingApps.length > 0 && (
              <Badge variant="warning">{pendingApps.length}</Badge>
            )}
          </div>
          {pendingApps.length > 0 && (
            <button
              onClick={() => navigate('/admin/companii')}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Vezi toate
            </button>
          )}
        </div>

        {pendingApps.length > 0 ? (
          <div className="space-y-3">
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
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/companii/${app.id}`)}
              >
                <div>
                  <p className="font-medium text-gray-900">{app.companyName}</p>
                  <p className="text-sm text-gray-500">
                    CUI: {app.cui} &middot; {app.city}, {app.county}
                  </p>
                </div>
                <p className="text-sm text-gray-400">
                  {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Nu exista aplicatii in asteptare.</p>
        )}
      </Card>
    </div>
  );
}
