import { gql, useQuery } from '@apollo/client';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
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

const COMPANY_ORDERS = gql`
  query CompanyOrders($first: Int!, $after: String, $status: BookingStatus) {
    companyBookings(first: $first, after: $after, status: $status) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        status
        estimatedTotal
        address {
          streetAddress
          city
        }
        worker {
          id
          fullName
        }
        client {
          fullName
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingStatus =
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_COMPANY'
  | 'PENDING';

interface OrderAddress {
  streetAddress: string;
  city: string;
}

interface OrderWorker {
  id: string;
  fullName: string;
}

interface OrderClient {
  firstName: string;
  lastName: string;
}

interface OrderNode {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  status: string;
  estimatedTotal: number | null;
  address: OrderAddress | null;
  worker: OrderWorker | null;
  client: OrderClient | null;
}

interface OrderEdge {
  node: OrderNode;
  cursor: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface CompanyOrdersData {
  companyBookings: {
    edges: OrderEdge[];
    pageInfo: PageInfo;
    totalCount: number;
  };
}

// ---------------------------------------------------------------------------
// Filter tabs config
// ---------------------------------------------------------------------------

interface FilterTab {
  key: string;
  label: string;
  status: BookingStatus | null;
}

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'Toate', status: null },
  { key: 'ASSIGNED', label: 'Alocate', status: 'ASSIGNED' },
  { key: 'CONFIRMED', label: 'Confirmate', status: 'CONFIRMED' },
  { key: 'IN_PROGRESS', label: 'In desfasurare', status: 'IN_PROGRESS' },
  { key: 'COMPLETED', label: 'Finalizate', status: 'COMPLETED' },
];

const PAGE_SIZE = 20;

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
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(amount: number | null): string {
  if (amount == null) return '—';
  return `${amount.toFixed(0)} RON`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.tabsContainer}>
      <FlashList
        data={FILTER_TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={90}
        contentContainerStyle={styles.tabsContent}
        renderItem={({ item }) => {
          const isActive = item.key === active;
          return (
            <Pressable
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelect(item.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
        keyExtractor={(item) => item.key}
      />
    </View>
  );
}

function OrderCard({ order }: { order: OrderNode }) {
  const serviceName =
    order.serviceName ?? formatServiceType(order.serviceType);

  return (
    <Pressable
      onPress={() => router.push(`/(company)/orders/${order.id}` as never)}
    >
      <PlatformCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.refCode}>{order.referenceCode}</Text>
          <StatusBadge status={order.status} />
        </View>

        <Text style={styles.serviceName}>{serviceName}</Text>

        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>{formatDate(order.scheduledDate)}</Text>
          {order.scheduledStartTime && (
            <Text style={styles.metaDot}>·</Text>
          )}
          {order.scheduledStartTime && (
            <Text style={styles.metaText}>{order.scheduledStartTime}</Text>
          )}
        </View>

        {order.address && (
          <Text style={styles.address} numberOfLines={1}>
            {order.address.streetAddress}, {order.address.city}
          </Text>
        )}

        <View style={styles.cardFooter}>
          {order.worker ? (
            <Text style={styles.workerName}>
              Lucrator: {order.worker.fullName}
            </Text>
          ) : (
            <Text style={styles.workerUnassigned}>Nealocata</Text>
          )}
          <Text style={styles.price}>
            {formatPrice(order.estimatedTotal)}
          </Text>
        </View>
      </PlatformCard>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanyOrdersScreen() {
  const [activeTab, setActiveTab] = useState<string>('all');

  const activeFilter = FILTER_TABS.find((t) => t.key === activeTab);
  const statusFilter = activeFilter?.status ?? null;

  const { data, loading, error, fetchMore, refetch } =
    useQuery<CompanyOrdersData>(COMPANY_ORDERS, {
      variables: {
        first: PAGE_SIZE,
        after: null,
        status: statusFilter,
      },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    });

  const orders = data?.companyBookings?.edges ?? [];
  const pageInfo = data?.companyBookings?.pageInfo;
  const totalCount = data?.companyBookings?.totalCount ?? 0;

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      const tab = FILTER_TABS.find((t) => t.key === key);
      refetch({ first: PAGE_SIZE, after: null, status: tab?.status ?? null });
    },
    [refetch]
  );

  const handleLoadMore = useCallback(() => {
    if (!pageInfo?.hasNextPage || loading) return;
    fetchMore({
      variables: {
        first: PAGE_SIZE,
        after: pageInfo.endCursor,
        status: statusFilter,
      },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev;
        return {
          companyBookings: {
            ...fetchMoreResult.companyBookings,
            edges: [
              ...prev.companyBookings.edges,
              ...fetchMoreResult.companyBookings.edges,
            ],
          },
        };
      },
    });
  }, [pageInfo, loading, fetchMore, statusFilter]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Comenzi</Text>
        {data && (
          <Text style={styles.totalCount}>{totalCount} total</Text>
        )}
      </View>

      {/* Filter tabs */}
      <FilterTabs active={activeTab} onSelect={handleTabChange} />

      {/* Error */}
      {error && !data && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Initial loading */}
      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && data && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nicio comanda gasita pentru filtrul selectat.
          </Text>
        </View>
      )}

      {/* Orders list */}
      {orders.length > 0 && (
        <FlashList
          data={orders}
          estimatedItemSize={140}
          keyExtractor={(item) => item.node.id}
          renderItem={({ item }) => <OrderCard order={item.node} />}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            pageInfo?.hasNextPage ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ paddingVertical: spacing.xl }}
              />
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
  totalCount: { ...typography.small, color: colors.textSecondary },

  // Tabs
  tabsContainer: { height: 44, marginBottom: spacing.sm },
  tabsContent: { paddingHorizontal: spacing.base },
  tab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { ...typography.smallMedium, color: colors.textSecondary },
  tabTextActive: { color: '#fff' },

  // List
  listContent: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  // Card
  card: { padding: spacing.base, marginBottom: spacing.md, gap: spacing.xs },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refCode: { ...typography.caption, color: colors.textSecondary },
  serviceName: { ...typography.bodyMedium, color: colors.textPrimary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.small, color: colors.textSecondary },
  metaDot: { ...typography.small, color: colors.textSecondary },
  address: { ...typography.small, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  workerName: { ...typography.small, color: colors.primary },
  workerUnassigned: { ...typography.small, color: colors.warning },
  price: { ...typography.smallMedium, color: colors.textPrimary },

  // States
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
});
