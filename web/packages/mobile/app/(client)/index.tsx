import { gql, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  AppState,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/auth/AuthContext';
import { PlatformCard } from '../../src/design';
import { colors, spacing, typography } from '../../src/design/tokens';

const DASHBOARD_QUERY = gql`
  query ClientDashboard {
    myBookings(first: 3, status: CONFIRMED) {
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
    }
    unreadNotificationCount
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
}

interface DashboardData {
  myBookings: { edges: BookingEdge[] };
  unreadNotificationCount: number;
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data, refetch } = useQuery<DashboardData>(DASHBOARD_QUERY);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const bookings = data?.myBookings?.edges ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Buna, {user?.firstName ?? 'utilizator'}!
          </Text>
          <Text style={styles.subGreeting}>Cum iti putem ajuta azi?</Text>
        </View>

        <Button
          label="+ Rezervare noua"
          onPress={() => router.push('/new-booking')}
          fullWidth
          style={styles.cta}
        />

        {bookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rezervari viitoare</Text>
            {bookings.map(({ node }) => (
              <Pressable
                key={node.id}
                onPress={() =>
                  router.push(`/(client)/bookings/${node.id}` as never)
                }
              >
                <PlatformCard style={styles.bookingCard}>
                  <View style={styles.cardRow}>
                    <Text style={styles.serviceType}>
                      {formatServiceType(node.serviceType)}
                    </Text>
                    <StatusBadge status={node.status} />
                  </View>
                  {node.address && (
                    <Text style={styles.address}>
                      {node.address.streetAddress}, {node.address.city}
                    </Text>
                  )}
                  <Text style={styles.date}>
                    {formatDate(node.scheduledDate)}
                  </Text>
                  <Text style={styles.price}>
                    {node.estimatedTotal.toFixed(2)} RON
                  </Text>
                </PlatformCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  header: { marginBottom: spacing.xl },
  greeting: { ...typography.heading2, color: colors.textPrimary },
  subGreeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cta: { marginBottom: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bookingCard: { padding: spacing.base, gap: spacing.xs },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceType: { ...typography.bodyMedium, color: colors.textPrimary },
  address: { ...typography.small, color: colors.textSecondary },
  date: { ...typography.smallMedium, color: colors.textPrimary },
  price: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
});
