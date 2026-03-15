import { gql, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const COMPANY_CALENDAR = gql`
  query CompanyCalendar($from: String!, $to: String!) {
    companyBookingsByDateRange(from: $from, to: $to) {
      id
      referenceCode
      serviceType
      scheduledDate
      scheduledStartTime
      status
      address {
        city
      }
      worker {
        fullName
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarBookingStatus =
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PENDING'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_COMPANY';

interface CalendarBooking {
  id: string;
  referenceCode: string;
  serviceType: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  status: CalendarBookingStatus;
  address: { city: string } | null;
  worker: { fullName: string } | null;
}

interface CalendarData {
  companyBookingsByDateRange: CalendarBooking[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];

// Monday = 0 for our grid (ISO week)
const ISO_DAY_INDEX: Record<number, number> = {
  1: 0, // Mon
  2: 1, // Tue
  3: 2, // Wed
  4: 3, // Thu
  5: 4, // Fri
  6: 5, // Sat
  0: 6, // Sun
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfISOWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift so Mon=0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${monday.toLocaleDateString('ro-RO', opts)} – ${sunday.toLocaleDateString('ro-RO', opts)}`;
}

function isSameDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function bookingStatusColor(status: CalendarBookingStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'CONFIRMED':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'IN_PROGRESS':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'COMPLETED':
      return { bg: '#F3F4F6', text: '#374151' };
    case 'ASSIGNED':
      return { bg: '#FEF3C7', text: '#92400E' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

function formatServiceShort(type: string): string {
  const map: Record<string, string> = {
    STANDARD_CLEANING: 'Standard',
    DEEP_CLEANING: 'Profunda',
    MOVE_IN_OUT: 'Mutare',
    POST_CONSTRUCTION: 'Constructie',
    OFFICE: 'Birou',
    WINDOW: 'Geamuri',
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BookingBlock({
  booking,
  onPress,
}: {
  booking: CalendarBooking;
  onPress: () => void;
}) {
  const { bg, text } = bookingStatusColor(booking.status);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.bookingBlock, { backgroundColor: bg }]}
    >
      <Text style={[styles.blockService, { color: text }]} numberOfLines={1}>
        {formatServiceShort(booking.serviceType)}
      </Text>
      {booking.scheduledStartTime && (
        <Text style={[styles.blockTime, { color: text }]} numberOfLines={1}>
          {booking.scheduledStartTime}
        </Text>
      )}
      {booking.worker && (
        <Text style={[styles.blockWorker, { color: text }]} numberOfLines={1}>
          {booking.worker.fullName.split(' ')[0]}
        </Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanyCalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfISOWeek(today)
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fromStr = toDateKey(weekStart);
  const toStr = toDateKey(addDays(weekStart, 6));

  const { data, loading, error } = useQuery<CalendarData>(COMPANY_CALENDAR, {
    variables: { from: fromStr, to: toStr },
    fetchPolicy: 'cache-and-network',
  });

  // Group bookings by date key
  const bookingsByDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    (data?.companyBookingsByDateRange ?? []).forEach((b) => {
      const key = b.scheduledDate.slice(0, 10); // normalize to YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [data]);

  function handlePrevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function handleNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  const totalThisWeek = data?.companyBookingsByDateRange?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Calendar</Text>
        {data && (
          <Text style={styles.weekTotal}>
            {totalThisWeek} comenzi
          </Text>
        )}
      </View>

      {/* Week navigation */}
      <PlatformCard style={styles.weekNav}>
        <Pressable
          onPress={handlePrevWeek}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Text style={styles.navArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
        <Pressable
          onPress={handleNextWeek}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Text style={styles.navArrow}>{'›'}</Text>
        </Pressable>
      </PlatformCard>

      {/* Loading */}
      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Error */}
      {error && !data && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Calendar grid */}
      <ScrollView
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {weekDays.map((day, idx) => {
            const key = toDateKey(day);
            const isToday = isSameDate(day, today);
            const dayBookings = bookingsByDate[key] ?? [];

            return (
              <View key={key} style={styles.dayColumn}>
                {/* Day header */}
                <View
                  style={[
                    styles.dayHeader,
                    isToday && styles.dayHeaderToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      isToday && styles.dayLabelToday,
                    ]}
                  >
                    {DAY_LABELS[idx]}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>

                {/* Booking blocks */}
                <View style={styles.dayBody}>
                  {dayBookings.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <Text style={styles.emptyDayDot}>·</Text>
                    </View>
                  ) : (
                    dayBookings.map((booking) => (
                      <BookingBlock
                        key={booking.id}
                        booking={booking}
                        onPress={() =>
                          router.push(
                            `/(company)/orders/${booking.id}` as never
                          )
                        }
                      />
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <PlatformCard style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legenda</Text>
          <View style={styles.legendRow}>
            {(
              [
                { status: 'ASSIGNED', label: 'Alocat' },
                { status: 'CONFIRMED', label: 'Confirmat' },
                { status: 'IN_PROGRESS', label: 'In desfasurare' },
                { status: 'COMPLETED', label: 'Finalizat' },
              ] as { status: CalendarBookingStatus; label: string }[]
            ).map(({ status, label }) => {
              const { bg, text } = bookingStatusColor(status);
              return (
                <View key={status} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: bg }]} />
                  <Text style={[styles.legendLabel, { color: text }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </PlatformCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // Page header
  pageHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: { ...typography.heading3, color: colors.textPrimary },
  weekTotal: { ...typography.small, color: colors.textSecondary },

  // Week navigation
  weekNav: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrow: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  weekRange: { ...typography.bodyMedium, color: colors.textPrimary },

  // Calendar grid
  calendarContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  dayColumn: {
    flex: 1,
    gap: 4,
  },

  // Day header
  dayHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: 2,
  },
  dayHeaderToday: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayLabelToday: { color: '#fff' },
  dayNumber: { ...typography.smallMedium, color: colors.textPrimary },
  dayNumberToday: { color: '#fff' },

  // Day body
  dayBody: {
    minHeight: 80,
    gap: 4,
  },
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  emptyDayDot: {
    fontSize: 18,
    color: colors.border,
  },

  // Booking block
  bookingBlock: {
    borderRadius: radius.sm,
    padding: 5,
    gap: 2,
  },
  blockService: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  blockTime: {
    fontSize: 9,
    lineHeight: 12,
  },
  blockWorker: {
    fontSize: 9,
    lineHeight: 12,
    fontStyle: 'italic',
  },

  // Legend
  legendCard: { padding: spacing.base, gap: spacing.sm },
  legendTitle: { ...typography.smallMedium, color: colors.textSecondary },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendLabel: { fontSize: 11, fontWeight: '500' },

  // States
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
});
