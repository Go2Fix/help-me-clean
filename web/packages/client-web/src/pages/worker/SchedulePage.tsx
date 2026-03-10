import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  MY_WORKER_COMPANY_SCHEDULE,
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

interface CompanyScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkDay: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function jsDayOfWeek(d: Date): number {
  return d.getDay();
}

// Monday-start ordering for display
const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

// ─── Component ──────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { t } = useTranslation(['dashboard', 'worker']);
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

  const { data: companySchedData, loading: companySchedLoading } = useQuery(MY_WORKER_COMPANY_SCHEDULE);
  const companySchedule: CompanyScheduleSlot[] = companySchedData?.myWorkerCompanySchedule ?? [];

  const { data: overridesData, loading: overridesLoading, refetch: refetchOverrides } = useQuery(MY_WORKER_DATE_OVERRIDES, {
    variables: { from: fromISO, to: toISO },
    fetchPolicy: 'cache-and-network',
  });
  const overrides: DateOverride[] = overridesData?.myWorkerDateOverrides ?? [];

  const overrides30From = formatDateISO(new Date());
  const overrides30To = formatDateISO(addDays(new Date(), 30));
  const { data: overrides30Data, refetch: refetchOverrides30 } = useQuery(MY_WORKER_DATE_OVERRIDES, {
    variables: { from: overrides30From, to: overrides30To },
    fetchPolicy: 'cache-and-network',
  });
  const overrides30: DateOverride[] = overrides30Data?.myWorkerDateOverrides ?? [];

  // ─── Mutations ──────────────────────────────────────────────────────

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

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      const key = job.scheduledDate?.split('T')[0];
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(job);
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
    }
    return map;
  }, [jobs]);

  const overridesByDate = useMemo(() => {
    const map: Record<string, DateOverride> = {};
    for (const o of overrides) {
      const key = o.date?.split('T')[0];
      if (key) map[key] = o;
    }
    return map;
  }, [overrides]);

  const availByDay = useMemo(() => {
    const map: Record<number, AvailabilitySlot> = {};
    for (const slot of availabilitySlots) {
      map[slot.dayOfWeek] = slot;
    }
    return map;
  }, [availabilitySlots]);

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

  // ─── Format week range ─────────────────────────────────────────────

  const formatWeekRange = (start: Date, end: Date): string => {
    const monthKeys: Record<number, string> = {
      0: t('worker:schedule.months.0'), 1: t('worker:schedule.months.1'),
      2: t('worker:schedule.months.2'), 3: t('worker:schedule.months.3'),
      4: t('worker:schedule.months.4'), 5: t('worker:schedule.months.5'),
      6: t('worker:schedule.months.6'), 7: t('worker:schedule.months.7'),
      8: t('worker:schedule.months.8'), 9: t('worker:schedule.months.9'),
      10: t('worker:schedule.months.10'), 11: t('worker:schedule.months.11'),
    };
    const s = `${start.getDate()} ${monthKeys[start.getMonth()]}`;
    const e = `${end.getDate()} ${monthKeys[end.getMonth()]} ${end.getFullYear()}`;
    return `${s} - ${e}`;
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('worker:schedule.pageTitle')}</h1>
        <p className="text-gray-500 mt-1">{t('worker:schedule.pageSubtitle')}</p>
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
          {t('worker:schedule.tabSchedule')}
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
          {t('worker:schedule.tabAvailability')}
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
          formatWeekRange={formatWeekRange}
        />
      ) : (
        <AvailabilityManager
          availabilitySlots={availabilitySlots}
          companySchedule={companySchedule}
          availLoading={availLoading || companySchedLoading}
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
  formatWeekRange: (start: Date, end: Date) => string;
}

