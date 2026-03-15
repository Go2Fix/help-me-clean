import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

export default function BookingSuccessScreen() {
  const { bookingId, referenceCode, estimatedTotal, isGuest } =
    useLocalSearchParams<{
      bookingId: string;
      referenceCode: string;
      estimatedTotal: string;
      isGuest: string;
    }>();

  const guest = isGuest === '1';
  const total = estimatedTotal ? parseFloat(estimatedTotal) : null;

  function handleViewBooking() {
    if (guest) {
      // Guest: go to login to create account
      router.replace('/(auth)/login');
    } else {
      // Authenticated: navigate to booking detail
      router.replace(`/(client)/bookings/${bookingId}` as never);
    }
  }

  function handleGoHome() {
    if (guest) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(client)');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>Rezervare trimisa!</Text>
        <Text style={styles.subtitle}>
          Cererea ta a fost inregistrata. Te vom contacta in scurt timp pentru confirmare.
        </Text>

        {/* Reference card */}
        <PlatformCard style={styles.refCard}>
          <Text style={styles.refLabel}>Cod rezervare</Text>
          <Text style={styles.refCode}>{referenceCode}</Text>
          {total !== null && (
            <>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total estimat</Text>
                <Text style={styles.totalValue}>{total.toFixed(2)} RON</Text>
              </View>
            </>
          )}
        </PlatformCard>

        {/* Guest conversion banner */}
        {guest && (
          <PlatformCard style={styles.guestBanner}>
            <Text style={styles.guestBannerTitle}>Creeaza un cont Go2Fix</Text>
            <Text style={styles.guestBannerBody}>
              Inregistreaza-te pentru a urmari rezervarile tale, a salva adrese si a gestiona platile.
            </Text>
            <Pressable
              style={styles.guestBannerBtn}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.guestBannerBtnText}>Creeaza cont gratuit →</Text>
            </Pressable>
          </PlatformCard>
        )}

        {/* Info */}
        <View style={styles.infoList}>
          <InfoItem icon="📧" text="Vei primi un email de confirmare in cateva minute." />
          <InfoItem icon="📞" text="Un reprezentant te va contacta pentru a confirma detaliile." />
          <InfoItem icon="🔔" text="Vei primi notificari despre statusul rezervarii tale." />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!guest && (
            <Button
              label="Vezi rezervarea"
              onPress={handleViewBooking}
              fullWidth
              size="lg"
            />
          )}
          <Button
            label={guest ? 'Inapoi la start' : 'Inapoi acasa'}
            variant="ghost"
            onPress={handleGoHome}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing['2xl'],
    paddingTop: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40, color: '#fff', fontWeight: '700' },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  refCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refLabel: { ...typography.smallMedium, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  refCode: { ...typography.heading2, color: colors.primary, letterSpacing: 2 },
  divider: { width: '100%', height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  totalLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  totalValue: { ...typography.heading3, color: colors.primary },
  guestBanner: {
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  guestBannerTitle: { ...typography.heading3, color: colors.primary },
  guestBannerBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  guestBannerBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  guestBannerBtnText: { ...typography.bodyMedium, color: '#fff' },
  infoList: { width: '100%', gap: spacing.md },
  infoItem: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  infoIcon: { fontSize: 18, marginTop: 2 },
  infoText: { ...typography.small, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  actions: { width: '100%', gap: spacing.md, marginTop: spacing.md },
});
