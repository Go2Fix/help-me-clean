import { gql, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { StatusBadge } from '../../src/components/ui/Badge';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const TODAY_JOBS = gql`
  query WorkerTodayJobs {
    myBookings(first: 20, status: CONFIRMED) {
      edges {
        id
        status
        serviceType
        scheduledDate
        scheduledStartTime
        address {
          streetAddress
          city
        }
      }
    }
  }
`;

const WORKER_STATS = gql`
  query MyWorkerStats {
    myWorkerStats {
      totalJobsCompleted
      averageRating
      totalReviews
      thisMonthJobs
      thisMonthEarnings
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobNode {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  address: { streetAddress: string; city: string } | null;
}

interface JobEdge {
  node: JobNode;
}

interface TodayJobsData {
  myBookings: { edges: JobEdge[] };
}

interface WorkerStats {
  totalJobsCompleted: number;
  averageRating: number;
  totalReviews: number;
  thisMonthJobs: number;
  thisMonthEarnings: number;
}

interface WorkerStatsData {
  myWorkerStats: WorkerStats;
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

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  return timeStr;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatEarnings(amount: number): string {
  return `${amount.toFixed(0)} RON`;
}

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <PlatformCard style={styles.statCard}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </PlatformCard>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkerTodayScreen() {
  const { user } = useAuth();

  const {
    data: todayData,
    loading: todayLoading,
    refetch: refetchToday,
  } = useQuery<TodayJobsData>(TODAY_JOBS, { fetchPolicy: 'cache-and-network' });

  const { data: statsData, loading: statsLoading } =
    useQuery<WorkerStatsData>(WORKER_STATS, {
      fetchPolicy: 'cache-and-network',
    });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: string) => {
      if (state === 'active') refetchToday();
    });
    return () => sub.remove();
  }, [refetchToday]);

  const jobs = todayData?.myBookings?.edges ?? [];
  const stats = statsData?.myWorkerStats;

  const todayDate = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Buna, {user?.firstName}!</Text>
            <Text style={styles.dateText}>{todayDate}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        {statsLoading && !stats ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: spacing.base }}
          />
        ) : stats ? (
          <View style={styles.statsRow}>
            <StatCard
              label="Joburi totale"
              value={String(stats.totalJobsCompleted)}
            />
            <StatCard
              label="Rating"
              value={`★ ${formatRating(stats.averageRating)}`}
              accent
            />
            <StatCard
              label="Luna aceasta"
              value={formatEarnings(stats.thisMonthEarnings)}
            />
          </View>
        ) : null}

        {/* Today's section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Joburi azi</Text>
          {jobs.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{jobs.length}</Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {todayLoading && !todayData && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        )}

        {/* Empty state */}
        {jobs.length === 0 && !todayLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌤</Text>
            <Text style={styles.emptyTitle}>Niciun job azi</Text>
            <Text style={styles.emptySubtitle}>
              Nu ai joburi programate pentru astazi. Verifica sectiunea Joburi
              pentru urmatoarele programari.
            </Text>
          </View>
        )}

        {/* Job list */}
        {jobs.map(({ node }) => (
          <Pressable
            key={node.id}
            onPress={() =>
              router.push(`/(worker)/jobs/${node.id}` as never)
            }
          >
            <PlatformCard style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.service} numberOfLines={1}>
                  {formatServiceType(node.serviceType)}
                </Text>
                <StatusBadge status={node.status} />
              </View>
              {node.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {node.address.streetAddress}, {node.address.city}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.dateStr}>
                  {formatDate(node.scheduledDate)}
                </Text>
                {node.scheduledStartTime ? (
                  <Text style={styles.timeStr}>
                    {formatTime(node.scheduledStartTime)}
                  </Text>
                ) : null}
              </View>
            </PlatformCard>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  greeting: { ...typography.heading3, color: colors.textPrimary },
  dateText: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statValueAccent: { color: colors.accent },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: -spacing.xs,
  },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: { padding: spacing.base, gap: spacing.xs },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  service: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  address: { ...typography.small, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dateStr: { ...typography.small, color: colors.textSecondary },
  timeStr: { ...typography.smallMedium, color: colors.primary },
  empty: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  emptySubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
