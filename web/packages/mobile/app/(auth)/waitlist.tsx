import { gql, useMutation, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: JoinWaitlistInput!) {
    joinWaitlist(input: $input) {
      id
      email
    }
  }
`;

const WAITLIST_STATS = gql`
  query WaitlistStats {
    waitlistStats {
      totalCount
    }
  }
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const CITIES = [
  'București',
  'Cluj-Napoca',
  'Timișoara',
  'Iași',
  'Brașov',
  'Constanța',
  'Galați',
  'Craiova',
  'Ploiești',
  'Altul',
];

type LeadType = 'CLIENT' | 'COMPANY';

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  city: string;
}

interface CompanyForm {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onPress: () => void;
  children: string;
}

function TabButton({ active, onPress, children }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {children}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </Pressable>
  );
}

function SuccessCard({ leadType }: { leadType: LeadType }) {
  return (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <Text style={styles.successIcon}>✓</Text>
      </View>
      <Text style={styles.successTitle}>
        {leadType === 'CLIENT' ? 'Înregistrare reușită!' : 'Cerere trimisă!'}
      </Text>
      <Text style={styles.successSubtitle}>
        {leadType === 'CLIENT'
          ? 'Te vom notifica prin email când platforma devine disponibilă în orașul tău. Verifică inbox-ul pentru confirmarea înregistrării.'
          : 'Am primit cererea ta! Un membru al echipei Go2Fix te va contacta în scurt timp.'}
      </Text>
      <View style={styles.successBadge}>
        <Text style={styles.successBadgeText}>
          ✓ Verifică email-ul pentru confirmare
        </Text>
      </View>
    </View>
  );
}

interface CityPickerProps {
  value: string;
  onChange: (city: string) => void;
}

