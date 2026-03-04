import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Home,
  Bath,
  Ruler,
  PawPrint,
  FileText,
  User,
  Star,
  Pause,
  Play,
  XCircle,
  Repeat,
  TrendingDown,
  CalendarRange,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/ClientBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import {
  SUBSCRIPTION_DETAIL,
  PAUSE_SUBSCRIPTION,
  RESUME_SUBSCRIPTION,
  CANCEL_SUBSCRIPTION,
  REQUEST_SUBSCRIPTION_WORKER_CHANGE,
} from '../../graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubscriptionAddress {
  streetAddress: string;
  city: string;
  county: string;
  floor?: string;
  apartment?: string;
}

interface SubscriptionWorker {
  id: string;
  fullName: string;
  ratingAvg: number | null;
  user?: { avatarUrl: string | null } | null;
}

interface SubscriptionCompany {
  id: string;
  companyName: string;
}

interface SubscriptionExtra {
  extra: {
    id: string;
    nameRo: string;
    price: number;
  };
  quantity: number;
  price: number;
}

interface SubscriptionBooking {
  id: string;
  referenceCode: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedTotal: number;
  status: string;
  paymentStatus: string;
  worker: { id: string; fullName: string } | null;
}

interface UpcomingBooking {
  id: string;
  referenceCode: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
}

interface Subscription {
  id: string;
  recurrenceType: string;
  dayOfWeek: number;
  preferredTime: string;
  serviceType: string;
  serviceName: string;
  propertyType: string;
  numRooms: number;
  numBathrooms: number;
  areaSqm: number | null;
  hasPets: boolean;
  specialInstructions: string | null;
  hourlyRate: number;
  estimatedDurationHours: number;
  perSessionOriginal: number;
  discountPct: number;
  perSessionDiscounted: number;
  sessionsPerMonth: number;
  monthlyAmount: number;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  pausedAt: string | null;
  workerChangeRequestedAt: string | null;
  workerChangeReason: string | null;
  createdAt: string;
  totalBookings: number;
  completedBookings: number;
  client: { id: string; fullName: string; email: string; phone: string } | null;
  worker: SubscriptionWorker | null;
  company: SubscriptionCompany | null;
  address: SubscriptionAddress | null;
  bookings: SubscriptionBooking[];
  upcomingBookings: UpcomingBooking[];
  extras: SubscriptionExtra[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PAUSED: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-red-50 text-red-700',
  PAST_DUE: 'bg-red-50 text-red-700',
};

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2) + ' RON';
}

