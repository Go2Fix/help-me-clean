import { gql, useMutation, useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_AVAILABILITY = gql`
  query MyWorkerAvailability {
    myWorkerAvailability {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

const UPDATE_AVAILABILITY = gql`
  mutation UpdateAvailability($slots: [AvailabilitySlotInput!]!) {
    updateAvailability(slots: $slots) {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityData {
  myWorkerAvailability: AvailabilitySlot[];
}

interface DayState {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
}

const DEFAULT_DAY_STATE = (dayOfWeek: number): DayState => ({
  dayOfWeek,
  isAvailable: false,
  startTime: '08:00',
  endTime: '17:00',
});

function buildInitialState(slots: AvailabilitySlot[]): DayState[] {
  return Array.from({ length: 7 }, (_, i) => {
    const existing = slots.find((s) => s.dayOfWeek === i);
    if (existing) {
      return {
        dayOfWeek: i,
        isAvailable: existing.isAvailable,
        startTime: existing.startTime,
        endTime: existing.endTime,
      };
    }
    return DEFAULT_DAY_STATE(i);
  });
}

// ---------------------------------------------------------------------------
// Time picker popover (simple inline list)
// ---------------------------------------------------------------------------

interface TimePickerProps {
  value: string;
  onChange: (t: string) => void;
  label: string;
  disabled?: boolean;
}

function TimePicker({ value, onChange, label, disabled = false }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={timeStyles.container}>
      <Text style={timeStyles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => !disabled && setOpen((v) => !v)}
        style={[timeStyles.trigger, disabled && timeStyles.triggerDisabled]}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[timeStyles.triggerText, disabled && timeStyles.triggerTextDisabled]}>
          {value}
        </Text>
        <Text style={timeStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={timeStyles.dropdown}>
          <ScrollView style={timeStyles.dropdownScroll} nestedScrollEnabled>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  onChange(t);
                  setOpen(false);
                }}
                style={[
                  timeStyles.option,
                  t === value && timeStyles.optionActive,
                ]}
              >
                <Text
                  style={[
                    timeStyles.optionText,
                    t === value && timeStyles.optionTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const timeStyles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  triggerDisabled: {
    backgroundColor: colors.borderLight,
    borderColor: colors.borderLight,
  },
  triggerText: { ...typography.smallMedium, color: colors.textPrimary },
  triggerTextDisabled: { color: colors.textSecondary },
  chevron: { fontSize: 10, color: colors.textSecondary },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: { maxHeight: 180 },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionActive: { backgroundColor: colors.primary + '18' },
  optionText: { ...typography.small, color: colors.textPrimary },
  optionTextActive: { color: colors.primary, fontWeight: '600' },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkerScheduleScreen() {
  const [days, setDays] = useState<DayState[]>(
    Array.from({ length: 7 }, (_, i) => DEFAULT_DAY_STATE(i))
  );
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const { loading: queryLoading } = useQuery<AvailabilityData>(
    MY_AVAILABILITY,
    {
      fetchPolicy: 'cache-and-network',
      onCompleted: (d) => {
        setDays(buildInitialState(d.myWorkerAvailability));
        setDirty(false);
      },
    }
  );

  const [updateAvailability, { loading: mutationLoading }] = useMutation(
    UPDATE_AVAILABILITY,
    {
      onCompleted: () => {
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      },
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  function updateDay(dayOfWeek: number, patch: Partial<DayState>) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
    setDirty(true);
    setSaved(false);
  }

  function handleSave() {
    const slots = days
      .filter((d) => d.isAvailable)
      .map(({ dayOfWeek, startTime, endTime }) => ({
        dayOfWeek,
        startTime,
        endTime,
      }));
    updateAvailability({ variables: { slots } });
  }

  if (queryLoading && days.every((d) => !d.isAvailable)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Programul meu</Text>
        <Text style={styles.subtitle}>
          Seteaza zilele si orele in care esti disponibil.
        </Text>

        {days.map((day) => (
          <PlatformCard key={day.dayOfWeek} style={styles.dayCard}>
            {/* Day toggle row */}
            <View style={styles.dayHeaderRow}>
              <View style={styles.dayNameContainer}>
                <View
                  style={[
                    styles.dayBadge,
                    day.isAvailable && styles.dayBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayBadgeText,
                      day.isAvailable && styles.dayBadgeTextActive,
                    ]}
                  >
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                </View>
                <Text style={styles.dayAvailLabel}>
                  {day.isAvailable ? 'Disponibil' : 'Indisponibil'}
                </Text>
              </View>
              <Switch
                value={day.isAvailable}
                onValueChange={(val: boolean) =>
                  updateDay(day.dayOfWeek, { isAvailable: val })
                }
                trackColor={{
                  false: colors.border,
                  true: colors.primary + '66',
                }}
                thumbColor={day.isAvailable ? colors.primary : colors.textSecondary}
              />
            </View>

            {/* Time pickers — shown only when available */}
            {day.isAvailable && (
              <View style={styles.timeRow}>
                <TimePicker
                  label="De la"
                  value={day.startTime}
                  onChange={(t) => updateDay(day.dayOfWeek, { startTime: t })}
                />
                <View style={styles.timeSeparator} />
                <TimePicker
                  label="Pana la"
                  value={day.endTime}
                  onChange={(t) => updateDay(day.dayOfWeek, { endTime: t })}
                />
              </View>
            )}
          </PlatformCard>
        ))}

        {/* Feedback / submit */}
        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>Programul a fost salvat.</Text>
          </View>
        )}

        <Button
          label={mutationLoading ? 'Se salveaza...' : 'Salveaza programul'}
          onPress={handleSave}
          loading={mutationLoading}
          disabled={!dirty || mutationLoading}
          fullWidth
        />

        <Text style={styles.footerNote}>
          Disponibilitatea seteaza cand poti fi alocat la joburi noi.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  title: { ...typography.heading3, color: colors.textPrimary },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: -spacing.xs },
  dayCard: { padding: spacing.base, gap: spacing.md },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeActive: { backgroundColor: colors.primary },
  dayBadgeText: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  dayBadgeTextActive: { color: '#fff' },
  dayAvailLabel: { ...typography.small, color: colors.textSecondary },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  timeSeparator: { width: spacing.xs },
  savedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  savedText: { ...typography.smallMedium, color: '#065F46' },
  footerNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
