import { gql, useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
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
import { saveToken } from '../../src/apollo/client';
import { useAuth } from '../../src/auth/AuthContext';
import { AuthUser } from '../../src/auth/AuthService';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography } from '../../src/design/tokens';

const VERIFY_OTP = gql`
  mutation VerifyEmailOtpMobile($email: String!, $code: String!, $role: UserRole!) {
    verifyEmailOtp(email: $email, code: $code, role: $role) {
      token
      user {
        id
        email
        fullName
        role
        avatarUrl
        preferredLanguage
      }
    }
  }
`;

const REQUEST_OTP = gql`
  mutation ResendOtpMobile($email: String!, $role: UserRole!) {
    requestEmailOtp(email: $email, role: $role) {
      success
    }
  }
`;

interface VerifyOtpData {
  verifyEmailOtp: {
    token: string;
    user: AuthUser;
  };
}

export default function OtpScreen() {
  const { email, devCode, role: roleParam } = useLocalSearchParams<{
    email: string;
    devCode?: string;
    role?: string;
  }>();
  const role = (roleParam ?? 'CLIENT') as 'CLIENT' | 'COMPANY_ADMIN' | 'WORKER';
  const [otp, setOtp] = useState(devCode ?? '');
  const inputRef = useRef<TextInput>(null);
  const { setUser } = useAuth();

  const [verifyOtp, { loading }] = useMutation<VerifyOtpData>(VERIFY_OTP);
  const [resendOtp, { loading: resending }] = useMutation(REQUEST_OTP);

  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = useMemo(() => makeStyles(dark), [dark]);

  async function handleVerify() {
    if (otp.length < 6) return;
    try {
      const { data } = await verifyOtp({ variables: { email, code: otp, role } });
      if (data?.verifyEmailOtp?.token) {
        await saveToken(data.verifyEmailOtp.token);
        setUser(data.verifyEmailOtp.user);
        // RoleRouter in _layout.tsx handles navigation to the correct portal
      }
    } catch (err) {
      console.error('OTP verification failed:', err);
    }
  }

  async function handleResend() {
    try {
      await resendOtp({ variables: { email, role } });
    } catch {
      // Silent — user can retry
    }
  }

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

          <Text style={s.title}>Verifica emailul</Text>
          <Text style={s.subtitle}>
            Am trimis un cod de 6 cifre la{'\n'}
            <Text style={s.emailHighlight}>{email}</Text>
          </Text>

          <TextInput
            ref={inputRef}
            style={s.otpInput}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={dark ? '#4B5563' : colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <Button
            label="Verifica"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < 6}
            fullWidth
          />

          <Pressable
            onPress={handleResend}
            disabled={resending}
            style={s.resendBtn}
          >
            <Text style={s.resendText}>
              {resending ? 'Se trimite...' : 'Nu ai primit codul? Retrimite'}
            </Text>
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
    title: {
      ...typography.heading2,
      color: textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: textSecondary,
      marginBottom: spacing['2xl'],
      lineHeight: 24,
    },
    emailHighlight: { color: colors.primary, fontWeight: '600' },
    otpInput: {
      backgroundColor: surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.lg,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 8,
      color: textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    resendBtn: { marginTop: spacing.xl, alignSelf: 'center' },
    resendText: {
      ...typography.small,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });
}
