import { gql, useMutation, useQuery } from '@apollo/client';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { JobTimer } from '../../../src/components/worker/JobTimer';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const WORKER_JOB_DETAIL = gql`
  query WorkerJobDetail($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      paymentStatus
      address {
        streetAddress
        city
        county
        floor
        apartment
        entryCode
      }
      client {
        id
        fullName
      }
      startedAt
      completedAt
      startLat
      startLng
      finishLat
      finishLng
      photos {
        id
        photoUrl
        phase
      }
    }
  }
`;

const START_JOB = gql`
  mutation StartJob($id: ID!, $latitude: Float, $longitude: Float) {
    startJob(id: $id, latitude: $latitude, longitude: $longitude) {
      id
      status
      startedAt
      startLat
      startLng
    }
  }
`;

const COMPLETE_JOB = gql`
  mutation CompleteJob($id: ID!, $latitude: Float, $longitude: Float) {
    completeJob(id: $id, latitude: $latitude, longitude: $longitude) {
      id
      status
      completedAt
      finishLat
      finishLng
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobAddress {
  streetAddress: string;
  city: string;
  county: string;
  floor: string | null;
  apartment: string | null;
  entryCode: string | null;
}

interface JobClient {
  id: string;
  firstName: string;
  lastName: string;
}

interface JobPhoto {
  id: string;
  photoUrl: string;
  phase: string;
}

interface JobDetail {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  estimatedDurationHours: number | null;
  status: string;
  paymentStatus: string | null;
  address: JobAddress | null;
  client: JobClient | null;
  startedAt: string | null;
  completedAt: string | null;
  startLat: number | null;
  startLng: number | null;
  finishLat: number | null;
  finishLng: number | null;
  photos: JobPhoto[];
}

interface WorkerJobDetailData {
  booking: JobDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    STANDARD_CLEANING: 'Curatenie standard',
    DEEP_CLEANING: 'Curatenie profunda',
    MOVE_IN_OUT: 'Curatenie mutare',
    POST_CONSTRUCTION: 'Curatenie dupa constructie',
    OFFICE: 'Curatenie birou',
    WINDOW: 'Curatenie geamuri',
  };
  return map[type] ?? type;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  return timeStr;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

function computeDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMin = Math.round((end - start) / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GPS helper
// ---------------------------------------------------------------------------

interface GpsCoords {
  latitude: number | null;
  longitude: number | null;
}

async function requestGps(): Promise<GpsCoords> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { latitude: null, longitude: null };
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkerJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(false);

  const { data, loading, error, refetch } = useQuery<WorkerJobDetailData>(
    WORKER_JOB_DETAIL,
    { variables: { id }, fetchPolicy: 'cache-and-network' }
  );

  const [startJob, { loading: startLoading }] = useMutation(START_JOB, {
    onCompleted: () => {
      setGpsLoading(false);
      refetch();
    },
    onError: (err) => {
      setGpsLoading(false);
      Alert.alert('Eroare', err.message);
    },
  });

  const [completeJob, { loading: completeLoading }] = useMutation(COMPLETE_JOB, {
    onCompleted: () => {
      setGpsLoading(false);
      refetch();
    },
    onError: (err) => {
      setGpsLoading(false);
      Alert.alert('Eroare', err.message);
    },
  });

  async function handleStartJob() {
    setGpsLoading(true);
    setGpsWarning(false);
    const coords = await requestGps();
    if (coords.latitude === null) {
      setGpsWarning(true);
    }
    startJob({
      variables: {
        id,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
  }

  async function handleCompleteJob() {
    setGpsLoading(true);
    setGpsWarning(false);
    const coords = await requestGps();
    if (coords.latitude === null) {
      setGpsWarning(true);
    }
    completeJob({
      variables: {
        id,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
  }

  const actionInProgress = gpsLoading || startLoading || completeLoading;

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data?.booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error?.message ?? 'Jobul nu a fost gasit.'}
          </Text>
          <Button
            label="Inapoi"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: spacing.base }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const job = data.booking;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>{'‹ Inapoi'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.refCode}>{job.referenceCode}</Text>
            <Text style={styles.serviceName}>
              {job.serviceName ?? formatServiceType(job.serviceType)}
            </Text>
          </View>
          <StatusBadge status={job.status} />
        </View>

        {/* GPS warning */}
        {gpsWarning && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Permisiunea de localizare este necesara pentru inregistrarea corecta a jobului.
            </Text>
          </View>
        )}

        {/* Address card */}
        {job.address && (
          <PlatformCard style={styles.card}>
            <SectionTitle label="Adresa" />
            <Text style={styles.addressMain}>
              {job.address.streetAddress}
              {job.address.floor ? `, Etaj ${job.address.floor}` : ''}
              {job.address.apartment ? `, Ap. ${job.address.apartment}` : ''}
            </Text>
            <Text style={styles.addressCity}>
              {job.address.city}, {job.address.county}
            </Text>
            {job.address.entryCode ? (
              <View style={styles.entryCodeRow}>
                <Text style={styles.entryCodeLabel}>Cod intrare:</Text>
                <Text style={styles.entryCodeValue}>{job.address.entryCode}</Text>
              </View>
            ) : null}
          </PlatformCard>
        )}

        {/* Schedule card */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Programare" />
          <DetailRow label="Data" value={formatDate(job.scheduledDate)} />
          <DetailRow label="Ora start" value={formatTime(job.scheduledStartTime)} />
          {job.estimatedDurationHours != null && (
            <DetailRow
              label="Durata estimata"
              value={`${job.estimatedDurationHours} ore`}
            />
          )}
        </PlatformCard>

        {/* Client card */}
        {job.client && (
          <PlatformCard style={styles.card}>
            <SectionTitle label="Client" />
            <View style={styles.clientRow}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>
                  {job.client.firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.clientName}>
                {job.client.firstName} {job.client.lastName.charAt(0)}.
              </Text>
            </View>
          </PlatformCard>
        )}

        {/* Status-gated action section */}
        {job.status === 'CONFIRMED' && (
          <View style={styles.actionSection}>
            <Button
              label="Porneste jobul"
              variant="primary"
              size="lg"
              onPress={handleStartJob}
              loading={actionInProgress}
              disabled={actionInProgress}
              fullWidth
            />
            <Text style={styles.actionHint}>
              Se va inregistra locatia GPS la pornire.
            </Text>
          </View>
        )}

        {job.status === 'IN_PROGRESS' && (
          <>
            {/* Timer */}
            <PlatformCard style={styles.card}>
              <SectionTitle label="Job in desfasurare" />
              {job.startedAt ? (
                <>
                  <View style={styles.timerRow}>
                    <JobTimer startedAt={job.startedAt} />
                  </View>
                  <DetailRow
                    label="Pornit la"
                    value={formatDateTime(job.startedAt)}
                  />
                </>
              ) : null}
            </PlatformCard>

            {/* Photo placeholder */}
            <PlatformCard style={styles.card}>
              <SectionTitle label="Fotografii job" />
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderIcon}>📷</Text>
                <Text style={styles.photoPlaceholderText}>
                  Functie foto in curand
                </Text>
              </View>
            </PlatformCard>

            <View style={styles.actionSection}>
              <Button
                label="Finalizeaza jobul"
                variant="secondary"
                size="lg"
                onPress={handleCompleteJob}
                loading={actionInProgress}
                disabled={actionInProgress}
                fullWidth
              />
              <Text style={styles.actionHint}>
                Se va inregistra locatia GPS la finalizare.
              </Text>
            </View>
          </>
        )}

        {job.status === 'COMPLETED' && job.startedAt && job.completedAt && (
          <PlatformCard style={[styles.card, styles.completedCard]}>
            <SectionTitle label="Job finalizat" />
            <View style={styles.completedCheckRow}>
              <View style={styles.completedCheck}>
                <Text style={styles.completedCheckText}>✓</Text>
              </View>
              <Text style={styles.completedLabel}>Finalizat cu succes</Text>
            </View>
            <DetailRow
              label="Pornit la"
              value={formatDateTime(job.startedAt)}
            />
            <DetailRow
              label="Finalizat la"
              value={formatDateTime(job.completedAt)}
            />
            <DetailRow
              label="Durata totala"
              value={computeDuration(job.startedAt, job.completedAt)}
            />
          </PlatformCard>
        )}
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
    padding: spacing.base,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { ...typography.bodyMedium, color: colors.primary },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleLeft: { flex: 1, marginRight: spacing.sm },
  refCode: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  serviceName: { ...typography.heading3, color: colors.textPrimary },
  card: { padding: spacing.base, gap: spacing.sm },
  sectionTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailLabel: { ...typography.small, color: colors.textSecondary, flex: 1 },
  detailValue: {
    ...typography.smallMedium,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  addressMain: { ...typography.bodyMedium, color: colors.textPrimary },
  addressCity: { ...typography.small, color: colors.textSecondary },
  entryCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  entryCodeLabel: { ...typography.small, color: '#92400E', fontWeight: '500' },
  entryCodeValue: {
    ...typography.bodyMedium,
    color: '#92400E',
    fontWeight: '700',
    letterSpacing: 1,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  clientName: { ...typography.bodyMedium, color: colors.textPrimary },
  actionSection: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timerRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
  },
  photoPlaceholderIcon: { fontSize: 32 },
  photoPlaceholderText: { ...typography.body, color: colors.textSecondary },
  completedCard: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completedCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  completedCheck: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCheckText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  completedLabel: { ...typography.bodyMedium, color: colors.secondary },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: { ...typography.small, color: '#92400E' },
  errorText: { ...typography.small, color: colors.danger },
});
