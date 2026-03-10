import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
  Home,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  Star,
  Search,
  Check,
  Repeat,
  CalendarClock,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import RescheduleModal from '@/components/booking/RescheduleModal';
import { ADMIN_BOOKING_DETAIL, ADMIN_CANCEL_BOOKING, ADMIN_RESCHEDULE_BOOKING, ALL_BOOKINGS, ALL_WORKERS, ASSIGN_WORKER, MARK_BOOKING_PAID } from '@/graphql/operations';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

interface WorkerOption {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  ratingAvg: number;
  totalJobsCompleted: number;
  company: { id: string; companyName: string } | null;
}

export default function BookingDetailPage() {
  const { t } = useTranslation(['dashboard', 'admin']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');

  const { data, loading } = useQuery(ADMIN_BOOKING_DETAIL, { variables: { id } });
  const [adminCancel, { loading: cancelling }] = useMutation(ADMIN_CANCEL_BOOKING, {
    refetchQueries: [
      { query: ADMIN_BOOKING_DETAIL, variables: { id } },
      { query: ALL_BOOKINGS, variables: { first: 50 } },
    ],
  });

  const { data: workersData, loading: loadingWorkers } = useQuery(ALL_WORKERS, {
    skip: !assignModal,
  });

  const [assignWorker, { loading: assigning }] = useMutation(ASSIGN_WORKER, {
    refetchQueries: [
      { query: ADMIN_BOOKING_DETAIL, variables: { id } },
      { query: ALL_BOOKINGS, variables: { first: 50 } },
    ],
  });

  const [adminRescheduleBooking, { loading: rescheduling }] = useMutation(ADMIN_RESCHEDULE_BOOKING, {
    refetchQueries: [{ query: ADMIN_BOOKING_DETAIL, variables: { id } }],
    onCompleted: () => setRescheduleModal(false),
  });

  const [markPaid, { loading: markingPaid }] = useMutation(MARK_BOOKING_PAID, {
    refetchQueries: [
      { query: ADMIN_BOOKING_DETAIL, variables: { id } },
      { query: ALL_BOOKINGS, variables: { first: 50 } },
    ],
  });

  const booking = data?.booking;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">{t('admin:bookingDetail.notFound')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/comenzi')}>
          {t('admin:bookingDetail.backToBookings')}
        </Button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await adminCancel({ variables: { id, reason: cancelReason.trim() } });
    setCancelModal(false);
    setCancelReason('');
  };

  const handleAssign = async (workerId: string) => {
    await assignWorker({ variables: { bookingId: id, workerId } });
    setAssignModal(false);
    setWorkerSearch('');
  };

  const handleMarkPaid = async () => {
    await markPaid({ variables: { id } });
  };

  const isCancelled = booking.status.startsWith('CANCELLED');
  const canCancel = !['COMPLETED'].includes(booking.status) && !isCancelled;
  const canAssign = booking.status === 'ASSIGNED' && !booking.worker;
  const isPaid = booking.paymentStatus?.toUpperCase() === 'PAID';

  // Filter workers by search
  const allWorkers: WorkerOption[] = workersData?.allWorkers ?? [];
  const filteredWorkers = workerSearch.trim()
    ? allWorkers.filter((c) =>
        c.fullName.toLowerCase().includes(workerSearch.toLowerCase()) ||
        c.company?.companyName?.toLowerCase().includes(workerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(workerSearch.toLowerCase())
      )
    : allWorkers;

  // Build status timeline
  const timelineSteps = [
    {
      label: t('admin:bookingDetail.timeline.created'),
      date: booking.createdAt,
      icon: FileText,
      done: true,
    },
    {
      label: t('admin:bookingDetail.timeline.paidConfirmed'),
      date: booking.paidAt ?? null,
      icon: CheckCircle,
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: t('admin:bookingDetail.timeline.inProgress'),
      date: booking.startedAt,
      icon: Clock,
      done: ['IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: t('admin:bookingDetail.timeline.completed'),
      date: booking.completedAt,
      icon: CheckCircle,
      done: booking.status === 'COMPLETED',
    },
  ];

  if (isCancelled) {
    timelineSteps.push({
      label: t(`admin:bookings.statusLabels.${booking.status}`, { defaultValue: t('admin:bookingDetail.timeline.completed') }),
      date: booking.cancelledAt,
      icon: XCircle,
      done: true,
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/comenzi')}
          className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{booking.referenceCode}</h1>
            <Badge variant={statusVariant[booking.status] ?? 'default'}>
              {t(`admin:bookings.statusLabels.${booking.status}`, { defaultValue: booking.status })}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-gray-500">{booking.serviceName}</p>
            {booking.category && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {booking.category.icon} {booking.category.nameRo}
              </span>
            )}
          </div>
        </div>
        {canCancel && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setRescheduleModal(true)}>
              <CalendarClock className="h-4 w-4" />
              {t('admin:bookingDetail.reschedule')}
            </Button>
            <Button variant="danger" onClick={() => setCancelModal(true)}>
              {t('admin:bookingDetail.cancelBooking')}
            </Button>
          </div>
        )}
      </div>

      {booking.recurringGroupId && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <Repeat className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('admin:bookingDetail.recurringBadge')}
                {booking.occurrenceNumber && (
                  ` — ${t('admin:bookingDetail.recurringSession', { number: booking.occurrenceNumber })}`
                )}
              </p>
              <p className="text-xs text-gray-500">
                {t('admin:bookingDetail.recurringDescription')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('admin:bookingDetail.sections.bookingDetails')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('admin:bookingDetail.fields.scheduledDate')}</p>
                  <p className="text-sm text-gray-900">{formatDate(booking.scheduledDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('admin:bookingDetail.fields.timeAndDuration')}</p>
                  <p className="text-sm text-gray-900">
                    {booking.scheduledStartTime} &middot; {booking.estimatedDurationHours}h
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('admin:bookingDetail.fields.property')}</p>
                  <p className="text-sm text-gray-900">
                    {booking.propertyType ?? '--'} &middot; {booking.numRooms ?? 0} {t('admin:bookingDetail.fields.rooms')} &middot; {booking.numBathrooms ?? 0} {t('admin:bookingDetail.fields.bathrooms')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('admin:bookingDetail.fields.areaPets')}</p>
                  <p className="text-sm text-gray-900">
                    {booking.areaSqm ?? '--'} {t('admin:bookingDetail.fields.sqm')} &middot; {booking.hasPets ? t('admin:bookingDetail.fields.hasPets') : t('admin:bookingDetail.fields.noPets')}
                  </p>
                </div>
              </div>
            </div>
            {booking.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-1">{t('admin:bookingDetail.fields.specialInstructions')}</p>
                <p className="text-sm text-gray-600">{booking.specialInstructions}</p>
              </div>
            )}
          </Card>

          {/* Address */}
          {booking.address && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin:bookingDetail.sections.address')}
              </h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">{booking.address.streetAddress}</p>
                  <p className="text-sm text-gray-500">
                    {booking.address.city}, {booking.address.county} {booking.address.postalCode}
                  </p>
                  {(booking.address.floor || booking.address.apartment) && (
                    <p className="text-sm text-gray-500">
                      {booking.address.floor && `${t('admin:bookingDetail.fields.floor')} ${booking.address.floor}`}
                      {booking.address.floor && booking.address.apartment && ' / '}
                      {booking.address.apartment && `${t('admin:bookingDetail.fields.apartment')} ${booking.address.apartment}`}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Time Slots */}
          {booking.timeSlots && booking.timeSlots.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin:bookingDetail.sections.timeSlots')}
              </h3>
              <div className="space-y-3">
                {booking.timeSlots.map((slot: { id: string; slotDate: string; startTime: string; endTime: string; isSelected: boolean }) => (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      slot.isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Calendar className={`h-4 w-4 mt-0.5 shrink-0 ${slot.isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {formatDate(slot.slotDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                      </p>
                    </div>
                    {slot.isSelected ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3 mr-1" />
                        {t('admin:bookingDetail.slots.selected')}
                      </Badge>
                    ) : (
                      <Badge variant="default">{t('admin:bookingDetail.slots.proposed')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pricing */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('admin:bookingDetail.sections.pricing')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('admin:bookingDetail.pricing.hourlyRate')}</span>
                <span className="text-gray-900">{booking.hourlyRate ? formatCurrency(booking.hourlyRate) : '--'}/h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('admin:bookingDetail.pricing.estimatedTotal')}</span>
                <span className="text-gray-900">{formatCurrency(booking.estimatedTotal)}</span>
              </div>
              {booking.finalTotal != null && (
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">{t('admin:bookingDetail.pricing.finalTotal')}</span>
                  <span className="text-gray-900">{formatCurrency(booking.finalTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                <span className="text-gray-500">{t('admin:bookingDetail.pricing.platformCommission')}</span>
                <span className="text-gray-900">{booking.platformCommissionPct ?? '--'}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('admin:bookingDetail.pricing.paymentStatus')}</span>
                <Badge variant={isPaid ? 'success' : 'warning'}>
                  {booking.paymentStatus}
                </Badge>
              </div>
              {!isPaid && !isCancelled && (
                <div className="pt-3 border-t border-gray-200">
                  <Button
                    size="sm"
                    onClick={handleMarkPaid}
                    loading={markingPaid}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('admin:bookingDetail.pricing.markAsPaid')}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('admin:bookingDetail.sections.timeline')}
            </h3>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${step.done ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <StepIcon className={`h-4 w-4 ${step.done ? 'text-primary' : 'text-gray-300'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-gray-400">{formatDateTime(step.date)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {booking.cancellationReason && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-danger">
                    {t('admin:bookingDetail.timeline.cancellationReason')}
                  </p>
                  <p className="text-sm text-gray-600">{booking.cancellationReason}</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Client */}
          {booking.client && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t('admin:bookingDetail.sections.client')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Link
                    to={`/admin/utilizatori/${booking.client.id}`}
                    className="font-medium text-gray-900 hover:text-primary transition-colors"
                  >
                    {booking.client.fullName}
                  </Link>
                  <p className="text-sm text-gray-500">{booking.client.email}</p>
                  {booking.client.phone && (
                    <p className="text-sm text-gray-500">{booking.client.phone}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Company */}
          {booking.company && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t('admin:bookingDetail.sections.company')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-secondary/10">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <Link
                    to={`/admin/companii/${booking.company.id}`}
                    className="font-medium text-gray-900 hover:text-secondary transition-colors"
                  >
                    {booking.company.companyName}
                  </Link>
                  <p className="text-sm text-gray-500">{booking.company.contactEmail}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Worker */}
          {booking.worker && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t('admin:bookingDetail.sections.worker')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <User className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.worker.fullName}</p>
                  {booking.worker.phone && (
                    <p className="text-sm text-gray-500">{booking.worker.phone}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {!booking.worker && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t('admin:bookingDetail.sections.worker')}
              </h3>
              <p className="text-sm text-gray-400 mb-3">{t('admin:bookingDetail.worker.noWorker')}</p>
              {canAssign && (
                <Button onClick={() => setAssignModal(true)} className="w-full">
                  <UserPlus className="h-4 w-4" />
                  {t('admin:bookingDetail.worker.assignWorker')}
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        open={cancelModal}
        onClose={() => { setCancelModal(false); setCancelReason(''); }}
        title={t('admin:bookingDetail.cancelModal.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('admin:bookingDetail.cancelModal.confirmText')}{' '}
            <strong>{booking.referenceCode}</strong>?
          </p>
          <Input
            label={t('admin:bookingDetail.cancelModal.reasonLabel')}
            placeholder={t('admin:bookingDetail.cancelModal.reasonPlaceholder')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => { setCancelModal(false); setCancelReason(''); }}
            >
              {t('admin:bookingDetail.cancelModal.back')}
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelling}
              disabled={!cancelReason.trim()}
            >
              {t('admin:bookingDetail.cancelModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Worker Modal */}
      <Modal
        open={assignModal}
        onClose={() => { setAssignModal(false); setWorkerSearch(''); }}
        title={t('admin:bookingDetail.assignModal.title')}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin:bookingDetail.assignModal.searchPlaceholder')}
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {loadingWorkers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredWorkers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {t('admin:bookingDetail.assignModal.noWorker')}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {worker.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{worker.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {worker.company?.companyName ?? t('admin:bookingDetail.assignModal.noCompany')}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Star className="h-3 w-3 text-accent" />
                          {worker.ratingAvg > 0 ? worker.ratingAvg.toFixed(1) : '--'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {worker.totalJobsCompleted} {t('admin:bookingDetail.worker.jobs')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(worker.id)}
                    loading={assigning}
                    className="shrink-0 ml-3"
                  >
                    {t('admin:bookingDetail.assignModal.select')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleModal}
        onClose={() => setRescheduleModal(false)}
        loading={rescheduling}
        bookingId={booking.id}
        hasWorker={!!booking.worker}
        onConfirm={async (date, time, reason) => {
          await adminRescheduleBooking({
            variables: { id: booking.id, scheduledDate: date, scheduledStartTime: time, reason },
          });
        }}
        rescheduleFreeHoursBefore={24}
        rescheduleMaxPerBooking={99}
        currentRescheduleCount={booking.rescheduleCount ?? 0}
        scheduledDate={booking.scheduledDate}
        scheduledStartTime={booking.scheduledStartTime}
        isAdmin
      />
    </div>
  );
}