function formatAddress(address: SubscriptionAddress, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const parts = [address.streetAddress];
  if (address.floor) parts.push(t('client:addresses.floor', { floor: address.floor }));
  if (address.apartment) parts.push(t('client:addresses.apartment', { apt: address.apartment }));
  parts.push(`${address.city}, ${address.county}`);
  return parts.join(', ');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation(['dashboard', 'client']);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [pastDueDismissed, setPastDueDismissed] = useState(false);
  const [showWorkerChangeModal, setShowWorkerChangeModal] = useState(false);
  const [workerChangeSuccess, setWorkerChangeSuccess] = useState(false);
  const [workerChangeError, setWorkerChangeError] = useState<string | null>(null);
  const [workerChangeReason, setWorkerChangeReason] = useState('');

  const { data, loading, error } = useQuery<{ serviceSubscription: Subscription }>(
    SUBSCRIPTION_DETAIL,
    {
      variables: { id },
      skip: !id || !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [pauseSubscription, { loading: pausing }] = useMutation(PAUSE_SUBSCRIPTION, {
    refetchQueries: [{ query: SUBSCRIPTION_DETAIL, variables: { id } }],
  });

  const [resumeSubscription, { loading: resuming }] = useMutation(RESUME_SUBSCRIPTION, {
    refetchQueries: [{ query: SUBSCRIPTION_DETAIL, variables: { id } }],
  });

  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION, {
    refetchQueries: [{ query: SUBSCRIPTION_DETAIL, variables: { id } }],
    onCompleted: () => {
      setShowCancelModal(false);
      setCancelReason('');
    },
  });

  const [requestWorkerChange, { loading: changingWorker }] = useMutation(
    REQUEST_SUBSCRIPTION_WORKER_CHANGE,
    {
      refetchQueries: [{ query: SUBSCRIPTION_DETAIL, variables: { id } }],
      onCompleted: () => {
        setShowWorkerChangeModal(false);
        setWorkerChangeError(null);
        setWorkerChangeReason('');
        setWorkerChangeSuccess(true);
        setTimeout(() => setWorkerChangeSuccess(false), 5000);
      },
      onError: (err) => {
        setWorkerChangeError(
          err.message || t('client:subscriptionDetail.error.workerChange'),
        );
      },
    },
  );

  // ─── Auth guard ──────────────────────────────────────────────────────────

  if (authLoading) {
    return <LoadingSpinner text={t('client:subscriptionDetail.verifyingAuth')} />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/autentificare"
        state={{ from: `/cont/abonamente/${id}` }}
        replace
      />
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-4 sm:py-8">
        <div className="max-w-4xl mx-auto sm:px-2 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-gray-200 rounded-xl" />
              <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-4 w-full bg-gray-200 rounded" />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2].map((j) => (
                      <div key={j} className="h-4 w-full bg-gray-200 rounded" />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error / Not found ───────────────────────────────────────────────────

  if (error || !data?.serviceSubscription) {
    return (
      <div className="py-8 text-center max-w-4xl mx-auto">
        <p className="text-danger mb-4">
          {error
            ? t('client:subscriptionDetail.error.loadFailed')
            : t('client:subscriptionDetail.error.notFound')}
        </p>
        <Button variant="outline" onClick={() => navigate('/cont/abonamente')}>
          <ArrowLeft className="h-4 w-4" />
          {t('client:subscriptionDetail.backToSubscriptions')}
        </Button>
      </div>
    );
  }

  const sub = data.serviceSubscription;
  const statusClasses = STATUS_CLASSES[sub.status] ?? 'bg-gray-100 text-gray-800';
  const statusLabel = t(`client:subscriptionDetail.status.${sub.status}`, { defaultValue: sub.status });
  const isActive = sub.status === 'ACTIVE';
  const isPaused = sub.status === 'PAUSED';
  const isCancelled = sub.status === 'CANCELLED';
  const isPastDue = sub.status === 'PAST_DUE';

  const handleCancel = async () => {
    await cancelSubscription({
      variables: {
        id: sub.id,
        reason: cancelReason.trim() || undefined,
      },
    });
  };

  const handleWorkerChange = async () => {
    setWorkerChangeError(null);
    await requestWorkerChange({ variables: { id: sub.id, reason: workerChangeReason.trim() || undefined } });
  };

  return (
    <div className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto sm:px-2">
        {/* Back button */}
        <button
          onClick={() => navigate('/cont/abonamente')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">{t('client:subscriptionDetail.backToSubscriptions')}</span>
        </button>

        {/* PAST_DUE payment failure banner */}
        {sub.status === 'PAST_DUE' && !pastDueDismissed && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">{t('client:subscriptionDetail.pastDueBanner.title')}</p>
              <p className="text-sm text-amber-700 mt-1">
                {t('client:subscriptionDetail.pastDueBanner.description')}
              </p>
              <button
                onClick={() => navigate('/cont/plati')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                {t('client:subscriptionDetail.pastDueBanner.updatePayment')}
              </button>
            </div>
            <button
              onClick={() => setPastDueDismissed(true)}
              className="text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {sub.serviceName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  statusClasses,
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Repeat className="h-4 w-4" />
                {t(`client:subscriptionDetail.recurrence.${sub.recurrenceType}`, { defaultValue: sub.recurrenceType })}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {t(`client:subscriptionDetail.days.${sub.dayOfWeek}`, { defaultValue: '' })}, {formatTime(sub.preferredTime)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  loading={pausing}
                  onClick={() => pauseSubscription({ variables: { id: sub.id } })}
                >
                  <Pause className="h-4 w-4" />
                  {t('client:subscriptionDetail.actions.pause')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  {t('client:subscriptionDetail.actions.cancel')}
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button
                  size="sm"
                  loading={resuming}
                  onClick={() => resumeSubscription({ variables: { id: sub.id } })}
                >
                  <Play className="h-4 w-4" />
                  {t('client:subscriptionDetail.actions.resume')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  {t('client:subscriptionDetail.actions.cancel')}
                </Button>
              </>
            )}
            {(isCancelled || isPastDue) && (
              <div className="text-sm text-gray-500 italic">
                {isCancelled
                  ? t('client:subscriptionDetail.actions.cancelledOn', {
                      date: sub.cancelledAt ? formatDate(sub.cancelledAt, i18n.language) : '',
                    })
                  : t('client:subscriptionDetail.actions.pastDue')}
              </div>
            )}
          </div>
        </div>

        {/* Cancellation reason banner */}
        {isCancelled && sub.cancellationReason && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-6">
            <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{t('client:subscriptionDetail.cancellationReason')}</p>
              <p className="text-sm text-red-700 mt-0.5">{sub.cancellationReason}</p>
            </div>
          </div>
        )}

        {/* Paused banner */}
        {isPaused && sub.pausedAt && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 mb-6">
            <Pause className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              {t('client:subscriptionDetail.pausedSince', { date: formatDate(sub.pausedAt, i18n.language) })}
            </p>
          </div>
        )}

        {/* Worker change success banner */}
        {workerChangeSuccess && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-6">
            <RefreshCw className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              {t('client:subscriptionDetail.workerChangeSuccess')}
            </p>
          </div>
        )}

        {/* Pending worker change banner */}
        {sub.workerChangeRequestedAt && !workerChangeSuccess && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 mb-6">
            <RefreshCw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {t('client:subscriptionDetail.workerChangePending.title')}
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {t('client:subscriptionDetail.workerChangePending.description')}
              </p>
              {sub.workerChangeReason && (
                <p className="text-xs text-amber-600 mt-1">
                  {t('client:subscriptionDetail.workerChangePending.reason', { reason: sub.workerChangeReason })}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pricing card */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('client:subscriptionDetail.pricing.title')}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm text-gray-600">{t('client:subscriptionDetail.pricing.hourlyRate')}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(sub.hourlyRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarRange className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm text-gray-600">{t('client:subscriptionDetail.pricing.estimatedDuration')}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {sub.estimatedDurationHours} {t('client:subscriptionDetail.serviceDetails.duration_one', { count: sub.estimatedDurationHours })}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-500">{t('client:subscriptionDetail.pricing.originalPrice')}</span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(sub.perSessionOriginal)}
                    </span>
                  </div>
                  {sub.discountPct > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-emerald-600 font-medium">
                          {t('client:subscriptionDetail.pricing.subscriptionDiscount')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">
                        -{sub.discountPct}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 font-medium">
                      {t('client:subscriptionDetail.pricing.pricePerSession')}{sub.discountPct > 0 ? ` ${t('client:subscriptionDetail.pricing.withDiscount')}` : ''}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(sub.perSessionDiscounted)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-500">
                      {t('client:subscriptionDetail.pricing.sessionsPerMonth')}
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {sub.sessionsPerMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 bg-primary/5 rounded-xl px-3 -mx-1">
                    <span className="text-base font-semibold text-gray-900">
                      {t('client:subscriptionDetail.pricing.monthlyTotal')}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(sub.monthlyAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Service details card */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('client:subscriptionDetail.serviceDetails.title')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sub.propertyType && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <Home className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.propertyType')}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {t(`client:subscriptionDetail.propertyTypes.${sub.propertyType}`, { defaultValue: sub.propertyType })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Home className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.rooms')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {sub.numRooms} {t('client:subscriptionDetail.serviceDetails.rooms_one', { count: sub.numRooms })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Bath className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.bathrooms')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {sub.numBathrooms} {t('client:subscriptionDetail.serviceDetails.bathrooms_one', { count: sub.numBathrooms })}
                    </div>
                  </div>
                </div>
                {sub.areaSqm != null && sub.areaSqm > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Ruler className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.area')}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {sub.areaSqm} mp
                      </div>
                    </div>
                  </div>
                )}
                {sub.hasPets && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <PawPrint className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.pets')}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {t('client:subscriptionDetail.serviceDetails.hasPets')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {sub.specialInstructions && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{t('client:subscriptionDetail.serviceDetails.specialInstructions')}</div>
                      <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                        {sub.specialInstructions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Upcoming bookings */}
            {sub.upcomingBookings.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('client:subscriptionDetail.upcomingBookings', { count: sub.upcomingBookings.length })}
                </h2>
                <div className="space-y-3">
                  {sub.upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(booking.scheduledDate, i18n.language)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(booking.scheduledStartTime)}
                            </span>
                            <span className="font-mono">{booking.referenceCode}</span>
                          </div>
                        </div>
                      </div>
                      <Badge status={booking.status} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Booking history */}
            {sub.bookings.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('client:subscriptionDetail.bookingHistory', { count: sub.bookings.length })}
                </h2>
                <div className="space-y-3">
                  {sub.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors gap-2"
                      onClick={() => navigate(`/cont/comenzi/${booking.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge status={booking.status} />
                          {booking.paymentStatus === 'paid' && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              {t('client:subscriptionDetail.paid')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(booking.scheduledDate, i18n.language)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(booking.scheduledStartTime)}
                          </span>
                          {booking.worker && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {booking.worker.fullName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(booking.estimatedTotal)}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {booking.referenceCode}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Period info */}
            {(sub.currentPeriodStart || sub.currentPeriodEnd) && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('client:subscriptionDetail.currentPeriod')}
                </h2>
                <div className="space-y-3">
                  {sub.currentPeriodStart && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{t('client:subscriptionDetail.periodStart')}</div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(sub.currentPeriodStart, i18n.language)}
                        </div>
                      </div>
                    </div>
                  )}
                  {sub.currentPeriodEnd && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarRange className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{t('client:subscriptionDetail.periodEnd')}</div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(sub.currentPeriodEnd, i18n.language)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Progress */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {t('client:subscriptionDetail.progress.title')}
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{t('client:subscriptionDetail.progress.completedBookings')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {sub.completedBookings} / {sub.totalBookings}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${sub.totalBookings > 0 ? (sub.completedBookings / sub.totalBookings) * 100 : 0}%`,
                  }}
                />
              </div>
            </Card>

            {/* Address card */}
            {sub.address && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('client:subscriptionDetail.address')}
                </h2>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatAddress(sub.address, t)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Worker & Company card */}
            {sub.worker && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('client:subscriptionDetail.team')}
                </h2>
                <div className="flex flex-col items-center text-center">
                  {sub.worker.user?.avatarUrl ? (
                    <img
                      src={sub.worker.user.avatarUrl}
                      alt={sub.worker.fullName}
                      className="w-20 h-20 rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {sub.worker.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="mt-3 text-base font-semibold text-gray-900">
                    {sub.worker.fullName}
                  </div>
                  {sub.worker.ratingAvg != null && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                      {sub.worker.ratingAvg.toFixed(1)}
                    </div>
                  )}
                </div>
                {sub.worker && (isActive || isPaused) && !sub.workerChangeRequestedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkerChangeError(null);
                        setShowWorkerChangeModal(true);
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('client:subscriptionDetail.requestWorkerChange')}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Extras */}
            {sub.extras.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('client:subscriptionDetail.extras')}
                </h2>
                <ul className="space-y-1.5">
                  {sub.extras.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      {item.extra.nameRo}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Subscription meta */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('client:subscriptionDetail.info.title')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('client:subscriptionDetail.info.createdOn')}</span>
                  <span className="text-gray-900 font-medium">
                    {formatDate(sub.createdAt, i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('client:subscriptionDetail.info.serviceType')}</span>
                  <span className="text-gray-900 font-medium">{sub.serviceType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('client:subscriptionDetail.info.recurrence')}</span>
                  <span className="text-gray-900 font-medium">
                    {t(`client:subscriptionDetail.recurrence.${sub.recurrenceType}`, { defaultValue: sub.recurrenceType })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('client:subscriptionDetail.info.preferredDay')}</span>
                  <span className="text-gray-900 font-medium">
                    {t(`client:subscriptionDetail.days.${sub.dayOfWeek}`, { defaultValue: String(sub.dayOfWeek) })}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Cancel Modal */}
        <Modal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title={t('client:subscriptionDetail.cancelModal.title')}
        >
          <p className="text-sm text-gray-600 mb-4">
            {t('client:subscriptionDetail.cancelModal.description')}
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('client:subscriptionDetail.cancelModal.reasonLabel')}
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              rows={3}
              placeholder={t('client:subscriptionDetail.cancelModal.reasonPlaceholder')}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowCancelModal(false)}
            >
              {t('client:subscriptionDetail.cancelModal.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={cancelling}
              onClick={handleCancel}
            >
              {t('client:subscriptionDetail.cancelModal.confirm')}
            </Button>
          </div>
        </Modal>

        {/* Worker Change Modal */}
        <Modal
          open={showWorkerChangeModal}
          onClose={() => setShowWorkerChangeModal(false)}
          title={t('client:subscriptionDetail.workerChangeModal.title')}
        >
          <p className="text-sm text-gray-600 mb-4">
            {t('client:subscriptionDetail.workerChangeModal.description')}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('client:subscriptionDetail.workerChangeModal.reasonLabel')}
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              rows={3}
              placeholder={t('client:subscriptionDetail.workerChangeModal.reasonPlaceholder')}
              value={workerChangeReason}
              onChange={(e) => setWorkerChangeReason(e.target.value)}
            />
          </div>
          {workerChangeError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-4">
              <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{workerChangeError}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowWorkerChangeModal(false)}
            >
              {t('client:subscriptionDetail.workerChangeModal.cancel')}
            </Button>
            <Button
              loading={changingWorker}
              onClick={handleWorkerChange}
            >
              {t('client:subscriptionDetail.workerChangeModal.submit')}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
