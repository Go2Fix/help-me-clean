import { gql, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React from 'react';
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
import { useAuth } from '../../src/auth/AuthContext';
import { StatusBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_COMPANY_SETTINGS = gql`
  query MyCompanySettings {
    myCompany {
      id
      companyName
      status
      city
      contactEmail
      contactPhone
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyInfo {
  id: string;
  companyName: string;
  status: string;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface CompanySettingsData {
  myCompany: CompanyInfo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function MenuRow({
  label,
  subtitle,
  onPress,
  disabled,
}: {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.menuRow, disabled && styles.menuRowDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.menuLeft}>
        <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={[styles.menuChevron, disabled && styles.menuLabelDisabled]}>
        {'›'}
      </Text>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanySettingsScreen() {
  const { user, logout } = useAuth();

  const { data, loading } = useQuery<CompanySettingsData>(
    MY_COMPANY_SETTINGS,
    { fetchPolicy: 'cache-and-network' }
  );

  const company = data?.myCompany;

  const appVersion =
    Constants.expoConfig?.version ?? '—';

  function handleLogout() {
    Alert.alert('Deconectare', 'Esti sigur ca vrei sa te deconectezi?', [
      { text: 'Renunta', style: 'cancel' },
      { text: 'Deconectare', style: 'destructive', onPress: logout },
    ]);
  }

  function handlePlaceholder(name: string) {
    Alert.alert(name, 'Aceasta functionalitate va fi disponibila in curand.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>Setari</Text>

        {/* User card */}
        <PlatformCard style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userRole}>Administrator Companie</Text>
          </View>
        </PlatformCard>

        {/* Company info card */}
        {loading && !company && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: spacing.md }}
          />
        )}

        {company && (
          <PlatformCard style={styles.companyCard}>
            <View style={styles.companyHeader}>
              <View style={styles.companyHeaderLeft}>
                <Text style={styles.companyName}>{company.companyName}</Text>
                {company.city && (
                  <Text style={styles.companyCity}>{company.city}</Text>
                )}
              </View>
              <StatusBadge status={company.status} />
            </View>

            <View style={styles.companyDetails}>
              <View style={styles.companyDetailRow}>
                <Text style={styles.companyDetailLabel}>CUI</Text>
                <Text style={styles.companyDetailValue}>—</Text>
              </View>
              <View style={styles.companyDetailRow}>
                <Text style={styles.companyDetailLabel}>Status</Text>
                <Text style={styles.companyDetailValue}>
                  {companyStatusLabel(company.status)}
                </Text>
              </View>
              {company.contactEmail && (
                <View style={styles.companyDetailRow}>
                  <Text style={styles.companyDetailLabel}>Email</Text>
                  <Text
                    style={styles.companyDetailValue}
                    numberOfLines={1}
                  >
                    {company.contactEmail}
                  </Text>
                </View>
              )}
              {company.contactPhone && (
                <View style={styles.companyDetailRow}>
                  <Text style={styles.companyDetailLabel}>Telefon</Text>
                  <Text style={styles.companyDetailValue}>
                    {company.contactPhone}
                  </Text>
                </View>
              )}
            </View>
          </PlatformCard>
        )}

        {/* Financial section */}
        <SectionHeader title="Financiar" />
        <PlatformCard style={styles.menuCard}>
          <MenuRow
            label="Plati & Payouts"
            subtitle="Istoricul platilor si retrageri"
            onPress={() => handlePlaceholder('Plati & Payouts')}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            label="Facturi"
            subtitle="Descarca facturi emise"
            onPress={() => handlePlaceholder('Facturi')}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            label="Configurare Stripe"
            subtitle="Disponibil pe web (go2fix.ro)"
            disabled
          />
        </PlatformCard>

        {/* Reputatie section */}
        <SectionHeader title="Reputatie" />
        <PlatformCard style={styles.menuCard}>
          <MenuRow
            label="Recenzii"
            subtitle="Toate recenziile companiei tale"
            onPress={() => handlePlaceholder('Recenzii')}
          />
        </PlatformCard>

        {/* App section */}
        <SectionHeader title="Aplicatie" />
        <PlatformCard style={styles.menuCard}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Versiune</Text>
            <Text style={styles.versionValue}>{appVersion}</Text>
          </View>
          <View style={styles.menuDivider} />
          <MenuRow
            label="Termeni & Conditii"
            onPress={() => handlePlaceholder('Termeni & Conditii')}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            label="Politica de confidentialitate"
            onPress={() => handlePlaceholder('Politica de confidentialitate')}
          />
        </PlatformCard>

        {/* Logout */}
        <Button
          label="Deconectare"
          variant="ghost"
          onPress={handleLogout}
          fullWidth
          style={styles.logoutBtn}
        />

        <Text style={styles.brand}>Go2Fix.ro</Text>
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

  // Page title
  pageTitle: { ...typography.heading3, color: colors.textPrimary },

  // User card
  userCard: {
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    ...typography.heading3,
    color: '#fff',
    fontWeight: '700',
  },
  userInfo: { flex: 1 },
  userName: { ...typography.bodyMedium, color: colors.textPrimary },
  userEmail: { ...typography.small, color: colors.textSecondary },
  userRole: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },

  // Company card
  companyCard: { padding: spacing.base, gap: spacing.md },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyHeaderLeft: { flex: 1, marginRight: spacing.sm },
  companyName: { ...typography.bodyMedium, color: colors.textPrimary },
  companyCity: { ...typography.small, color: colors.textSecondary },
  companyDetails: { gap: spacing.sm },
  companyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyDetailLabel: { ...typography.small, color: colors.textSecondary, flex: 1 },
  companyDetailValue: {
    ...typography.smallMedium,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },

  // Section header
  sectionHeader: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
    paddingHorizontal: spacing.xs,
  },

  // Menu card
  menuCard: { overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  menuRowDisabled: { opacity: 0.45 },
  menuLeft: { flex: 1, gap: 2 },
  menuLabel: { ...typography.body, color: colors.textPrimary },
  menuLabelDisabled: { color: colors.textSecondary },
  menuSubtitle: { ...typography.caption, color: colors.textSecondary },
  menuChevron: {
    fontSize: 22,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.base,
  },

  // Version row
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  versionLabel: { ...typography.body, color: colors.textPrimary },
  versionValue: { ...typography.small, color: colors.textSecondary },

  // Logout
  logoutBtn: { marginTop: spacing.sm },

  // Brand
  brand: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