function WeekCalendarView({
  weekStart, weekEnd, weekDays, loading,
  onPrevWeek, onNextWeek, onToday, onJobClick, formatWeekRange,
}: WeekCalendarProps) {
  const { t } = useTranslation(['dashboard', 'worker']);

  return (
    <div>
      {/* Week navigation header */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label={t('worker:schedule.prevWeek')}
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
              {t('worker:schedule.today')}
            </button>
          </div>
          <button
            onClick={onNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label={t('worker:schedule.nextWeek')}
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
  const { t } = useTranslation(['dashboard', 'worker']);
  const today = isToday(day.date);
  const hasOverrideOff = day.override && !day.override.isAvailable;
  const dayNameShort = t(`days.short.${day.dayOfWeek}`);

  const statusLabels: Record<string, string> = {
    ASSIGNED: t('worker:schedule.statusLabels.ASSIGNED'),
    CONFIRMED: t('worker:schedule.statusLabels.CONFIRMED'),
    IN_PROGRESS: t('worker:schedule.statusLabels.IN_PROGRESS'),
    COMPLETED: t('worker:schedule.statusLabels.COMPLETED'),
  };

  const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    ASSIGNED: 'info', CONFIRMED: 'warning', IN_PROGRESS: 'success', COMPLETED: 'default',
  };

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
            {dayNameShort}
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
          title={day.available ? t('worker:schedule.available') : t('worker:schedule.unavailable')}
        />
      </div>

      {/* Override badge */}
      {hasOverrideOff && (
        <div className="mb-2">
          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            {t('worker:schedule.dayOff')}
          </span>
        </div>
      )}

      {/* Jobs */}
      <div className="flex-1 space-y-1.5">
        {day.dayJobs.length === 0 && !hasOverrideOff && (
          <p className="text-[10px] text-gray-300 mt-2">{t('worker:schedule.noOrders')}</p>
        )}
        {day.dayJobs.map((job) => {
          const variant = statusVariants[job.status] ?? 'default';
          const label = statusLabels[job.status] ?? job.status;
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
                <Badge variant={variant} className="text-[10px] px-1.5 py-0">
                  {label}
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
  const { t } = useTranslation(['dashboard', 'worker']);
  const today = isToday(day.date);
  const hasOverrideOff = day.override && !day.override.isAvailable;
  const dayName = t(`days.${day.dayOfWeek}`);

  const statusLabels: Record<string, string> = {
    ASSIGNED: t('worker:schedule.statusLabels.ASSIGNED'),
    CONFIRMED: t('worker:schedule.statusLabels.CONFIRMED'),
    IN_PROGRESS: t('worker:schedule.statusLabels.IN_PROGRESS'),
    COMPLETED: t('worker:schedule.statusLabels.COMPLETED'),
  };

  const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    ASSIGNED: 'info', CONFIRMED: 'warning', IN_PROGRESS: 'success', COMPLETED: 'default',
  };

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
              {dayName}
            </span>
            {today && <span className="text-xs text-blue-500 ml-2">{t('worker:schedule.today')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrideOff && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
              {t('worker:schedule.dayOff')}
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
        <p className="text-sm text-gray-400">{t('worker:schedule.noOrdersScheduled')}</p>
      ) : (
        <div className="space-y-2">
          {day.dayJobs.map((job) => {
            const variant = statusVariants[job.status] ?? 'default';
            const label = statusLabels[job.status] ?? job.status;
            return (
              <button
                key={job.id}
                onClick={() => onJobClick(job.id)}
                className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h4 className="text-sm font-semibold text-gray-900">{job.serviceName}</h4>
                  <Badge variant={variant}>{label}</Badge>
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
  companySchedule: CompanyScheduleSlot[];
  availLoading: boolean;
  overrides: DateOverride[];
  setDateOverride: (opts: { variables: { date: string; isAvailable: boolean; startTime: string; endTime: string } }) => Promise<unknown>;
  savingOverride: boolean;
}

function AvailabilityManager({
  availabilitySlots, companySchedule, availLoading, overrides, setDateOverride, savingOverride,
}: AvailabilityManagerProps) {
  const displaySlots = availabilitySlots.length > 0
    ? availabilitySlots
    : companySchedule.map((cs) => ({
        id: cs.id,
        dayOfWeek: cs.dayOfWeek,
        startTime: cs.startTime,
        endTime: cs.endTime,
        isAvailable: cs.isWorkDay,
      }));

  return (
    <div className="space-y-6">
      <ReadOnlyScheduleDisplay slots={displaySlots} loading={availLoading} />
      <DateOverridesManager
        overrides={overrides}
        onSetOverride={setDateOverride}
        saving={savingOverride}
      />
    </div>
  );
}

// ─── Read-Only Schedule Display ─────────────────────────────────────────────

interface ReadOnlyScheduleDisplaySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface ReadOnlyScheduleDisplayProps {
  slots: ReadOnlyScheduleDisplaySlot[];
  loading: boolean;
}

function ReadOnlyScheduleDisplay({ slots, loading }: ReadOnlyScheduleDisplayProps) {
  const { t } = useTranslation(['dashboard', 'worker']);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">{t('worker:schedule.weeklySchedule')}</h2>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4">
        <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">{t('worker:schedule.readOnlyInfo')}</p>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{t('worker:schedule.noScheduleConfigured')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {WEEK_DAY_ORDER.map((dow) => {
            const slot = slots.find((s) => s.dayOfWeek === dow);
            const isAvailable = slot?.isAvailable ?? false;
            const dayName = t(`days.${dow}`);
            return (
              <div
                key={dow}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl',
                  isAvailable ? 'bg-emerald-50/50' : 'bg-gray-50',
                )}
              >
                <span className={cn(
                  'text-sm font-medium w-24 shrink-0',
                  isAvailable ? 'text-gray-900' : 'text-gray-400',
                )}>
                  {dayName}
                </span>
                {isAvailable && slot ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {slot.startTime} – {slot.endTime}
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-gray-100 text-gray-400 rounded-full px-3 py-1 text-xs">
                    {t('worker:schedule.unavailableLabel')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const { t, i18n } = useTranslation(['dashboard', 'worker']);
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
      setToast({ type: 'success', message: t('worker:schedule.addedDayOff') });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: t('worker:schedule.errorAddDayOff') });
    }
  };

  const handleCancel = async (date: string) => {
    setToast(null);
    try {
      await onSetOverride({
        variables: { date, isAvailable: true, startTime: '08:00', endTime: '20:00' },
      });
      setToast({ type: 'success', message: t('worker:schedule.cancelledDayOff') });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: t('worker:schedule.errorCancelDayOff') });
    }
  };

  const minDate = formatDateISO(new Date());
  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">{t('worker:schedule.requestedDaysOff')}</h2>
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t('worker:schedule.requestDayOff')}
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
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('worker:schedule.date')}</label>
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
              <span className="text-sm text-gray-700">{t('worker:schedule.allDay')}</span>
            </div>

            {!isFullDay && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('worker:schedule.timeFrom')}</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('worker:schedule.timeTo')}</label>
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
                {t('worker:schedule.save')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormDate(''); }}>
                <X className="h-4 w-4" />
                {t('worker:schedule.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overrides list */}
      {sortedOverrides.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{t('worker:schedule.noDaysOff')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedOverrides.map((override) => {
            const dateStr = override.date?.split('T')[0] ?? override.date;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = t(`days.${dateObj.getDay()}`);
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
                      {dayName}, {dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isFullDayOff
                        ? t('worker:schedule.fullDayOff')
                        : t('worker:schedule.partialDayOff', { start: override.startTime, end: override.endTime })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(dateStr)}
                  disabled={saving}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t('worker:schedule.cancelDayOff')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
