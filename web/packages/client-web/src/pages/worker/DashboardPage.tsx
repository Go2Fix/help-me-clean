import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  Star, Briefcase, MessageSquare, Clock, MapPin, Calendar,
  ChevronRight, Brain, FileText, CalendarDays, User,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@go2fix/shared';
import {
  MY_WORKER_STATS, TODAYS_JOBS,
  MY_WORKER_REVIEWS, MY_WORKER_PROFILE,
} from '@/graphql/operations';

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  ASSIGNED: 'Asignata', CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In lucru', COMPLETED: 'Finalizata',
  CANCELLED_BY_CLIENT: 'Anulata', CANCELLED_BY_COMPANY: 'Anulata', CANCELLED_BY_ADMIN: 'Anulata',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ASSIGNED: 'info', CONFIRMED: 'warning', IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger', CANCELLED_BY_COMPANY: 'danger', CANCELLED_BY_ADMIN: 'danger',
};

const REQUIRED_DOC_TYPES = ['cazier_judiciar', 'contract_munca'];

// ─── Types ──────────────────────────────────────────────────────────────────

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
  createdAt: string;
  reviewer: { fullName: string } | null;
}

interface WorkerDoc { documentType: string; status: string }

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, colorBg, colorIcon, valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  colorBg: string;
  colorIcon: string;
  valueColor?: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', colorBg)}>
          <Icon className={cn('h-6 w-6', colorIcon)} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={cn('text-2xl font-bold', valueColor ?? 'text-gray-900')}>{value}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-200 rounded-xl" />
            <div>
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-14" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: profileData, loading: profileLoading } = useQuery(MY_WORKER_PROFILE);
  const { data: statsData, loading: statsLoading } = useQuery(MY_WORKER_STATS);
  const { data: jobsData, loading: jobsLoading } = useQuery(TODAYS_JOBS);
  const { data: reviewsData, loading: reviewsLoading } = useQuery(MY_WORKER_REVIEWS, {
    variables: { limit: 3, offset: 0 },
  });

  const profile = profileData?.myWorkerProfile;
  const stats = statsData?.myWorkerStats;
  const jobs: Job[] = jobsData?.todaysJobs ?? [];
  const reviews: Review[] = reviewsData?.myWorkerReviews?.reviews ?? [];

  // Alerts
  const personalityDone = !!profile?.personalityAssessment?.completedAt;
  const docs: WorkerDoc[] = profile?.documents ?? [];
  const approvedDocTypes = new Set(docs.filter((d) => d.status === 'APPROVED').map((d) => d.documentType));
  const hasMissingDocs = REQUIRED_DOC_TYPES.some((t) => !approvedDocTypes.has(t));

  const firstName = profile?.fullName?.split(' ')[0] ?? '';
  const todayStr = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isKpiLoading = statsLoading || profileLoading;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName ? `Bun venit, ${firstName}!` : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{todayStr}</p>
      </div>

      {/* Smart Alerts */}
      {profile && (!personalityDone || hasMissingDocs) && (
        <div className="space-y-3 mb-6">
          {!personalityDone && (
            <Link
              to="/worker/test-personalitate"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors"
            >
              <Brain className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Completeaza testul de personalitate</p>
                <p className="text-xs text-amber-600">Necesar pentru activarea contului</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
            </Link>
          )}
          {hasMissingDocs && (
            <Link
              to="/worker/profil"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors"
            >
              <FileText className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Documente necesare lipsesc</p>
                <p className="text-xs text-amber-600">Incarca documentele pentru a fi activat</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      {isKpiLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={Star} label="Rating"
            value={stats?.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
            sub={`${stats?.totalReviews ?? 0} recenzii`}
            colorBg="bg-amber-500/10" colorIcon="text-amber-500" valueColor="text-amber-600"
          />
          <KpiCard
            icon={Briefcase} label="Joburi finalizate"
            value={stats?.totalJobsCompleted ?? 0}
            sub={`${stats?.thisMonthJobs ?? 0} luna aceasta`}
            colorBg="bg-blue-600/10" colorIcon="text-blue-600"
          />
          <KpiCard
            icon={MessageSquare} label="Recenzii"
            value={stats?.totalReviews ?? 0}
            sub={stats?.averageRating ? `media ${Number(stats.averageRating).toFixed(1)}` : ''}
            colorBg="bg-purple-500/10" colorIcon="text-purple-500"
          />
        </div>
      )}

      {/* Main Grid: Left (chart + jobs) | Right (actions + reviews) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* ─── Left Column ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Jobs */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Joburile de azi</h2>
              <Link to="/worker/comenzi" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Toate comenzile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {jobsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10">
                <div className="p-3 rounded-full bg-gray-100 inline-flex mb-3">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Niciun job programat azi.</p>
                <Link to="/worker/program" className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Vezi programul tau &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/worker/comenzi/${job.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Client initials */}
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold">
                        {job.client?.fullName
                          ?.split(' ')
                          .map((w) => w.charAt(0))
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{job.serviceName}</p>
                        <Badge variant={statusVariant[job.status] ?? 'default'} className="shrink-0">
                          {statusLabel[job.status] ?? job.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.scheduledStartTime} &middot; {job.estimatedDurationHours}h
                        </span>
                        {job.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {job.address.streetAddress}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right Column (Sidebar) ────────────────────────────────── */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Acces rapid</h2>
            <div className="space-y-1">
              {[
                { to: '/worker/program', icon: CalendarDays, label: 'Programul meu' },
                { to: '/worker/mesaje', icon: MessageSquare, label: 'Mesaje' },
                { to: '/worker/profil', icon: User, label: 'Profil & Setari' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-50 transition-colors">
                    <item.icon className="h-4 w-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Recenzii recente</h2>
              <Link to="/worker/profil" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Toate &rarr;
              </Link>
            </div>
            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-gray-100 inline-flex mb-2">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Nicio recenzie inca.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3.5 w-3.5',
                              i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{review.reviewer?.fullName ?? 'Client'}</p>
                    {review.comment && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
