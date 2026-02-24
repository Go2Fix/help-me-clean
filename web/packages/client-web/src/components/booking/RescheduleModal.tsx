import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { CalendarClock, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import TimeInput24h from '@/components/ui/TimeInput24h';
import { CHECK_WORKER_AVAILABILITY } from '@/graphql/operations';

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string, reason?: string) => Promise<void>;
  loading: boolean;
  bookingId: string;
  hasWorker: boolean;
  rescheduleFreeHoursBefore: number;
  rescheduleMaxPerBooking: number;
  currentRescheduleCount: number;
  scheduledDate: string;
  scheduledStartTime: string;
  isAdmin?: boolean;
}

export default function RescheduleModal({
  open,
  onClose,
  onConfirm,
  loading,
  bookingId,
  hasWorker,
  rescheduleFreeHoursBefore,
  rescheduleMaxPerBooking,
  currentRescheduleCount,
  scheduledDate,
  scheduledStartTime,
  isAdmin = false,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [checkAvailability, { data: availData, loading: availLoading }] = useLazyQuery(
    CHECK_WORKER_AVAILABILITY,
    { fetchPolicy: 'network-only' },
  );

  // Check availability when both date and time are selected and there's a worker assigned.
  useEffect(() => {
    if (newDate && newTime && hasWorker) {
      checkAvailability({ variables: { bookingId, date: newDate, startTime: newTime } });
    }
  }, [newDate, newTime, bookingId, hasWorker, checkAvailability]);

  const availability = availData?.checkWorkerAvailability;

  const hoursUntil = (() => {
    try {
      const [h, m] = scheduledStartTime.split(':').map(Number);
      const start = new Date(
        `${scheduledDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      );
      return (start.getTime() - Date.now()) / 3_600_000;
    } catch {
      return Infinity;
    }
  })();

  const isPastFreeWindow = hoursUntil < rescheduleFreeHoursBefore;
  const remainingReschedules = rescheduleMaxPerBooking - currentRescheduleCount;

  const minDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const handleConfirm = async () => {
    setError(null);
    if (!newDate || !newTime) {
      setError('Selecteaza data si ora noua.');
      return;
    }
    try {
      await onConfirm(newDate, newTime, reason.trim() || undefined);
      setNewDate('');
      setNewTime('');
      setReason('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare necunoscuta.');
    }
  };

  const handleClose = () => {
    setError(null);
    setNewDate('');
    setNewTime('');
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reprogrameaza comanda">
      {isPastFreeWindow && !isAdmin && (
        <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Programarea este in mai putin de {rescheduleFreeHoursBefore} ore.
            Te rugam sa te asiguri ca noua data si ora sunt convenabile.
          </p>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-gray-400 mb-4">
          Reprogramari folosite: {currentRescheduleCount} / {rescheduleMaxPerBooking}
          {remainingReschedules === 1 && (
            <span className="text-amber-600 ml-1">(ultima disponibila)</span>
          )}
        </p>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Data noua
          </label>
          <input
            type="date"
            min={minDate}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ora noua
          </label>
          <TimeInput24h value={newTime} onChange={setNewTime} />
        </div>

        {/* Worker availability indicator */}
        {hasWorker && newDate && newTime && (
          <div className="flex items-start gap-2 p-3 rounded-xl border">
            {availLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se verifica disponibilitatea lucratorului...
              </div>
            ) : availability?.available ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 w-full -m-3 p-3 rounded-xl border-emerald-100">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Lucratorul este disponibil la data si ora selectata
              </div>
            ) : (
              <div className="w-full -m-3 p-3 rounded-xl bg-red-50 border-red-100">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {availability?.reason || 'Lucratorul nu este disponibil'}
                </div>
                {availability?.conflicts && availability.conflicts.length > 0 && (
                  <ul className="mt-1.5 ml-6 text-xs text-red-600 space-y-0.5">
                    {availability.conflicts.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Motiv (optional)
          </label>
          <textarea
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            rows={2}
            placeholder="De ce reprogramezi?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={handleClose}>
          Renunta
        </Button>
        <Button loading={loading} disabled={!newDate || !newTime} onClick={handleConfirm}>
          <CalendarClock className="h-4 w-4" />
          Confirma reprogramarea
        </Button>
      </div>
    </Modal>
  );
}
