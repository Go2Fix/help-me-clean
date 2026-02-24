import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Building2 } from 'lucide-react';
import { cn } from '@go2fix/shared';
import {
  MY_WORKER_AVAILABILITY,
  MY_WORKER_BOOKINGS_BY_DATE_RANGE,
  MY_WORKER_COMPANY_SCHEDULE,
  MY_WORKER_DATE_OVERRIDES,
  SET_WORKER_DATE_OVERRIDE,
} from '@/graphql/operations';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- Types -------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Booking {
  id: string;
  referenceCode: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  client: { fullName: string } | null;
  address: { streetAddress: string; city: string } | null;
}

interface CompanyScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkDay: boolean;
}

interface DateOverride {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface EditModalState {
  open: boolean;
  date: string;
  dayName: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

// --- Constants & Helpers -----------------------------------------------------

const DAY_NAMES = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function fmtYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDM(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Grid index (0=Mon..6=Sun) to API dayOfWeek (0=Sun,1=Mon..6=Sat). */
function gridToDow(idx: number): number {
  return idx === 6 ? 0 : idx + 1;
}

// --- Component ---------------------------------------------------------------

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [modal, setModal] = useState<EditModalState>({
    open: false, date: '', dayName: 'Luni',
    isAvailable: true, startTime: '08:00', endTime: '17:00',
  });

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const fromDate = fmtYMD(weekStart);
  const toDate = fmtYMD(weekEnd);

  const { data: availData, loading: availLoading } = useQuery(MY_WORKER_AVAILABILITY);
  const { data: bookData, loading: bookLoading } = useQuery(
    MY_WORKER_BOOKINGS_BY_DATE_RANGE,
    { variables: { from: fromDate, to: toDate } },
  );
  const { data: scheduleData } = useQuery(MY_WORKER_COMPANY_SCHEDULE);
  const { data: overridesData, refetch: refetchOverrides } = useQuery(
    MY_WORKER_DATE_OVERRIDES,
    { variables: { from: fromDate, to: toDate } },
  );
  const [setDateOverride, { loading: saving }] = useMutation(SET_WORKER_DATE_OVERRIDE);

  const availability: AvailabilitySlot[] = availData?.myWorkerAvailability ?? [];
  const bookings: Booking[] = bookData?.myWorkerBookingsByDateRange ?? [];
  const companySchedule: CompanyScheduleSlot[] = scheduleData?.myWorkerCompanySchedule ?? [];
  const dateOverrides: DateOverride[] = overridesData?.myWorkerDateOverrides ?? [];
  const loading = availLoading || bookLoading;

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const arr = map.get(b.scheduledDate) ?? [];
      arr.push(b);
      map.set(b.scheduledDate, arr);
    }
    return map;
  }, [bookings]);

  const overridesByDate = useMemo(() => {
    const map = new Map<string, DateOverride>();
    for (const o of dateOverrides) {
      map.set(o.date, o);
    }
    return map;
  }, [dateOverrides]);

  const getSlotForDow = useCallback(
    (dow: number): AvailabilitySlot | undefined =>
      availability.find((s) => s.dayOfWeek === dow),
    [availability],
  );

  const getCompanySlotForDow = useCallback(
    (dow: number): CompanyScheduleSlot | undefined =>
      companySchedule.find((s) => s.dayOfWeek === dow),
    [companySchedule],
  );

  const goToPrevWeek = () => setWeekStart((p) => addDays(p, -7));
  const goToNextWeek = () => setWeekStart((p) => addDays(p, 7));
  const goToToday = () => setWeekStart(getMonday(new Date()));

  function openEditModal(gridIdx: number, date: Date) {
    const dow = gridToDow(gridIdx);
    const dateStr = fmtYMD(date);
    const override = overridesByDate.get(dateStr);
    const slot = getSlotForDow(dow);
    const companySlot = getCompanySlotForDow(dow);

    let defaultAvailable = true;
    let defaultStart = '08:00';
    let defaultEnd = '17:00';

    // Priority: date override > weekly availability > company schedule > default
    if (override) {
      defaultAvailable = override.isAvailable;
      defaultStart = override.startTime;
      defaultEnd = override.endTime;
    } else if (slot) {
      defaultAvailable = slot.isAvailable;
      defaultStart = slot.startTime;
      defaultEnd = slot.endTime;
    } else if (companySlot) {
      defaultAvailable = companySlot.isWorkDay;
      defaultStart = companySlot.startTime;
      defaultEnd = companySlot.endTime;
    }

    setModal({
      open: true, date: dateStr, dayName: DAY_NAMES[dow],
      isAvailable: defaultAvailable,
      startTime: defaultStart,
      endTime: defaultEnd,
    });
  }

  function getCompanyBoundsForDate(dateStr: string): { minTime: string; maxTime: string } | null {
    if (!dateStr) return null;
    const dow = new Date(dateStr).getDay();
    const cs = getCompanySlotForDow(dow);
    if (!cs || !cs.isWorkDay) return null;
    return { minTime: cs.startTime, maxTime: cs.endTime };
  }

  async function handleSave() {
    // Clamp times to company bounds before saving
    const bounds = getCompanyBoundsForDate(modal.date);
    let startTime = modal.startTime;
    let endTime = modal.endTime;
    if (bounds && modal.isAvailable) {
      if (startTime < bounds.minTime) startTime = bounds.minTime;
      if (endTime > bounds.maxTime) endTime = bounds.maxTime;
      if (startTime >= endTime) {
        startTime = bounds.minTime;
        endTime = bounds.maxTime;
      }
    }
    await setDateOverride({
      variables: {
        date: modal.date,
        isAvailable: modal.isAvailable,
        startTime,
        endTime,
      },
    });
    setModal((p) => ({ ...p, open: false }));
    refetchOverrides();
  }

  const weekLabel = `${fmtDM(weekStart)} - ${fmtDM(weekEnd)} ${weekEnd.getFullYear()}`;

  if (loading && availability.length === 0 && bookings.length === 0) {
    return <LoadingSpinner text="Se incarca calendarul..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Programul meu</h1>
        <p className="text-gray-500 mt-1">Gestioneaza disponibilitatea si vezi programarile tale.</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
            aria-label="Saptamana anterioara"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextWeek}
            className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
            aria-label="Saptamana urmatoare"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm sm:text-base font-bold text-gray-900">{weekLabel}</span>
        <Button variant="outline" size="sm" onClick={goToToday}>Astazi</Button>
      </div>

      {/* Compact Week List */}
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {weekDates.map((date, gridIdx) => {
            const dow = gridToDow(gridIdx);
            const dateStr = fmtYMD(date);
            const todayStr = fmtYMD(new Date());
            const override = overridesByDate.get(dateStr);
            const slot = getSlotForDow(dow);
            const companySlot = getCompanySlotForDow(dow);
            const dayBookings = bookingsByDate.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isCompanyOff = companySlot ? !companySlot.isWorkDay : false;

            // Resolve schedule text & style
            let scheduleText: string;
            let scheduleColor: string;
            if (override) {
              scheduleText = override.isAvailable ? `${override.startTime} - ${override.endTime}` : 'Indisponibil';
              scheduleColor = override.isAvailable ? 'text-emerald-600' : 'text-red-500';
            } else if (slot) {
              scheduleText = slot.isAvailable ? `${slot.startTime} - ${slot.endTime}` : 'Indisponibil';
              scheduleColor = slot.isAvailable ? 'text-emerald-600' : 'text-red-400';
            } else if (companySlot && companySlot.isWorkDay) {
              scheduleText = `${companySlot.startTime} - ${companySlot.endTime}`;
              scheduleColor = 'text-blue-600';
            } else if (companySlot && !companySlot.isWorkDay) {
              scheduleText = 'Zi libera';
              scheduleColor = 'text-gray-400';
            } else {
              scheduleText = 'Disponibil';
              scheduleColor = 'text-emerald-600';
            }

            return (
              <div key={gridIdx} className={cn(
                'px-4 py-3',
                isPast && 'opacity-40',
                isToday && 'bg-primary/5 border-l-3 border-l-primary',
              )}>
                {/* Day row */}
                <div className="flex items-center gap-3">
                  {/* Date circle */}
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                    isToday ? 'bg-primary text-white' : isPast ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-700',
                  )}>
                    {String(date.getDate()).padStart(2, '0')}
                  </div>
                  {/* Day name + schedule */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold', isPast ? 'text-gray-400' : 'text-gray-900')}>
                        {DAY_NAMES[dow]}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDM(date)}</span>
                    </div>
                    <p className={cn('text-xs font-medium mt-0.5', scheduleColor)}>
                      {scheduleText}
                    </p>
                  </div>
                  {/* Edit button */}
                  {!isPast && !isCompanyOff && (
                    <button
                      onClick={() => openEditModal(gridIdx, date)}
                      className="text-xs font-medium text-primary hover:text-blue-700 transition-colors cursor-pointer shrink-0"
                      aria-label={`Editeaza ${DAY_NAMES[dow]}`}
                    >
                      Editeaza
                    </button>
                  )}
                </div>
                {/* Booking sub-list */}
                {dayBookings.length > 0 && (
                  <div className={cn('ml-12 mt-2 space-y-1.5', isPast && 'opacity-70')}>
                    {dayBookings.map((b) => (
                      <Link
                        key={b.id}
                        to={`/worker/comenzi/${b.id}`}
                        className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Clock className="h-3 w-3 text-primary/60 shrink-0" />
                        <span className="font-medium text-gray-900">{b.scheduledStartTime}</span>
                        <span className="text-gray-600 truncate">{b.client?.fullName ?? 'Client'}</span>
                        <span className="text-gray-400 truncate hidden sm:inline">{b.serviceName}</span>
                        <ChevronRight className="h-3 w-3 text-gray-300 ml-auto shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Availability Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal((p) => ({ ...p, open: false }))}
        title={`Editare disponibilitate - ${modal.dayName} ${modal.date ? modal.date.split('-').reverse().join('.') : ''}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="modal-available"
              checked={modal.isAvailable}
              onChange={(e) => setModal((p) => ({ ...p, isAvailable: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <label htmlFor="modal-available" className="text-sm font-medium text-gray-700">
              Disponibil
            </label>
          </div>
          {modal.isAvailable && (() => {
            const bounds = getCompanyBoundsForDate(modal.date);
            const outOfBounds = bounds && (modal.startTime < bounds.minTime || modal.endTime > bounds.maxTime);
            return (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ora inceput" type="text" inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" placeholder="HH:MM"
                    value={modal.startTime}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9:]/g, '');
                      if (v.length === 2 && !v.includes(':')) v += ':';
                      if (v.length > 5) v = v.slice(0, 5);
                      setModal((p) => ({ ...p, startTime: v }));
                    }} />
                  <Input label="Ora sfarsit" type="text" inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" placeholder="HH:MM"
                    value={modal.endTime}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9:]/g, '');
                      if (v.length === 2 && !v.includes(':')) v += ':';
                      if (v.length > 5) v = v.slice(0, 5);
                      setModal((p) => ({ ...p, endTime: v }));
                    }} />
                </div>
                {bounds && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Program firma: {bounds.minTime} - {bounds.maxTime}
                  </p>
                )}
                {outOfBounds && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Orele vor fi ajustate la programul firmei la salvare.
                  </p>
                )}
              </>
            );
          })()}
          <p className="text-xs text-gray-400">
            Modificarea se aplica doar pentru data de {modal.date ? modal.date.split('-').reverse().join('.') : ''}.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModal((p) => ({ ...p, open: false }))} className="flex-1">
              Anuleaza
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Salveaza
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
