import { gql, useMutation } from '@apollo/client';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';
import { saveToken } from '../../src/apollo/client';
import { useAuth } from '../../src/auth/AuthContext';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const REQUEST_OTP = gql`
  mutation RequestOtpInvite($email: String!, $role: UserRole!) {
    requestEmailOtp(email: $email, role: $role) {
      success
      devCode
    }
  }
`;

const VERIFY_OTP = gql`
  mutation VerifyOtpInvite($email: String!, $code: String!, $role: UserRole!) {
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

const ACCEPT_INVITATION = gql`
  mutation AcceptInvitationMobile($token: String!) {
    acceptInvitation(token: $token) {
      id
      fullName
      status
      company {
        id
        companyName
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Types & states
// ---------------------------------------------------------------------------

type Step = 'token' | 'auth-email' | 'auth-otp' | 'processing' | 'success';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AcceptInviteScreen() {
  const { token: urlToken } = useLocalSearchParams<{ token?: string }>();
  const { setUser } = useAuth();

  const [step, setStep] = useState<Step>('token');
  const [inviteToken, setInviteToken] = useState(urlToken ?? '');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [requestOtp, { loading: requestingOtp }] = useMutation(REQUEST_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_OTP);
  const [acceptInvitation, { loading: accepting }] = useMutation(ACCEPT_INVITATION);

  // If token came from deep link, skip to auth step
  useEffect(() => {
    if (urlToken && urlToken.trim()) {
      setInviteToken(urlToken.trim());
      setStep('auth-email');
    }
  }, [urlToken]);

  function handleTokenContinue() {
    if (!inviteToken.trim()) {
      setError('Codul de invitatie este obligatoriu.');
      return;
    }
    setError(null);
    setStep('auth-email');
  }

  async function handleSendOtp() {
    if (!email.trim()) { setError('Emailul este obligatoriu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresa de email nu este valida.');
      return;
    }
    setError(null);
    try {
      const result = await requestOtp({
        variables: { email: email.trim().toLowerCase(), role: 'WORKER' },
      });
      const dc: string | null = result.data?.requestEmailOtp?.devCode;
      if (dc) setOtpCode(dc);
      setDevCode(dc ?? '');
      setStep('auth-otp');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la trimiterea codului.';
      setError(message);
    }
  }

  async function handleVerifyAndAccept() {
    if (otpCode.length < 6) { setError('Codul trebuie sa aiba 6 cifre.'); return; }
    setError(null);
    setStep('processing');
    try {
      // 1. Verify OTP
      const authResult = await verifyOtp({
        variables: { email: email.trim().toLowerCase(), code: otpCode, role: 'WORKER' },
      });
      const authToken: string = authResult.data?.verifyEmailOtp?.token;
      const user = authResult.data?.verifyEmailOtp?.user;
      await saveToken(authToken);
      setUser(user);

      // 2. Accept invitation
      const inviteResult = await acceptInvitation({
        variables: { token: inviteToken.trim() },
      });
      const profile = inviteResult.data?.acceptInvitation;
      setCompanyName(profile?.company?.companyName ?? '');
      setWorkerName(profile?.fullName ?? '');
      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la acceptarea invitatiei.';
      setError(message);
      setStep('auth-otp');
    }
  }

  // Auto-navigate to worker dashboard after success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        router.replace('/(worker)');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Processing state ──────────────────────────────────────────────────────

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>Se proceseaza invitatia...</Text>
          <Text style={styles.processingSubtext}>Te conectam la echipa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Invitatie acceptata!</Text>
          <Text style={styles.successSubtitle}>
            Bine ai venit in echipa{companyName ? ` ${companyName}` : ''}
            {workerName ? `, ${workerName}` : ''}!
          </Text>
          <Text style={styles.redirectNote}>Te redirectionam la dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Token entry state ─────────────────────────────────────────────────────

  if (step === 'token') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Inapoi</Text>
          </Pressable>

          <View style={styles.heroArea}>
            <Text style={styles.heroIcon}>👷</Text>
            <Text style={styles.pageTitle}>Accepta invitatie</Text>
            <Text style={styles.pageSubtitle}>
              Introdu codul de invitatie primit prin email de la compania care te-a invitat.
            </Text>
          </View>

          <PlatformCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Cod de invitatie *</Text>
            <TextInput
              style={styles.tokenInput}
              value={inviteToken}
              onChangeText={(v) => { setInviteToken(v); setError(null); }}
              placeholder="inv-xxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldHint}>
              Codul incepe cu "inv-" si este trimis prin email odata cu invitatia.
            </Text>
          </PlatformCard>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="Continua"
            onPress={handleTokenContinue}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Auth email entry ──────────────────────────────────────────────────────

  if (step === 'auth-email') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setStep('token')} style={styles.backBtn}>
            <Text style={styles.backText}>← Inapoi</Text>
          </Pressable>

          <View style={styles.heroArea}>
            <Text style={styles.heroIcon}>🔐</Text>
            <Text style={styles.pageTitle}>Autentifica-te</Text>
            <Text style={styles.pageSubtitle}>
              Pentru a accepta invitatia, trebuie sa te autentifici cu emailul tau.
            </Text>
          </View>

          <PlatformCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Emailul tau *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="email@exemplu.ro"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </PlatformCard>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="Trimite cod de verificare"
            onPress={handleSendOtp}
            loading={requestingOtp}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Auth OTP code ─────────────────────────────────────────────────────────

  // step === 'auth-otp'
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => setStep('auth-email')} style={styles.backBtn}>
          <Text style={styles.backText}>← Inapoi</Text>
        </Pressable>

        <View style={styles.heroArea}>
          <Text style={styles.pageTitle}>Verifica emailul</Text>
          <Text style={styles.pageSubtitle}>
            Am trimis un cod de 6 cifre la{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
        </View>

        <TextInput
          style={styles.otpInput}
          value={otpCode}
          onChangeText={(v) => { setOtpCode(v.replace(/[^0-9]/g, '').slice(0, 6)); setError(null); }}
          placeholder="000000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        {devCode ? (
          <Text style={styles.devCodeNote}>Dev: codul este {devCode}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Verifica si accepta invitatia"
          onPress={handleVerifyAndAccept}
          loading={verifyingOtp || accepting}
          disabled={otpCode.length < 6}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm }}
        />

        <Pressable
          onPress={handleSendOtp}
          disabled={requestingOtp}
          style={styles.resendBtn}
        >
          <Text style={styles.resendText}>
            {requestingOtp ? 'Se trimite...' : 'Nu ai primit codul? Retrimite'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing['2xl'],
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.xl,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { ...typography.body, color: colors.primary },
  heroArea: { alignItems: 'center', gap: spacing.md },
  heroIcon: { fontSize: 48 },
  pageTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: 'center' },
  pageSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: { color: colors.primary, fontWeight: '600' },
  formCard: { padding: spacing.base, gap: spacing.md },
  fieldLabel: { ...typography.smallMedium, color: colors.textSecondary },
  fieldHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  tokenInput: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    letterSpacing: 0.5,
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  devCodeNote: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
  resendBtn: { alignSelf: 'center', marginTop: spacing.md },
  resendText: { ...typography.small, color: colors.primary, textDecorationLine: 'underline' },

  // Processing
  processingText: { ...typography.heading3, color: colors.textPrimary, textAlign: 'center' },
  processingSubtext: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  // Success
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: { fontSize: 40 },
  successTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: 'center' },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectNote: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
});
