import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft, MapPin, Phone, Mail, Clock, Calendar, Search, Loader2,
  Star, Check, Repeat, FileText, CheckCircle, XCircle, AlertCircle, Home,
  UserPlus, Download, ExternalLink, MessageSquare, Receipt, CreditCard,
  ChevronDown, Eye,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  COMPANY_BOOKING_DETAIL,
  COMPANY_BOOKINGS,
  MY_CLEANERS,
  ASSIGN_CLEANER,
  CANCEL_BOOKING,
  SUGGEST_CLEANERS,
  ACTIVE_CITIES,
  SELECT_BOOKING_TIME_SLOT,
  COMPANY_INVOICE_FOR_BOOKING,
  BOOKING_PAYMENT_DETAILS,
  GENERATE_BOOKING_INVOICE,
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ASSIGNED: 'info',
  CONFIRMED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_COMPANY: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
};

const statusLabel: Record<string, string> = {
  ASSIGNED: 'Asignat',
  CONFIRMED: 'Confirmata',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizata',
  CANCELLED: 'Anulata',
  CANCELLED_BY_CLIENT: 'Anulat de client',
  CANCELLED_BY_COMPANY: 'Anulat de companie',
  CANCELLED_BY_ADMIN: 'Anulat de admin',
};

const paymentStatusLabel: Record<string, string> = {
  PAID: 'Platita',
  paid: 'Platita',
  PENDING: 'In asteptare',
  pending: 'In asteptare',
  FAILED: 'Esuata',
  failed: 'Esuata',
  REFUNDED: 'Rambursata',
  refunded: 'Rambursata',
  SUCCEEDED: 'Reusita',
  succeeded: 'Reusita',
};

const paymentBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAID: 'success',
  paid: 'success',
  PENDING: 'warning',
  pending: 'warning',
  FAILED: 'danger',
  failed: 'danger',
  REFUNDED: 'info',
  refunded: 'info',
  SUCCEEDED: 'success',
  succeeded: 'success',
};

const invoiceStatusLabel: Record<string, string> = {
  DRAFT: 'Ciorna',
  ISSUED: 'Emisa',
  CANCELLED: 'Anulata',
  PAID: 'Platita',
};

const invoiceBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  ISSUED: 'info',
  CANCELLED: 'danger',
  PAID: 'success',
};

