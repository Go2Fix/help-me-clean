import { gql, useQuery } from '@apollo/client';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const WORKER_ALL_JOBS = gql`
  query WorkerAllJobs($first: Int!, $status: String) {
    searchWorkerBookings(limit: $first, offset: 0, status: $status) {
      edges {
        id
        referenceCode
        serviceType
        scheduledDate
        scheduledStartTime
        status
        address {
          streetAddress
          city
        }
      }
      totalCount
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobNode {
  id: string;
  referenceCode: string;
  serviceType: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  status: string;
  address: { streetAddress: string; city: string } | null;
}

interface JobEdge {
  node: JobNode;
}

interface WorkerAllJobsData {
  searchWorkerBookings: {
    edges: JobEdge[];
    totalCount: number;
  };
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

interface FilterTab {
  label: string;
  value: string | null;
}

const FILTER_TABS: FilterTab[] = [
  { label: 'Toate', value: null },
  { label: 'Confirmate', value: 'CONFIRMED' },
  { label: 'In desfasurare', value: 'IN_PROGRESS' },
  { label: 'Finalizate', value: 'COMPLETED' },
  { label: 'Anulate', value: 'CANCELLED_BY_CLIENT' },
];

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

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  return timeStr;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkerJobsScreen() {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data, loading } = useQuery<WorkerAllJobsData>(WORKER_ALL_JOBS, {
    variables: { first: 50, status: activeTab ?? undefined },
    fetchPolicy: 'cache-and-network',
  });

  const jobs = data?.searchWorkerBookings?.edges ?? [];
  const totalCount = data?.searchWorkerBookings?.totalCount ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Joburile mele</Text>
        <Text style={styles.count}>{totalCount} total</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScroll}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Pressable
              key={tab.label}
              onPress={() => setActiveTab(tab.value)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Loading state on initial fetch */}
      {loading && !data && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {/* List */}
      {(!loading || data) && (
        <FlashList
          data={jobs}
          estimatedItemSize={110}
          keyExtractor={(item: JobEdge) => item.node.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: JobEdge }) => (
            <Pressable
              onPress={() =>
                router.push(`/(worker)/jobs/${item.node.id}` as never)
              }
            >
              <PlatformCard style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.serviceType} numberOfLines={1}>
                    {formatServiceType(item.node.serviceType)}
                  </Text>
                  <StatusBadge status={item.node.status} />
                </View>
                {item.node.address && (
                  <Text style={styles.address} numberOfLines={1}>
                    {item.node.address.streetAddress}, {item.node.address.city}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.date}>
                    {formatDate(item.node.scheduledDate)}
                  </Text>
                  {item.node.scheduledStartTime ? (
                    <Text style={styles.time}>
                      {formatTime(item.node.scheduledStartTime)}
                    </Text>
                  ) : null}
                  <Text style={styles.refCode}>
                    {item.node.referenceCode}
                  </Text>
                </View>
              </PlatformCard>
            </Pressable>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Niciun job gasit</Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab
                    ? 'Nu exista joburi pentru filtrul selectat.'
                    : 'Nu ai joburi alocate momentan.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.heading3, color: colors.textPrimary },
  count: { ...typography.small, color: colors.textSecondary },
  tabsScroll: { flexGrow: 0 },
  tabsContainer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: { ...typography.smallMedium, color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: spacing.base },
  card: {
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceType: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  address: { ...typography.small, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  date: { ...typography.small, color: colors.textSecondary },
  time: { ...typography.smallMedium, color: colors.primary },
  refCode: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  empty: {
    alignItems: 'center',
    padding: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  emptySubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
