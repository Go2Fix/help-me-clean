import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  Star, Briefcase, Clock, MapPin, Calendar,
  ChevronRight, Brain, FileText, CalendarDays, User,
  MessageSquare, ClipboardList, Camera, AlignLeft, MessageCircle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import ProfileSetupChecklist from '@/components/ProfileSetupChecklist';
import type { SetupItem } from '@/components/ProfileSetupChecklist';
import {
  MY_WORKER_STATS, TODAYS_JOBS,
  MY_WORKER_REVIEWS, MY_WORKER_PROFILE, MY_WORKER_AVAILABILITY,
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
  category?: { id: string; slug: string; nameRo: string; nameEn: string; icon?: string } | null;
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

function Metric({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profileData, loading: profileLoading } = useQuery(MY_WORKER_PROFILE);
  const { data: statsData, loading: statsLoading } = useQuery(MY_WORKER_STATS);
  const { data: jobsData, loading: jobsLoading } = useQuery(TODAYS_JOBS);
  const { data: reviewsData, loading: reviewsLoading } = useQuery(MY_WORKER_REVIEWS, {
    variables: { limit: 3, offset: 0 },
  });
  const { data: availabilityData } = useQuery(MY_WORKER_AVAILABILITY);

  const profile = profileData?.myWorkerProfile;
  const stats = statsData?.myWorkerStats;
  const jobs: Job[] = jobsData?.todaysJobs ?? [];
  const reviews: Review[] = reviewsData?.myWorkerReviews?.reviews ?? [];

  // Setup checks
  const personalityDone = !!profile?.personalityAssessment?.completedAt;
  const docs: WorkerDoc[] = profile?.documents ?? [];
  const approvedDocTypes = new Set(docs.filter((d) => d.status === 'APPROVED').map((d) => d.documentType));
  const hasAllDocs = REQUIRED_DOC_TYPES.every((t) => approvedDocTypes.has(t));
  const availabilitySet = availabilityData?.myWorkerAvailability?.some((d: { isAvailable: boolean }) => d.isAvailable) ?? false;

  const firstName = profile?.fullName?.split(' ')[0] ?? '';
  const todayStr = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isKpiLoading = statsLoading || profileLoading;

  const checklistItems: SetupItem[] = [
    { key: 'avatar', label: 'Adaugă o fotografie de profil', done: !!profile?.user?.avatarUrl, to: '/worker/profil', icon: Camera },
    { key: 'bio', label: 'Completează bio-ul', description: 'Prezintă-te clienților', done: !!profile?.bio?.trim(), to: '/worker/profil', icon: AlignLeft },
    { key: 'phone', label: 'Verifică numărul de telefon', description: 'Via WhatsApp', done: !!user?.phoneVerified, to: '/worker/profil', icon: MessageCircle },
    { key: 'personality', label: 'Test de personalitate', done: personalityDone, to: '/worker/test-personalitate', icon: Brain },
    { key: 'docs', label: 'Încarcă documentele obligatorii', description: 'Cazier judiciar și contract de muncă', done: hasAllDocs, to: '/worker/documente-obligatorii', icon: FileText },
    { key: 'availability', label: 'Setează disponibilitatea', description: 'Zilele și orele în care poți lucra', done: availabilitySet, to: '/worker/program', icon: CalendarDays },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName ? `Bun venit, ${firstName}!` : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{todayStr}</p>
      </div>

      {/* Key Metrics */}
      {isKpiLoading ? (
        <Card>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
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
        <Card>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 divide-x divide-gray-100">
            <Metric
              icon={Star} label="Rating"
              value={stats?.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
              sub={`${stats?.totalReviews ?? 0} recenzii`}
            />
            <div className="pl-6">
              <Metric
                icon={Briefcase} label="Joburi finalizate"
                value={stats?.totalJobsCompleted ?? 0}
                sub={`${stats?.thisMonthJobs ?? 0} luna aceasta`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Setup Checklist */}
      {profile && (
        <ProfileSetupChecklist
          items={checklistItems}
          title="Primii pași"
          subtitle="Completează profilul pentru a primi comenzi"
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/worker/comenzi', icon: ClipboardList, label: 'Comenzile mele', color: 'bg-blue-50 text-blue-600' },
          { to: '/worker/program', icon: CalendarDays, label: 'Programul meu', color: 'bg-emerald-50 text-emerald-600' },
          { to: '/worker/mesaje', icon: MessageSquare, label: 'Mesaje', color: 'bg-violet-50 text-violet-600' },
          { to: '/worker/profil', icon: User, label: 'Profil & Setari', color: 'bg-amber-50 text-amber-600' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group bg-white"
          >
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', item.color.split(' ')[0])}>
              <item.icon className={cn('h-5 w-5', item.color.split(' ')[1])} />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 text-center">{item.label}</span>
          </Link>
        ))}
      </div>

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
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center gap-4 py-6 px-2">
            <div className="p-3 rounded-full bg-gray-50 shrink-0">
              <Calendar className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Niciun job programat azi</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Verifica{' '}
                <Link to="/worker/program" className="text-blue-600 hover:text-blue-700">
                  programul tau
                </Link>{' '}
                pentru urmatoarele zile.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/worker/comenzi/${job.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
              >
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
                    {job.category && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium shrink-0">
                        {job.category.icon} {job.category.nameRo}
                      </span>
                    )}
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
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex items-center gap-4 py-4 px-2">
            <div className="p-3 rounded-full bg-gray-50 shrink-0">
              <Star className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Nicio recenzie inca</p>
              <p className="text-xs text-gray-500 mt-0.5">Recenziile vor aparea dupa finalizarea primelor comenzi.</p>
            </div>
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
  );
}
