import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { ArrowLeft, MapPin, User, Phone, Mail, Clock, Calendar, Search, Loader2, Star, Check, Repeat } from 'lucide-react';
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
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Modal state
  const [assignModal, setAssignModal] = useState(false);
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Queries
  const { data, loading } = useQuery(COMPANY_BOOKING_DETAIL, {
    variables: { id },
    skip: !id,
  });

  const { data: cleanersData, loading: loadingCleaners } = useQuery(MY_CLEANERS, {
    skip: !assignModal,
  });

  // Fetch active cities for resolving city -> cityId/areaId for suggestions
  const { data: citiesData } = useQuery(ACTIVE_CITIES, {
    skip: !assignModal,
  });

  const booking = data?.booking;

  // Resolve cityId and areaId from the booking address, if possible
  const resolvedLocation = (() => {
    if (!booking?.address?.city || !citiesData?.activeCities) return null;
    const bookingCity = booking.address.city.toLowerCase().trim();
    const matchedCity = (citiesData.activeCities as EnabledCity[]).find(
      (c) => c.name.toLowerCase().trim() === bookingCity,
    );
    if (!matchedCity) return null;
    // Try to match area by address street or just return city with first area
    const firstArea = matchedCity.areas?.[0];
    if (!firstArea) return null;
    return { cityId: matchedCity.id, areaId: firstArea.id };
  })();

  // Build timeSlots from booking data for SUGGEST_CLEANERS query.
  const suggestTimeSlots = (() => {
    if (!booking?.scheduledDate || !booking?.scheduledStartTime) return [];
    const durationHours = booking.estimatedDurationHours ?? 2;
    const [h, m] = booking.scheduledStartTime.split(':').map(Number);
    const endH = h + Math.floor(durationHours);
    const endM = m + Math.round((durationHours % 1) * 60);
    const endTime = `${String(endH + Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    return [{ date: booking.scheduledDate, startTime: booking.scheduledStartTime, endTime }];
  })();

  // Fetch cleaner suggestions when the assign modal is open and we can resolve a location
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

  // Mutations
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

  // Handlers
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

  // Filter cleaners by search
  const allCleaners: CleanerOption[] = cleanersData?.myCleaners ?? [];
  const filteredCleaners = cleanerSearch.trim()
    ? allCleaners.filter((c) =>
        c.fullName.toLowerCase().includes(cleanerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(cleanerSearch.toLowerCase())
      )
    : allCleaners;

  // Get IDs of suggested cleaners so we can mark them in the full list
  const suggestedCleanerIds = new Set(suggestedCleaners.map((s) => s.cleaner.id));

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
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

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

  const isCancelled = booking.status.startsWith('CANCELLED');
  const canCancel = !['COMPLETED'].includes(booking.status) && !isCancelled;

  return (
    <div>
      <button
        onClick={() => navigate('/firma/comenzi')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi la comenzi
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Comanda #{booking.referenceCode}
            </h1>
            <Badge variant={statusBadgeVariant[booking.status] || 'default'}>
              {statusLabel[booking.status] || booking.status}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            {booking.serviceName} &middot; Creata pe {booking.createdAt}
          </p>
        </div>
        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setCancelModal(true)}>
            Anuleaza comanda
          </Button>
        )}
      </div>

      {booking.recurringGroupId && (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <Repeat className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Programare recurenta
                {booking.occurrenceNumber && ` — Sesiunea #${booking.occurrenceNumber}`}
              </p>
              <p className="text-xs text-gray-500">
                Aceasta comanda face parte dintr-o serie recurenta.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Detalii programare</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-medium">{booking.scheduledDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Ora start</p>
                  <p className="font-medium">{booking.scheduledStartTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Durata estimata</p>
                  <p className="font-medium">{booking.estimatedDurationHours}h</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Time Slots */}
          {booking.timeSlots && booking.timeSlots.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Intervale de timp</h2>
              <div className="space-y-3">
                {booking.timeSlots.map((slot: { id: string; slotDate: string; startTime: string; endTime: string; isSelected: boolean }) => {
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
                      <Calendar className={`h-5 w-5 shrink-0 ${slot.isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(slot.slotDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
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
                          onClick={() => selectTimeSlot({ variables: { bookingId: id, timeSlotId: slot.id } })}
                        >
                          Selecteaza
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Address */}
          {booking.address && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Adresa</h2>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{booking.address.streetAddress}</p>
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

          {/* Property Details */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Detalii proprietate</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {booking.numRooms != null && (
                <div>
                  <p className="text-gray-500">Camere</p>
                  <p className="font-medium">{booking.numRooms}</p>
                </div>
              )}
              {booking.numBathrooms != null && (
                <div>
                  <p className="text-gray-500">Bai</p>
                  <p className="font-medium">{booking.numBathrooms}</p>
                </div>
              )}
              {booking.areaSqm != null && (
                <div>
                  <p className="text-gray-500">Suprafata</p>
                  <p className="font-medium">{booking.areaSqm} mp</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Animale de companie</p>
                <p className="font-medium">{booking.hasPets ? 'Da' : 'Nu'}</p>
              </div>
            </div>
            {booking.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Instructiuni speciale</p>
                <p className="text-sm">{booking.specialInstructions}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Pret</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Estimat</span>
                <span className="font-medium">{booking.estimatedTotal} RON</span>
              </div>
              {booking.finalTotal && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Final</span>
                  <span className="font-bold text-lg">{booking.finalTotal} RON</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Plata</span>
                <Badge variant={booking.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  {booking.paymentStatus || 'In asteptare'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Client */}
          {booking.client && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Client</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{booking.client.fullName}</span>
                </div>
                {booking.client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{booking.client.email}</span>
                  </div>
                )}
                {booking.client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{booking.client.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Cleaner */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Cleaner asignat</h2>
            {booking.cleaner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{booking.cleaner.fullName}</span>
                </div>
                {booking.cleaner.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{booking.cleaner.phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">Niciun cleaner asignat inca.</p>
                <Button size="sm" className="w-full" onClick={() => setAssignModal(true)}>
                  Asigneaza cleaner
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Assign Cleaner Modal */}
      <Modal
        open={assignModal}
        onClose={() => { setAssignModal(false); setCleanerSearch(''); }}
        title="Asigneaza cleaner"
      >
        <div className="space-y-4">
          {/* Suggestions Section */}
          {resolvedLocation && suggestedCleaners.length > 0 && !cleanerSearch.trim() && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-accent" />
                <h4 className="text-sm font-semibold text-gray-900">Recomandari</h4>
                <span className="text-xs text-gray-400">
                  ({booking.address?.city})
                </span>
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
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-blue-700">
                            {suggestion.cleaner.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {suggestion.cleaner.fullName}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="h-3 w-3 text-accent" />
                              {suggestion.cleaner.ratingAvg > 0 ? suggestion.cleaner.ratingAvg.toFixed(1) : '--'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {suggestion.cleaner.totalJobsCompleted} joburi
                            </span>
                            <Badge
                              variant={suggestion.availabilityStatus === 'AVAILABLE' ? 'success' : 'warning'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {suggestion.availabilityStatus === 'AVAILABLE' ? 'Disponibil' : 'Partial'}
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
                <p className="text-xs text-gray-400 mb-2">Sau cauta manual din toti curatorii tai:</p>
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
            <p className="text-sm text-gray-400 text-center py-6">Niciun cleaner gasit.</p>
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
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {cleaner.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{cleaner.fullName}</p>
                        {suggestedCleanerIds.has(cleaner.id) && (
                          <Badge variant="info" className="text-[10px] px-1.5 py-0">Recomandat</Badge>
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

      {/* Cancel Booking Modal */}
      <Modal
        open={cancelModal}
        onClose={() => { setCancelModal(false); setCancelReason(''); }}
        title="Anuleaza comanda"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Esti sigur ca vrei sa anulezi comanda <strong>#{booking.referenceCode}</strong>?
            Aceasta actiune nu poate fi reversata.
          </p>
          <div>
            <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <Button variant="ghost" onClick={() => { setCancelModal(false); setCancelReason(''); }}>
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
