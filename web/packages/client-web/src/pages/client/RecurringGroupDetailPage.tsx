import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Repeat,
  User,
  Building2,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/ClientBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import {
  RECURRING_GROUP_DETAIL,
  CANCEL_RECURRING_GROUP,
  PAUSE_RECURRING_GROUP,
  RESUME_RECURRING_GROUP,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Occurrence {
  id: string;
  referenceCode: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedTotal: number;
  status: string;
  paymentStatus: string;
  occurrenceNumber: number;
  cleaner: {
    id: string;
    fullName: string;
  } | null;
}

interface RecurringGroup {
  id: string;
  recurrenceType: string;
  dayOfWeek: number;
  preferredTime: string;
  serviceType: string;
  serviceName: string;
  hourlyRate: number;
  estimatedTotalPerOccurrence: number;
  isActive: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  totalOccurrences: number;
  completedOccurrences: number;
  createdAt: string;
  client: { id: string; fullName: string; email: string; phone: string } | null;
  preferredCleaner: { id: string; fullName: string; phone: string } | null;
  company: { id: string; companyName: string; contactPhone: string } | null;
  address: {
    streetAddress: string;
    city: string;
    county: string;
    floor?: string;
    apartment?: string;
  } | null;
  occurrences: Occurrence[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'Bisaptamanal',
  MONTHLY: 'Lunar',
};

const DAY_NAMES = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function RecurringGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data, loading, error, refetch } = useQuery<{ recurringGroup: RecurringGroup }>(
    RECURRING_GROUP_DETAIL,
    {
      variables: { id },
      skip: !id || !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [cancelGroup, { loading: cancelling }] = useMutation(CANCEL_RECURRING_GROUP, {
    onCompleted: () => {
      setShowCancelModal(false);
      refetch();
    },
  });

  const [pauseGroup, { loading: pausing }] = useMutation(PAUSE_RECURRING_GROUP, {
    onCompleted: () => refetch(),
  });

  const [resumeGroup, { loading: resuming }] = useMutation(RESUME_RECURRING_GROUP, {
    onCompleted: () => refetch(),
  });

  if (authLoading) return <LoadingSpinner text="Se verifica autentificarea..." />;
  if (!isAuthenticated) return <Navigate to="/autentificare" replace />;
  if (loading) return <LoadingSpinner text="Se incarca detaliile..." />;
  if (error || !data?.recurringGroup) {
    return (
      <div className="py-4 sm:py-8">
        <div className="max-w-3xl mx-auto sm:px-2 text-center">
          <p className="text-danger mb-4">Nu am putut incarca seria recurenta.</p>
          <Button variant="outline" onClick={() => navigate('/cont/comenzi')}>
            Inapoi la comenzi
          </Button>
        </div>
      </div>
    );
  }

  const group = data.recurringGroup;

  return (
    <div className="py-4 sm:py-8">
      <div className="max-w-3xl mx-auto sm:px-2">
        {/* Back button */}
        <button
          onClick={() => navigate('/cont/comenzi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la comenzi
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Repeat className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {group.serviceName}
              </h1>
              <span
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-full',
                  group.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {group.isActive ? 'Activa' : group.cancelledAt ? 'Anulata' : 'Pauza'}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {RECURRENCE_LABELS[group.recurrenceType] || group.recurrenceType} —{' '}
              {DAY_NAMES[group.dayOfWeek] || ''}, ora {formatTime(group.preferredTime)}
            </p>
          </div>

          {group.isActive && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pauseGroup({ variables: { id: group.id } })}
                disabled={pausing}
              >
                <Pause className="h-4 w-4" />
                Pauza
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Anuleaza seria
              </Button>
            </div>
          )}

          {!group.isActive && !group.cancelledAt && (
            <Button
              size="sm"
              onClick={() => resumeGroup({ variables: { id: group.id } })}
              disabled={resuming}
            >
              <Play className="h-4 w-4" />
              Reia seria
            </Button>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Preferred cleaner */}
          {group.preferredCleaner && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Curatator preferat</p>
                  <p className="font-semibold text-gray-900">{group.preferredCleaner.fullName}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Company */}
          {group.company && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Companie</p>
                  <p className="font-semibold text-gray-900">{group.company.companyName}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Address */}
          {group.address && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Adresa</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {group.address.streetAddress}, {group.address.city}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Price */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pret per sesiune</p>
                <p className="font-semibold text-gray-900">
                  {group.estimatedTotalPerOccurrence} lei
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Progres</h3>
            <span className="text-sm text-gray-500">
              {group.completedOccurrences} / {group.totalOccurrences} finalizate
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${group.totalOccurrences > 0 ? (group.completedOccurrences / group.totalOccurrences) * 100 : 0}%`,
              }}
            />
          </div>
        </Card>

        {/* Occurrences */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Toate programarile ({group.occurrences.length})
        </h3>
        <div className="space-y-3">
          {group.occurrences.map((occ) => {
            const isSubstitute =
              group.preferredCleaner &&
              occ.cleaner &&
              occ.cleaner.id !== group.preferredCleaner.id;

            return (
              <Card
                key={occ.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/cont/comenzi/${occ.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        #{occ.occurrenceNumber}
                      </span>
                      <Badge status={occ.status} />
                      {occ.paymentStatus === 'PAID' && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Platit
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(occ.scheduledDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(occ.scheduledStartTime)}
                      </span>
                      {occ.cleaner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {occ.cleaner.fullName}
                          {isSubstitute && (
                            <span className="text-xs text-amber-600 font-medium">
                              (Inlocuitor)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-gray-900">
                      {occ.estimatedTotal} lei
                    </div>
                    <div className="text-xs text-gray-400">{occ.referenceCode}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Cancel Modal */}
        <Modal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Anuleaza seria recurenta"
        >
          <p className="text-sm text-gray-600 mb-4">
            Toate programarile viitoare vor fi anulate. Programarile deja finalizate nu sunt afectate.
          </p>
          <textarea
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 resize-none mb-4"
            rows={3}
            placeholder="Motivul anularii (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Renunta
            </Button>
            <Button
              onClick={() =>
                cancelGroup({
                  variables: { id: group.id, reason: cancelReason || undefined },
                })
              }
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'Se anuleaza...' : 'Confirma anularea'}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
