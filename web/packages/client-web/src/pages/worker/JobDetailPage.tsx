import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';
import {
  ArrowLeft, Calendar, Repeat, Clock, MapPin, Home,
  PawPrint, Check, CheckCircle, CheckSquare, Square,
  AlertTriangle, Phone, Star,
  MessageSquare, Building2, Key, FileText, XCircle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  CLIENT_BOOKING_DETAIL,
  START_JOB,
  COMPLETE_JOB,
  OPEN_BOOKING_CHAT,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingExtra {
  extra: {
    id: string;
    nameRo: string;
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  ASSIGNED: { label: 'Asignata', variant: 'info' },
  CONFIRMED: { label: 'Confirmata', variant: 'warning' },
  IN_PROGRESS: { label: 'In lucru', variant: 'info' },
  COMPLETED: { label: 'Finalizata', variant: 'success' },
  CANCELLED_BY_CLIENT: { label: 'Anulata de client', variant: 'danger' },
  CANCELLED_BY_COMPANY: { label: 'Anulata de companie', variant: 'danger' },
  CANCELLED_BY_ADMIN: { label: 'Anulata de admin', variant: 'danger' },
};

const FINALIZED_STATUSES = ['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_ADMIN'];

const propertyTypeLabel: Record<string, string> = {
  APARTMENT: 'Apartament',
  HOUSE: 'Casa',
  OFFICE: 'Birou',
  STUDIO: 'Garsoniera',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ro-RO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface TimelineStep {
  label: string;
  date: string | null;
  icon: typeof FileText;
  done: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data, loading } = useQuery(CLIENT_BOOKING_DETAIL, {
    variables: { id },
    skip: !id,
  });
  const booking = data?.booking as BookingData | undefined;

  // Mutations return { id, status } — Apollo auto-updates the normalized booking entity.
  // List queries (TODAYS_JOBS, MY_ASSIGNED_JOBS) self-correct via cache-and-network on next visit.
  const [startJob, { loading: starting }] = useMutation(START_JOB);
  const [completeJob, { loading: completing }] = useMutation(COMPLETE_JOB);
  const [openBookingChat, { loading: openingChat }] = useMutation(OPEN_BOOKING_CHAT, {
    onCompleted: (res) => {
      const roomId = res?.openBookingChat?.id;
      if (roomId) navigate(`/worker/mesaje/${roomId}`);
    },
  });

  const actionLoading = starting || completing;

  const handleAction = async (action: 'start' | 'complete') => {
    setError('');
    try {
      if (action === 'start') await startJob({ variables: { id } });
      if (action === 'complete') await completeJob({ variables: { id } });
    } catch {
      setError('Nu s-a putut actualiza statusul. Te rugam sa incerci din nou.');
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

  // ─── Not Found ──────────────────────────────────────────────────────────────

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto pb-8">
        <button
          onClick={() => navigate('/worker/comenzi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
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

  // ─── Derived data ───────────────────────────────────────────────────────────

  const badge = STATUS_BADGE[booking.status] ?? { label: booking.status, variant: 'default' as const };
  const isFinalized = FINALIZED_STATUSES.includes(booking.status);
  const isCancelled = booking.status.startsWith('CANCELLED');

  const includedItems = booking.includedItems ?? [];
  const extras = booking.extras ?? [];
  const totalChecklistItems = includedItems.length + extras.length;
  const checkedCount = checkedItems.size;
  const showProgress = (booking.status === 'IN_PROGRESS' || booking.status === 'CONFIRMED') && totalChecklistItems > 0;

  // Timeline
  const timelineSteps: TimelineStep[] = [
    { label: 'Asignata', date: booking.createdAt, icon: FileText, done: true },
    {
      label: 'Confirmata',
      date: null,
      icon: CheckCircle,
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: 'In lucru',
      date: booking.startedAt || null,
      icon: Clock,
      done: ['IN_PROGRESS', 'COMPLETED'].includes(booking.status),
    },
    {
      label: 'Finalizata',
      date: booking.completedAt || null,
      icon: CheckCircle,
      done: booking.status === 'COMPLETED',
    },
  ];
  if (isCancelled) {
    timelineSteps.push({
      label: STATUS_BADGE[booking.status]?.label || 'Anulata',
      date: null,
      icon: XCircle,
      done: true,
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/worker/comenzi')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi la comenzi
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{booking.serviceName}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {booking.category && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {booking.category.icon} {booking.category.nameRo}
              </span>
            )}
            {booking.recurringGroupId && (
              <Badge variant="info">
                <Repeat className="h-3 w-3 mr-1" />
                Recurenta{booking.occurrenceNumber ? ` #${booking.occurrenceNumber}` : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ref: {booking.referenceCode} &middot; {formatDateTime(booking.createdAt)}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ─────────────────────────────────────────────────── */}
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

          {/* Job Details */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Detalii job</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50">
                  <Clock className="h-4 w-4 text-emerald-600" />
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
                    {propertyTypeLabel[booking.propertyType || ''] || booking.propertyType || 'Apartament'}
                    {booking.numRooms != null && ` \u00b7 ${booking.numRooms} cam.`}
                    {booking.numBathrooms != null && ` \u00b7 ${booking.numBathrooms} bai`}
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
                  <p className="text-xs text-gray-500">Suprafata & Animale</p>
                  <p className="text-sm font-medium">
                    {booking.areaSqm != null ? `${booking.areaSqm} mp` : '-'}
                    {' \u00b7 '}
                    {booking.hasPets ? 'Cu animale' : 'Fara animale'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Checklist */}
          {totalChecklistItems > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Ce trebuie sa faci</h2>

              {/* Progress bar — active statuses only */}
              {showProgress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progres: {checkedCount}/{totalChecklistItems} finalizate
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
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-3">Suplimentare</p>
                  <div className="space-y-1">
                    {extras.map((extra, idx) => {
                      const checklistIndex = includedItems.length + idx;
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
                              {extra.extra.nameRo}
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
                            {extra.extra.nameRo}
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
                <p className="text-sm font-semibold text-amber-800 mb-1">Instructiuni speciale</p>
                <p className="text-sm text-amber-700">{booking.specialInstructions}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {booking.address && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Adresa</h2>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-0.5 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{booking.address.streetAddress}</p>
                  <p>{booking.address.city}{booking.address.county ? `, ${booking.address.county}` : ''}</p>
                  {(booking.address.floor || booking.address.apartment) && (
                    <p className="text-gray-400">
                      {booking.address.floor && `Etaj ${booking.address.floor}`}
                      {booking.address.floor && booking.address.apartment && ', '}
                      {booking.address.apartment && `Ap. ${booking.address.apartment}`}
                    </p>
                  )}
                </div>
              </div>

              {booking.address.entryCode && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 shrink-0">
                    <Key className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cod intrare</p>
                    <p className="text-sm font-bold text-gray-900 font-mono tracking-wider">{booking.address.entryCode}</p>
                  </div>
                </div>
              )}

              {booking.address.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Note adresa</p>
                  <p className="text-sm text-gray-600">{booking.address.notes}</p>
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
              <h2 className="font-semibold text-gray-900 mb-3">Client</h2>
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
                    Suna
                  </a>
                )}
                <button
                  onClick={() => openBookingChat({ variables: { bookingId: booking.id } })}
                  disabled={openingChat}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Mesaj
                </button>
              </div>
            </Card>
          )}

          {/* Company */}
          {booking.company && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Firma</h2>
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
              <h2 className="font-semibold text-gray-900 mb-3">Recenzie client</h2>
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
          <Button
            onClick={() => handleAction('start')}
            loading={starting}
            disabled={actionLoading}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Incepe curatenia
          </Button>
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
              Finalizeaza curatenia
            </Button>
            {totalChecklistItems > 0 && checkedCount < totalChecklistItems && (
              <p className="text-xs text-gray-400 text-center">
                Bifeaza toate sarcinile pentru a finaliza
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
