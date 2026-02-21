import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Star, Briefcase, TrendingUp, MessageSquare, Clock, MapPin, Calendar } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@go2fix/shared';
import {
  MY_CLEANER_STATS, TODAYS_JOBS, CLEANER_EARNINGS_BY_DATE_RANGE, MY_CLEANER_REVIEWS, MY_CLEANER_PROFILE,
} from '@/graphql/operations';

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

const statusLabel: Record<string, string> = {
  PENDING: 'In asteptare', ASSIGNED: 'Asignat', CONFIRMED: 'Confirmat',
  IN_PROGRESS: 'In desfasurare', COMPLETED: 'Finalizat',
  CANCELLED_BY_CLIENT: 'Anulat', CANCELLED_BY_COMPANY: 'Anulat', CANCELLED_BY_ADMIN: 'Anulat',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning', ASSIGNED: 'info', CONFIRMED: 'info', IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger', CANCELLED_BY_COMPANY: 'danger', CANCELLED_BY_ADMIN: 'danger',
};

interface Job {
  id: string;
  referenceCode: string;
  serviceName: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  address: { streetAddress: string; city: string } | null;
  client: { fullName: string } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewType: string;
  createdAt: string;
  booking: { id: string; referenceCode: string } | null;
  reviewer: { id: string; fullName: string } | null;
}

interface EarningPoint { date: string; amount: number }

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorBg: string;
  colorIcon: string;
  valueColor?: string;
}

function KpiCard({ icon: Icon, label, value, colorBg, colorIcon, valueColor }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', colorBg)}>
          <Icon className={cn('h-6 w-6', colorIcon)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={cn('text-2xl font-bold', valueColor ?? 'text-gray-900')}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { from, to } = useMemo(() => {
    const now = new Date();
    const ago = new Date(now);
    ago.setDate(ago.getDate() - 30);
    return { from: toYYYYMMDD(ago), to: toYYYYMMDD(now) };
  }, []);

  const { loading: profileLoading } = useQuery(MY_CLEANER_PROFILE);
  const { data: statsData, loading: statsLoading } = useQuery(MY_CLEANER_STATS);
  const { data: jobsData, loading: jobsLoading } = useQuery(TODAYS_JOBS);
  const { data: earningsData, loading: earningsLoading } = useQuery(CLEANER_EARNINGS_BY_DATE_RANGE, {
    variables: { from, to },
  });
  const { data: reviewsData, loading: reviewsLoading } = useQuery(MY_CLEANER_REVIEWS, {
    variables: { limit: 5, offset: 0 },
  });

  const stats = statsData?.myCleanerStats;
  const jobs: Job[] = jobsData?.todaysJobs ?? [];
  const earningsRaw: EarningPoint[] = earningsData?.cleanerEarningsByDateRange ?? [];
  const reviews: Review[] = reviewsData?.myCleanerReviews?.reviews ?? [];

  const chartData = useMemo(
    () => earningsRaw.map((p) => ({ date: formatDate(p.date), amount: Number(p.amount) })),
    [earningsRaw],
  );

  if (statsLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bine ai venit!</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={Star} label="Rating"
          value={stats?.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
          colorBg="bg-amber-500/10" colorIcon="text-amber-500" valueColor="text-amber-600"
        />
        <KpiCard
          icon={Briefcase} label="Joburi finalizate"
          value={stats?.totalJobsCompleted ?? 0}
          colorBg="bg-blue-600/10" colorIcon="text-blue-600"
        />
        <KpiCard
          icon={TrendingUp} label="Castiguri luna aceasta"
          value={`${Number(stats?.thisMonthEarnings ?? 0).toFixed(0)} RON`}
          colorBg="bg-emerald-500/10" colorIcon="text-emerald-500" valueColor="text-emerald-600"
        />
        <KpiCard
          icon={MessageSquare} label="Recenzii"
          value={stats?.totalReviews ?? 0}
          colorBg="bg-purple-500/10" colorIcon="text-purple-500"
        />
      </div>

      {/* Earnings Chart */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Castiguri - ultimele 30 zile</h2>
          {earningsLoading ? (
            <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Niciun castig in aceasta perioada.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} RON`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)} RON`, 'Castig']}
                  labelFormatter={(label: string) => label}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={2} fill="url(#earningsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Today's Jobs */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Joburile de azi</h2>
          {jobsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Niciun job programat azi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/worker/comenzi/${job.id}`}
                  className="block p-4 rounded-xl border border-gray-100 hover:border-blue-600/30 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{job.serviceName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ref: {job.referenceCode}</p>
                    </div>
                    <Badge variant={statusVariant[job.status] ?? 'default'}>
                      {statusLabel[job.status] ?? job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {job.scheduledStartTime} &middot; {job.estimatedDurationHours}h
                    </span>
                    {job.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {job.address.streetAddress}, {job.address.city}
                      </span>
                    )}
                    {job.client && <span className="text-gray-500">{job.client.fullName}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recenzii recente */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recenzii recente</h2>
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nicio recenzie inca.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-4 w-4',
                              i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300',
                            )}
                          />
                        ))}
                      </div>
                      <p className="font-semibold text-gray-900">
                        {review.reviewer?.fullName ?? 'Anonim'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('ro-RO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {review.comment ?? 'Fara comentariu'}
                  </p>
                  {review.booking && (
                    <p className="text-xs text-gray-400 mt-1">
                      Ref: {review.booking.referenceCode}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
