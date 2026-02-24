import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
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

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'Bisaptamanal',
  MONTHLY: 'Lunar',
};

const DAY_NAMES: Record<number, string> = {
  0: 'Duminica', 1: 'Luni', 2: 'Marti', 3: 'Miercuri',
  4: 'Joi', 5: 'Vineri', 6: 'Sambata',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartament', HOUSE: 'Casa', OFFICE: 'Birou', STUDIO: 'Garsoniera',
};

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success', PAUSED: 'warning', PAST_DUE: 'danger', CANCELLED: 'default',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ', PAUSED: 'Pauzat', PAST_DUE: 'Restant', CANCELLED: 'Anulat',
};

const bookingStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  PENDING: 'warning', ASSIGNED: 'info', CONFIRMED: 'info', IN_PROGRESS: 'info',
  COMPLETED: 'success', CANCELLED: 'danger',
};

const bookingStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare', ASSIGNED: 'Asignat', CONFIRMED: 'Confirmat',
  IN_PROGRESS: 'In desfasurare', COMPLETED: 'Finalizat', CANCELLED: 'Anulat',
};

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
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

function fmtAddress(address: SubscriptionAddress): string {
  const parts = [address.streetAddress];
  if (address.floor) parts.push(`Etaj ${address.floor}`);
  if (address.apartment) parts.push(`Ap. ${address.apartment}`);
  parts.push(`${address.city}, ${address.county}`);
  return parts.join(', ');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompanySubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          {error ? 'Eroare la incarcarea abonamentului.' : 'Abonamentul nu a fost gasit.'}
        </p>
        <Button variant="ghost" onClick={() => navigate('/firma/abonamente')}>
          <ArrowLeft className="h-4 w-4" />
          Inapoi la abonamente
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
              {RECURRENCE_LABELS[sub.recurrenceType] || sub.recurrenceType}
            </span>
          </div>
          <p className="text-gray-500 mt-0.5">
            {DAY_NAMES[sub.dayOfWeek] ?? ''}, ora {fmtTime(sub.preferredTime)} &middot; {sub.sessionsPerMonth} sedinte/luna
          </p>
        </div>
      </div>

      {/* Banners */}
      {isCancelled && sub.cancellationReason && (
        <Card className="mb-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Motiv anulare</p>
              <p className="text-sm text-red-700 mt-0.5">{sub.cancellationReason}</p>
              {sub.cancelledAt && (
                <p className="text-xs text-red-500 mt-1">Anulat pe {fmtDate(sub.cancelledAt)}</p>
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
              Lucratorul a fost schimbat cu succes. Toate programarile viitoare au fost actualizate.
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
                Cerere de schimbare lucrator in asteptare
              </p>
              {sub.workerChangeReason && (
                <p className="text-sm text-amber-700 mt-0.5">
                  Motiv: {sub.workerChangeReason}
                </p>
              )}
              <p className="text-xs text-amber-600 mt-1">
                Solicitat pe {fmtDate(sub.workerChangeRequestedAt)}
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setWorkerChangeModal(true)}
              >
                <RefreshCw className="h-4 w-4" />
                Atribuie lucrator nou
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preturi</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tarif orar</span>
                <span className="text-gray-900">{fmtCurrency(sub.hourlyRate)}/h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Durata estimata</span>
                <span className="text-gray-900">{sub.estimatedDurationHours} {sub.estimatedDurationHours === 1 ? 'ora' : 'ore'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pret per sesiune (original)</span>
                <span className="text-gray-900">{fmtCurrency(sub.perSessionOriginal)}</span>
              </div>
              {sub.discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Reducere abonament
                  </span>
                  <span className="text-emerald-600 font-medium">-{sub.discountPct}%</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-700">Pret per sesiune</span>
                <span className="text-gray-900">{fmtCurrency(sub.perSessionDiscounted)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sesiuni pe luna</span>
                  <span className="text-gray-900">{sub.sessionsPerMonth}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-2 p-3 bg-primary/5 rounded-xl -mx-1">
                  <span className="text-gray-900">Total lunar</span>
                  <span className="text-primary">{fmtCurrency(sub.monthlyAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Service Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalii serviciu</h3>
            <div className="grid grid-cols-2 gap-4">
              {sub.propertyType && (
                <div className="flex items-start gap-3">
                  <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Tip proprietate</p>
                    <p className="text-sm text-gray-900">{PROPERTY_TYPE_LABELS[sub.propertyType] ?? sub.propertyType}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Camere</p>
                  <p className="text-sm text-gray-900">{sub.numRooms} {sub.numRooms === 1 ? 'camera' : 'camere'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Bath className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Bai</p>
                  <p className="text-sm text-gray-900">{sub.numBathrooms} {sub.numBathrooms === 1 ? 'baie' : 'bai'}</p>
                </div>
              </div>
              {sub.areaSqm != null && sub.areaSqm > 0 && (
                <div className="flex items-start gap-3">
                  <Ruler className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Suprafata</p>
                    <p className="text-sm text-gray-900">{sub.areaSqm} mp</p>
                  </div>
                </div>
              )}
              {sub.hasPets && (
                <div className="flex items-start gap-3">
                  <PawPrint className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Animale</p>
                    <p className="text-sm text-gray-900">Da</p>
                  </div>
                </div>
              )}
            </div>
            {sub.specialInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Instructiuni speciale</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{sub.specialInstructions}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Address */}
          {sub.address && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresa</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-900">{fmtAddress(sub.address)}</p>
              </div>
            </Card>
          )}

          {/* Upcoming Bookings */}
          {sub.upcomingBookings.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Programari viitoare ({sub.upcomingBookings.length})
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
                        <p className="text-sm font-medium text-gray-900">{fmtDate(b.scheduledDate)}</p>
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
                Istoric programari ({sub.bookings.length})
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
                        <p className="text-sm text-gray-900">{fmtDate(b.scheduledDate)}, {fmtTime(b.scheduledStartTime)}</p>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Client</h3>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Companie</h3>
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
            <h3 className="text-sm font-medium text-gray-500 mb-3">Lucrator</h3>
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
                    Schimba lucratorul
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">Niciun lucrator asignat</p>
            )}
          </Card>

          {/* Period */}
          {(sub.currentPeriodStart || sub.currentPeriodEnd) && (
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Perioada curenta</h3>
              <div className="space-y-2 text-sm">
                {sub.currentPeriodStart && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Inceput</span>
                    <span className="text-gray-900">{fmtDate(sub.currentPeriodStart)}</span>
                  </div>
                )}
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sfarsit</span>
                    <span className="text-gray-900">{fmtDate(sub.currentPeriodEnd)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Progress */}
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Progres</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Finalizate</span>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Servicii suplimentare</h3>
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
            <h3 className="text-sm font-medium text-gray-500 mb-3">Informatii</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creat pe</span>
                <span className="text-gray-900">{fmtDate(sub.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tip serviciu</span>
                <span className="text-gray-900">{sub.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ziua preferata</span>
                <span className="text-gray-900">{DAY_NAMES[sub.dayOfWeek] ?? sub.dayOfWeek}</span>
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
