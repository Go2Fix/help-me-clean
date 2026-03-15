import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

const TRUST_STRIP = '500+ clienți mulțumiți · Firme verificate · Plată securizată';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = useMemo(() => makeStyles(dark), [dark]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <View style={s.hero}>
        {/* Top bar */}
        <View style={s.topBar}>
          <View />
          <Pressable onPress={() => router.push('/(auth)/login')}>
            {({ pressed }) => (
              <View style={[s.contBtnWrap, pressed && { opacity: 0.6 }]}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={40} tint="light" style={s.contBtnBlur}>
                    <Feather name="user" size={18} color="#fff" />
                  </BlurView>
                ) : (
                  <View style={s.contBtnAndroid}>
                    <Feather name="user" size={18} color="#fff" />
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </View>

        {/* Branding */}
        <View style={s.brand}>
          <View style={s.logoRow}>
            <Text style={s.logoIcon}>✦</Text>
            <Text style={s.logo}>Go2Fix</Text>
          </View>
          <Text style={s.tagline}>
            Casa ta, <Text style={s.taglineAccent}>curată</Text>
            {'\n'}în câteva ore.
          </Text>
        </View>

        {/* Trust strip */}
        <View style={s.pill}>
          <Text style={s.pillText}>{TRUST_STRIP}</Text>
        </View>

        {/* Primary CTA */}
        <Pressable onPress={() => router.push('/new-booking')}>
          {({ pressed }) => (
            <View style={[s.bookBtn, pressed && s.bookBtnPressed]}>
              <View style={s.bookBtnTop}>
                <Text style={s.bookBtnEmoji}>🧹</Text>
                <View style={s.bookBtnBadge}>
                  <Text style={s.bookBtnBadgeText}>Fara cont necesar</Text>
                </View>
              </View>
              <Text style={s.bookBtnLabel}>Rezerva o curatenie</Text>
              <View style={s.bookBtnBottom}>
                <Text style={s.bookBtnSub}>Rapid si usor · Plata online</Text>
                <View style={s.bookBtnArrow}>
                  <Text style={s.bookBtnArrowText}>→</Text>
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Bottom panel ──────────────────────────────────────────── */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, spacing.base) + spacing.base }]}>
        <Pressable onPress={() => router.push('/(auth)/register-company')}>
          {({ pressed }) => (
            <View style={[s.partnerBtn, pressed && s.partnerBtnPressed]}>
              <View style={s.partnerBtnIcon}>
                <Feather name="briefcase" size={18} color={colors.primary} />
              </View>
              <View style={s.partnerBtnBody}>
                <Text style={s.partnerBtnLabel}>Aplica ca firma partenera</Text>
                <Text style={s.partnerBtnSub}>Inregistreaza-ti compania pe Go2Fix</Text>
              </View>
              <Feather name="chevron-right" size={18} color={dark ? '#6B7280' : colors.textSecondary} />
            </View>
          )}
        </Pressable>

        <Text style={s.footerText}>Go2Fix SRL · go2fix.ro</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Theme-aware styles
// ---------------------------------------------------------------------------

function makeStyles(dark: boolean) {
  const bottomBg = dark ? '#1C1C1E' : colors.background;
  const cardBg = dark ? '#2C2C2E' : '#ffffff';
  const cardText = dark ? '#F9FAFB' : colors.textPrimary;
  const cardSub = dark ? '#9CA3AF' : colors.textSecondary;
  const badgeBg = dark ? 'rgba(37,99,235,0.25)' : '#EFF6FF';
  const badgeBorder = dark ? 'rgba(37,99,235,0.4)' : '#BFDBFE';
  const badgeText = dark ? '#93C5FD' : colors.primary;
  const partnerBg = dark ? '#2C2C2E' : '#F8FAFF';
  const partnerBorder = dark ? '#3A3A3C' : '#E0EAFF';
  const partnerIconBg = dark ? 'rgba(37,99,235,0.2)' : '#EFF6FF';
  const dividerColor = dark ? '#3A3A3C' : colors.border;
  const footerColor = dark ? '#4B5563' : '#D1D5DB';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.primary,
    },

    // ── Hero ──────────────────────────────────────────────────────────────
    hero: {
      flex: 1,
      paddingHorizontal: spacing['2xl'],
      paddingBottom: spacing['2xl'],
      gap: spacing.xl,
      justifyContent: 'flex-end',
    },

    topBar: {
      position: 'absolute',
      top: spacing.md,
      left: spacing['2xl'],
      right: spacing['2xl'],
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },

    contBtnWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
    },
    contBtnBlur: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contBtnAndroid: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    // Branding
    brand: { gap: spacing.sm },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoIcon: {
      fontSize: 20,
      color: 'rgba(255,255,255,0.7)',
    },
    logo: {
      fontSize: 36,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 30,
      fontWeight: '800',
      color: '#fff',
      lineHeight: 38,
      letterSpacing: -0.5,
    },
    taglineAccent: {
      color: colors.secondary,
    },

    // Trust strip
    pill: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    pillText: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.1,
    },

    // Primary CTA
    bookBtn: {
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: 22,
    },
    bookBtnPressed: { opacity: 0.82 },
    bookBtnTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    bookBtnEmoji: { fontSize: 32 },
    bookBtnBadge: {
      backgroundColor: badgeBg,
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    bookBtnBadgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: badgeText,
    },
    bookBtnLabel: {
      fontSize: 22,
      fontWeight: '800',
      color: cardText,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    bookBtnBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bookBtnSub: {
      fontSize: 13,
      color: cardSub,
    },
    bookBtnArrow: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookBtnArrowText: {
      fontSize: 17,
      color: '#fff',
      fontWeight: '700',
    },

    // ── Bottom panel ────────────────────────────────────────────────────────
    bottom: {
      backgroundColor: bottomBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing['2xl'],
      gap: spacing.base,
      alignItems: 'center',
    },

    // Partner button
    partnerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      backgroundColor: partnerBg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: partnerBorder,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.base,
    },
    partnerBtnPressed: { opacity: 0.72 },
    partnerBtnIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.lg,
      backgroundColor: partnerIconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    partnerBtnBody: {
      flex: 1,
      marginRight: spacing.sm,
    },
    partnerBtnLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: cardText,
      letterSpacing: -0.2,
    },
    partnerBtnSub: {
      fontSize: 12,
      color: cardSub,
      marginTop: 2,
    },

    footerText: {
      ...typography.caption,
      color: footerColor,
      marginTop: spacing.xs,
    },
  });
}
