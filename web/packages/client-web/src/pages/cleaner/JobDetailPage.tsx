import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';
import {
  ArrowLeft, Calendar, Repeat, Clock, MapPin,
  Home, Bath, Ruler, PawPrint, Square, CheckSquare,
  Sparkles, AlertTriangle, User, Phone,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  CLIENT_BOOKING_DETAIL,
  START_JOB,
  COMPLETE_JOB,
  TODAYS_JOBS,
  MY_ASSIGNED_JOBS,
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
  estimatedTotal: number;
  status: string;
  specialInstructions?: string;
  propertyType?: string;
  numRooms?: number;
  numBathrooms?: number;
  areaSqm?: number;
  hasPets?: boolean;
  recurringGroupId?: string;
  occurrenceNumber?: number;
  address?: { streetAddress: string; city: string; county: string; floor?: string; apartment?: string };
  client?: { id: string; fullName: string; phone?: string };
  timeSlots?: { id: string; slotDate: string; startTime: string; endTime: string; isSelected: boolean }[];
  extras: BookingExtra[];
}

// ─── Status Badge Map ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  ASSIGNED: { label: 'Asignata', variant: 'info' },
  CONFIRMED: { label: 'Confirmata', variant: 'warning' },
  IN_PROGRESS: { label: 'In lucru', variant: 'success' },
  COMPLETED: { label: 'Finalizata', variant: 'success' },
  CANCELLED_BY_CLIENT: { label: 'Anulata', variant: 'danger' },
  CANCELLED_BY_COMPANY: { label: 'Anulata', variant: 'danger' },
  CANCELLED_BY_ADMIN: { label: 'Anulata', variant: 'danger' },
};

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

  const refetchQueries = [
    { query: TODAYS_JOBS },
    { query: MY_ASSIGNED_JOBS },
    { query: CLIENT_BOOKING_DETAIL, variables: { id } },
  ];

  const [startJob, { loading: starting }] = useMutation(START_JOB, { refetchQueries });
  const [completeJob, { loading: completing }] = useMutation(COMPLETE_JOB, { refetchQueries });

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
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const badge = STATUS_BADGE[booking.status] ?? { label: booking.status, variant: 'default' as const };

  const includedItems = booking.includedItems ?? [];
  const extras = booking.extras ?? [];
  const totalChecklistItems = includedItems.length + extras.length;
  const checkedCount = checkedItems.size;
  const showProgress = (booking.status === 'IN_PROGRESS' || booking.status === 'CONFIRMED') && totalChecklistItems > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{booking.serviceName}</h1>
          <p className="text-sm text-gray-400 mt-1.5">Ref: {booking.referenceCode}</p>
        </div>
        <Badge variant={badge.variant} className="mt-1">{badge.label}</Badge>
      </div>

      {/* Recurring info */}
      {booking.recurringGroupId && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 mb-6">
          <Repeat className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm text-blue-800">
            Programare recurenta
            {booking.occurrenceNumber && ` \u2014 Sesiunea #${booking.occurrenceNumber}`}
          </span>
        </div>
      )}

      {/* Property Quick Stats */}
      {(booking.numRooms || booking.numBathrooms || booking.areaSqm || booking.hasPets !== undefined) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {booking.numRooms != null && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{booking.numRooms}</p>
                <p className="text-xs text-gray-500">Camere</p>
              </div>
            </div>
          )}
          {booking.numBathrooms != null && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100">
                <Bath className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{booking.numBathrooms}</p>
                <p className="text-xs text-gray-500">Bai</p>
              </div>
            </div>
          )}
          {booking.areaSqm != null && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100">
                <Ruler className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{booking.areaSqm}</p>
                <p className="text-xs text-gray-500">mp</p>
              </div>
            </div>
          )}
          {booking.hasPets != null && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${booking.hasPets ? 'bg-red-100' : 'bg-gray-100'}`}>
                <PawPrint className={`h-5 w-5 ${booking.hasPets ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{booking.hasPets ? 'Da' : 'Nu'}</p>
                <p className="text-xs text-gray-500">Animale</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progres: {checkedCount}/{totalChecklistItems} finalizate
            </span>
            <span className="text-sm font-medium text-emerald-600">
              {totalChecklistItems > 0 ? Math.round((checkedCount / totalChecklistItems) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${totalChecklistItems > 0 ? (checkedCount / totalChecklistItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Task Checklist */}
      {totalChecklistItems > 0 && (
        <Card className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Ce trebuie sa faci</h2>

          {/* Included Items */}
          <div className="space-y-1">
            {includedItems.map((item, index) => {
              const isChecked = checkedItems.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleItem(index)}
                  className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    isChecked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-300 shrink-0" />
                  )}
                  <span className={`text-sm ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Extras in Checklist */}
          {extras.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-3" />
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-3">Suplimentare</p>
              <div className="space-y-1">
                {extras.map((extra, idx) => {
                  const checklistIndex = includedItems.length + idx;
                  const isChecked = checkedItems.has(checklistIndex);
                  return (
                    <button
                      key={extra.extra.id}
                      type="button"
                      onClick={() => toggleItem(checklistIndex)}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                        isChecked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
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

      {/* Extras Card */}
      {extras.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Servicii suplimentare</h2>
          <div className="space-y-3">
            {extras.map((extra) => (
              <div key={extra.extra.id} className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-purple-50">
                  {extra.extra.icon ? (
                    <span className="text-lg">{extra.extra.icon}</span>
                  ) : (
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{extra.extra.nameRo}</p>
                </div>
                {extra.quantity > 1 && (
                  <Badge variant="default" className="text-xs">x{extra.quantity}</Badge>
                )}
                <span className="text-sm font-semibold text-gray-900">
                  {extra.price * extra.quantity} lei
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Schedule Card */}
      <Card className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Programare</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(booking.scheduledDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(booking.scheduledDate).toLocaleDateString('ro-RO', { weekday: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-50">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{booking.scheduledStartTime}</p>
              <p className="text-xs text-gray-400">Ora start</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{booking.estimatedDurationHours}h</p>
              <p className="text-xs text-gray-400">Durata</p>
            </div>
          </div>
        </div>
      </Card>


      {/* Address */}
      {booking.address && (
        <Card className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Adresa</h2>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 mt-0.5">
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
        </Card>
      )}

      {/* Client */}
      <Card className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Client</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">{booking.client?.fullName ?? '--'}</span>
          </div>
          {booking.client?.phone && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100">
                <Phone className="h-4 w-4 text-gray-600" />
              </div>
              <a
                href={`tel:${booking.client.phone}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {booking.client.phone}
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Special Instructions */}
      {booking.specialInstructions && (
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Instructiuni speciale</p>
            <p className="text-sm text-amber-700">{booking.specialInstructions}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700 text-center mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
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
