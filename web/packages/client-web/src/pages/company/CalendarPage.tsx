import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MY_CLEANERS,
  COMPANY_BOOKINGS_BY_DATE_RANGE,
  CLEANER_DATE_OVERRIDES,
  SET_CLEANER_DATE_OVERRIDE_BY_ADMIN,
  MY_COMPANY_WORK_SCHEDULE,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Cleaner {
  id: string;
  fullName: string;
  status: string;
  avatarUrl: string | null;
  availability: AvailabilitySlot[];
}

interface Booking {
  id: string;
  referenceCode: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  client: { id: string; fullName: string; phone: string } | null;
  cleaner: { id: string; fullName: string } | null;
  address: { streetAddress: string; city: string } | null;
}

interface WorkScheduleSlot {
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

interface EffectiveAvailability {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  source: 'override' | 'weekly' | 'company' | 'default';
}

interface ModalState {
  open: boolean;
  cleanerId: string;
  cleanerName: string;
  date: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// ─── Constants & Helpers ────────────────────────────────────────────────────

const DAY_SHORT = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];
const DAY_FULL = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success', INVITED: 'info', PENDING: 'warning', SUSPENDED: 'danger', INACTIVE: 'default',
};
const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ', INVITED: 'Invitat', PENDING: 'In asteptare', SUSPENDED: 'Suspendat', INACTIVE: 'Inactiv',
};

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

/** Grid index (0=Mon) to API dayOfWeek (0=Sun). */
function gridToDow(idx: number): number { return idx === 6 ? 0 : idx + 1; }