function CityPicker({ value, onChange }: CityPickerProps) {
  return (
    <View style={styles.cityGrid}>
      {CITIES.map((city) => (
        <Pressable
          key={city}
          onPress={() => onChange(city)}
          style={[styles.cityChip, value === city && styles.cityChipActive]}
        >
          <Text
            style={[
              styles.cityChipText,
              value === city && styles.cityChipTextActive,
            ]}
          >
            {city}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Client Form ─────────────────────────────────────────────────────────────

interface ClientFormSectionProps {
  loading: boolean;
  onSubmit: (form: ClientForm) => void;
}

function ClientFormSection({ loading, onSubmit }: ClientFormSectionProps) {
  const [form, setForm] = useState<ClientForm>({
    name: '',
    email: '',
    phone: '',
    city: '',
  });
  const [errors, setErrors] = useState<Partial<ClientForm>>({});

  const update = (field: keyof ClientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: Partial<ClientForm> = {};
    if (!form.name.trim()) next.name = 'Numele este obligatoriu';
    if (!form.email.trim()) next.email = 'Emailul este obligatoriu';
    else if (!isValidEmail(form.email)) next.email = 'Email invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(form);
  };

  return (
    <View style={styles.formContainer}>
      <Input
        label="Nume *"
        placeholder="Ion Popescu"
        value={form.name}
        onChangeText={(v) => update('name', v)}
        error={errors.name}
        autoCapitalize="words"
      />
      <Input
        label="Email *"
        placeholder="ion@email.ro"
        value={form.email}
        onChangeText={(v) => update('email', v)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Telefon (opțional)"
        placeholder="0712345678"
        value={form.phone}
        onChangeText={(v) => update('phone', v)}
        keyboardType="phone-pad"
      />

      <View style={styles.fieldWrapper}>
        <Text style={styles.fieldLabel}>Oraș preferință</Text>
        <CityPicker value={form.city} onChange={(v) => update('city', v)} />
      </View>

      <Button
        label={loading ? 'Se trimite...' : 'Înregistrează-te'}
        onPress={handleSubmit}
        fullWidth
        disabled={loading}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

// ─── Company Form ────────────────────────────────────────────────────────────

interface CompanyFormSectionProps {
  loading: boolean;
  onSubmit: (form: CompanyForm) => void;
}

function CompanyFormSection({ loading, onSubmit }: CompanyFormSectionProps) {
  const [form, setForm] = useState<CompanyForm>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    city: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<CompanyForm>>({});

  const update = (field: keyof CompanyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: Partial<CompanyForm> = {};
    if (!form.name.trim()) next.name = 'Numele de contact este obligatoriu';
    if (!form.companyName.trim())
      next.companyName = 'Numele firmei este obligatoriu';
    if (!form.email.trim()) next.email = 'Emailul este obligatoriu';
    else if (!isValidEmail(form.email)) next.email = 'Email invalid';
    if (!form.phone.trim()) next.phone = 'Telefonul este obligatoriu';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(form);
  };

  return (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
    >
      <Input
        label="Nume de contact *"
        placeholder="Ion Popescu"
        value={form.name}
        onChangeText={(v) => update('name', v)}
        error={errors.name}
        autoCapitalize="words"
      />
      <Input
        label="Nume firmă *"
        placeholder="Curățenie S.R.L."
        value={form.companyName}
        onChangeText={(v) => update('companyName', v)}
        error={errors.companyName}
        autoCapitalize="words"
      />
      <Input
        label="Email *"
        placeholder="contact@firma.ro"
        value={form.email}
        onChangeText={(v) => update('email', v)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Telefon *"
        placeholder="0712345678"
        value={form.phone}
        onChangeText={(v) => update('phone', v)}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <Input
        label="Oraș"
        placeholder="București"
        value={form.city}
        onChangeText={(v) => update('city', v)}
        autoCapitalize="words"
      />
      <Input
        label="Mesaj"
        placeholder="Furnizăm servicii de curățenie de 5 ani..."
        value={form.message}
        onChangeText={(v) => update('message', v)}
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        label={loading ? 'Se trimite...' : 'Trimite cerere'}
        onPress={handleSubmit}
        fullWidth
        disabled={loading}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WaitlistScreen() {
  const [activeTab, setActiveTab] = useState<LeadType>('CLIENT');
  const [submitted, setSubmitted] = useState(false);
  const [submittedLeadType, setSubmittedLeadType] = useState<LeadType>('CLIENT');

  const [joinWaitlist, { loading }] = useMutation(JOIN_WAITLIST);
  const { data: statsData } = useQuery(WAITLIST_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  const totalCount = statsData?.waitlistStats?.totalCount ?? 247;

  const handleClientSubmit = async (form: ClientForm) => {
    try {
      await joinWaitlist({
        variables: {
          input: {
            leadType: 'CLIENT',
            name: form.name.trim(),
            email: form.email.trim(),
            ...(form.phone.trim() && { phone: form.phone.trim() }),
            ...(form.city && { city: form.city }),
          },
        },
      });
      setSubmittedLeadType('CLIENT');
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to join waitlist:', err);
    }
  };

  const handleCompanySubmit = async (form: CompanyForm) => {
    try {
      await joinWaitlist({
        variables: {
          input: {
            leadType: 'COMPANY',
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            companyName: form.companyName.trim(),
            ...(form.city.trim() && { city: form.city.trim() }),
            ...(form.message.trim() && { message: form.message.trim() }),
          },
        },
      });
      setSubmittedLeadType('COMPANY');
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to join waitlist:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.backBtnText}>← Înapoi</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.loginBtnText}>Cont →</Text>
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Lansăm în curând</Text>
            </View>
            <Text style={styles.title}>Revoluția serviciilor de casă începe aici</Text>
            <Text style={styles.subtitle}>
              Înscrie-te în lista de așteptare și primești{' '}
              <Text style={styles.discount}>20% reducere</Text> la prima comandă.
            </Text>

            {/* Feature pills */}
            <View style={styles.features}>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillEmoji}>🔔</Text>
                <Text style={styles.featurePillText}>Notificare lansare</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillEmoji}>⭐</Text>
                <Text style={styles.featurePillText}>Discount exclusiv</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillEmoji}>⚡</Text>
                <Text style={styles.featurePillText}>Prioritate acces</Text>
              </View>
            </View>
          </View>

          {/* Form card */}
          <PlatformCard style={styles.card}>
            {submitted ? (
              <SuccessCard leadType={submittedLeadType} />
            ) : (
              <View>
                {/* Tabs */}
                <View style={styles.tabs}>
                  <TabButton
                    active={activeTab === 'CLIENT'}
                    onPress={() => setActiveTab('CLIENT')}
                  >
                    Client
                  </TabButton>
                  <TabButton
                    active={activeTab === 'COMPANY'}
                    onPress={() => setActiveTab('COMPANY')}
                  >
                    Firmă
                  </TabButton>
                </View>

                {/* Form */}
                {activeTab === 'CLIENT' ? (
                  <ClientFormSection
                    loading={loading}
                    onSubmit={handleClientSubmit}
                  />
                ) : (
                  <CompanyFormSection
                    loading={loading}
                    onSubmit={handleCompanySubmit}
                  />
                )}
              </View>
            )}
          </PlatformCard>

          {/* Social proof */}
          {!submitted && (
            <View style={styles.socialProof}>
              <Text style={styles.socialProofIcon}>👥</Text>
              <Text style={styles.socialProofText}>
                Peste{' '}
                <Text style={styles.socialProofCount}>
                  {totalCount.toLocaleString('ro-RO')}
                </Text>{' '}
                persoane înscrise
              </Text>
            </View>
          )}

          {/* Privacy */}
          {!submitted && (
            <Text style={styles.privacy}>
              Respectăm confidențialitatea ta. Nu spam, doar notificări
              importante.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  backBtnText: { ...typography.bodyMedium, color: colors.textSecondary },
  loginBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginBtnText: { ...typography.smallMedium, color: colors.textPrimary },

  hero: { marginBottom: spacing.xl, gap: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  discount: { fontWeight: '700', color: colors.primary },

  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  featurePillEmoji: { fontSize: 14 },
  featurePillText: { ...typography.caption, color: colors.textSecondary },

  card: { padding: spacing.xl, marginBottom: spacing.lg },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.lg,
    gap: spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: { ...typography.bodyMedium, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },

  formContainer: { gap: spacing.base },
  fieldWrapper: { gap: spacing.xs },
  fieldLabel: { ...typography.smallMedium, color: colors.textPrimary },

  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cityChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  cityChipText: { ...typography.small, color: colors.textSecondary },
  cityChipTextActive: { color: colors.primary, fontWeight: '600' },

  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successIcon: { fontSize: 32, color: colors.secondary },
  successTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },

  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  socialProofIcon: { fontSize: 16 },
  socialProofText: { ...typography.small, color: colors.textSecondary },
  socialProofCount: { fontWeight: '700', color: colors.textPrimary },

  privacy: {
    ...typography.caption,
    color: colors.border,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
