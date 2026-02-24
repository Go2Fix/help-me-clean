import { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Repeat,
  Calendar,
  User,
  Building2,
  ChevronRight,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { MY_SUBSCRIPTIONS } from '../../graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UpcomingBooking {
  id: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
}

interface Subscription {
  id: string;
  recurrenceType: string;
  serviceType: string;
  serviceName: string;
  status: string;
  monthlyAmount: number;
  perSessionDiscounted: number;
  sessionsPerMonth: number;
  discountPct: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  cancelledAt: string | null;
  pausedAt: string | null;
  totalBookings: number;
  completedBookings: number;
  worker: { id: string; fullName: string } | null;
  company: { id: string; companyName: string } | null;
  upcomingBookings: UpcomingBooking[];
}

interface SubscriptionsData {
  mySubscriptions: Subscription[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'Bi-saptamanal',
  MONTHLY: 'Lunar',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
> = {
  ACTIVE: { label: 'Activ', variant: 'success' },
  PAUSED: { label: 'In pauza', variant: 'warning' },
  PAST_DUE: { label: 'Restanta', variant: 'danger' },
  CANCELLED: { label: 'Anulat', variant: 'default' },
};

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 bg-gray-200 rounded-lg" />
        <div className="h-5 w-16 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-6 w-48 bg-gray-200 rounded-lg mb-3" />
      <div className="h-8 w-32 bg-gray-200 rounded-lg mb-4" />
      <div className="space-y-2">
        <div className="h-4 w-40 bg-gray-200 rounded-lg" />
        <div className="h-4 w-36 bg-gray-200 rounded-lg" />
        <div className="h-4 w-44 bg-gray-200 rounded-lg" />
      </div>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t: _t } = useTranslation();

  // ─── Query ──────────────────────────────────────────────────────────────

  const { data, loading, error } = useQuery<SubscriptionsData>(
    MY_SUBSCRIPTIONS,
    {
      fetchPolicy: 'cache-and-network',
      skip: !isAuthenticated,
    },
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCardClick = useCallback(
    (subscriptionId: string) => {
      navigate(`/cont/abonamente/${subscriptionId}`);
    },
    [navigate],
  );

  const subscriptions = data?.mySubscriptions ?? [];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonamentele mele</h1>
        <p className="text-gray-500 mt-1">
          Gestioneaza abonamentele tale recurente pentru servicii de curatenie.
        </p>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <Repeat className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Eroare la incarcarea abonamentelor
          </h3>
          <p className="text-gray-500 mb-4">
            Nu am putut incarca abonamentele tale. Te rugam sa incerci din nou.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reincearca
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && subscriptions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Repeat className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Niciun abonament activ
          </h3>
          <p className="text-gray-500 mb-6">
            Nu ai inca niciun abonament. Creeaza o rezervare recurenta pentru a beneficia de reduceri.
          </p>
          <Button onClick={() => navigate('/rezervare')}>
            <Sparkles className="h-4 w-4" />
            Creeaza o rezervare
          </Button>
        </div>
      )}

      {/* Subscription Cards */}
      {!error && subscriptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map((sub) => {
            const statusCfg = STATUS_CONFIG[sub.status] ?? {
              label: sub.status,
              variant: 'default' as const,
            };
            const recurrenceLabel =
              RECURRENCE_LABELS[sub.recurrenceType] ?? sub.recurrenceType;
            const nextBooking =
              sub.upcomingBookings.length > 0 ? sub.upcomingBookings[0] : null;
            const progressPct =
              sub.totalBookings > 0
                ? Math.round((sub.completedBookings / sub.totalBookings) * 100)
                : 0;

            return (
              <Card
                key={sub.id}
                className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                onClick={() => handleCardClick(sub.id)}
              >
                {/* Top row: recurrence + status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">
                      {recurrenceLabel}
                    </span>
                  </div>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>

                {/* Service name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {sub.serviceName}
                </h3>

                {/* Monthly amount + discount */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {formatAmount(sub.monthlyAmount)}
                  </span>
                  <span className="text-sm text-gray-500">RON/luna</span>
                  {sub.discountPct > 0 && (
                    <Badge variant="success" className="ml-1">
                      -{sub.discountPct}%
                    </Badge>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {/* Worker */}
                  {sub.worker && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{sub.worker.fullName}</span>
                    </div>
                  )}

                  {/* Company */}
                  {sub.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{sub.company.companyName}</span>
                    </div>
                  )}

                  {/* Next booking */}
                  {nextBooking && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>
                        Urmatoarea programare:{' '}
                        <span className="font-medium text-gray-900">
                          {formatDateLong(nextBooking.scheduledDate)}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Sessions per month */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarCheck className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      {sub.sessionsPerMonth}{' '}
                      {sub.sessionsPerMonth === 1 ? 'sedinta' : 'sedinte'}/luna
                      {' '}
                      &middot;{' '}
                      {formatAmount(sub.perSessionDiscounted)} RON/sedinta
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {sub.totalBookings > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">
                        {sub.completedBookings} din {sub.totalBookings} programari completate
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {progressPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Period info + chevron */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Perioada: {formatDate(sub.currentPeriodStart)} -{' '}
                    {formatDate(sub.currentPeriodEnd)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
