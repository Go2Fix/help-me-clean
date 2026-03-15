import { gql, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
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

const COMPANY_DASHBOARD = gql`
  query CompanyDashboard {
    myCompany {
      id
      companyName
      status
      ratingAvg
      logoUrl
      contactEmail
      contactPhone
      city
    }
    myCompanyFinancialSummary {
      totalRevenue
      completedBookings
      netPayout
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyProfile {
  id: string;
  companyName: string;
  status: string;
  ratingAvg: number | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
}

interface FinancialSummary {
  totalRevenue: number;
  completedBookings: number;
  netPayout: number;
}

interface DashboardData {
  myCompany: CompanyProfile;
  myCompanyFinancialSummary: FinancialSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `${amount.toFixed(0)} RON`;
}

function formatRating(rating: number | null): string {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

function companyStatusLabel(status: string): string {
  const map: Record<string, string> = {
    APPROVED: 'Aprobata',
    PENDING_REVIEW: 'In verificare',
    SUSPENDED: 'Suspendata',
    REJECTED: 'Respinsa',
  };
  return map[status] ?? status;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <PlatformCard style={styles.statCard}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </PlatformCard>
  );
}

function QuickAction({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={[styles.quickAction, { borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.quickActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanyDashboardScreen() {
  const { user } = useAuth();

  const { data, loading, error } = useQuery<DashboardData>(COMPANY_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const company = data?.myCompany;
  const summary = data?.myCompanyFinancialSummary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Buna, {user?.fullName?.split(' ')[0] ?? 'Admin'}!
            </Text>
            <Text style={styles.companyName}>
              {company?.companyName ?? 'Compania ta'}
            </Text>
          </View>
          {company && (
            <View style={styles.statusBadgeWrap}>
              <StatusBadge status={company.status} />
            </View>
          )}
        </View>

        {/* Loading state */}
        {loading && !data && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: spacing.xl }}
          />
        )}

        {/* Error state */}
        {error && !data && (
          <PlatformCard style={styles.errorCard}>
            <Text style={styles.errorText}>
              Nu s-au putut incarca datele: {error.message}
            </Text>
          </PlatformCard>
        )}

        {/* Rating */}
        {company && (
          <PlatformCard style={styles.ratingCard}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>
                {formatRating(company.ratingAvg)}
              </Text>
              <Text style={styles.ratingLabel}>Rating mediu</Text>
            </View>
            {company.city && (
              <Text style={styles.ratingCity}>{company.city}</Text>
            )}
          </PlatformCard>
        )}

        {/* Stats row */}
        {summary && (
          <>
            <Text style={styles.sectionTitle}>Sumar</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Venituri totale"
                value={formatCurrency(summary.totalRevenue)}
                highlight
              />
              <StatCard
                label="Comenzi"
                value={String(summary.completedBookings)}
              />
            </View>

            {summary.netPayout > 0 && (
              <PlatformCard style={styles.payoutCard}>
                <View style={styles.payoutRow}>
                  <View>
                    <Text style={styles.payoutLabel}>Plati in asteptare</Text>
                    <Text style={styles.payoutValue}>
                      {formatCurrency(summary.netPayout)}
                    </Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutBadgeText}>Payout</Text>
                  </View>
                </View>
              </PlatformCard>
            )}
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Actiuni rapide</Text>
        <View style={styles.quickActions}>
          <QuickAction
            label="Comenzi noi"
            color={colors.primary}
            onPress={() =>
              router.push('/(company)/orders/index' as never)
            }
          />
          <QuickAction
            label="Echipa"
            color={colors.secondary}
            onPress={() => router.push('/(company)/team' as never)}
          />
          <QuickAction
            label="Calendar"
            color={colors.accent}
            onPress={() => router.push('/(company)/calendar' as never)}
          />
        </View>

        {/* Company info footer */}
        {company && (
          <PlatformCard style={styles.infoCard}>
            <Text style={styles.infoTitle}>Informatii companie</Text>
            {company.contactEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {company.contactEmail}
                </Text>
              </View>
            )}
            {company.contactPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefon</Text>
                <Text style={styles.infoValue}>{company.contactPhone}</Text>
              </View>
            )}
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
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerLeft: { flex: 1 },
  greeting: { ...typography.body, color: colors.textSecondary },
  companyName: { ...typography.heading2, color: colors.textPrimary },
  statusBadgeWrap: { marginLeft: spacing.sm, paddingTop: spacing.xs },

  // Rating card
  ratingCard: {
    padding: spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingStar: { fontSize: 22, color: colors.accent },
  ratingValue: { ...typography.heading3, color: colors.textPrimary },
  ratingLabel: { ...typography.small, color: colors.textSecondary },
  ratingCity: { ...typography.small, color: colors.textSecondary },

  // Section title
  sectionTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statValueHighlight: { color: colors.primary },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Payout card
  payoutCard: { padding: spacing.base },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutLabel: { ...typography.small, color: colors.textSecondary },
  payoutValue: { ...typography.heading3, color: colors.warning },
  payoutBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  payoutBadgeText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: spacing.md },
  quickAction: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  quickActionText: { ...typography.smallMedium, fontWeight: '600' },

  // Info card
  infoCard: { padding: spacing.base, gap: spacing.sm },
  infoTitle: { ...typography.smallMedium, color: colors.textSecondary },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { ...typography.small, color: colors.textSecondary, flex: 1 },
  infoValue: {
    ...typography.smallMedium,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },

  // Error
  errorCard: { padding: spacing.base },
  errorText: { ...typography.small, color: colors.danger },
});
