import { useState, useEffect, useMemo } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  RESOLVE_SUBSCRIPTION_WORKER_CHANGE,
  CHECK_WORKER_FOR_SUBSCRIPTION,
  RESOLVE_WORKER_CHANGE_PER_BOOKING,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkerOption {
  id: string;
  fullName: string;
  email?: string;
  status: string;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  company?: { id: string; companyName: string } | null;
}

interface BookingAvailability {
  bookingId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  referenceCode: string;
  available: boolean;
  reason: string | null;
  conflicts: string[] | null;
}

interface AvailabilityResult {
  checkWorkerForSubscriptionBookings: {
    subscriptionId: string;
    workerId: string;
    workerName: string;
    allAvailable: boolean;
    availableCount: number;
    conflictCount: number;
    bookings: BookingAvailability[];
  };
}

interface WorkerChangeModalProps {
  open: boolean;
  onClose: () => void;
  subscriptionId: string;
  workerChangeReason?: string | null;
  workerChangeRequestedAt?: string | null;
  workers: WorkerOption[];
  loadingWorkers: boolean;
  showCompanyName?: boolean;
  onSuccess: () => void;
  refetchQueries?: any[];
}

type Phase = 'select' | 'checking' | 'allClear' | 'conflicts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function fmtTime(timeStr: string): string {
  return timeStr ? timeStr.slice(0, 5) : '';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkerChangeModal({
  open,
  onClose,
  subscriptionId,
  workerChangeReason,
  workerChangeRequestedAt,
  workers,
  loadingWorkers,
  showCompanyName = false,
  onSuccess,
  refetchQueries,
}: WorkerChangeModalProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [perBookingAssignments, setPerBookingAssignments] = useState<
    Record<string, string>
  >({});

  // ── Reset state when modal opens/closes ─────────────────────────────────

  useEffect(() => {
    if (open) {
      setPhase('select');
      setSelectedWorkerId(null);
      setWorkerSearch('');
      setError(null);
      setPerBookingAssignments({});
    }
  }, [open]);

  const resetState = () => {
    setPhase('select');
    setSelectedWorkerId(null);
    setWorkerSearch('');
    setError(null);
    setPerBookingAssignments({});
  };

  // ── GraphQL operations ──────────────────────────────────────────────────

  const [checkAvailability, { data: availData }] =
    useLazyQuery<AvailabilityResult>(CHECK_WORKER_FOR_SUBSCRIPTION, {
      fetchPolicy: 'network-only',
    });

  const [resolveWorkerChange, { loading: resolvingSimple }] = useMutation(
    RESOLVE_SUBSCRIPTION_WORKER_CHANGE,
    {
      refetchQueries,
      onCompleted: () => {
        resetState();
        onClose();
        onSuccess();
      },
      onError: (err) => setError(err.message),
    },
  );

  const [resolvePerBooking, { loading: resolvingPerBooking }] = useMutation(
    RESOLVE_WORKER_CHANGE_PER_BOOKING,
    {
      refetchQueries,
      onCompleted: () => {
        resetState();
        onClose();
        onSuccess();
      },
      onError: (err) => setError(err.message),
    },
  );

  // ── Derived data ────────────────────────────────────────────────────────

  const activeWorkers = useMemo(
    () => workers.filter((w) => w.status === 'ACTIVE' || w.status === 'active'),
    [workers],
  );

  const filteredWorkers = useMemo(() => {
    if (!workerSearch) return activeWorkers;
    const q = workerSearch.toLowerCase();
    return activeWorkers.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        (showCompanyName &&
          (w.company?.companyName ?? '').toLowerCase().includes(q)),
    );
  }, [activeWorkers, workerSearch, showCompanyName]);

  const selectedWorker = useMemo(
    () => activeWorkers.find((w) => w.id === selectedWorkerId) ?? null,
    [activeWorkers, selectedWorkerId],
  );

  const checkResult = availData?.checkWorkerForSubscriptionBookings ?? null;

  const conflictingBookings = useMemo(
    () => (checkResult?.bookings ?? []).filter((b) => !b.available),
    [checkResult],
  );

  const allConflictsAssigned = useMemo(() => {
    if (conflictingBookings.length === 0) return false;
    return conflictingBookings.every(
      (b) => !!perBookingAssignments[b.bookingId],
    );
  }, [conflictingBookings, perBookingAssignments]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCheckAvailability = async () => {
    if (!selectedWorkerId) return;
    setError(null);
    setPhase('checking');
    try {
      const { data } = await checkAvailability({
        variables: { subscriptionId, workerId: selectedWorkerId },
      });
      const result = data?.checkWorkerForSubscriptionBookings;
      if (result?.allAvailable) {
        setPhase('allClear');
      } else {
        setPerBookingAssignments({});
        setPhase('conflicts');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la verificare.');
      setPhase('select');
    }
  };

  const handleConfirmSimple = () => {
    if (!selectedWorkerId) return;
    resolveWorkerChange({
      variables: { id: subscriptionId, workerId: selectedWorkerId },
    });
  };

  const handleConfirmPerBooking = () => {
    if (!selectedWorkerId) return;
    const assignments = Object.entries(perBookingAssignments).map(
      ([bookingId, workerId]) => ({ bookingId, workerId }),
    );
    resolvePerBooking({
      variables: {
        id: subscriptionId,
        defaultWorkerId: selectedWorkerId,
        assignments,
      },
    });
  };

  const handleBackToSelect = () => {
    setPhase('select');
    setError(null);
    setPerBookingAssignments({});
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Atribuie lucrator nou"
      className={phase === 'conflicts' ? 'max-w-2xl' : undefined}
    >
      <div className="space-y-4">
        {/* ── Phase: Select ─────────────────────────────────────────────── */}
        {phase === 'select' && (
          <>
            {/* Reason banner */}
            {workerChangeRequestedAt && workerChangeReason && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Motiv cerere client
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {workerChangeReason}
                  </p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cauta lucrator..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Worker List */}
            <div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
              {loadingWorkers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Niciun lucrator gasit.
                </p>
              ) : (
                filteredWorkers.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWorkerId(w.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left cursor-pointer',
                      selectedWorkerId === w.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-gray-50',
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-accent">
                        {w.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {w.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {showCompanyName
                          ? (w.company?.companyName ?? 'Fara companie')
                          : ''}
                        {showCompanyName &&
                        (w.ratingAvg != null || w.totalJobsCompleted > 0)
                          ? ' · '
                          : ''}
                        {w.ratingAvg != null
                          ? `★ ${w.ratingAvg.toFixed(1)}`
                          : ''}
                        {w.totalJobsCompleted > 0
                          ? `${w.ratingAvg != null ? ' · ' : ''}${w.totalJobsCompleted} comenzi`
                          : ''}
                      </p>
                    </div>
                    {selectedWorkerId === w.id && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose}>
                Anuleaza
              </Button>
              <Button
                disabled={!selectedWorkerId}
                onClick={handleCheckAvailability}
              >
                Verifica disponibilitate
              </Button>
            </div>
          </>
        )}

        {/* ── Phase: Checking ──────────────────────────────────────────── */}
        {phase === 'checking' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500">
              Se verifica disponibilitatea pentru{' '}
              <span className="font-medium text-gray-700">
                {selectedWorker?.fullName}
              </span>
              ...
            </p>
          </div>
        )}

        {/* ── Phase: All Clear ─────────────────────────────────────────── */}
        {phase === 'allClear' && checkResult && (
          <>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                Lucratorul{' '}
                <span className="font-semibold">{checkResult.workerName}</span>{' '}
                este disponibil pentru toate cele{' '}
                <span className="font-semibold">
                  {checkResult.availableCount}
                </span>{' '}
                programari viitoare.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={handleBackToSelect}>
                <ArrowLeft className="h-4 w-4" />
                Inapoi
              </Button>
              <Button loading={resolvingSimple} onClick={handleConfirmSimple}>
                Confirma schimbarea
              </Button>
            </div>
          </>
        )}

        {/* ── Phase: Conflicts ─────────────────────────────────────────── */}
        {phase === 'conflicts' && checkResult && (
          <>
            {/* Conflict header */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">
                  {checkResult.conflictCount}
                </span>{' '}
                din{' '}
                <span className="font-semibold">
                  {checkResult.availableCount + checkResult.conflictCount}
                </span>{' '}
                programari au conflicte cu{' '}
                <span className="font-semibold">{checkResult.workerName}</span>.
                Atribuie un lucrator alternativ pentru fiecare conflict.
              </p>
            </div>

            {/* Booking list */}
            <div className="max-h-72 overflow-y-auto space-y-2 -mx-1 px-1">
              {checkResult.bookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  className={cn(
                    'p-3 rounded-xl border',
                    booking.available
                      ? 'border-emerald-100 bg-emerald-50/50'
                      : 'border-red-100 bg-red-50/50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {booking.available ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {fmtDate(booking.scheduledDate)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {fmtTime(booking.scheduledStartTime)}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {booking.referenceCode}
                        </span>
                      </div>

                      {booking.available ? (
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {checkResult.workerName}
                        </p>
                      ) : (
                        <>
                          {booking.reason && (
                            <p className="text-xs text-red-600 mt-0.5">
                              {booking.reason}
                            </p>
                          )}
                          {booking.conflicts &&
                            booking.conflicts.length > 0 && (
                              <ul className="mt-0.5 text-xs text-red-500 space-y-0.5">
                                {booking.conflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            )}

                          {/* Per-booking worker selector */}
                          <div className="mt-2">
                            <select
                              value={
                                perBookingAssignments[booking.bookingId] ?? ''
                              }
                              onChange={(e) =>
                                setPerBookingAssignments((prev) => ({
                                  ...prev,
                                  [booking.bookingId]: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            >
                              <option value="">
                                -- Selecteaza lucrator --
                              </option>
                              {activeWorkers.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.fullName}
                                  {showCompanyName && w.company
                                    ? ` (${w.company.companyName})`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={handleBackToSelect}>
                <ArrowLeft className="h-4 w-4" />
                Inapoi la selectie
              </Button>
              <Button
                loading={resolvingPerBooking}
                disabled={!allConflictsAssigned}
                onClick={handleConfirmPerBooking}
              >
                Confirma cu asignari individuale
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
