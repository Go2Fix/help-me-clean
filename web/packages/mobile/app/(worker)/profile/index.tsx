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
import { useAuth } from '../../../src/auth/AuthContext';
import { Button } from '../../../src/components/ui/Button';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const WORKER_STATS = gql`
  query WorkerProfileStats {
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

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

function formatEarnings(amount: number): string {
  return `${amount.toFixed(0)} RON`;
}

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MenuItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}

function MenuItem({ label, icon, onPress, disabled = false }: MenuItemProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.menuItem,
        pressed && !disabled && styles.menuItemPressed,
        disabled && styles.menuItemDisabled,
      ]}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>
        {label}
      </Text>
      {disabled ? (
        <Text style={styles.menuSoon}>In curand</Text>
      ) : (
        <Text style={styles.menuChevron}>›</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkerProfileScreen() {
  const { user, logout } = useAuth();

  const { data, loading } = useQuery<WorkerStatsData>(WORKER_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.myWorkerStats;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profilul meu</Text>

        {/* Profile card */}
        <PlatformCard style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.profileRole}>Lucrator Go2Fix</Text>
              {stats ? (
                <View style={styles.ratingRow}>
                  <Text style={styles.stars}>
                    {renderStars(stats.averageRating)}
                  </Text>
                  <Text style={styles.ratingValue}>
                    {formatRating(stats.averageRating)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({stats.totalReviews} recenzii)
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          {loading && !stats && (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          )}
        </PlatformCard>

        {/* Stats card */}
        {stats && (
          <PlatformCard style={styles.statsCard}>
            <Text style={styles.cardSectionTitle}>Statistici</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stats.totalJobsCompleted}
                </Text>
                <Text style={styles.statLabel}>Joburi totale</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.thisMonthJobs}</Text>
                <Text style={styles.statLabel}>Luna aceasta</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.statValueEarnings]}>
                  {formatEarnings(stats.thisMonthEarnings)}
                </Text>
                <Text style={styles.statLabel}>Castiguri luna</Text>
              </View>
            </View>
          </PlatformCard>
        )}

        {/* Menu */}
        <PlatformCard style={styles.menuCard}>
          <Text style={styles.cardSectionTitle}>Cont</Text>
          <MenuItem
            icon="📅"
            label="Program saptamanal"
            onPress={() => router.push('/(worker)/schedule' as never)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="📄"
            label="Documentele mele"
            onPress={() => {}}
            disabled
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="🧠"
            label="Test personalitate"
            onPress={() => {}}
            disabled
          />
        </PlatformCard>

        {/* Logout */}
        <Button
          label="Deconectare"
          variant="ghost"
          onPress={logout}
          fullWidth
        />
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
  title: { ...typography.heading3, color: colors.textPrimary },

  // Profile card
  profileCard: { padding: spacing.base, gap: spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1, gap: spacing.xs },
  profileName: { ...typography.heading3, color: colors.textPrimary },
  profileRole: { ...typography.small, color: colors.primary, fontWeight: '600' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  stars: { fontSize: 14, color: colors.accent },
  ratingValue: { ...typography.smallMedium, color: colors.textPrimary },
  reviewCount: { ...typography.caption, color: colors.textSecondary },

  // Stats card
  statsCard: { padding: spacing.base },
  cardSectionTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderLight,
  },
  statValue: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statValueEarnings: { color: colors.secondary },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Menu card
  menuCard: { padding: spacing.base },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemPressed: { opacity: 0.6 },
  menuItemDisabled: { opacity: 0.5 },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  menuLabelDisabled: { color: colors.textSecondary },
  menuChevron: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  menuSoon: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 44,
  },
});
