import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Calendar, Repeat, Clock, MapPin, Home,
  PawPrint, Check, CheckCircle, CheckSquare, Square,
  AlertTriangle, Phone, Star,
  Building2, Key, FileText, XCircle, Navigation,
  Camera, X, Loader2,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  CLIENT_BOOKING_DETAIL,
  START_JOB,
  COMPLETE_JOB,
  UPLOAD_JOB_PHOTO,
  DELETE_JOB_PHOTO,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingJobPhoto {
  id: string;
  photoUrl: string;
  phase: string;
  sortOrder: number;
}

interface BookingExtra {
  extra: {
    id: string;
    nameRo: string;
    nameEn: string;
    icon?: string;
    allowMultiple: boolean;
    unitLabel?: string;
  };
  price: number;
  quantity: number;
}

interface BookingData {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  includedItems: string[];
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  specialInstructions?: string;
  propertyType?: string;
  numRooms?: number;
  numBathrooms?: number;
  areaSqm?: number;
  hasPets?: boolean;
  recurringGroupId?: string;
  occurrenceNumber?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  address?: {
    streetAddress: string;
    city: string;
    county: string;
    floor?: string;
    apartment?: string;
    entryCode?: string;
    notes?: string;
  };
  client?: { id: string; fullName: string; phone?: string };
  company?: { id: string; companyName: string; contactPhone?: string };
  extras: BookingExtra[];
  review?: { id: string; rating: number; comment?: string; createdAt: string };
  category?: { id: string; slug: string; nameRo: string; nameEn: string; icon?: string } | null;
  photos?: BookingJobPhoto[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  ASSIGNED: 'info',
  CONFIRMED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

const FINALIZED_STATUSES = ['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_ADMIN'];

interface TimelineStep {
  labelKey: string;
  date: string | null;
  icon: typeof FileText;
  done: boolean;
  isCancelStep?: boolean;
  customLabel?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { t, i18n } = useTranslation(['dashboard', 'worker']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [gpsToast, setGpsToast] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [photoPhase, setPhotoPhase] = useState<'before' | 'after' | 'during'>('during');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data, loading } = useQuery(CLIENT_BOOKING_DETAIL, {
    variables: { id },
    skip: !id,
  });
  const booking = data?.booking as BookingData | undefined;

  const [startJob, { loading: starting }] = useMutation(START_JOB);
  const [completeJob, { loading: completing }] = useMutation(COMPLETE_JOB);
  const [uploadJobPhoto] = useMutation(UPLOAD_JOB_PHOTO);
  const [deleteJobPhoto] = useMutation(DELETE_JOB_PHOTO);
  const actionLoading = starting || completing;

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  const getGPS = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 0 },
      );
    });
  };

  const handleAction = async (action: 'start' | 'complete') => {
    setError('');
    try {
      const gps = await getGPS();
      if (action === 'start') {
        await startJob({ variables: { id, latitude: gps?.latitude, longitude: gps?.longitude } });
      }
      if (action === 'complete') {
        await completeJob({ variables: { id, latitude: gps?.latitude, longitude: gps?.longitude } });
      }
      if (gps) {
        setGpsToast('Locația a fost înregistrată.');
        setTimeout(() => setGpsToast(''), 4000);
      }
    } catch {
      setError(t('worker:jobDetail.actions.errorUpdate'));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;
    setUploadingPhoto(true);
    try {
      await uploadJobPhoto({
        variables: { bookingId: booking.id, file, phase: photoPhase },
        refetchQueries: ['ClientBookingDetail'],
      });
    } catch (err) {
      console.error('Failed to upload photo:', err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm(t('worker:jobDetail.photos.deleteConfirm'))) return;
    try {
      await deleteJobPhoto({
        variables: { id: photoId },
        refetchQueries: ['ClientBookingDetail'],
      });
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-8">
        <button
          onClick={() => navigate('/worker/comenzi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('worker:jobDetail.backToOrders')}
        </button>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-40 bg-gray-200 rounded-xl" />
              <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-xl" />
              <div className="h-32 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────────────

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto pb-8">
        <button
          onClick={() => navigate('/worker/comenzi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('worker:jobDetail.backToOrders')}
        </button>
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('worker:jobDetail.notFound')}</h3>
            <p className="text-gray-500">{t('worker:jobDetail.notFoundDesc')}</p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Derived data ───────────────────────────────────────────────────────────

  const canStartJob = useMemo(() => {
    if (!booking?.scheduledDate || !booking?.scheduledStartTime) return true;
    const [year, month, day] = booking.scheduledDate.split('-').map(Number);
    const [hour, minute] = booking.scheduledStartTime.split(':').map(Number);
    const scheduledAt = new Date(year, month - 1, day, hour, minute, 0);
    const allowedFrom = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
    return new Date() >= allowedFrom;
  }, [booking?.scheduledDate, booking?.scheduledStartTime]);

  const startUnlockTime = useMemo(() => {
    if (!booking?.scheduledDate || !booking?.scheduledStartTime) return '';
    const [year, month, day] = booking.scheduledDate.split('-').map(Number);
    const [hour, minute] = booking.scheduledStartTime.split(':').map(Number);
    const unlockAt = new Date(year, month - 1, day, hour, minute, 0);
    unlockAt.setHours(unlockAt.getHours() - 1);
    return unlockAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [booking?.scheduledDate, booking?.scheduledStartTime]);

  const badgeVariant = STATUS_BADGE_VARIANT[booking.status] ?? ('default' as const);
  const badgeLabel = t(`worker:jobDetail.statusLabels.${booking.status}`, { defaultValue: booking.status });
  const isFinalized = FINALIZED_STATUSES.includes(booking.status);
  const isCancelled = booking.status.startsWith('CANCELLED');

  const includedItems = booking.includedItems ?? [];
  const extras = booking.extras ?? [];
  const totalChecklistItems = includedItems.length + extras.length;
  const checkedCount = checkedItems.size;
  const showProgress = (booking.status === 'IN_PROGRESS' || booking.status === 'CONFIRMED') && totalChecklistItems > 0;

  // Timeline
  const timelineSteps: TimelineStep[] = [
    { labelKey: 'worker:jobDetail.timeline.assigned', date: booking.createdAt, icon: FileText, done: true },
    {
      labelKey: 'worker:jobDetail.timeline.confirmed',
      date: null,
      icon: CheckCircle,
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      labelKey: 'worker:jobDetail.timeline.inProgress',
      date: booking.startedAt || null,
      icon: Clock,
      done: ['IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      labelKey: 'worker:jobDetail.timeline.completed',
      date: booking.completedAt || null,
      icon: CheckCircle,
      done: booking.status === 'COMPLETED',
    },
  ];
  if (isCancelled) {
    timelineSteps.push({
      labelKey: 'worker:jobDetail.timeline.cancelled',
      customLabel: t(`worker:jobDetail.statusLabels.${booking.status}`, { defaultValue: t('worker:jobDetail.timeline.cancelled') }),
      date: null,
      icon: XCircle,
      done: true,
      isCancelStep: true,
    });
  }

  const getPhaseLabel = (phase: string) => {
    if (phase === 'before') return t('worker:jobDetail.photos.phaseBefore');
    if (phase === 'after') return t('worker:jobDetail.photos.phaseAfter');
    return t('worker:jobDetail.photos.phaseDuring');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/worker/comenzi')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('worker:jobDetail.backToOrders')}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{booking.serviceName}</h1>
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            {booking.category && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {booking.category.icon} {i18n.language === 'en' ? booking.category.nameEn : booking.category.nameRo}
              </span>
            )}
            {booking.recurringGroupId && (
              <Badge variant="info">
                <Repeat className="h-3 w-3 mr-1" />
                {booking.occurrenceNumber
                  ? t('worker:jobDetail.recurringNum', { num: booking.occurrenceNumber })
                  : t('worker:jobDetail.recurring')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('worker:jobDetail.ref', { code: booking.referenceCode })} &middot; {formatDateTime(booking.createdAt)}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Status Timeline */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">{t('worker:jobDetail.timeline.title')}</h2>
            <div className="relative">
              {timelineSteps.map((step, idx) => {
                const IconComp = step.icon;
                const isLast = idx === timelineSteps.length - 1;
                const isCancelStep = !!step.isCancelStep;
                const label = step.customLabel ?? t(step.labelKey);
                return (
                  <div key={idx} className="flex gap-3 relative">
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[15px] top-[30px] w-0.5 h-[calc(100%-14px)]',
                          step.done ? (isCancelStep ? 'bg-red-200' : 'bg-blue-200') : 'bg-gray-200',
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full shrink-0',
                        step.done
                          ? isCancelStep
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className={isLast ? 'pb-0' : 'pb-5'}>
                      <p className={cn('text-sm font-medium', step.done ? 'text-gray-900' : 'text-gray-400')}>
                        {label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(step.date)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Job Details */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">{t('worker:jobDetail.jobDetails.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('worker:jobDetail.jobDetails.date')}</p>
                  <p className="text-sm font-medium">{formatDate(booking.scheduledDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50">
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('worker:jobDetail.jobDetails.timeAndDuration')}</p>
                  <p className="text-sm font-medium">
                    {booking.scheduledStartTime?.slice(0, 5)} &middot; {booking.estimatedDurationHours}h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50">
                  <Home className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('worker:jobDetail.jobDetails.property')}</p>
                  <p className="text-sm font-medium">
                    {t(`worker:jobDetail.propertyTypes.${booking.propertyType || 'APARTMENT'}`, { defaultValue: booking.propertyType || 'Apartament' })}
                    {booking.numRooms != null && ` \u00b7 ${t('worker:jobDetail.jobDetails.rooms', { count: booking.numRooms })}`}
                    {booking.numBathrooms != null && ` \u00b7 ${t('worker:jobDetail.jobDetails.bathrooms', { count: booking.numBathrooms })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg',
                  booking.hasPets ? 'bg-red-50' : 'bg-gray-50',
                )}>
                  <PawPrint className={cn('h-4 w-4', booking.hasPets ? 'text-red-500' : 'text-gray-400')} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('worker:jobDetail.jobDetails.surfaceAndPets')}</p>
                  <p className="text-sm font-medium">
                    {booking.areaSqm != null ? t('worker:jobDetail.jobDetails.sqm', { area: booking.areaSqm }) : '-'}
                    {' \u00b7 '}
                    {booking.hasPets ? t('worker:jobDetail.jobDetails.withPets') : t('worker:jobDetail.jobDetails.noPets')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Checklist */}
          {totalChecklistItems > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">{t('worker:jobDetail.checklist.title')}</h2>

              {/* Progress bar — active statuses only */}
              {showProgress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {t('worker:jobDetail.checklist.progress', { checked: checkedCount, total: totalChecklistItems })}
                    </span>
                    <span className="text-sm font-medium text-emerald-600">
                      {Math.round((checkedCount / totalChecklistItems) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(checkedCount / totalChecklistItems) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Included items */}
              <div className="space-y-1">
                {includedItems.map((item, index) => {
                  if (isFinalized) {
                    return (
                      <div key={index} className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        isCancelled ? 'bg-gray-50' : 'bg-emerald-50',
                      )}>
                        <Check className={cn(
                          'h-4 w-4 shrink-0',
                          isCancelled ? 'text-gray-400' : 'text-emerald-500',
                        )} />
                        <span className={cn(
                          'text-sm',
                          isCancelled ? 'text-gray-400 line-through' : 'text-gray-600',
                        )}>{item}</span>
                      </div>
                    );
                  }
                  const isChecked = checkedItems.has(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleItem(index)}
                      className={cn(
                        'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                        isChecked ? 'bg-emerald-50' : 'hover:bg-gray-50',
                      )}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300 shrink-0" />
                      )}
                      <span className={cn('text-sm', isChecked ? 'line-through text-gray-400' : 'text-gray-700')}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Extras inline */}
              {extras.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-3" />
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {t('worker:jobDetail.checklist.extras')}
                  </p>
                  <div className="space-y-1">
                    {extras.map((extra, idx) => {
                      const checklistIndex = includedItems.length + idx;
                      const extraName = i18n.language === 'en' ? (extra.extra.nameEn || extra.extra.nameRo) : extra.extra.nameRo;
                      if (isFinalized) {
                        return (
                          <div key={extra.extra.id} className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                            isCancelled ? 'bg-gray-50' : 'bg-emerald-50',
                          )}>
                            <Check className={cn(
                              'h-4 w-4 shrink-0',
                              isCancelled ? 'text-gray-400' : 'text-emerald-500',
                            )} />
                            <span className={cn(
                              'text-sm',
                              isCancelled ? 'text-gray-400 line-through' : 'text-gray-600',
                            )}>
                              {extraName}
                              {extra.quantity > 1 && ` (x${extra.quantity})`}
                            </span>
                          </div>
                        );
                      }
                      const isChecked = checkedItems.has(checklistIndex);
                      return (
                        <button
                          key={extra.extra.id}
                          type="button"
                          onClick={() => toggleItem(checklistIndex)}
                          className={cn(
                            'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                            isChecked ? 'bg-emerald-50' : 'hover:bg-gray-50',
                          )}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-300 shrink-0" />
                          )}
                          <span className={cn('text-sm', isChecked ? 'line-through text-gray-400' : 'text-gray-700')}>
                            {extraName}
                            {extra.quantity > 1 && ` (x${extra.quantity})`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Special Instructions */}
          {booking.specialInstructions && (
            <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">{t('worker:jobDetail.specialInstructions')}</p>
                <p className="text-sm text-amber-700">{booking.specialInstructions}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {booking.address && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">{t('worker:jobDetail.address.title')}</h2>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-0.5 text-sm text-gray-600 flex-1">
                  <p className="font-medium text-gray-900">{booking.address.streetAddress}</p>
                  <p>{booking.address.city}{booking.address.county ? `, ${booking.address.county}` : ''}</p>
                  {(booking.address.floor || booking.address.apartment) && (
                    <p className="text-gray-400">
                      {booking.address.floor && t('worker:jobDetail.address.floor', { floor: booking.address.floor })}
                      {booking.address.floor && booking.address.apartment && ', '}
                      {booking.address.apartment && t('worker:jobDetail.address.apartment', { apt: booking.address.apartment })}
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [booking.address.streetAddress, booking.address.city, booking.address.county].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {t('worker:jobDetail.address.openMaps')}
                  </a>
                </div>
              </div>

              {booking.address.entryCode && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 shrink-0">
                    <Key className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('worker:jobDetail.address.entryCode')}</p>
                    <p className="text-sm font-bold text-gray-900 font-mono tracking-wider">{booking.address.entryCode}</p>
                  </div>
                </div>
              )}

              {booking.address.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{t('worker:jobDetail.address.notes')}</p>
                  <p className="text-sm text-gray-600">{booking.address.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Job Photos */}
          {(booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED') && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-600" />
                {t('worker:jobDetail.photos.title')}
              </h3>

              {/* Photo grid */}
              {booking.photos && booking.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {booking.photos.map((photo) => (
                    <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo.photoUrl} alt={photo.phase} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1">
                        <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                          {getPhaseLabel(photo.phase)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload controls (only in IN_PROGRESS) */}
              {booking.status === 'IN_PROGRESS' && (
                <div className="flex gap-2">
                  <select
                    value={photoPhase}
                    onChange={(e) => setPhotoPhase(e.target.value as 'before' | 'after' | 'during')}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="before">{t('worker:jobDetail.photos.phaseOptions.before')}</option>
                    <option value="during">{t('worker:jobDetail.photos.phaseOptions.during')}</option>
                    <option value="after">{t('worker:jobDetail.photos.phaseOptions.after')}</option>
                  </select>
                  <label className={cn(
                    'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors',
                    uploadingPhoto && 'opacity-50 pointer-events-none',
                  )}>
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {t('worker:jobDetail.photos.addPhoto')}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ─── Right Column (Sidebar) ────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Client */}
          {booking.client && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">{t('worker:jobDetail.client.title')}</h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                  <span className="text-sm font-semibold">
                    {booking.client.fullName
                      .split(' ')
                      .map((w) => w.charAt(0))
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{booking.client.fullName}</p>
                </div>
              </div>
              {booking.client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <a href={`tel:${booking.client.phone}`} className="hover:text-blue-600 transition-colors">
                    {booking.client.phone}
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                {booking.client.phone && (
                  <a
                    href={`tel:${booking.client.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t('worker:jobDetail.client.call')}
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Company */}
          {booking.company && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">{t('worker:jobDetail.company.title')}</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 shrink-0">
                  <Building2 className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">{booking.company.companyName}</p>
              </div>
            </Card>
          )}

          {/* Review */}
          {booking.review && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">{t('worker:jobDetail.review.title')}</h2>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'h-5 w-5',
                      n <= (booking.review?.rating ?? 0)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200',
                    )}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {booking.review.rating}/5
                </span>
              </div>
              {booking.review.comment && (
                <p className="text-sm text-gray-600 italic">&ldquo;{booking.review.comment}&rdquo;</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {formatDate(booking.review.createdAt)}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Action Buttons (full width) ───────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700 text-center mt-6">
          {error}
        </div>
      )}
      <div className="mt-6 space-y-3">
        {booking.status === 'CONFIRMED' && (
          <>
            <Button
              onClick={() => handleAction('start')}
              loading={starting}
              disabled={actionLoading || !canStartJob}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              {t('worker:jobDetail.actions.startCleaning')}
            </Button>
            {!canStartJob && (
              <p className="text-xs text-amber-500 text-center mt-1">
                {t('worker:jobDetail.actions.tooEarlyToStart', { time: startUnlockTime })}
              </p>
            )}
          </>
        )}
        {booking.status === 'IN_PROGRESS' && (
          <>
            <Button
              onClick={() => handleAction('complete')}
              loading={completing}
              disabled={actionLoading || (totalChecklistItems > 0 && checkedCount < totalChecklistItems)}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {t('worker:jobDetail.actions.completeCleaning')}
            </Button>
            {totalChecklistItems > 0 && checkedCount < totalChecklistItems && (
              <p className="text-xs text-gray-400 text-center">
                {t('worker:jobDetail.actions.checkAllTasks')}
              </p>
            )}
          </>
        )}
      </div>

      {/* GPS toast */}
      {gpsToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm">
          <Navigation className="inline h-4 w-4 mr-2" />
          {gpsToast}
        </div>
      )}
    </div>
  );
}