const propertyTypeLabel: Record<string, string> = {
  APARTMENT: 'Apartament',
  HOUSE: 'Casa',
  OFFICE: 'Birou',
  STUDIO: 'Garsoniera',
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 'md',
  color = 'blue',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md';
  color?: 'blue' | 'emerald' | 'primary';
}) {
  const [imgError, setImgError] = useState(false);
  const onError = useCallback(() => setImgError(true), []);

  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    primary: 'bg-primary/10 text-primary',
  };

  const initials = name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={onError}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 ${colorMap[color]}`}>
      <span className={`${textSize} font-semibold`}>{initials}</span>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CleanerOption {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: string;
  ratingAvg: number;
  totalJobsCompleted: number;
}

interface SuggestedCleaner {
  cleaner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    ratingAvg: number;
    totalJobsCompleted: number;
  };
  company: {
    id: string;
    companyName: string;
  };
  availabilityStatus: string;
  matchScore: number;
}

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

interface EnabledCity {
  id: string;
  name: string;
  county: string;
  isActive: boolean;
  areas: CityArea[];
}

interface TimelineStep {
  label: string;
  date: string | null;
  icon: typeof FileText;
  done: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Modal state
  const [assignModal, setAssignModal] = useState(false);
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [invoiceExpanded, setInvoiceExpanded] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data, loading } = useQuery(COMPANY_BOOKING_DETAIL, {
    variables: { id },
    skip: !id,
  });

  const booking = data?.booking;

  const { data: invoiceData, loading: loadingInvoice } = useQuery(COMPANY_INVOICE_FOR_BOOKING, {
    variables: { bookingId: id },
    skip: !id,
  });

  const isPaid = booking?.paymentStatus?.toUpperCase() === 'PAID';

  const { data: paymentData, loading: loadingPayment } = useQuery(BOOKING_PAYMENT_DETAILS, {
    variables: { bookingId: id },
    skip: !id || !isPaid,
  });

  const { data: cleanersData, loading: loadingCleaners } = useQuery(MY_CLEANERS, {
    skip: !assignModal,
  });

  const { data: citiesData } = useQuery(ACTIVE_CITIES, {
    skip: !assignModal,
  });

  // Resolve cityId and areaId from the booking address
  const resolvedLocation = (() => {
    if (!booking?.address?.city || !citiesData?.activeCities) return null;
    const bookingCity = booking.address.city.toLowerCase().trim();
    const matchedCity = (citiesData.activeCities as EnabledCity[]).find(
      (c) => c.name.toLowerCase().trim() === bookingCity,
    );
    if (!matchedCity) return null;
    const firstArea = matchedCity.areas?.[0];
    if (!firstArea) return null;
    return { cityId: matchedCity.id, areaId: firstArea.id };
  })();

  // Build timeSlots for SUGGEST_CLEANERS query
  const suggestTimeSlots = (() => {
    if (!booking?.scheduledDate || !booking?.scheduledStartTime) return [];
    const durationHours = booking.estimatedDurationHours ?? 2;
    const [h, m] = booking.scheduledStartTime.split(':').map(Number);
    const endH = h + Math.floor(durationHours);
    const endM = m + Math.round((durationHours % 1) * 60);
    const endTime = `${String(endH + Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    return [{ date: booking.scheduledDate, startTime: booking.scheduledStartTime, endTime }];
  })();

  const { data: suggestionsData, loading: loadingSuggestions } = useQuery(SUGGEST_CLEANERS, {
    variables: {
      cityId: resolvedLocation?.cityId ?? '',
      areaId: resolvedLocation?.areaId ?? '',
      timeSlots: suggestTimeSlots,
      estimatedDurationHours: booking?.estimatedDurationHours ?? 2,
    },
    skip: !assignModal || !resolvedLocation || suggestTimeSlots.length === 0,
  });

  const suggestedCleaners: SuggestedCleaner[] = suggestionsData?.suggestCleaners ?? [];

  // ─── Mutations ───────────────────────────────────────────────────────────

  const [assignCleaner, { loading: assigning }] = useMutation(ASSIGN_CLEANER, {
    refetchQueries: [{ query: COMPANY_BOOKING_DETAIL, variables: { id } }],
  });

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_BOOKING, {
    refetchQueries: [
      { query: COMPANY_BOOKING_DETAIL, variables: { id } },
      { query: COMPANY_BOOKINGS },
    ],
  });

  const [selectTimeSlot, { loading: selectingSlot }] = useMutation(SELECT_BOOKING_TIME_SLOT, {
    refetchQueries: [{ query: COMPANY_BOOKING_DETAIL, variables: { id } }],
  });

  const [generateInvoice, { loading: generatingInvoice }] = useMutation(GENERATE_BOOKING_INVOICE, {
    refetchQueries: [{ query: COMPANY_INVOICE_FOR_BOOKING, variables: { bookingId: id } }],
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAssign = async (cleanerId: string) => {
    await assignCleaner({ variables: { bookingId: id, cleanerId } });
    setAssignModal(false);
    setCleanerSearch('');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelBooking({ variables: { id, reason: cancelReason.trim() } });
    setCancelModal(false);
    setCancelReason('');
  };

  const handleGenerateInvoice = async () => {
    await generateInvoice({ variables: { bookingId: id } });
  };

  // Filter cleaners by search
  const allCleaners: CleanerOption[] = cleanersData?.myCleaners ?? [];
  const filteredCleaners = cleanerSearch.trim()
    ? allCleaners.filter((c) =>
        c.fullName.toLowerCase().includes(cleanerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(cleanerSearch.toLowerCase()),
      )
    : allCleaners;

  const suggestedCleanerIds = new Set(suggestedCleaners.map((s) => s.cleaner.id));

  // ─── Derived data ────────────────────────────────────────────────────────

  const invoice = invoiceData?.companyInvoiceForBooking;
  const payment = paymentData?.bookingPaymentDetails;

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <button
          onClick={() => navigate('/firma/comenzi')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la comenzi
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

  // ─── Not found ───────────────────────────────────────────────────────────

  if (!booking) {
    return (
      <div>
        <button
          onClick={() => navigate('/firma/comenzi')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la comenzi
        </button>
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Comanda nu a fost gasita</h3>
            <p className="text-gray-500">Aceasta comanda nu exista sau nu ai acces.</p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Computed values ─────────────────────────────────────────────────────

  const isCancelled = booking.status.startsWith('CANCELLED');
  const canCancel = !['COMPLETED'].includes(booking.status) && !isCancelled;
  const totalForCalc = booking.finalTotal || booking.estimatedTotal || 0;
  const commissionPct = booking.platformCommissionPct || 0;
  const commissionAmount = totalForCalc * (commissionPct / 100);
  const netEarnings = totalForCalc - commissionAmount;

  // Timeline
  const timelineSteps: TimelineStep[] = [
    { label: 'Creata', date: booking.createdAt, icon: FileText, done: true },
    {
      label: 'Platita & Confirmata',
      date: booking.paidAt,
      icon: CheckCircle,
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: 'In desfasurare',
      date: booking.startedAt,
      icon: Clock,
      done: ['IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: 'Finalizata',
      date: booking.completedAt,
      icon: CheckCircle,
      done: booking.status === 'COMPLETED',
    },
  ];
  if (isCancelled) {
    timelineSteps.push({
      label: statusLabel[booking.status] || 'Anulata',
      date: booking.cancelledAt,
      icon: XCircle,
      done: true,
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate('/firma/comenzi')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi la comenzi
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Comanda #{booking.referenceCode}
            </h1>
            <Badge variant={statusBadgeVariant[booking.status] || 'default'}>
              {statusLabel[booking.status] || booking.status}
            </Badge>
            {booking.recurringGroupId && (
              <Badge variant="info">
                <Repeat className="h-3 w-3 mr-1" />
                Recurenta{booking.occurrenceNumber ? ` #${booking.occurrenceNumber}` : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {booking.serviceName} &middot; Creata pe {formatDateTime(booking.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/firma/mesaje">
            <Button variant="ghost" size="sm">
              <MessageSquare className="h-4 w-4" />
              Mesaje
            </Button>
          </Link>
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setCancelModal(true)}>
              Anuleaza
            </Button>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Status Timeline */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Progresul comenzii</h2>
            <div className="relative">
              {timelineSteps.map((step, idx) => {
                const IconComp = step.icon;
                const isLast = idx === timelineSteps.length - 1;
                const isCancelStep = step.icon === XCircle;
                return (
                  <div key={idx} className="flex gap-3 relative">
                    {/* Vertical line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[15px] top-[30px] w-0.5 h-[calc(100%-14px)] ${
                          step.done ? (isCancelStep ? 'bg-red-200' : 'bg-blue-200') : 'bg-gray-200'
                        }`}
                      />
                    )}
                    {/* Icon */}
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
                    {/* Content */}
                    <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
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
            {booking.cancellationReason && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 bg-red-50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-4 rounded-b-xl">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Motiv anulare</p>
                  <p className="text-sm text-red-600 mt-0.5">{booking.cancellationReason}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Order Details */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Detalii comanda</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data</p>
                  <p className="text-sm font-medium">{formatDate(booking.scheduledDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ora & Durata</p>
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
                  <p className="text-xs text-gray-500">Proprietate</p>
                  <p className="text-sm font-medium">
                    {propertyTypeLabel[booking.propertyType] || booking.propertyType}
                    {booking.numRooms != null && ` \u00b7 ${booking.numRooms} cam.`}
                    {booking.numBathrooms != null && ` \u00b7 ${booking.numBathrooms} bai`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50">
                  <Home className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Suprafata & Animale</p>
                  <p className="text-sm font-medium">
                    {booking.areaSqm != null ? `${booking.areaSqm} mp` : '-'}
                    {' \u00b7 '}
                    {booking.hasPets ? 'Cu animale' : 'Fara animale'}
                  </p>
                </div>
              </div>
            </div>
            {booking.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Instructiuni speciale</p>
                <p className="text-sm text-gray-700">{booking.specialInstructions}</p>
              </div>
            )}
          </Card>

          {/* Service & Extras */}
          {((booking.includedItems && booking.includedItems.length > 0) ||
            (booking.extras && booking.extras.length > 0)) && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Servicii & Extra</h2>
              {booking.includedItems && booking.includedItems.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Servicii incluse
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {booking.includedItems.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {booking.extras && booking.extras.length > 0 && (
                <div>
                  {booking.includedItems && booking.includedItems.length > 0 && (
                    <div className="border-t border-gray-100 my-4" />
                  )}
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Extra
                  </p>
                  <div className="space-y-2">
                    {booking.extras.map(
                      (
                        extraItem: {
                          extra: { id: string; nameRo: string; nameEn: string };
                          price: number;
                          quantity: number;
                        },
                        idx: number,
                      ) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {extraItem.extra.nameRo}
                            {extraItem.quantity > 1 && (
                              <span className="text-gray-400"> x{extraItem.quantity}</span>
                            )}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(extraItem.price * extraItem.quantity)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Address */}
          {booking.address && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Adresa</h2>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 shrink-0">
                  <MapPin className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.address.streetAddress}</p>
                  <p className="text-sm text-gray-500">
                    {booking.address.city}, {booking.address.county}
                  </p>
                  {(booking.address.floor || booking.address.apartment) && (
                    <p className="text-sm text-gray-500">
                      {booking.address.floor ? `Etaj ${booking.address.floor}` : ''}
                      {booking.address.floor && booking.address.apartment ? ', ' : ''}
                      {booking.address.apartment ? `Ap. ${booking.address.apartment}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Time Slots */}
          {booking.timeSlots && booking.timeSlots.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Intervale de timp</h2>
              <div className="space-y-2">
                {booking.timeSlots.map(
                  (slot: {
                    id: string;
                    slotDate: string;
                    startTime: string;
                    endTime: string;
                    isSelected: boolean;
                  }) => {
                    const canSelect = booking.status === 'ASSIGNED' && !slot.isSelected;
                    return (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          slot.isSelected
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <Calendar
                          className={`h-5 w-5 shrink-0 ${
                            slot.isSelected ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(slot.slotDate).toLocaleDateString('ro-RO', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                          </p>
                        </div>
                        {slot.isSelected ? (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-semibold">Selectat</span>
                          </div>
                        ) : canSelect ? (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={selectingSlot}
                            onClick={() =>
                              selectTimeSlot({
                                variables: { bookingId: id, timeSlotId: slot.id },
                              })
                            }
                          >
                            Selecteaza
                          </Button>
                        ) : null}
                      </div>
                    );
                  },
                )}
              </div>
            </Card>
          )}

          {/* Review */}
          {booking.review && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Recenzie client</h2>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-5 w-5 ${
                      n <= booking.review.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
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

        {/* ─── Right Column (Sidebar) ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Financial Summary */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-400" />
              Sumar financiar
            </h2>
            <div className="space-y-2 text-sm">
              {booking.hourlyRate != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarif orar</span>
                  <span className="font-medium">{formatCurrency(booking.hourlyRate)}/h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Durata estimata</span>
                <span className="font-medium">{booking.estimatedDurationHours}h</span>
              </div>
              <div className="border-t border-gray-100 my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">Total estimat</span>
                <span className="font-medium">{formatCurrency(booking.estimatedTotal || 0)}</span>
              </div>
              {booking.finalTotal != null && booking.finalTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Total final</span>
                  <span className="font-bold text-base">{formatCurrency(booking.finalTotal)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Comision platforma ({commissionPct}%)
                </span>
                <span className="text-red-600 font-medium">-{formatCurrency(commissionAmount)}</span>
              </div>
              <div className="flex justify-between bg-emerald-50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 rounded">
                <span className="font-bold text-gray-900">Castigul tau net</span>
                <span className="font-bold text-emerald-600">{formatCurrency(netEarnings)}</span>
              </div>
              <div className="border-t border-gray-100 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status plata</span>
                <Badge variant={paymentBadgeVariant[booking.paymentStatus] || 'warning'}>
                  {paymentStatusLabel[booking.paymentStatus] || booking.paymentStatus || 'In asteptare'}
                </Badge>
              </div>
              {booking.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Platita la</span>
                  <span className="text-xs text-gray-600">{formatDateTime(booking.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Client */}
          {booking.client && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Client</h2>
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={booking.client.avatarUrl} name={booking.client.fullName} color="blue" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.client.fullName}
                  </p>
                </div>
              </div>
              {(booking.client.phone || booking.client.email) && (
                <div className="space-y-1.5 mb-3">
                  {booking.client.phone && (
                    <a href={`tel:${booking.client.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {booking.client.phone}
                    </a>
                  )}
                  {booking.client.email && (
                    <a href={`mailto:${booking.client.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors truncate">
                      <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{booking.client.email}</span>
                    </a>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                {booking.client.phone && (
                  <a
                    href={`tel:${booking.client.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Suna
                  </a>
                )}
                {booking.client.email && (
                  <a
                    href={`mailto:${booking.client.email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Worker (Cleaner) */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Lucrator asignat</h2>
            {booking.cleaner ? (
              <div>
                <Link
                  to={`/firma/echipa/${booking.cleaner.id}`}
                  className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <Avatar src={booking.cleaner.user?.avatarUrl} name={booking.cleaner.fullName} color="emerald" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {booking.cleaner.fullName}
                    </p>
                    <p className="text-xs text-gray-400">Vezi profil &rarr;</p>
                  </div>
                </Link>
                {(booking.cleaner.phone || booking.cleaner.email) && (
                  <div className="space-y-1.5 mb-3">
                    {booking.cleaner.phone && (
                      <a href={`tel:${booking.cleaner.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {booking.cleaner.phone}
                      </a>
                    )}
                    {booking.cleaner.email && (
                      <a href={`mailto:${booking.cleaner.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors truncate">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{booking.cleaner.email}</span>
                      </a>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {booking.cleaner.phone && (
                    <a
                      href={`tel:${booking.cleaner.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Suna
                    </a>
                  )}
                  {booking.cleaner.email && (
                    <a
                      href={`mailto:${booking.cleaner.email}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">Niciun lucrator asignat</p>
                <Button size="sm" className="w-full" onClick={() => setAssignModal(true)}>
                  <UserPlus className="h-4 w-4" />
                  Asigneaza lucrator
                </Button>
              </div>
            )}
          </Card>

          {/* Invoice */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Factura
            </h2>
            {loadingInvoice ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : invoice ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
                  <Badge variant={invoiceBadgeVariant[invoice.status] || 'default'}>
                    {invoiceStatusLabel[invoice.status] || invoice.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">{formatCurrency(invoice.totalAmount / 100)}</span>
                </div>
                {invoice.issuedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Emisa</span>
                    <span className="text-xs text-gray-600">{formatDate(invoice.issuedAt)}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setInvoiceExpanded(!invoiceExpanded)}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {invoiceExpanded ? 'Ascunde detalii' : 'Vezi factura'}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${invoiceExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {invoice.downloadUrl && (
                    <a
                      href={invoice.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  )}
                  <Link
                    to="/firma/facturi"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Toate
                  </Link>
                </div>

                {/* Expanded invoice detail */}
                {invoiceExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {/* Seller & Buyer */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-medium text-gray-500 uppercase tracking-wide mb-1">Furnizor</p>
                        <p className="font-medium text-gray-900">{invoice.sellerCompanyName}</p>
                        <p className="text-gray-500">CUI: {invoice.sellerCui}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500 uppercase tracking-wide mb-1">Client</p>
                        <p className="font-medium text-gray-900">{invoice.buyerName}</p>
                        {invoice.buyerCui && <p className="text-gray-500">CUI: {invoice.buyerCui}</p>}
                      </div>
                    </div>

                    {/* Line items */}
                    {invoice.lineItems && invoice.lineItems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Articole</p>
                        <div className="space-y-1.5">
                          {invoice.lineItems.map((item: {
                            id: string;
                            descriptionRo: string;
                            quantity: number;
                            unitPrice: number;
                            vatRate: number;
                            vatAmount: number;
                            lineTotal: number;
                            lineTotalWithVat: number;
                          }) => (
                            <div key={item.id} className="flex items-start justify-between text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-700">{item.descriptionRo}</p>
                                <p className="text-gray-400">
                                  {item.quantity} x {formatCurrency(item.unitPrice / 100)}
                                  {item.vatRate > 0 && ` (TVA ${item.vatRate}%)`}
                                </p>
                              </div>
                              <span className="font-medium text-gray-900 ml-2 shrink-0">
                                {formatCurrency(item.lineTotalWithVat / 100)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-700">{formatCurrency(invoice.subtotalAmount / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">TVA ({invoice.vatRate}%)</span>
                        <span className="text-gray-700">{formatCurrency(invoice.vatAmount / 100)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm pt-1">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">{formatCurrency(invoice.totalAmount / 100)}</span>
                      </div>
                    </div>

                    {/* Due date & notes */}
                    {invoice.dueDate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Scadenta</span>
                        <span className="text-gray-700">{formatDate(invoice.dueDate)}</span>
                      </div>
                    )}
                    {invoice.notes && (
                      <div className="text-xs">
                        <p className="text-gray-500 mb-0.5">Note</p>
                        <p className="text-gray-600 italic">{invoice.notes}</p>
                      </div>
                    )}

                    {/* e-Factura status */}
                    {invoice.efacturaStatus && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">e-Factura</span>
                        <Badge variant={invoice.efacturaStatus === 'ACCEPTED' ? 'success' : invoice.efacturaStatus === 'ERROR' ? 'danger' : 'default'}>
                          {invoice.efacturaStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : booking.status === 'COMPLETED' && isPaid ? (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Nicio factura generata inca.
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleGenerateInvoice}
                  loading={generatingInvoice}
                >
                  <FileText className="h-4 w-4" />
                  Genereaza factura
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Factura va fi disponibila dupa finalizare.
              </p>
            )}
          </Card>

          {/* Payment Details */}
          {isPaid && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                Detalii plata
              </h2>
              {loadingPayment ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : payment ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="font-medium">{formatCurrency(payment.amountTotal / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Suma companie</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(payment.amountCompany / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Comision platforma</span>
                    <span className="text-red-600">
                      -{formatCurrency(payment.amountPlatformFee / 100)}
                    </span>
                  </div>
                  {payment.refundAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rambursare</span>
                      <span className="text-amber-600">
                        {formatCurrency(payment.refundAmount / 100)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status</span>
                    <Badge variant={paymentBadgeVariant[payment.status] || 'default'}>
                      {paymentStatusLabel[payment.status] || payment.status}
                    </Badge>
                  </div>
                  {payment.stripePaymentIntentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stripe ID</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {payment.stripePaymentIntentId.length > 20
                          ? `${payment.stripePaymentIntentId.slice(0, 20)}...`
                          : payment.stripePaymentIntentId}
                      </span>
                    </div>
                  )}
                  {payment.failureReason && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{payment.failureReason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Detaliile platii nu sunt disponibile.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ─── Assign Cleaner Modal ─────────────────────────────────────────── */}
      <Modal
        open={assignModal}
        onClose={() => {
          setAssignModal(false);
          setCleanerSearch('');
        }}
        title="Asigneaza lucrator"
      >
        <div className="space-y-4">
          {/* Suggestions Section */}
          {resolvedLocation && suggestedCleaners.length > 0 && !cleanerSearch.trim() && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-accent" />
                <h4 className="text-sm font-semibold text-gray-900">Recomandari</h4>
                <span className="text-xs text-gray-400">({booking.address?.city})</span>
              </div>
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {suggestedCleaners.slice(0, 3).map((suggestion) => (
                    <div
                      key={suggestion.cleaner.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={suggestion.cleaner.avatarUrl} name={suggestion.cleaner.fullName} color="blue" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {suggestion.cleaner.fullName}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="h-3 w-3 text-accent" />
                              {suggestion.cleaner.ratingAvg > 0
                                ? suggestion.cleaner.ratingAvg.toFixed(1)
                                : '--'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {suggestion.cleaner.totalJobsCompleted} joburi
                            </span>
                            <Badge
                              variant={
                                suggestion.availabilityStatus === 'AVAILABLE' ? 'success' : 'warning'
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {suggestion.availabilityStatus === 'AVAILABLE'
                                ? 'Disponibil'
                                : 'Partial'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(suggestion.cleaner.id)}
                        loading={assigning}
                        className="shrink-0 ml-3"
                      >
                        Selecteaza
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 mb-1">
                <p className="text-xs text-gray-400 mb-2">
                  Sau cauta manual din toti lucratorii tai:
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cauta dupa nume sau email..."
              value={cleanerSearch}
              onChange={(e) => setCleanerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {loadingCleaners ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredCleaners.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Niciun lucrator gasit.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredCleaners.map((cleaner) => (
                <div
                  key={cleaner.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    suggestedCleanerIds.has(cleaner.id)
                      ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
                      : 'border-gray-200 hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={cleaner.fullName} color="primary" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {cleaner.fullName}
                        </p>
                        {suggestedCleanerIds.has(cleaner.id) && (
                          <Badge variant="info" className="text-[10px] px-1.5 py-0">
                            Recomandat
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Star className="h-3 w-3 text-accent" />
                          {cleaner.ratingAvg > 0 ? cleaner.ratingAvg.toFixed(1) : '--'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {cleaner.totalJobsCompleted} joburi
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(cleaner.id)}
                    loading={assigning}
                    className="shrink-0 ml-3"
                  >
                    Selecteaza
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Cancel Booking Modal ─────────────────────────────────────────── */}
      <Modal
        open={cancelModal}
        onClose={() => {
          setCancelModal(false);
          setCancelReason('');
        }}
        title="Anuleaza comanda"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Esti sigur ca vrei sa anulezi comanda <strong>#{booking.referenceCode}</strong>? Aceasta
            actiune nu poate fi reversata.
          </p>
          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Motivul anularii
            </label>
            <textarea
              id="cancel-reason"
              placeholder="Explica motivul anularii..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setCancelModal(false);
                setCancelReason('');
              }}
            >
              Inapoi
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelling}
              disabled={!cancelReason.trim()}
            >
              Anuleaza comanda
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
