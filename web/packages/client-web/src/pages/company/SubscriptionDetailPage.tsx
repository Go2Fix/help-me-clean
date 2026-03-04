import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Building2,
  Home,
  Bath,
  Ruler,
  PawPrint,
  FileText,
  XCircle,
  Repeat,
  TrendingDown,
  RefreshCw,
  Star,
  Loader2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import WorkerChangeModal from '@/components/subscription/WorkerChangeModal';
import {
  SUBSCRIPTION_DETAIL,
  MY_WORKERS,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  extra: { id: string; nameRo: string; price: number };
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

interface WorkerOption {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  company: { id: string; companyName: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success', PAUSED: 'warning', PAST_DUE: 'danger', CANCELLED: 'default',
};

const bookingStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  PENDING: 'warning', ASSIGNED: 'info', CONFIRMED: 'info', IN_PROGRESS: 'info',
  COMPLETED: 'success', CANCELLED: 'danger',
};

function fmtDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function fmtTime(timeStr: string): string {
  return timeStr ? timeStr.slice(0, 5) : '';
}

function fmtCurrency(amount: number): string {
  return amount.toFixed(2) + ' RON';
}

function fmtAddress(address: SubscriptionAddress, floorLabel: string, aptLabel: string): string {
  const parts = [address.streetAddress];
  if (address.floor) parts.push(`${floorLabel} ${address.floor}`);
  if (address.apartment) parts.push(`${aptLabel} ${address.apartment}`);
  parts.push(`${address.city}, ${address.county}`);
  return parts.join(', ');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompanySubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('company');
  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const recurrenceLabels: Record<string, string> = {
    WEEKLY: t('subscriptionDetail.recurrence.weekly', { defaultValue: t('subscriptions.recurrence.weekly') }),
    BIWEEKLY: t('subscriptionDetail.recurrence.biweekly', { defaultValue: t('subscriptions.recurrence.biweekly') }),
    MONTHLY: t('subscriptionDetail.recurrence.monthly', { defaultValue: t('subscriptions.recurrence.monthly') }),
  };

  const dayNames: Record<number, string> = {
    0: t('subscriptionDetail.days.0'),
    1: t('subscriptionDetail.days.1'),
    2: t('subscriptionDetail.days.2'),
    3: t('subscriptionDetail.days.3'),
    4: t('subscriptionDetail.days.4'),
    5: t('subscriptionDetail.days.5'),
    6: t('subscriptionDetail.days.6'),
  };

  const propertyTypeLabels: Record<string, string> = {
    APARTMENT: t('subscriptionDetail.serviceDetails.propertyTypes.APARTMENT'),
    HOUSE: t('subscriptionDetail.serviceDetails.propertyTypes.HOUSE'),
    OFFICE: t('subscriptionDetail.serviceDetails.propertyTypes.OFFICE'),
    STUDIO: t('subscriptionDetail.serviceDetails.propertyTypes.STUDIO'),
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: t('subscriptions.status.active'),
    PAUSED: t('subscriptions.status.paused'),
    PAST_DUE: t('subscriptions.status.pastDue'),
    CANCELLED: t('subscriptions.status.cancelled'),
  };

  const bookingStatusLabel: Record<string, string> = {
    PENDING: t('subscriptionDetail.bookingStatus.pending'),
    ASSIGNED: t('subscriptionDetail.bookingStatus.assigned'),
    CONFIRMED: t('subscriptionDetail.bookingStatus.confirmed'),
    IN_PROGRESS: t('subscriptionDetail.bookingStatus.inProgress'),
    COMPLETED: t('subscriptionDetail.bookingStatus.completed'),
    CANCELLED: t('subscriptionDetail.bookingStatus.cancelled'),
  };

  const [workerChangeModal, setWorkerChangeModal] = useState(false);
  const [workerChangeSuccess, setWorkerChangeSuccess] = useState(false);

  const { data, loading, error } = useQuery<{ serviceSubscription: Subscription }>(
    SUBSCRIPTION_DETAIL,
    { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' },
  );

  const { data: workersData, loading: loadingWorkers } = useQuery<{ myWorkers: WorkerOption[] }>(MY_WORKERS, {
    skip: !workerChangeModal,
  });

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error / Not found
  if (error || !data?.serviceSubscription) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">
          {error ? t('subscriptionDetail.loadError') : t('subscriptionDetail.notFound')}
        </p>
        <Button variant="ghost" onClick={() => navigate('/firma/abonamente')}>
          <ArrowLeft className="h-4 w-4" />
          {t('subscriptionDetail.backToSubscriptions')}
        </Button>
      </div>
    );
  }

  const sub = data.serviceSubscription;
  const isCancelled = sub.status === 'CANCELLED';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/firma/abonamente')}
          className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{sub.serviceName}</h1>
            <Badge variant={statusBadgeVariant[sub.status] ?? 'default'}>
              {statusLabel[sub.status] ?? sub.status}
            </Badge>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-blue-600">
              <Repeat className="h-3 w-3" />
              {recurrenceLabels[sub.recurrenceType] || sub.recurrenceType}
            </span>
          </div>
          <p className="text-gray-500 mt-0.5">
            {dayNames[sub.dayOfWeek] ?? ''}, ora {fmtTime(sub.preferredTime)} &middot; {t('subscriptionDetail.sessions', { count: sub.sessionsPerMonth })}
          </p>
        </div>
      </div>

      {/* Banners */}
      {isCancelled && sub.cancellationReason && (
        <Card className="mb-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{t('subscriptionDetail.cancellationReason')}</p>
              <p className="text-sm text-red-700 mt-0.5">{sub.cancellationReason}</p>
              {sub.cancelledAt && (
                <p className="text-xs text-red-500 mt-1">{t('subscriptionDetail.cancelledAt', { date: fmtDate(sub.cancelledAt, locale) })}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {workerChangeSuccess && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-800">
              {t('subscriptionDetail.workerChangeSuccess')}
            </p>
          </div>
        </Card>
      )}

      {sub.workerChangeRequestedAt && !workerChangeSuccess && (
        <Card className="mb-6">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {t('subscriptionDetail.workerChangePending')}
              </p>
              {sub.workerChangeReason && (
                <p className="text-sm text-amber-700 mt-0.5">
                  {t('subscriptionDetail.workerChangeReason', { reason: sub.workerChangeReason })}
                </p>
              )}
              <p className="text-xs text-amber-600 mt-1">
                {t('subscriptionDetail.workerChangeRequested', { date: fmtDate(sub.workerChangeRequestedAt!, locale) })}
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setWorkerChangeModal(true)}
              >
                <RefreshCw className="h-4 w-4" />
                {t('subscriptionDetail.assignNewWorker')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscriptionDetail.pricing.title')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subscriptionDetail.pricing.hourlyRate')}</span>
                <span className="text-gray-900">{fmtCurrency(sub.hourlyRate)}{t('subscriptionDetail.pricing.perHour')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subscriptionDetail.pricing.duration')}</span>
                <span className="text-gray-900">{sub.estimatedDurationHours} {sub.estimatedDurationHours === 1 ? t('subscriptionDetail.pricing.hour') : t('subscriptionDetail.pricing.hours')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subscriptionDetail.pricing.perSessionOriginal')}</span>
                <span className="text-gray-900">{fmtCurrency(sub.perSessionOriginal)}</span>
              </div>
              {sub.discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {t('subscriptionDetail.pricing.discount')}
                  </span>
                  <span className="text-emerald-600 font-medium">-{sub.discountPct}%</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-700">{t('subscriptionDetail.pricing.perSession')}</span>
                <span className="text-gray-900">{fmtCurrency(sub.perSessionDiscounted)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('subscriptionDetail.pricing.sessionsPerMonth')}</span>
                  <span className="text-gray-900">{sub.sessionsPerMonth}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-2 p-3 bg-primary/5 rounded-xl -mx-1">
                  <span className="text-gray-900">{t('subscriptionDetail.pricing.monthlyTotal')}</span>
                  <span className="text-primary">{fmtCurrency(sub.monthlyAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Service Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscriptionDetail.serviceDetails.title')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {sub.propertyType && (
                <div className="flex items-start gap-3">
                  <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">{t('subscriptionDetail.serviceDetails.propertyType')}</p>
                    <p className="text-sm text-gray-900">{propertyTypeLabels[sub.propertyType] ?? sub.propertyType}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('subscriptionDetail.serviceDetails.rooms')}</p>
                  <p className="text-sm text-gray-900">{sub.numRooms} {sub.numRooms === 1 ? t('subscriptionDetail.serviceDetails.room') : t('subscriptionDetail.serviceDetails.roomsPlural')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Bath className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('subscriptionDetail.serviceDetails.bathrooms')}</p>
                  <p className="text-sm text-gray-900">{sub.numBathrooms} {sub.numBathrooms === 1 ? t('subscriptionDetail.serviceDetails.bathroom') : t('subscriptionDetail.serviceDetails.bathroomsPlural')}</p>
                </div>
              </div>
              {sub.areaSqm != null && sub.areaSqm > 0 && (
                <div className="flex items-start gap-3">
                  <Ruler className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">{t('subscriptionDetail.serviceDetails.area')}</p>
                    <p className="text-sm text-gray-900">{sub.areaSqm} {t('subscriptionDetail.serviceDetails.sqm')}</p>
                  </div>
                </div>
              )}
              {sub.hasPets && (
                <div className="flex items-start gap-3">
                  <PawPrint className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">{t('subscriptionDetail.serviceDetails.pets')}</p>
                    <p className="text-sm text-gray-900">{t('subscriptionDetail.serviceDetails.petsYes')}</p>
                  </div>
                </div>
              )}
            </div>
            {sub.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{t('subscriptionDetail.serviceDetails.instructions')}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{sub.specialInstructions}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Address */}
          {sub.address && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscriptionDetail.address')}</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-900">{fmtAddress(sub.address, t('subscriptionDetail.floor'), t('subscriptionDetail.apartment'))}</p>
              </div>
            </Card>
          )}

          {/* Upcoming Bookings */}
          {sub.upcomingBookings.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('subscriptionDetail.upcomingBookings', { count: sub.upcomingBookings.length })}
              </h3>
              <div className="space-y-2">
                {sub.upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/firma/comenzi/${b.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fmtDate(b.scheduledDate, locale)}</p>
                        <p className="text-xs text-gray-500">
                          {fmtTime(b.scheduledStartTime)} &middot; {b.referenceCode}
                        </p>
                      </div>
                    </div>
                    <Badge variant={bookingStatusVariant[b.status] ?? 'default'}>
                      {bookingStatusLabel[b.status] ?? b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Booking History */}
          {sub.bookings.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('subscriptionDetail.bookingHistory', { count: sub.bookings.length })}
              </h3>
              <div className="space-y-2">
                {sub.bookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/firma/comenzi/${b.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={bookingStatusVariant[b.status] ?? 'default'}>
                        {bookingStatusLabel[b.status] ?? b.status}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">{fmtDate(b.scheduledDate, locale)}, {fmtTime(b.scheduledStartTime)}</p>
                        <p className="text-xs text-gray-500">
                          {b.referenceCode}
                          {b.worker ? ` — ${b.worker.fullName}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 shrink-0">
                      {fmtCurrency(b.estimatedTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client */}
          {sub.client && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.client')}</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {sub.client.fullName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{sub.client.email}</p>
                  {sub.client.phone && (
                    <p className="text-sm text-gray-500">{sub.client.phone}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Company */}
          {sub.company && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.company')}</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-secondary/10">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <p className="font-medium text-gray-900 truncate">
                  {sub.company.companyName}
                </p>
              </div>
            </Card>
          )}

          {/* Worker */}
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.worker')}</h3>
            {sub.worker ? (
              <>
                <div className="flex items-center gap-3">
                  {sub.worker.user?.avatarUrl ? (
                    <img
                      src={sub.worker.user.avatarUrl}
                      alt={sub.worker.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-accent">
                        {sub.worker.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{sub.worker.fullName}</p>
                    {sub.worker.ratingAvg != null && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                        {sub.worker.ratingAvg.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                {(sub.status === 'ACTIVE' || sub.status === 'PAUSED') && !sub.workerChangeRequestedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setWorkerChangeModal(true)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('subscriptionDetail.changeWorker')}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">{t('subscriptionDetail.noWorker')}</p>
            )}
          </Card>

          {/* Period */}
          {(sub.currentPeriodStart || sub.currentPeriodEnd) && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.currentPeriod')}</h3>
              <div className="space-y-2 text-sm">
                {sub.currentPeriodStart && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('subscriptionDetail.periodStart')}</span>
                    <span className="text-gray-900">{fmtDate(sub.currentPeriodStart, locale)}</span>
                  </div>
                )}
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('subscriptionDetail.periodEnd')}</span>
                    <span className="text-gray-900">{fmtDate(sub.currentPeriodEnd, locale)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Progress */}
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.progress.title')}</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('subscriptionDetail.progress.completed')}</span>
              <span className="text-sm font-semibold text-gray-900">
                {sub.completedBookings} / {sub.totalBookings}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${sub.totalBookings > 0 ? (sub.completedBookings / sub.totalBookings) * 100 : 0}%` }}
              />
            </div>
          </Card>

          {/* Extras */}
          {sub.extras.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.extras')}</h3>
              <ul className="space-y-1.5">
                {sub.extras.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.extra.nameRo}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </span>
                    <span className="text-gray-500">{fmtCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Meta Info */}
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-3">{t('subscriptionDetail.meta.title')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('subscriptionDetail.meta.createdAt')}</span>
                <span className="text-gray-900">{fmtDate(sub.createdAt, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('subscriptionDetail.meta.serviceType')}</span>
                <span className="text-gray-900">{sub.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('subscriptionDetail.meta.preferredDay')}</span>
                <span className="text-gray-900">{dayNames[sub.dayOfWeek] ?? sub.dayOfWeek}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <WorkerChangeModal
        open={workerChangeModal}
        onClose={() => setWorkerChangeModal(false)}
        subscriptionId={sub.id}
        workerChangeReason={sub.workerChangeReason}
        workerChangeRequestedAt={sub.workerChangeRequestedAt}
        workers={workersData?.myWorkers ?? []}
        loadingWorkers={loadingWorkers}
        showCompanyName={false}
        onSuccess={() => {
          setWorkerChangeSuccess(true);
          setTimeout(() => setWorkerChangeSuccess(false), 5000);
        }}
        refetchQueries={[{ query: SUBSCRIPTION_DETAIL, variables: { id } }]}
      />
    </div>
  );
}
