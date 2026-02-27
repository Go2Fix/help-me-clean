import { useState, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Hash,
  Home,
  Bath,
  Ruler,
  PawPrint,
  FileText,
  MessageCircle,
  CreditCard,
  Star,
  Check,
  Repeat,
  Sparkles,
  CheckCircle,
  XCircle,
  KeyRound,
  Timer,
  CalendarClock,
  AlertTriangle,
  Download,
  Scale,
  Camera,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/ClientBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { CLIENT_BOOKING_DETAIL, CANCEL_BOOKING, OPEN_BOOKING_CHAT, CREATE_BOOKING_PAYMENT_INTENT, REQUEST_REFUND, SUBMIT_REVIEW, UPLOAD_REVIEW_PHOTOS, BOOKING_POLICY, RESCHEDULE_BOOKING, CLIENT_INVOICE_FOR_BOOKING } from '@/graphql/operations';
import RescheduleModal from '@/components/booking/RescheduleModal';
import { StripeElementsWrapper } from '@/context/StripeContext';
import StripePaymentForm from '@/components/payment/StripePaymentForm';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingAddress {
  streetAddress: string;
  city: string;
  county: string;
  floor?: string;
  apartment?: string;
  entryCode?: string;
  notes?: string;
}

interface BookingWorker {
  id: string;
  fullName: string;
  user?: {
    id: string;
    avatarUrl?: string;
  };
}

interface ReviewPhoto {
  id: string;
  photoUrl: string;
  sortOrder: number;
}

interface BookingReview {
  id: string;
  rating: number;
  ratingPunctuality?: number;
  ratingQuality?: number;
  ratingCommunication?: number;
  ratingValue?: number;
  comment?: string;
  status?: string;
  photos?: ReviewPhoto[];
  createdAt: string;
}

interface BookingCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon: string;
}

interface BookingData {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  category?: BookingCategory;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  estimatedTotal: number;
  finalTotal?: number;
  status: string;
  specialInstructions?: string;
  propertyType?: string;
  numRooms: number;
  numBathrooms: number;
  areaSqm?: number;
  hasPets?: boolean;
  paymentStatus?: string;
  paidAt?: string;
  recurringGroupId?: string;
  occurrenceNumber?: number;
  rescheduleCount?: number;
  rescheduledAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  address: BookingAddress;
  worker?: BookingWorker;
  includedItems: string[];
  extras: {
    extra: {
      id: string;
      nameRo: string;
      nameEn: string;
      price: number;
      durationMinutes: number;
      icon?: string;
      allowMultiple: boolean;
      unitLabel?: string;
    };
    price: number;
    quantity: number;
  }[];

