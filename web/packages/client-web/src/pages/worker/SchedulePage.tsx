import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User,
  Plus, Check, X, Loader2,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  MY_WORKER_BOOKINGS_BY_DATE_RANGE,
  MY_WORKER_AVAILABILITY,
  UPDATE_AVAILABILITY,
  MY_WORKER_DATE_OVERRIDES,
  SET_WORKER_DATE_OVERRIDE,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  referenceCode: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  address: { streetAddress: string; city: string } | null;
  client: { fullName: string; phone: string } | null;
}

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface DateOverride {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  ASSIGNED: { label: 'Asignata', variant: 'info' },
  CONFIRMED: { label: 'Confirmata', variant: 'warning' },
  IN_PROGRESS: { label: 'In lucru', variant: 'success' },
  COMPLETED: { label: 'Finalizata', variant: 'default' },
};

// dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday  (DB convention)
const DAY_NAMES: Record<number, string> = {
  0: 'Duminica', 1: 'Luni', 2: 'Marti', 3: 'Miercuri', 4: 'Joi', 5: 'Vineri', 6: 'Sambata',
};

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dum', 1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Joi', 5: 'Vin', 6: 'Sam',
};

// Monday-start ordering for display
const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatWeekRange(start: Date, end: Date): string {
  const monthsRo = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = `${start.getDate()} ${monthsRo[start.getMonth()]}`;
  const e = `${end.getDate()} ${monthsRo[end.getMonth()]} ${end.getFullYear()}`;
  return `${s} - ${e}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function jsDayOfWeek(d: Date): number {
  return d.getDay(); // 0=Sun, 1=Mon, ...
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'program' | 'disponibilitate'>('program');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const fromISO = formatDateISO(weekStart);
  const toISO = formatDateISO(weekEnd);

  // ─── Data Fetching ──────────────────────────────────────────────────

  const { data: jobsData, loading: jobsLoading } = useQuery(MY_WORKER_BOOKINGS_BY_DATE_RANGE, {
    variables: { from: fromISO, to: toISO },
    fetchPolicy: 'cache-and-network',
  });
  const jobs: Job[] = jobsData?.myWorkerBookingsByDateRange ?? [];

  const { data: availData, loading: availLoading } = useQuery(MY_WORKER_AVAILABILITY);
  const availabilitySlots: AvailabilitySlot[] = availData?.myWorkerAvailability ?? [];

  const { data: overridesData, loading: overridesLoading, refetch: refetchOverrides } = useQuery(MY_WORKER_DATE_OVERRIDES, {
    variables: { from: fromISO, to: toISO },
    fetchPolicy: 'cache-and-network',
  });
  const overrides: DateOverride[] = overridesData?.myWorkerDateOverrides ?? [];

  // For the overrides management tab (next 30 days)
  const overrides30From = formatDateISO(new Date());
  const overrides30To = formatDateISO(addDays(new Date(), 30));
  const { data: overrides30Data, refetch: refetchOverrides30 } = useQuery(MY_WORKER_DATE_OVERRIDES, {
    variables: { from: overrides30From, to: overrides30To },
    fetchPolicy: 'cache-and-network',
  });
  const overrides30: DateOverride[] = overrides30Data?.myWorkerDateOverrides ?? [];

  // ─── Mutations ──────────────────────────────────────────────────────

  const [updateAvailability, { loading: savingAvail }] = useMutation(UPDATE_AVAILABILITY, {
    refetchQueries: [{ query: MY_WORKER_AVAILABILITY }],
  });

  const [setDateOverride, { loading: savingOverride }] = useMutation(SET_WORKER_DATE_OVERRIDE, {
    onCompleted: () => {
      refetchOverrides();
      refetchOverrides30();
    },
  });

  // ─── Week Navigation ───────────────────────────────────────────────

  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const goToCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

  // ─── Derived Data ──────────────────────────────────────────────────

  // Map: dateISO -> jobs[]
  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      const key = job.scheduledDate?.split('T')[0];
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(job);
      }
    }
    // Sort jobs within each day by start time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
    }
    return map;
  }, [jobs]);

  // Map: dateISO -> override
  const overridesByDate = useMemo(() => {
    const map: Record<string, DateOverride> = {};
    for (const o of overrides) {
      const key = o.date?.split('T')[0];
      if (key) map[key] = o;
    }
    return map;
  }, [overrides]);

  // Map: dayOfWeek -> AvailabilitySlot
  const availByDay = useMemo(() => {
    const map: Record<number, AvailabilitySlot> = {};
    for (const slot of availabilitySlots) {
      map[slot.dayOfWeek] = slot;
    }
    return map;
  }, [availabilitySlots]);

  // ─── Week days array ───────────────────────────────────────────────

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateISO = formatDateISO(date);
      const dayOfWeek = jsDayOfWeek(date);
      const slot = availByDay[dayOfWeek];
      const override = overridesByDate[dateISO];
      const dayJobs = jobsByDate[dateISO] ?? [];
      const available = override ? override.isAvailable : (slot?.isAvailable ?? false);
      return { date, dateISO, dayOfWeek, slot, override, dayJobs, available };
    });
  }, [weekStart, availByDay, overridesByDate, jobsByDate]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Program</h1>
        <p className="text-gray-500 mt-1">Programul tau saptamanal si disponibilitatea</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('program')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer',
            activeTab === 'program'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Calendar className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Program
        </button>
        <button
          onClick={() => setActiveTab('disponibilitate')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer',
            activeTab === 'disponibilitate'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Clock className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Disponibilitate
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'program' ? (
        <WeekCalendarView
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekDays={weekDays}
          loading={jobsLoading || availLoading || overridesLoading}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToCurrentWeek}
          onJobClick={(id) => navigate(`/worker/job/${id}`)}
        />
      ) : (
        <AvailabilityManager
          availabilitySlots={availabilitySlots}
          availLoading={availLoading}
          updateAvailability={updateAvailability}
          savingAvail={savingAvail}
          overrides={overrides30.filter((o) => !o.isAvailable)}
          setDateOverride={setDateOverride}
          savingOverride={savingOverride}
        />
      )}
    </div>
  );
}

// ─── Tab 1: Weekly Calendar View ────────────────────────────────────────────

interface WeekDay {
  date: Date;
  dateISO: string;
  dayOfWeek: number;
  slot: AvailabilitySlot | undefined;
  override: DateOverride | undefined;
  dayJobs: Job[];
  available: boolean;
}

interface WeekCalendarProps {
  weekStart: Date;
  weekEnd: Date;
  weekDays: WeekDay[];
  loading: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onJobClick: (id: string) => void;
}

function WeekCalendarView({
  weekStart, weekEnd, weekDays, loading,
  onPrevWeek, onNextWeek, onToday, onJobClick,
}: WeekCalendarProps) {
  return (
    <div>
      {/* Week navigation header */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Saptamana anterioara"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {formatWeekRange(weekStart, weekEnd)}
            </h2>
            <button
              onClick={onToday}
              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Azi
            </button>
          </div>
          <button
            onClick={onNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Saptamana urmatoare"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden lg:grid lg:grid-cols-7 gap-2">
            {weekDays.map((wd) => (
              <DayColumn key={wd.dateISO} day={wd} onJobClick={onJobClick} />
            ))}
          </div>

          {/* Mobile/Tablet: stacked cards */}
          <div className="lg:hidden space-y-3">
            {weekDays.map((wd) => (
              <DayCard key={wd.dateISO} day={wd} onJobClick={onJobClick} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Day Column (desktop) ───────────────────────────────────────────────────

function DayColumn({ day, onJobClick }: { day: WeekDay; onJobClick: (id: string) => void }) {
  const today = isToday(day.date);
  const hasOverrideOff = day.override && !day.override.isAvailable;

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 min-h-[160px] flex flex-col',
        today
          ? 'border-blue-300 bg-blue-50/50'
          : 'border-gray-200 bg-white',
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-xs font-medium',
              today ? 'text-blue-600' : 'text-gray-500',
            )}
          >
            {DAY_NAMES_SHORT[day.dayOfWeek]}
          </span>
          <span
            className={cn(
              'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full',
              today
                ? 'bg-blue-600 text-white'
                : 'text-gray-900',
            )}
          >
            {day.date.getDate()}
          </span>
        </div>
        {/* Availability indicator */}
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            day.available ? 'bg-emerald-400' : 'bg-gray-300',
          )}
          title={day.available ? 'Disponibil' : 'Indisponibil'}
        />
      </div>

      {/* Override badge */}
      {hasOverrideOff && (
        <div className="mb-2">
          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            Zi libera
          </span>
        </div>
      )}

      {/* Jobs */}
      <div className="flex-1 space-y-1.5">
        {day.dayJobs.length === 0 && !hasOverrideOff && (
          <p className="text-[10px] text-gray-300 mt-2">Nicio comanda</p>
        )}
        {day.dayJobs.map((job) => {
          const badge = STATUS_BADGE[job.status] ?? { label: job.status, variant: 'default' as const };
          return (
            <button
              key={job.id}
              onClick={() => onJobClick(job.id)}
              className="w-full text-left p-2 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
            >
              <p className="text-xs font-semibold text-gray-900 truncate">{job.serviceName}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-[10px] text-gray-500">
                  {job.scheduledStartTime} ({job.estimatedDurationHours}h)
                </span>
              </div>
              <div className="mt-1">
                <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                  {badge.label}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day Card (mobile) ──────────────────────────────────────────────────────

function DayCard({ day, onJobClick }: { day: WeekDay; onJobClick: (id: string) => void }) {
  const today = isToday(day.date);
  const hasOverrideOff = day.override && !day.override.isAvailable;

  // Skip days with no jobs and no override (keeps mobile view clean)
  if (day.dayJobs.length === 0 && !hasOverrideOff && !today) return null;

  return (
    <Card
      className={cn(
        today && 'border-blue-300 bg-blue-50/30',
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold',
              today
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900',
            )}
          >
            {day.date.getDate()}
          </span>
          <div>
            <span className={cn('text-sm font-semibold', today ? 'text-blue-600' : 'text-gray-900')}>
              {DAY_NAMES[day.dayOfWeek]}
            </span>
            {today && <span className="text-xs text-blue-500 ml-2">Azi</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrideOff && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
              Zi libera
            </span>
          )}
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              day.available ? 'bg-emerald-400' : 'bg-gray-300',
            )}
          />
        </div>
      </div>

      {/* Jobs */}
      {day.dayJobs.length === 0 ? (
        <p className="text-sm text-gray-400">Nicio comanda programata</p>
      ) : (
        <div className="space-y-2">
          {day.dayJobs.map((job) => {
            const badge = STATUS_BADGE[job.status] ?? { label: job.status, variant: 'default' as const };
            return (
              <button
                key={job.id}
                onClick={() => onJobClick(job.id)}
                className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h4 className="text-sm font-semibold text-gray-900">{job.serviceName}</h4>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {job.scheduledStartTime} ({job.estimatedDurationHours}h)
                  </div>
                  {job.address && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {job.address.streetAddress}, {job.address.city}
                    </div>
                  )}
                  {job.client && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {job.client.fullName}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Tab 2: Availability Manager ────────────────────────────────────────────

interface AvailabilityManagerProps {
  availabilitySlots: AvailabilitySlot[];
  availLoading: boolean;
  updateAvailability: (opts: { variables: { slots: AvailabilitySlotInput[] } }) => Promise<unknown>;
  savingAvail: boolean;
  overrides: DateOverride[];
  setDateOverride: (opts: { variables: { date: string; isAvailable: boolean; startTime: string; endTime: string } }) => Promise<unknown>;
  savingOverride: boolean;
}

interface AvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function AvailabilityManager({
  availabilitySlots, availLoading, updateAvailability, savingAvail,
  overrides, setDateOverride, savingOverride,
}: AvailabilityManagerProps) {
  return (
    <div className="space-y-6">
      <WeeklyScheduleEditor
        slots={availabilitySlots}
        loading={availLoading}
        onSave={updateAvailability}
        saving={savingAvail}
      />
      <DateOverridesManager
        overrides={overrides}
        onSetOverride={setDateOverride}
        saving={savingOverride}
      />
    </div>
  );
}

// ─── Weekly Schedule Editor ─────────────────────────────────────────────────

interface WeeklyScheduleEditorProps {
  slots: AvailabilitySlot[];
  loading: boolean;
  onSave: (opts: { variables: { slots: AvailabilitySlotInput[] } }) => Promise<unknown>;
  saving: boolean;
}

interface EditableSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function WeeklyScheduleEditor({ slots, loading, onSave, saving }: WeeklyScheduleEditorProps) {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Build editable state from slots
  const initialState = useMemo((): EditableSlot[] => {
    return WEEK_DAY_ORDER.map((dow) => {
      const existing = slots.find((s) => s.dayOfWeek === dow);
      return {
        dayOfWeek: dow,
        startTime: existing?.startTime ?? '08:00',
        endTime: existing?.endTime ?? '18:00',
        isAvailable: existing?.isAvailable ?? false,
      };
    });
  }, [slots]);

  const [editSlots, setEditSlots] = useState<EditableSlot[]>(initialState);

  // Re-sync when server data changes
  const slotsKey = slots.map((s) => `${s.dayOfWeek}-${s.isAvailable}-${s.startTime}-${s.endTime}`).join(',');
  const [lastKey, setLastKey] = useState(slotsKey);
  if (slotsKey !== lastKey) {
    setLastKey(slotsKey);
    setEditSlots(
      WEEK_DAY_ORDER.map((dow) => {
        const existing = slots.find((s) => s.dayOfWeek === dow);
        return {
          dayOfWeek: dow,
          startTime: existing?.startTime ?? '08:00',
          endTime: existing?.endTime ?? '18:00',
          isAvailable: existing?.isAvailable ?? false,
        };
      }),
    );
  }

  const updateSlot = useCallback((dayOfWeek: number, field: keyof EditableSlot, value: string | boolean) => {
    setEditSlots((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s)),
    );
  }, []);

  const handleSave = async () => {
    setToast(null);
    try {
      await onSave({
        variables: {
          slots: editSlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
          })),
        },
      });
      setToast({ type: 'success', message: 'Program salvat cu succes!' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Eroare la salvarea programului.' });
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">Program saptamanal</h2>
      </div>

      <div className="space-y-2">
        {editSlots.map((slot) => (
          <div
            key={slot.dayOfWeek}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              slot.isAvailable ? 'bg-emerald-50/50' : 'bg-gray-50',
            )}
          >
            {/* Toggle */}
            <button
              type="button"
              onClick={() => updateSlot(slot.dayOfWeek, 'isAvailable', !slot.isAvailable)}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer',
                slot.isAvailable ? 'bg-emerald-500' : 'bg-gray-300',
              )}
              aria-label={`${DAY_NAMES[slot.dayOfWeek]} disponibil`}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                  slot.isAvailable && 'translate-x-5',
                )}
              />
            </button>

            {/* Day name */}
            <span className={cn(
              'text-sm font-medium w-20 shrink-0',
              slot.isAvailable ? 'text-gray-900' : 'text-gray-400',
            )}>
              {DAY_NAMES[slot.dayOfWeek]}
            </span>

            {/* Time inputs */}
            {slot.isAvailable ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.dayOfWeek, 'startTime', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 w-[110px] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(slot.dayOfWeek, 'endTime', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 w-[110px] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Indisponibil</span>
            )}
          </div>
        ))}
      </div>

      {/* Toast + Save */}
      <div className="flex items-center justify-between mt-5">
        <div>
          {toast && (
            <span
              className={cn(
                'text-sm font-medium',
                toast.type === 'success' ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {toast.type === 'success' && <Check className="h-4 w-4 inline-block mr-1 -mt-0.5" />}
              {toast.message}
            </span>
          )}
        </div>
        <Button onClick={handleSave} loading={saving} size="sm">
          Salveaza programul
        </Button>
      </div>
    </Card>
  );
}

// ─── Date Overrides Manager ─────────────────────────────────────────────────

interface DateOverridesManagerProps {
  overrides: DateOverride[];
  onSetOverride: (opts: { variables: { date: string; isAvailable: boolean; startTime: string; endTime: string } }) => Promise<unknown>;
  saving: boolean;
}

function DateOverridesManager({ overrides, onSetOverride, saving }: DateOverridesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('20:00');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sortedOverrides = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides],
  );

  const handleAdd = async () => {
    if (!formDate) return;
    setToast(null);
    try {
      await onSetOverride({
        variables: {
          date: formDate,
          isAvailable: false,
          startTime: isFullDay ? '00:00' : formStart,
          endTime: isFullDay ? '23:59' : formEnd,
        },
      });
      setShowForm(false);
      setFormDate('');
      setIsFullDay(true);
      setFormStart('08:00');
      setFormEnd('20:00');
      setToast({ type: 'success', message: 'Zi libera adaugata!' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Eroare la adaugarea zilei libere.' });
    }
  };

  const handleCancel = async (date: string) => {
    setToast(null);
    try {
      await onSetOverride({
        variables: { date, isAvailable: true, startTime: '08:00', endTime: '20:00' },
      });
      setToast({ type: 'success', message: 'Zi libera anulata.' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Eroare la anularea zilei libere.' });
    }
  };

  const minDate = formatDateISO(new Date());

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Zile libere</h2>
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Adauga zi libera
          </Button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'text-sm font-medium mb-4 px-3 py-2 rounded-lg',
          toast.type === 'success' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50',
        )}>
          {toast.message}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data</label>
              <input
                type="date"
                value={formDate}
                min={minDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFullDay(!isFullDay)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer',
                  isFullDay ? 'bg-blue-600' : 'bg-gray-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                    isFullDay && 'translate-x-5',
                  )}
                />
              </button>
              <span className="text-sm text-gray-700">Toata ziua</span>
            </div>

            {!isFullDay && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">De la</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Pana la</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} loading={saving} disabled={!formDate}>
                <Check className="h-4 w-4" />
                Salveaza
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormDate(''); }}>
                <X className="h-4 w-4" />
                Anuleaza
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overrides list */}
      {sortedOverrides.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nu ai zile libere programate in urmatoarele 30 de zile.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedOverrides.map((override) => {
            const dateStr = override.date?.split('T')[0] ?? override.date;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = DAY_NAMES[dateObj.getDay()] ?? '';
            const isFullDayOff = override.startTime === '00:00' && (override.endTime === '23:59' || override.endTime === '23:59:00');
            return (
              <div
                key={override.id}
                className="flex items-center justify-between px-3 py-2.5 bg-red-50/50 border border-red-100 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-red-600">{dateObj.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {dayName}, {dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isFullDayOff ? 'Zi libera completa' : `Liber: ${override.startTime} - ${override.endTime}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(dateStr)}
                  disabled={saving}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Anuleaza'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
