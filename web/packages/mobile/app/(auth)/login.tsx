import { gql, useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const REQUEST_OTP = gql`
  mutation RequestEmailOtpMobile($email: String!, $role: UserRole!) {
    requestEmailOtp(email: $email, role: $role) {
      success
      devCode
    }
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = (roleParam ?? 'CLIENT') as 'CLIENT' | 'COMPANY_ADMIN' | 'WORKER';

  const [email, setEmail] = useState('');
  const [requestOtp, { loading }] = useMutation(REQUEST_OTP);

  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = useMemo(() => makeStyles(dark), [dark]);

  async function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    try {
      const { data } = await requestOtp({ variables: { email: trimmed, role } });
      const devCode = data?.requestEmailOtp?.devCode;
      router.push({
        pathname: '/(auth)/otp',
        params: { email: trimmed, devCode: devCode ?? '', role },
      });
    } catch (err) {
      console.error('OTP request failed:', err);
    }
  }

  const subtitle =
    role === 'COMPANY_ADMIN'
      ? 'Autentifica-te cu emailul firmei tale'
      : role === 'WORKER'
      ? 'Autentifica-te cu emailul de lucrator'
      : 'Introdu adresa ta de email pentru a continua';

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.container}
      >
        <View style={s.content}>
          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.closeBtn}>
              <Feather name="x" size={22} color={dark ? '#9CA3AF' : colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={s.logo}>Go2Fix</Text>
          <Text style={s.title}>Autentificare</Text>
          <Text style={s.subtitle}>{subtitle}</Text>

          <View style={s.form}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplu.ro"
              placeholderTextColor={dark ? '#6B7280' : colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            <Button
              label="Continua"
              onPress={handleContinue}
              loading={loading}
              fullWidth
              style={s.button}
            />
          </View>

          {/* Google placeholder (coming soon) */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>sau</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable style={s.googleBtn} disabled>
            <Text style={s.googleBtnText}>🔍 Continua cu Google</Text>
            <View style={s.comingSoonBadge}>
              <Text style={s.comingSoonText}>In curand</Text>
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Theme-aware styles
// ---------------------------------------------------------------------------

function makeStyles(dark: boolean) {
  const bg = dark ? '#0F0F11' : colors.background;
  const surface = dark ? '#1C1C1E' : colors.surface;
  const border = dark ? '#2C2C2E' : colors.border;
  const textPrimary = dark ? '#F9FAFB' : colors.textPrimary;
  const textSecondary = dark ? '#9CA3AF' : colors.textSecondary;

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    container: { flex: 1 },
    content: {
      flex: 1,
      padding: spacing['2xl'],
      paddingTop: spacing.lg,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: spacing.xl,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: dark ? '#2C2C2E' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.5,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      color: textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: textSecondary,
      marginBottom: spacing['2xl'],
    },
    form: { gap: spacing.md },
    label: { ...typography.smallMedium, color: textPrimary },
    input: {
      backgroundColor: surface,
      borderWidth: 1.5,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      ...typography.body,
      color: textPrimary,
    },
    button: { marginTop: spacing.sm },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing['2xl'],
      marginBottom: spacing.md,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: border },
    dividerText: { ...typography.small, color: textSecondary },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: border,
      borderRadius: 12,
      paddingVertical: spacing.md,
      backgroundColor: surface,
      opacity: 0.6,
      gap: spacing.sm,
    },
    googleBtnText: { ...typography.bodyMedium, color: textPrimary },
    comingSoonBadge: {
      backgroundColor: border,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    comingSoonText: { ...typography.caption, color: textSecondary },
  });
}