  review?: BookingReview;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      weekday: 'long',
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

function formatAddress(address: BookingAddress): string {
  const parts = [address.streetAddress];
  if (address.floor) parts.push(`Etaj ${address.floor}`);
  if (address.apartment) parts.push(`Ap. ${address.apartment}`);
  parts.push(`${address.city}, ${address.county}`);
  return parts.join(', ');
}

const propertyTypeLabel: Record<string, string> = {
  APARTMENT: 'Apartament',
  HOUSE: 'Casa',
  OFFICE: 'Birou',
  STUDIO: 'Garsoniera',
};

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

// ─── Rating Row ─────────────────────────────────────────────────────────────

function RatingRow({ label, icon: Icon, value, onChange }: { label: string; icon: LucideIcon; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`cursor-pointer ${s <= value ? 'text-amber-400' : 'text-gray-300'}`}
          >
            <Star className="h-5 w-5" fill={s <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [ratingPunctuality, setRatingPunctuality] = useState(0);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error, refetch } = useQuery<{ booking: BookingData }>(
    CLIENT_BOOKING_DETAIL,
    {
      variables: { id },
      skip: !id || !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_BOOKING, {
    onCompleted: () => {
      setCancelModalOpen(false);
      setCancelReason('');
    },
    // Mutation returns { id, status } — Apollo auto-updates the normalized booking entity.
    // MY_BOOKINGS self-corrects via cache-and-network on next visit.
  });

  const bookingStatus = data?.booking?.status;
  const { data: invoiceData } = useQuery(CLIENT_INVOICE_FOR_BOOKING, {
    variables: { bookingId: id },
    skip: !id || !isAuthenticated || bookingStatus !== 'COMPLETED',
  });

  const { data: policyData } = useQuery(BOOKING_POLICY);
  const [rescheduleBooking, { loading: rescheduling }] = useMutation(RESCHEDULE_BOOKING, {
    refetchQueries: [{ query: CLIENT_BOOKING_DETAIL, variables: { id } }],
    onCompleted: () => setRescheduleModalOpen(false),
  });

  const [openBookingChat, { loading: openingChat }] = useMutation(OPEN_BOOKING_CHAT, {
    onCompleted: (data) => {
      const chatRoomId = data.openBookingChat.id;
      navigate(`/cont/mesaje/${chatRoomId}`);
    },
  });

  const [createPaymentIntent, { loading: creatingPayment }] = useMutation(CREATE_BOOKING_PAYMENT_INTENT);
  const [requestRefundMutation, { loading: requestingRefund }] = useMutation(REQUEST_REFUND, {
    onCompleted: () => {
      setRefundModalOpen(false);
      setRefundReason('');
    },
    refetchQueries: [{ query: CLIENT_BOOKING_DETAIL, variables: { id } }],
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const [uploadReviewPhotosMutation] = useMutation(UPLOAD_REVIEW_PHOTOS);

  const [submitReview, { loading: submittingReview }] = useMutation(SUBMIT_REVIEW, {
    onCompleted: async (result) => {
      const reviewId = result?.submitReview?.id;
      if (reviewId && reviewPhotos.length > 0) {
        try {
          await uploadReviewPhotosMutation({
            variables: { reviewId, files: reviewPhotos },
          });
        } catch {
          // Photo upload failed but review was created successfully
        }
      }
      setReviewComment('');
      setRatingPunctuality(0);
      setRatingQuality(0);
      setRatingCommunication(0);
      setRatingValue(0);
      setReviewPhotos([]);
    },
    refetchQueries: [{ query: CLIENT_BOOKING_DETAIL, variables: { id } }],
  });

  // Auth guard
  if (authLoading) {
    return <LoadingSpinner text="Se verifica autentificarea..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/autentificare"
        state={{ from: `/cont/comenzi/${id}` }}
        replace
      />
    );
  }

  if (loading) {
    return (
      <div className="py-4 sm:py-8">
        <div className="max-w-4xl mx-auto sm:px-2 animate-pulse">
          {/* Back button skeleton */}
          <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2 sm:text-right">
              <div className="h-8 w-24 bg-gray-200 rounded sm:ml-auto" />
              <div className="h-4 w-20 bg-gray-200 rounded sm:ml-auto" />
            </div>
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-[30px] h-[30px] rounded-full bg-gray-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-28 bg-gray-200 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="h-5 w-20 bg-gray-200 rounded mb-4" />
                <div className="h-10 w-full bg-gray-200 rounded-xl" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.booking) {
    return (
      <div className="py-8 text-center max-w-4xl mx-auto">
        <p className="text-danger mb-4">
          {error
            ? 'Nu am putut incarca detaliile comenzii.'
            : 'Comanda nu a fost gasita.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/cont/comenzi')}>
          <ArrowLeft className="h-4 w-4" />
          Inapoi la comenzi
        </Button>
      </div>
    );
  }

  const booking = data.booking;
  const isCancelled = booking.status.startsWith('CANCELLED');
  const canCancel = booking.status === 'ASSIGNED' || booking.status === 'CONFIRMED';

  // Timeline
  const timelineSteps: { label: string; date: string | null; icon: typeof FileText; done: boolean }[] = [
    { label: 'Comanda plasata', date: booking.createdAt, icon: FileText, done: true },
    { label: 'Platita & Confirmata', date: booking.paidAt ?? null, icon: CheckCircle, done: !!booking.paidAt },
    { label: 'In desfasurare', date: booking.startedAt ?? null, icon: Clock, done: !!booking.startedAt },
    { label: 'Finalizata', date: booking.completedAt ?? null, icon: CheckCircle, done: booking.status === 'COMPLETED' },
  ];
  if (isCancelled) {
    timelineSteps.push({
      label: 'Anulata',
      date: booking.completedAt ?? null,
      icon: XCircle,
      done: true,
    });
  }

  const handleCancel = async () => {
    await cancelBooking({
      variables: {
        id: booking.id,
        reason: cancelReason.trim() || undefined,
      },
    });
  };

  return (
    <div className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto sm:px-2">
        {/* Back button */}
        <button
          onClick={() => navigate('/cont/comenzi')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Inapoi la comenzi</span>
        </button>

        {/* Recurring group banner */}
        {booking.recurringGroupId && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 mb-6 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => navigate(`/cont/recurente/${booking.recurringGroupId}`)}
          >
            <Repeat className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-sm text-blue-800">
              Parte din seria recurenta
              {booking.occurrenceNumber && ` — Programarea #${booking.occurrenceNumber}`}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {booking.serviceName}
              </h1>
              <Badge status={booking.status} />
              {booking.category && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                  {booking.category.icon} {booking.category.nameRo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Hash className="h-4 w-4" />
              <span className="text-sm font-mono">
                {booking.referenceCode}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {booking.finalTotal ?? booking.estimatedTotal} lei
            </div>
            <span className="text-sm text-gray-400">
              {booking.finalTotal ? 'Total final' : 'Total estimat'}
            </span>
          </div>
        </div>

        {/* Key info hero */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Data</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatDate(booking.scheduledDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Ora</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatTime(booking.scheduledStartTime)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Adresa</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatAddress(booking.address)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Progresul comenzii
              </h2>
              <div className="relative">
                {timelineSteps.map((step, idx) => {
                  const IconComp = step.icon;
                  const isLast = idx === timelineSteps.length - 1;
                  const isCancelStep = step.icon === XCircle;
                  return (
                    <div key={idx} className="flex gap-3 relative">
                      {!isLast && (
                        <div
                          className={`absolute left-[15px] top-[30px] w-0.5 h-[calc(100%-14px)] ${
                            step.done ? (isCancelStep ? 'bg-red-200' : 'bg-blue-200') : 'bg-gray-200'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full shrink-0 ${
                          step.done
                            ? isCancelStep
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className={isLast ? 'pb-0' : 'pb-5'}>
                        <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
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

            {/* Schedule & Property */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Detalii programare
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {booking.propertyType && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <Home className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Tip proprietate</div>
                      <div className="text-sm font-medium text-gray-900">
                        {propertyTypeLabel[booking.propertyType] ?? booking.propertyType}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Durata estimata</div>
                    <div className="text-sm font-medium text-gray-900">
                      {booking.estimatedDurationHours} {booking.estimatedDurationHours === 1 ? 'ora' : 'ore'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Home className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Camere</div>
                    <div className="text-sm font-medium text-gray-900">
                      {booking.numRooms}{' '}
                      {booking.numRooms === 1 ? 'camera' : 'camere'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Bath className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Bai</div>
                    <div className="text-sm font-medium text-gray-900">
                      {booking.numBathrooms}{' '}
                      {booking.numBathrooms === 1 ? 'baie' : 'bai'}
                    </div>
                  </div>
                </div>
                {booking.areaSqm && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Ruler className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Suprafata</div>
                      <div className="text-sm font-medium text-gray-900">
                        {booking.areaSqm} mp
                      </div>
                    </div>
                  </div>
                )}
                {booking.hasPets && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <PawPrint className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Animale</div>
                      <div className="text-sm font-medium text-gray-900">
                        Da, exista animale de companie
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Included service items */}
            {booking.includedItems && booking.includedItems.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ce include serviciul
                </h2>
                <ul className="space-y-2.5">
                  {booking.includedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Extras */}
            {booking.extras && booking.extras.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Servicii suplimentare
                </h2>
                <div className="space-y-3">
                  {booking.extras.map((be, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {be.extra.icon ? (
                            <span className="text-lg">{be.extra.icon}</span>
                          ) : (
                            <Sparkles className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {be.extra.nameRo}
                          </div>
                          {be.quantity > 1 && (
                            <div className="text-xs text-gray-500">x{be.quantity}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {be.price * be.quantity} lei
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Address details (entry code & notes) */}
            {(booking.address.entryCode || booking.address.notes) && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Detalii acces
                </h2>
                <div className="space-y-4">
                  {booking.address.entryCode && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <KeyRound className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Cod acces</div>
                        <div className="text-sm font-mono font-semibold text-gray-900">
                          {booking.address.entryCode}
                        </div>
                      </div>
                    </div>
                  )}
                  {booking.address.notes && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Note adresa</div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                          {booking.address.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Special Instructions */}
            {booking.specialInstructions && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Instructiuni speciale
                </h2>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {booking.specialInstructions}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Worker info */}
            {booking.worker && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Lucratorul tau
                </h2>
                <div className="flex flex-col items-center gap-3">
                  {booking.worker.user?.avatarUrl ? (
                    <img
                      src={booking.worker.user.avatarUrl}
                      alt={booking.worker.fullName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-primary">
                        {booking.worker.fullName
                          .split(' ')
                          .map((w) => w.charAt(0))
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-base font-semibold text-gray-900">
                    {booking.worker.fullName}
                  </div>
                  {!isCancelled && booking.status !== 'COMPLETED' && (
                    <Button
                      className="w-full"
                      loading={openingChat}
                      onClick={() =>
                        openBookingChat({ variables: { bookingId: booking.id } })
                      }
                    >
                      <MessageCircle className="h-4 w-4" />
                      Deschide chat
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Chat (when no worker assigned) */}
            {!booking.worker && !isCancelled && booking.status !== 'COMPLETED' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Chat
                </h2>
                <Button
                  className="w-full"
                  loading={openingChat}
                  onClick={() =>
                    openBookingChat({ variables: { bookingId: booking.id } })
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  Deschide chat
                </Button>
              </Card>
            )}

            {/* Payment — show for any unpaid booking with company, or any paid booking */}
            {booking.paymentStatus === 'paid' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Plata
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {booking.finalTotal ?? booking.estimatedTotal} RON
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Platit
                    </span>
                  </div>
                  {booking.paidAt && (
                    <p className="text-xs text-gray-500">
                      Platit pe {formatDate(booking.paidAt)}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {booking.paymentStatus !== 'paid' && !booking.status.startsWith('CANCELLED') && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Plata
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {booking.finalTotal ?? booking.estimatedTotal} RON
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      In asteptare
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    loading={creatingPayment}
                    onClick={async () => {
                      try {
                        const { data: piData } = await createPaymentIntent({
                          variables: { bookingId: booking.id },
                        });
                        const pi = piData.createBookingPaymentIntent;
                        setPaymentClientSecret(pi.clientSecret);
                        setPaymentAmount(pi.amount);
                        setPaymentError(null);
                        setShowPaymentModal(true);
                      } catch {
                        setPaymentError('Nu am putut initia plata. Incearca din nou.');
                      }
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Plateste acum
                  </Button>
                  {paymentError && (
                    <div className="text-danger text-sm bg-red-50 px-4 py-3 rounded-xl">
                      {paymentError}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Invoice */}
            {invoiceData?.clientInvoiceForBooking && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Factura
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {invoiceData.clientInvoiceForBooking.invoiceNumber ?? 'Draft'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {invoiceData.clientInvoiceForBooking.sellerCompanyName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {(invoiceData.clientInvoiceForBooking.totalAmount / 100).toFixed(2)} lei
                      </div>
                      {invoiceData.clientInvoiceForBooking.issuedAt && (
                        <div className="text-xs text-gray-400">
                          {formatDate(invoiceData.clientInvoiceForBooking.issuedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/cont/facturi/${invoiceData.clientInvoiceForBooking.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                      Vezi factura
                    </Button>
                    {invoiceData.clientInvoiceForBooking.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoiceData.clientInvoiceForBooking.downloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Review */}
            {booking.status === 'COMPLETED' && booking.paymentStatus === 'paid' && (
              <Card>
                {booking.review ? (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Recenzia ta
                    </h2>
                    <div className="space-y-3">
                      {/* Overall rating */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= booking.review!.rating
                                ? 'text-accent fill-accent'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Category breakdowns */}
                      {(booking.review.ratingPunctuality || booking.review.ratingQuality || booking.review.ratingCommunication || booking.review.ratingValue) && (
                        <div className="space-y-2 pt-2">
                          {([
                            { label: 'Punctualitate', icon: Clock, value: booking.review!.ratingPunctuality },
                            { label: 'Calitate', icon: Sparkles, value: booking.review!.ratingQuality },
                            { label: 'Comunicare', icon: MessageCircle, value: booking.review!.ratingCommunication },
                            { label: 'Raport calitate-pret', icon: Scale, value: booking.review!.ratingValue },
                          ] as { label: string; icon: LucideIcon; value: number | undefined }[]).map((cat) => cat.value ? (
                            <div key={cat.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <cat.icon className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-xs text-gray-600">{cat.label}</span>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`h-3.5 w-3.5 ${s <= cat.value! ? 'text-accent fill-accent' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                          ) : null)}
                        </div>
                      )}
                      {booking.review.comment && (
                        <p className="text-sm text-gray-700">
                          {booking.review.comment}
                        </p>
                      )}
                      {/* Review photos */}
                      {booking.review.photos && booking.review.photos.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {booking.review.photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.photoUrl}
                              alt="Poza recenzie"
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Trimisa pe {formatDate(booking.review.createdAt)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Lasa o recenzie
                    </h2>
                    <div className="space-y-4">
                      {/* Category ratings */}
                      <div className="space-y-3">
                        <RatingRow label="Punctualitate" icon={Clock} value={ratingPunctuality} onChange={setRatingPunctuality} />
                        <RatingRow label="Calitate" icon={Sparkles} value={ratingQuality} onChange={setRatingQuality} />
                        <RatingRow label="Comunicare" icon={MessageCircle} value={ratingCommunication} onChange={setRatingCommunication} />
                        <RatingRow label="Raport calitate-pret" icon={Scale} value={ratingValue} onChange={setRatingValue} />
                      </div>

                      {/* Auto-calculated overall display */}
                      {(ratingPunctuality > 0 || ratingQuality > 0 || ratingCommunication > 0 || ratingValue > 0) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                          <span className="text-sm font-medium text-gray-700">Nota generala:</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-accent fill-accent" />
                            <span className="text-sm font-bold text-gray-900">
                              {(() => {
                                const filled = [ratingPunctuality, ratingQuality, ratingCommunication, ratingValue].filter(v => v > 0);
                                return filled.length > 0 ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;
                              })()}
                            </span>
                            <span className="text-xs text-gray-400">/ 5</span>
                          </div>
                        </div>
                      )}

                      <textarea
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        rows={3}
                        placeholder="Cum a fost experienta? (optional)"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />

                      {/* Photo upload */}
                      <div>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setReviewPhotos((prev) => [...prev, ...files].slice(0, 3));
                            e.target.value = '';
                          }}
                        />
                        {reviewPhotos.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {reviewPhotos.map((file, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Poza ${idx + 1}`}
                                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                                />
                                <button
                                  type="button"
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-800 text-white flex items-center justify-center cursor-pointer hover:bg-gray-700"
                                  onClick={() => setReviewPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {reviewPhotos.length < 3 && (
                          <button
                            type="button"
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                            onClick={() => photoInputRef.current?.click()}
                          >
                            <Camera className="h-4 w-4" />
                            Adauga poze ({reviewPhotos.length}/3)
                          </button>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        disabled={ratingPunctuality === 0 && ratingQuality === 0 && ratingCommunication === 0 && ratingValue === 0}
                        loading={submittingReview}
                        onClick={() => {
                          const filled = [ratingPunctuality, ratingQuality, ratingCommunication, ratingValue].filter(v => v > 0);
                          const overall = filled.length > 0 ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;
                          submitReview({
                            variables: {
                              input: {
                                bookingId: booking.id,
                                rating: overall,
                                ratingPunctuality: ratingPunctuality || undefined,
                                ratingQuality: ratingQuality || undefined,
                                ratingCommunication: ratingCommunication || undefined,
                                ratingValue: ratingValue || undefined,
                                comment: reviewComment.trim() || undefined,
                              },
                            },
                          });
                        }}
                      >
                        <Star className="h-4 w-4" />
                        Trimite recenzia
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Refund Request (for cancelled bookings that were paid) */}
            {isCancelled && booking.paymentStatus === 'paid' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Rambursare
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Comanda a fost anulata. Poti solicita o rambursare.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setRefundModalOpen(true)}
                >
                  Solicita rambursare
                </Button>
              </Card>
            )}

            {/* Actions */}
            {canCancel && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Actiuni
                </h2>
                <div className="space-y-2">
                  {(() => {
                    const maxReschedules = policyData?.bookingPolicy?.rescheduleMaxPerBooking ?? 2;
                    const currentCount = booking.rescheduleCount ?? 0;
                    const limitReached = currentCount >= maxReschedules;
                    return (
                      <div>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={limitReached}
                          onClick={() => setRescheduleModalOpen(true)}
                        >
                          <CalendarClock className="h-4 w-4" />
                          Reprogrameaza
                        </Button>
                        {limitReached && (
                          <p className="text-xs text-gray-400 mt-1.5 text-center">
                            Ai atins limita de {maxReschedules} reprogramari
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => setCancelModalOpen(true)}
                  >
                    Anuleaza comanda
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Cancel Modal */}
        <Modal
          open={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Anuleaza comanda"
        >
          {(() => {
            const policy = policyData?.bookingPolicy;
            if (!policy) return null;
            const [h, m] = (booking.scheduledStartTime || '08:00').split(':').map(Number);
            const start = new Date(`${booking.scheduledDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
            const hoursUntil = (start.getTime() - Date.now()) / 3_600_000;
            let msg: string;
            if (hoursUntil >= policy.cancelFreeHoursBefore) {
              msg = 'Vei primi o rambursare completa (100%).';
            } else if (hoursUntil >= 24) {
              msg = `Vei primi o rambursare partiala (${policy.cancelLateRefundPct}%).`;
            } else {
              msg = 'Nu se acorda rambursare pentru anulari cu mai putin de 24 de ore inainte.';
            }
            return (
              <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-100">
                <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{msg}</p>
              </div>
            );
          })()}
          <p className="text-sm text-gray-500 mb-4">
            Esti sigur ca vrei sa anulezi aceasta comanda? Aceasta actiune nu
            poate fi anulata.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motiv anulare (optional)
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              rows={3}
              placeholder="Spune-ne de ce anulezi..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setCancelModalOpen(false)}
            >
              Renunta
            </Button>
            <Button
              variant="danger"
              loading={cancelling}
              onClick={handleCancel}
            >
              Confirma anularea
            </Button>
          </div>
        </Modal>

        {/* Reschedule Modal */}
        <RescheduleModal
          open={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          loading={rescheduling}
          bookingId={booking.id}
          hasWorker={!!booking.worker}
          onConfirm={async (date, time, reason) => {
            await rescheduleBooking({
              variables: { id: booking.id, scheduledDate: date, scheduledStartTime: time, reason },
            });
          }}
          rescheduleFreeHoursBefore={policyData?.bookingPolicy?.rescheduleFreeHoursBefore ?? 24}
          rescheduleMaxPerBooking={policyData?.bookingPolicy?.rescheduleMaxPerBooking ?? 2}
          currentRescheduleCount={booking.rescheduleCount ?? 0}
          scheduledDate={booking.scheduledDate}
          scheduledStartTime={booking.scheduledStartTime}
        />

        {/* Stripe Payment Modal */}
        <Modal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Plateste comanda"
        >
          {paymentClientSecret ? (
            <StripeElementsWrapper clientSecret={paymentClientSecret}>
              <StripePaymentForm
                amount={paymentAmount}
                onSuccess={() => {
                  setShowPaymentModal(false);
                  setPaymentClientSecret(null);
                  refetch();
                }}
                onError={(msg) => setPaymentError(msg)}
              />
            </StripeElementsWrapper>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          {paymentError && (
            <div className="mt-4 text-danger text-sm bg-red-50 px-4 py-3 rounded-xl">
              {paymentError}
            </div>
          )}
        </Modal>

        {/* Refund Request Modal */}
        <Modal
          open={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title="Solicita rambursare"
        >
          <p className="text-sm text-gray-500 mb-4">
            Descrie motivul pentru care doresti o rambursare. Cererea va fi analizata de echipa noastra.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motivul rambursarii
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              rows={3}
              placeholder="Explica motivul..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setRefundModalOpen(false)}
            >
              Renunta
            </Button>
            <Button
              loading={requestingRefund}
              disabled={!refundReason.trim()}
              onClick={() =>
                requestRefundMutation({
                  variables: {
                    bookingId: booking.id,
                    reason: refundReason.trim(),
                  },
                })
              }
            >
              Trimite cererea
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