/** Add hours to "HH:MM" and return "HH:MM". */
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [mobileDay, setMobileDay] = useState(0);
  const [modal, setModal] = useState<ModalState>({
    open: false, cleanerId: '', cleanerName: '',
    date: '', dayLabel: '', startTime: '08:00', endTime: '16:00',
    isAvailable: true,
  });

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const fromDate = fmtYMD(weekStart);
  const toDate = fmtYMD(weekEnd);

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: cData, loading: cLoading, refetch: refetchCleaners } = useQuery(MY_CLEANERS);
  const { data: bData, loading: bLoading, refetch: refetchBookings } = useQuery(
    COMPANY_BOOKINGS_BY_DATE_RANGE, { variables: { from: fromDate, to: toDate } },
  );
  const { data: wsData, loading: wsLoading } = useQuery(MY_COMPANY_WORK_SCHEDULE);
  const [setDateOverride, { loading: saving }] = useMutation(SET_CLEANER_DATE_OVERRIDE_BY_ADMIN);

  const cleaners: Cleaner[] = cData?.myCleaners ?? [];
  const bookings: Booking[] = bData?.companyBookingsByDateRange ?? [];
  const workSchedule: WorkScheduleSlot[] = wsData?.myCompanyWorkSchedule ?? [];
  const loading = cLoading || bLoading || wsLoading;

  // Fetch date overrides for all cleaners. We batch them into a single derived query
  // using the first cleaner's data to trigger refetch for all.
  const firstCleanerId = cleaners[0]?.id;
  const { data: ovDataFirst, refetch: refetchOverridesFirst } = useQuery(CLEANER_DATE_OVERRIDES, {
    variables: { cleanerId: firstCleanerId ?? '', from: fromDate, to: toDate },
    skip: !firstCleanerId,
  });
  const secondCleanerId = cleaners[1]?.id;
  const { data: ovDataSecond, refetch: refetchOverridesSecond } = useQuery(CLEANER_DATE_OVERRIDES, {
    variables: { cleanerId: secondCleanerId ?? '', from: fromDate, to: toDate },
    skip: !secondCleanerId,
  });
  const thirdCleanerId = cleaners[2]?.id;
  const { data: ovDataThird, refetch: refetchOverridesThird } = useQuery(CLEANER_DATE_OVERRIDES, {
    variables: { cleanerId: thirdCleanerId ?? '', from: fromDate, to: toDate },
    skip: !thirdCleanerId,
  });

  // Build override index: cleanerId_date -> DateOverride
  const overrideIndex = useMemo(() => {
    const map = new Map<string, DateOverride>();
    const addOverrides = (cid: string | undefined, data: DateOverride[]) => {
      if (!cid) return;
      for (const o of data) map.set(`${cid}_${o.date}`, o);
    };
    addOverrides(firstCleanerId, ovDataFirst?.cleanerDateOverrides ?? []);
    addOverrides(secondCleanerId, ovDataSecond?.cleanerDateOverrides ?? []);
    addOverrides(thirdCleanerId, ovDataThird?.cleanerDateOverrides ?? []);
    return map;
  }, [firstCleanerId, secondCleanerId, thirdCleanerId, ovDataFirst, ovDataSecond, ovDataThird]);

  function refetchOverridesForCleaner(cid: string) {
    if (cid === firstCleanerId) refetchOverridesFirst();
    else if (cid === secondCleanerId) refetchOverridesSecond();
    else if (cid === thirdCleanerId) refetchOverridesThird();
  }

  // ─── Booking index: cleanerId_date -> bookings[] ─────────────────────
  const bIndex = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (!b.cleaner) continue;
      const key = `${b.cleaner.id}_${b.scheduledDate}`;
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [bookings]);

  const hasConflict = useCallback((cb: Booking[]): boolean => {
    if (cb.length < 2) return false;
    const sorted = [...cb].sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (addHoursToTime(sorted[i].scheduledStartTime, sorted[i].estimatedDurationHours) > sorted[i + 1].scheduledStartTime) return true;
    }
    return false;
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────
  const goToPrevWeek = () => setWeekStart((p) => addDays(p, -7));
  const goToNextWeek = () => setWeekStart((p) => addDays(p, 7));
  const goToToday = () => setWeekStart(getMonday(new Date()));

  // ─── Cell helpers ─────────────────────────────────────────────────────
  function getEffectiveAvailability(c: Cleaner, gi: number, date: Date): EffectiveAvailability {
    const dow = gridToDow(gi);
    const dateStr = fmtYMD(date);

    // 1. Check date-specific override
    const override = overrideIndex.get(`${c.id}_${dateStr}`);
    if (override) {
      return {
        startTime: override.startTime,
        endTime: override.endTime,
        isAvailable: override.isAvailable,
        source: 'override',
      };
    }

    // 2. Check explicit cleaner weekly availability
    const explicit = c.availability?.find((s) => s.dayOfWeek === dow);
    if (explicit) {
      return {
        startTime: explicit.startTime,
        endTime: explicit.endTime,
        isAvailable: explicit.isAvailable,
        source: 'weekly',
      };
    }

    // 3. Fallback to company work schedule
    const companySlot = workSchedule.find((s) => s.dayOfWeek === dow);
    if (companySlot) {
      return {
        startTime: companySlot.startTime,
        endTime: companySlot.endTime,
        isAvailable: companySlot.isWorkDay,
        source: 'company',
      };
    }

    // 4. Hardcoded fallback
    const isWeekday = dow >= 1 && dow <= 5;
    return { startTime: '08:00', endTime: '17:00', isAvailable: isWeekday, source: 'default' };
  }

  function cellBookings(cid: string, d: Date): Booking[] {
    return bIndex.get(`${cid}_${fmtYMD(d)}`) ?? [];
  }

  // ─── Modal ────────────────────────────────────────────────────────────
  function openModal(c: Cleaner, gi: number, date: Date) {
    const eff = getEffectiveAvailability(c, gi, date);
    setModal({
      open: true, cleanerId: c.id, cleanerName: c.fullName,
      date: fmtYMD(date), dayLabel: DAY_FULL[gi],
      startTime: eff.startTime, endTime: eff.endTime,
      isAvailable: eff.isAvailable,
    });
  }

  async function handleSave() {
    await setDateOverride({
      variables: {
        cleanerId: modal.cleanerId,
        date: modal.date,
        isAvailable: modal.isAvailable,
        startTime: modal.startTime,
        endTime: modal.endTime,
      },
    });
    setModal((p) => ({ ...p, open: false }));
    refetchOverridesForCleaner(modal.cleanerId);
    refetchCleaners();
    refetchBookings();
  }

  const weekLabel = `Saptamana ${fmtDM(weekStart)} - ${fmtDM(weekEnd)} ${weekEnd.getFullYear()}`;

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading && cleaners.length === 0) {
    return <LoadingSpinner text="Se incarca calendarul..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 mt-1">Gestioneaza disponibilitatea si vezi programarile echipei.</p>
      </div>

      {/* Week Navigation */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Inapoi</span>
          </Button>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary hidden sm:block" />
            <span className="text-sm sm:text-base font-semibold text-gray-900">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>Astazi</Button>
            <Button variant="ghost" size="sm" onClick={goToNextWeek}>
              <span className="hidden sm:inline">Inainte</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {cleaners.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Niciun cleaner</h3>
            <p className="text-gray-500">Adauga cleaneri in echipa pentru a gestiona calendarul.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop Grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-t-xl overflow-hidden">
                <div className="bg-gray-50 p-3 text-xs font-medium text-gray-500 uppercase">Cleaner</div>
                {weekDates.map((date, idx) => {
                  const isToday = fmtYMD(date) === fmtYMD(new Date());
                  return (
                    <div key={idx} className={cn('p-3 text-center text-xs font-medium uppercase', isToday ? 'bg-primary/5 text-primary' : 'bg-gray-50 text-gray-500')}>
                      <div>{DAY_SHORT[idx]}</div>
                      <div className="text-sm font-semibold mt-0.5">{String(date.getDate()).padStart(2, '0')}</div>
                    </div>
                  );
                })}
              </div>

              {cleaners.map((cleaner) => (
                <div key={cleaner.id} className="grid grid-cols-8 gap-px bg-gray-200">
                  <div className="bg-white p-3 flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{cleaner.fullName?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{cleaner.fullName}</p>
                      <Badge variant={statusVariant[cleaner.status] ?? 'default'}>{statusLabel[cleaner.status] ?? cleaner.status}</Badge>
                    </div>
                  </div>
                  {weekDates.map((date, idx) => {
                    const eff = getEffectiveAvailability(cleaner, idx, date);
                    const cb = cellBookings(cleaner.id, date);
                    const conflict = hasConflict(cb);
                    const isDefault = eff.source === 'company' || eff.source === 'default';
                    const isOverride = eff.source === 'override';
                    return (
                      <div
                        key={idx}
                        onClick={() => openModal(cleaner, idx, date)}
                        className={cn(
                          'relative p-2 min-h-[72px] cursor-pointer transition-colors hover:bg-opacity-80',
                          eff.isAvailable && isOverride && 'bg-emerald-50 border border-emerald-200',
                          eff.isAvailable && eff.source === 'weekly' && 'bg-emerald-50/50 border border-dashed border-emerald-200',
                          eff.isAvailable && isDefault && 'bg-emerald-50/50 border border-dashed border-emerald-200',
                          !eff.isAvailable && isOverride && 'bg-red-50 border border-red-100',
                          !eff.isAvailable && eff.source === 'weekly' && 'bg-red-50/50 border border-dashed border-red-100',
                          !eff.isAvailable && isDefault && 'bg-gray-100 border border-dashed border-gray-300',
                          conflict && 'ring-2 ring-red-400',
                        )}
                      >
                        {eff.isAvailable && (
                          <div className="mb-1">
                            <p className="text-xs font-medium text-emerald-700">{eff.startTime} - {eff.endTime}</p>
                            {isDefault && <p className="text-[10px] text-emerald-500/70 italic">(implicit)</p>}
                            {eff.source === 'weekly' && <p className="text-[10px] text-emerald-500/70 italic">(saptamanal)</p>}
                          </div>
                        )}
                        {!eff.isAvailable && (
                          <p className={cn('text-xs mb-1', isDefault ? 'text-gray-400' : 'text-red-400 font-medium')}>
                            {isDefault ? 'Liber' : 'Indisponibil'}
                            {eff.source === 'weekly' && <span className="text-[10px] italic"> (saptamanal)</span>}
                          </p>
                        )}
                        {cb.map((b) => (
                          <div
                            key={b.id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/firma/comenzi/${b.id}`); }}
                            className="bg-primary/10 border border-primary/30 rounded-lg px-1.5 py-1 mb-1 cursor-pointer hover:bg-primary/20 transition-colors"
                          >
                            <p className="text-xs font-medium text-primary truncate">{b.client?.fullName ?? 'Client'}</p>
                            <p className="text-[10px] text-primary/70">{b.scheduledStartTime}</p>
                          </div>
                        ))}
                        {conflict && (
                          <div className="absolute top-1 right-1" title="Conflict de programare">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="h-1 bg-gray-200 rounded-b-xl" />
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden">
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2">
              {weekDates.map((date, idx) => {
                const isToday = fmtYMD(date) === fmtYMD(new Date());
                return (
                  <button
                    key={idx}
                    onClick={() => setMobileDay(idx)}
                    className={cn(
                      'flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-colors cursor-pointer',
                      mobileDay === idx ? 'bg-primary text-white'
                        : isToday ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-white text-gray-600 border border-gray-200',
                    )}
                  >
                    <div className="text-[10px] font-medium uppercase">{DAY_SHORT[idx]}</div>
                    <div className="text-sm font-bold mt-0.5">{String(date.getDate()).padStart(2, '0')}</div>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {cleaners.map((cleaner) => {
                const eff = getEffectiveAvailability(cleaner, mobileDay, weekDates[mobileDay]);
                const cb = cellBookings(cleaner.id, weekDates[mobileDay]);
                const conflict = hasConflict(cb);
                const isDefault = eff.source === 'company' || eff.source === 'default';
                return (
                  <Card key={cleaner.id} className={cn(conflict && 'ring-2 ring-red-400')}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-base font-semibold text-primary">{cleaner.fullName?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{cleaner.fullName}</p>
                          <Badge variant={statusVariant[cleaner.status] ?? 'default'}>{statusLabel[cleaner.status] ?? cleaner.status}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openModal(cleaner, mobileDay, weekDates[mobileDay])}>Editeaza</Button>
                    </div>
                    {eff.isAvailable ? (
                      <div className={cn(
                        'rounded-xl px-3 py-2 mb-2',
                        isDefault
                          ? 'bg-emerald-50/50 border border-dashed border-emerald-200'
                          : 'bg-emerald-50 border border-emerald-200',
                      )}>
                        <p className="text-sm font-medium text-emerald-700">
                          Disponibil: {eff.startTime} - {eff.endTime}
                        </p>
                        {isDefault && <p className="text-xs text-emerald-500/70 italic mt-0.5">(implicit)</p>}
                        {eff.source === 'weekly' && <p className="text-xs text-emerald-500/70 italic mt-0.5">(saptamanal)</p>}
                      </div>
                    ) : (
                      <div className={cn(
                        'rounded-xl px-3 py-2 mb-2',
                        isDefault
                          ? 'bg-gray-100 border border-dashed border-gray-300'
                          : 'bg-red-50 border border-red-100',
                      )}>
                        <p className={cn('text-sm', isDefault ? 'text-gray-400' : 'text-red-400 font-medium')}>
                          {isDefault ? 'Liber' : 'Indisponibil'}
                        </p>
                      </div>
                    )}
                    {cb.length > 0 && (
                      <div className="space-y-1.5">
                        {cb.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => navigate(`/firma/comenzi/${b.id}`)}
                            className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-primary">{b.client?.fullName ?? 'Client'}</p>
                              <p className="text-xs text-primary/70">{b.scheduledStartTime}</p>
                            </div>
                            <p className="text-xs text-primary/60 mt-0.5">{b.serviceName}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {conflict && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <p className="text-xs font-medium">Conflict de programare</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Availability Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal((p) => ({ ...p, open: false }))}
        title={`${modal.cleanerName} - ${modal.dayLabel} (${modal.date ? modal.date.split('-').reverse().join('.') : ''})`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAvailable"
              checked={modal.isAvailable}
              onChange={(e) => setModal((p) => ({ ...p, isAvailable: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700">
              Disponibil in aceasta zi
            </label>
          </div>
          {modal.isAvailable && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ora de inceput" type="time" value={modal.startTime}
                onChange={(e) => setModal((p) => ({ ...p, startTime: e.target.value }))} />
              <Input label="Ora de sfarsit" type="time" value={modal.endTime}
                onChange={(e) => setModal((p) => ({ ...p, endTime: e.target.value }))} />
            </div>
          )}
          <p className="text-xs text-gray-400">
            Modificarea se aplica doar pentru data de {modal.date ? modal.date.split('-').reverse().join('.') : ''}.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModal((p) => ({ ...p, open: false }))} className="flex-1">
              Anuleaza
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Salveaza</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
