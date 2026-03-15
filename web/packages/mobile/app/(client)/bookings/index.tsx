import { gql, useQuery } from '@apollo/client';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
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
import { colors, spacing, typography } from '../../../src/design/tokens';

const MY_BOOKINGS = gql`
  query MyBookingsMobile($first: Int!, $after: String, $status: BookingStatus) {
    myBookings(first: $first, after: $after, status: $status) {
      edges {
        id
        status
        serviceType
        scheduledDate
        estimatedTotal
        address {
          streetAddress
          city
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

interface BookingNode {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  estimatedTotal: number;
  address: { streetAddress: string; city: string } | null;
}

interface BookingEdge {
  node: BookingNode;
  cursor: string;
}

interface MyBookingsData {
  myBookings: {
    edges: BookingEdge[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    totalCount: number;
  };
}

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
    year: 'numeric',
  });
}

export default function BookingsScreen() {
  const { data, loading, fetchMore } = useQuery<MyBookingsData>(MY_BOOKINGS, {
    variables: { first: 20 },
  });

  const bookings = data?.myBookings?.edges ?? [];
  const pageInfo = data?.myBookings?.pageInfo;

  function loadMore() {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    fetchMore({ variables: { after: pageInfo.endCursor } });
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Rezervarile mele</Text>
        <Text style={styles.count}>
          {data?.myBookings?.totalCount ?? 0} total
        </Text>
      </View>
      <FlashList
        data={bookings}
        estimatedItemSize={120}
        keyExtractor={(item) => item.node.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(`/(client)/bookings/${item.node.id}` as never)
            }
          >
            <PlatformCard style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.serviceType}>
                  {formatServiceType(item.node.serviceType)}
                </Text>
                <StatusBadge status={item.node.status} />
              </View>
              {item.node.address && (
                <Text style={styles.address}>
                  {item.node.address.streetAddress}, {item.node.address.city}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.date}>
                  {formatDate(item.node.scheduledDate)}
                </Text>
                <Text style={styles.price}>
                  {item.node.estimatedTotal.toFixed(2)} RON
                </Text>
              </View>
            </PlatformCard>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nu ai rezervari momentan.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: spacing.base,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.heading3, color: colors.textPrimary },
  count: { ...typography.small, color: colors.textSecondary },
  list: { padding: spacing.base },
  card: { padding: spacing.base, marginBottom: spacing.sm, gap: spacing.xs },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceType: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  address: { ...typography.small, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  date: { ...typography.small, color: colors.textSecondary },
  price: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  empty: { alignItems: 'center', padding: spacing['3xl'] },
  emptyText: { ...typography.body, color: colors.textSecondary },
});
