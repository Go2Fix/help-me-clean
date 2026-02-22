import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
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
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { ADMIN_BOOKING_DETAIL, ADMIN_CANCEL_BOOKING, ALL_BOOKINGS, ALL_CLEANERS, ASSIGN_CLEANER } from '@/graphql/operations';

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

const statusLabel: Record<string, string> = {
  ASSIGNED: 'Asignat',
  CONFIRMED: 'Confirmat',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
  CANCELLED_BY_CLIENT: 'Anulat de client',
  CANCELLED_BY_COMPANY: 'Anulat de companie',
  CANCELLED_BY_ADMIN: 'Anulat de admin',
};

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

interface CleanerOption {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [cleanerSearch, setCleanerSearch] = useState('');

  const { data, loading } = useQuery(ADMIN_BOOKING_DETAIL, { variables: { id } });
  const [adminCancel, { loading: cancelling }] = useMutation(ADMIN_CANCEL_BOOKING, {
    refetchQueries: [
      { query: ADMIN_BOOKING_DETAIL, variables: { id } },
      { query: ALL_BOOKINGS, variables: { first: 50 } },
    ],
  });

  const { data: cleanersData, loading: loadingCleaners } = useQuery(ALL_CLEANERS, {
    skip: !assignModal,
  });

  const [assignCleaner, { loading: assigning }] = useMutation(ASSIGN_CLEANER, {
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
        <p className="text-gray-400">Comanda nu a fost gasita.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/comenzi')}>
          Inapoi la comenzi
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

  const handleAssign = async (cleanerId: string) => {
    await assignCleaner({ variables: { bookingId: id, cleanerId } });
    setAssignModal(false);
    setCleanerSearch('');
  };

  const isCancelled = booking.status.startsWith('CANCELLED');
  const canCancel = !['COMPLETED'].includes(booking.status) && !isCancelled;
  const canAssign = booking.status === 'ASSIGNED' && !booking.cleaner;

  // Filter cleaners by search
  const allCleaners: CleanerOption[] = cleanersData?.allCleaners ?? [];
  const filteredCleaners = cleanerSearch.trim()
    ? allCleaners.filter((c) =>
        c.fullName.toLowerCase().includes(cleanerSearch.toLowerCase()) ||
        c.company?.companyName?.toLowerCase().includes(cleanerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(cleanerSearch.toLowerCase())
      )
    : allCleaners;

  // Build status timeline
  const timelineSteps = [
    { label: 'Creata', date: booking.createdAt, icon: FileText, done: true },
    { label: 'Platita & Confirmata', date: booking.paidAt ?? null, icon: CheckCircle, done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) },
    { label: 'In desfasurare', date: booking.startedAt, icon: Clock, done: ['IN_PROGRESS', 'COMPLETED'].includes(booking.status) },
    { label: 'Finalizata', date: booking.completedAt, icon: CheckCircle, done: booking.status === 'COMPLETED' },
  ];

  if (isCancelled) {
    timelineSteps.push({
      label: statusLabel[booking.status] || 'Anulata',
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
              {statusLabel[booking.status] ?? booking.status}
            </Badge>
          </div>
          <p className="text-gray-500 mt-0.5">{booking.serviceName}</p>
        </div>
        {canCancel && (
          <Button variant="danger" onClick={() => setCancelModal(true)}>
            Anuleaza comanda
          </Button>
        )}
      </div>

      {booking.recurringGroupId && (
        <Card className="mb-6">
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalii rezervare</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Data programata</p>
                  <p className="text-sm text-gray-900">{formatDate(booking.scheduledDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Ora / Durata</p>
                  <p className="text-sm text-gray-900">
                    {booking.scheduledStartTime} &middot; {booking.estimatedDurationHours}h
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Proprietate</p>
                  <p className="text-sm text-gray-900">
                    {booking.propertyType ?? '--'} &middot; {booking.numRooms ?? 0} camere &middot; {booking.numBathrooms ?? 0} bai
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Suprafata / Animale</p>
                  <p className="text-sm text-gray-900">
                    {booking.areaSqm ?? '--'} mp &middot; {booking.hasPets ? 'Da, animale' : 'Fara animale'}
                  </p>
                </div>
              </div>
            </div>
            {booking.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Instructiuni speciale</p>
                <p className="text-sm text-gray-600">{booking.specialInstructions}</p>
              </div>
            )}
          </Card>

          {/* Address */}
          {booking.address && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresa</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">{booking.address.streetAddress}</p>
                  <p className="text-sm text-gray-500">
                    {booking.address.city}, {booking.address.county} {booking.address.postalCode}
                  </p>
                  {(booking.address.floor || booking.address.apartment) && (
                    <p className="text-sm text-gray-500">
                      {booking.address.floor && `Etaj ${booking.address.floor}`}
                      {booking.address.floor && booking.address.apartment && ' / '}
                      {booking.address.apartment && `Ap. ${booking.address.apartment}`}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Time Slots */}
          {booking.timeSlots && booking.timeSlots.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Intervale de timp</h3>
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
                        Selectat
                      </Badge>
                    ) : (
                      <Badge variant="default">Propus</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pricing */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preturi</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tarif orar</span>
                <span className="text-gray-900">{booking.hourlyRate ? formatCurrency(booking.hourlyRate) : '--'}/h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total estimat</span>
                <span className="text-gray-900">{formatCurrency(booking.estimatedTotal)}</span>
              </div>
              {booking.finalTotal != null && (
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total final</span>
                  <span className="text-gray-900">{formatCurrency(booking.finalTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                <span className="text-gray-500">Comision platforma</span>
                <span className="text-gray-900">{booking.platformCommissionPct ?? '--'}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status plata</span>
                <Badge variant={booking.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  {booking.paymentStatus}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
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
                  <p className="text-sm font-medium text-danger">Motiv anulare</p>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Client</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.client.fullName}</p>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Companie</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-secondary/10">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.company.companyName}</p>
                  <p className="text-sm text-gray-500">{booking.company.contactEmail}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Cleaner */}
          {booking.cleaner && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Curatator</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <User className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.cleaner.fullName}</p>
                  {booking.cleaner.phone && (
                    <p className="text-sm text-gray-500">{booking.cleaner.phone}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {!booking.cleaner && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Curatator</h3>
              <p className="text-sm text-gray-400 mb-3">Niciun curatator asignat</p>
              {canAssign && (
                <Button onClick={() => setAssignModal(true)} className="w-full">
                  <UserPlus className="h-4 w-4" />
                  Asigneaza cleaner
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
        title="Anuleaza comanda"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Esti sigur ca vrei sa anulezi comanda <strong>{booking.referenceCode}</strong>?
          </p>
          <Input
            label="Motivul anularii"
            placeholder="Explica motivul anularii..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
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

      {/* Assign Cleaner Modal */}
      <Modal
        open={assignModal}
        onClose={() => { setAssignModal(false); setCleanerSearch(''); }}
        title="Asigneaza cleaner"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cauta dupa nume, companie, email..."
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
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {cleaner.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{cleaner.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {cleaner.company?.companyName ?? 'Fara companie'}
                      </p>
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
    </div>
  );
}
