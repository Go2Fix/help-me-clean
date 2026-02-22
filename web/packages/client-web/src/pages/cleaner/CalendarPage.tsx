import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, Calendar, Building2 } from 'lucide-react';
import { cn } from '@go2fix/shared';
import {
  MY_CLEANER_AVAILABILITY,
  MY_CLEANER_BOOKINGS_BY_DATE_RANGE,
  MY_CLEANER_COMPANY_SCHEDULE,
  MY_CLEANER_DATE_OVERRIDES,
  SET_CLEANER_DATE_OVERRIDE,
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

  const { data: availData, loading: availLoading } = useQuery(MY_CLEANER_AVAILABILITY);
  const { data: bookData, loading: bookLoading } = useQuery(
    MY_CLEANER_BOOKINGS_BY_DATE_RANGE,
    { variables: { from: fromDate, to: toDate } },
  );
  const { data: scheduleData } = useQuery(MY_CLEANER_COMPANY_SCHEDULE);
  const { data: overridesData, refetch: refetchOverrides } = useQuery(
    MY_CLEANER_DATE_OVERRIDES,
    { variables: { from: fromDate, to: toDate } },
  );
  const [setDateOverride, { loading: saving }] = useMutation(SET_CLEANER_DATE_OVERRIDE);

  const availability: AvailabilitySlot[] = availData?.myCleanerAvailability ?? [];
  const bookings: Booking[] = bookData?.myCleanerBookingsByDateRange ?? [];
  const companySchedule: CompanyScheduleSlot[] = scheduleData?.myCleanerCompanySchedule ?? [];
  const dateOverrides: DateOverride[] = overridesData?.myCleanerDateOverrides ?? [];
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
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={goToPrevWeek}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Saptamana anterioara</span>
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary hidden sm:block" />
            <span className="text-sm sm:text-base font-semibold text-gray-900">{weekLabel}</span>
            <Button variant="outline" size="sm" onClick={goToToday}>Astazi</Button>
          </div>
          <button
            onClick={goToNextWeek}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Saptamana urmatoare</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* Day Cards */}
      <div className="space-y-3">
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

          // Resolve effective availability: date override > weekly slot > company schedule > default
          let statusElement: React.ReactNode;
          if (override) {
            if (override.isAvailable) {
              statusElement = (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {override.startTime} - {override.endTime}
                </span>
              );
            } else {
              statusElement = (
                <span className="inline-flex items-center rounded-xl bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-red-600 whitespace-nowrap">
                  Indisponibil
                </span>
              );
            }
          } else if (slot) {
            if (slot.isAvailable) {
              statusElement = (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50/50 border border-dashed border-emerald-300 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-600 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {slot.startTime} - {slot.endTime}
                </span>
              );
            } else {
              statusElement = (
                <span className="inline-flex items-center rounded-xl bg-red-50/50 border border-dashed border-red-200 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-red-400 whitespace-nowrap">
                  Indisponibil
                </span>
              );
            }
          } else if (companySlot && companySlot.isWorkDay) {
            statusElement = (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50/50 border border-dashed border-blue-300 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-blue-600 whitespace-nowrap">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {companySlot.startTime} - {companySlot.endTime}
              </span>
            );
          } else if (companySlot && !companySlot.isWorkDay) {
            statusElement = (
              <span className="inline-flex items-center rounded-xl bg-gray-100 border border-dashed border-gray-300 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-400 whitespace-nowrap">
                Zi libera
              </span>
            );
          } else {
            statusElement = (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50/50 border border-dashed border-emerald-300 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-600 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Disponibil
              </span>
            );
          }

          return (
            <Card key={gridIdx} className={cn(
              isToday && 'ring-2 ring-primary/30',
              isPast && 'opacity-50',
            )}>
              {/* Mobile layout: relative so edit button can sit top-right */}
              <div className="relative sm:flex sm:items-center sm:justify-between sm:gap-2">
                {/* Edit button / label — top-right on mobile, inline-right on desktop */}
                <div className="absolute right-0 top-0 sm:relative sm:order-3 shrink-0">
                  {isPast ? (
                    <span className="text-xs text-gray-300 px-2">Trecut</span>
                  ) : isCompanyOff ? (
                    <span className="text-xs text-gray-300 px-2">Zi libera</span>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(gridIdx, date)} aria-label={`Editeaza ${DAY_NAMES[dow]}`}>
                      Editeaza
                    </Button>
                  )}
                </div>
                {/* Left: Day name + date + status badge on mobile */}
                <div className="flex items-center gap-3 shrink-0 sm:order-1 pr-20 sm:pr-0">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    isToday ? 'bg-primary text-white' : isPast ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600',
                  )}>
                    {String(date.getDate()).padStart(2, '0')}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', isPast ? 'text-gray-400' : 'text-gray-900')}>{DAY_NAMES[dow]}</p>
                    <p className="text-xs text-gray-400">{fmtDM(date)}</p>
                  </div>
                  {/* Status badge — inline on mobile */}
                  <div className="sm:hidden">
                    {statusElement}
                  </div>
                </div>
                {/* Middle: Availability status (desktop only) */}
                <div className="hidden sm:flex flex-1 justify-center px-2 sm:order-2">
                  {statusElement}
                </div>
              </div>
              {/* Booking Pills */}
              {dayBookings.length > 0 && (
                <div className={cn('mt-3 flex flex-wrap gap-2', isPast && 'opacity-70')}>
                  {dayBookings.map((b) => (
                    <Link
                      key={b.id}
                      to={`/worker/comenzi/${b.id}`}
                      className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/20 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-primary">{b.client?.fullName ?? 'Client'}</span>
                      <span className="text-xs text-primary/70">{b.scheduledStartTime}</span>
                      <span className="text-xs text-primary/60 hidden sm:inline">{b.serviceName}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

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
                  <Input label="Ora inceput" type="time" value={modal.startTime}
                    min={bounds?.minTime} max={bounds?.maxTime}
                    onChange={(e) => setModal((p) => ({ ...p, startTime: e.target.value }))} />
                  <Input label="Ora sfarsit" type="time" value={modal.endTime}
                    min={bounds?.minTime} max={bounds?.maxTime}
                    onChange={(e) => setModal((p) => ({ ...p, endTime: e.target.value }))} />
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
