import { gql, useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { saveToken } from '../../src/apollo/client';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const SERVICE_CATEGORIES = gql`
  query ServiceCategoriesRegister {
    serviceCategories {
      id
      nameRo
      icon
      isActive
    }
  }
`;

const APPLY_AS_COMPANY = gql`
  mutation ApplyAsCompanyMobile($input: CompanyApplicationInput!) {
    applyAsCompany(input: $input) {
      company {
        id
        companyName
        status
      }
      claimToken
    }
  }
`;

const CLAIM_COMPANY = gql`
  mutation ClaimCompanyMobile($claimToken: String!) {
    claimCompany(claimToken: $claimToken) {
      id
      companyName
      status
    }
  }
`;

const REQUEST_OTP = gql`
  mutation RequestOtpRegisterCompany($email: String!, $role: UserRole!) {
    requestEmailOtp(email: $email, role: $role) {
      success
      devCode
    }
  }
`;

const VERIFY_OTP = gql`
  mutation VerifyOtpRegisterCompany($email: String!, $code: String!, $role: UserRole!) {
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompanyType = 'SRL' | 'PFA' | 'II';
type CuiStatus = 'idle' | 'loading' | 'found' | 'not-found';

interface Category {
  id: string;
  nameRo: string;
  icon: string | null;
  isActive: boolean;
}

interface AnafResult {
  companyName: string;
  streetAddress: string;
  city: string;
  county: string;
  contactPhone: string;
}

interface FormState {
  // Step 1
  companyName: string;
  cui: string;
  companyType: CompanyType;
  legalRepresentative: string;
  // Step 2
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  county: string;
  description: string;
  // Step 3
  regNumber: string;
  isVatPayer: boolean;
  bankName: string;
  iban: string;
  selectedCategoryIds: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 3;
const COMPANY_TYPES: CompanyType[] = ['SRL', 'PFA', 'II'];
type ScreenState = 'form' | 'otp-email' | 'otp-code' | 'success';

// Derive base URL from Apollo endpoint (strip /query suffix)
const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'https://api.go2fix.ro/query';
const API_BASE = apiUrl.replace(/\/query$/, '');

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function FieldGroup({
  label,
  s,
  children,
}: {
  label: string;
  s: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  multiline,
  numberOfLines,
  s,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <TextInput
      style={[s.input, multiline && s.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={s.placeholderColor as unknown as string}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      autoCorrect={autoCorrect ?? false}
      multiline={multiline}
      numberOfLines={numberOfLines}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RegisterCompanyScreen() {
  const { setUser } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = useMemo(() => makeStyles(dark), [dark]);

  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  // CUI lookup state
  const [cuiStatus, setCuiStatus] = useState<CuiStatus>('idle');
  const [anafResult, setAnafResult] = useState<AnafResult | null>(null);

  // OTP claim state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpDevCode, setOtpDevCode] = useState('');

  const [form, setForm] = useState<FormState>({
    companyName: '',
    cui: '',
    companyType: 'SRL',
    legalRepresentative: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    county: '',
    description: '',
    regNumber: '',
    isVatPayer: false,
    bankName: '',
    iban: '',
    selectedCategoryIds: [],
  });

  const { data: categoriesData, loading: categoriesLoading } = useQuery<{
    serviceCategories: Category[];
  }>(SERVICE_CATEGORIES);

  const [applyAsCompany, { loading: applying }] = useMutation(APPLY_AS_COMPANY);
  const [claimCompany, { loading: claiming }] = useMutation(CLAIM_COMPANY);
  const [requestOtp, { loading: requestingOtp }] = useMutation(REQUEST_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_OTP);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }

  function toggleCategory(id: string) {
    setForm((prev) => ({
      ...prev,
      selectedCategoryIds: prev.selectedCategoryIds.includes(id)
        ? prev.selectedCategoryIds.filter((c) => c !== id)
        : [...prev.selectedCategoryIds, id],
    }));
  }

  // ---------------------------------------------------------------------------
  // CUI Lookup
  // ---------------------------------------------------------------------------

  async function handleCuiLookup() {
    const cuiNum = parseInt(form.cui.replace(/\D/g, ''), 10);
    if (!cuiNum) return;
    setCuiStatus('loading');
    setAnafResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/company-lookup?cui=${cuiNum}`);
      const json = await res.json();
      if (json?.found && json.companyName) {
        const result: AnafResult = {
          companyName: json.companyName ?? '',
          streetAddress: json.streetAddress ?? '',
          city: json.city ?? '',
          county: json.county ?? '',
          contactPhone: json.contactPhone ?? '',
        };
        setAnafResult(result);
        // Auto-fill form fields
        setForm((prev) => ({
          ...prev,
          companyName: json.companyName || prev.companyName,
          address: json.streetAddress || prev.address,
          city: json.city || prev.city,
          county: json.county || prev.county,
          contactPhone: json.contactPhone || prev.contactPhone,
        }));
        setCuiStatus('found');
      } else {
        setCuiStatus('not-found');
      }
    } catch {
      setCuiStatus('not-found');
    }
  }

  // ---------------------------------------------------------------------------
  // Validation & navigation
  // ---------------------------------------------------------------------------

  function isStepValid(s: number): boolean {
    if (s === 1)
      return (
        form.companyName.trim().length > 0 &&
        form.cui.trim().length > 0 &&
        form.legalRepresentative.trim().length > 0
      );
    if (s === 2)
      return (
        form.contactEmail.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())
      );
    if (s === 3) return form.selectedCategoryIds.length > 0;
    return true;
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!form.companyName.trim()) return 'Numele firmei este obligatoriu.';
      if (!form.cui.trim()) return 'CUI-ul este obligatoriu.';
      if (!form.legalRepresentative.trim()) return 'Reprezentantul legal este obligatoriu.';
    }
    if (s === 2) {
      if (!form.contactEmail.trim()) return 'Emailul de contact este obligatoriu.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))
        return 'Adresa de email nu este valida.';
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setFormError(err); return; }
    setFormError(null);
    if (step < TOTAL_STEPS) setStep((v) => v + 1);
    else handleSubmit();
  }

  function goBack() {
    setFormError(null);
    if (step > 1) setStep((v) => v - 1);
    else router.back();
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit() {
    setFormError(null);
    try {
      const result = await applyAsCompany({
        variables: {
          input: {
            companyName: form.companyName.trim(),
            cui: form.cui.trim(),
            companyType: form.companyType,
            legalRepresentative: form.legalRepresentative.trim(),
            contactEmail: form.contactEmail.trim().toLowerCase(),
            contactPhone: form.contactPhone.trim() || null,
            address: form.address.trim() || '',
            city: form.city.trim() || '',
            county: form.county.trim() || '',
            description: form.description.trim() || null,
            regNumber: form.regNumber.trim() || null,
            isVatPayer: form.isVatPayer,
            bankName: form.bankName.trim() || null,
            iban: form.iban.trim() || null,
            categoryIds: form.selectedCategoryIds.length > 0 ? form.selectedCategoryIds : null,
          },
        },
      });
      const token: string = result.data?.applyAsCompany?.claimToken;
      const name: string = result.data?.applyAsCompany?.company?.companyName ?? '';
      setClaimToken(token);
      setCompanyName(name);
      setScreenState('otp-email');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Eroare la trimiterea cererii.');
    }
  }

  async function handleSendOtp() {
    if (!otpEmail.trim()) { setFormError('Emailul este obligatoriu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail.trim())) {
      setFormError('Adresa de email nu este valida.');
      return;
    }
    setFormError(null);
    try {
      const result = await requestOtp({
        variables: { email: otpEmail.trim().toLowerCase(), role: 'COMPANY_ADMIN' },
      });
      const devCode: string | null = result.data?.requestEmailOtp?.devCode;
      if (devCode) setOtpCode(devCode);
      setOtpDevCode(devCode ?? '');
      setScreenState('otp-code');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Eroare la trimiterea codului.');
    }
  }

  async function handleVerifyAndClaim() {
    if (otpCode.length < 6) { setFormError('Codul trebuie sa aiba 6 cifre.'); return; }
    setFormError(null);
    try {
      const result = await verifyOtp({
        variables: { email: otpEmail.trim().toLowerCase(), code: otpCode, role: 'COMPANY_ADMIN' },
      });
      const authToken: string = result.data?.verifyEmailOtp?.token;
      const user = result.data?.verifyEmailOtp?.user;
      await saveToken(authToken);
      setUser(user);
      if (claimToken) {
        await claimCompany({ variables: { claimToken } });
      }
      setScreenState('success');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Eroare la autentificare.');
    }
  }

  // ---------------------------------------------------------------------------
  // OTP email state
  // ---------------------------------------------------------------------------

  if (screenState === 'otp-email') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.simpleContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setScreenState('form')} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <View style={s.successIcon}>
            <Text style={s.successEmoji}>🏢</Text>
          </View>
          <Text style={s.successTitle}>Cerere trimisa!</Text>
          <Text style={s.successSubtitle}>
            Firma <Text style={{ fontWeight: '700' }}>{companyName}</Text> a fost inregistrata.{'\n'}
            Autentifica-te cu emailul firmei pentru a revendica contul.
          </Text>

          <View style={s.simpleCard}>
            <FieldGroup label="Email contact *" s={s}>
              <TextInput
                style={s.input}
                value={otpEmail}
                onChangeText={setOtpEmail}
                placeholder="email@firma.ro"
                placeholderTextColor={s.placeholderColor as unknown as string}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FieldGroup>
          </View>

          {formError ? <Text style={s.errorText}>{formError}</Text> : null}
          <Button
            label="Trimite cod de verificare"
            onPress={handleSendOtp}
            loading={requestingOtp}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // OTP code state
  // ---------------------------------------------------------------------------

  if (screenState === 'otp-code') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.simpleContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setScreenState('otp-email')} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={s.successTitle}>Verifica emailul</Text>
          <Text style={s.successSubtitle}>
            Am trimis un cod de 6 cifre la{'\n'}
            <Text style={s.emailHighlight}>{otpEmail}</Text>
          </Text>
          <TextInput
            style={s.otpInput}
            value={otpCode}
            onChangeText={(v) => setOtpCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={s.placeholderColor as unknown as string}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {otpDevCode ? (
            <Text style={s.devCodeNote}>Dev: codul este {otpDevCode}</Text>
          ) : null}
          {formError ? <Text style={s.errorText}>{formError}</Text> : null}
          <Button
            label="Verifica si revendica firma"
            onPress={handleVerifyAndClaim}
            loading={verifyingOtp || claiming}
            disabled={otpCode.length < 6}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (screenState === 'success') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.simpleContent}>
          <View style={s.successIcon}>
            <Text style={s.successEmoji}>✅</Text>
          </View>
          <Text style={s.successTitle}>Cont activat!</Text>
          <Text style={s.successSubtitle}>
            Firma <Text style={{ fontWeight: '700' }}>{companyName}</Text> a fost asociata cu contul tau.
            Urmeaza sa incarci documentele necesare pentru aprobare.
          </Text>
          <Button
            label="Mergi la dashboard"
            onPress={() => router.replace('/(company)')}
            fullWidth
            size="lg"
            style={{ marginTop: spacing['2xl'] }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Form steps
  // ---------------------------------------------------------------------------

  const categories = (categoriesData?.serviceCategories ?? []).filter((c) => c.isActive);

  function renderStep1() {
    const cuiReady = form.cui.replace(/\D/g, '').length >= 6;
    return (
      <>
        {/* CUI lookup */}
        <View style={s.cuiCard}>
          <View style={s.cuiHeader}>
            <Feather name="search" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.cuiTitle}>Cod unic de înregistrare (CUI)</Text>
              <Text style={s.cuiSubtitle}>Preluam automat datele firmei din registrul ANAF</Text>
            </View>
          </View>
          <View style={s.cuiRow}>
            <TextInput
              style={[s.input, s.cuiInput]}
              value={form.cui}
              onChangeText={(v) => {
                setField('cui', v);
                setCuiStatus('idle');
                setAnafResult(null);
              }}
              placeholder="Ex: 12345678 sau RO12345678"
              placeholderTextColor={s.placeholderColor as unknown as string}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />
            <Pressable
              style={[s.cuiBtn, (!cuiReady || cuiStatus === 'loading') && s.cuiBtnDisabled]}
              onPress={handleCuiLookup}
              disabled={!cuiReady || cuiStatus === 'loading'}
            >
              {cuiStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.cuiBtnText}>Verifică</Text>
              )}
            </Pressable>
          </View>

          {/* ANAF result card */}
          {cuiStatus === 'found' && anafResult && (
            <View style={s.anafFound}>
              <View style={s.anafFoundHeader}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={s.anafFoundLabel}>ANAF ✓</Text>
              </View>
              <Text style={s.anafCompanyName}>{anafResult.companyName}</Text>
              {anafResult.streetAddress ? (
                <Text style={s.anafDetail}>{anafResult.streetAddress}, {anafResult.city}</Text>
              ) : null}
              {anafResult.contactPhone ? (
                <Text style={s.anafDetail}>{anafResult.contactPhone}</Text>
              ) : null}
            </View>
          )}
          {cuiStatus === 'not-found' && (
            <Text style={s.cuiNotFound}>
              CUI-ul nu a fost gasit in ANAF. Continua completand manual datele.
            </Text>
          )}
        </View>

        {/* Company details */}
        <View style={s.formCard}>
          <FieldGroup label="Detalii firma" s={s}>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Nume firma *</Text>
              <StyledInput
                value={form.companyName}
                onChangeText={(v) => setField('companyName', v)}
                placeholder="Ex: Curatenie Pro SRL"
                autoCapitalize="words"
                s={s}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Tip firma *</Text>
              <View style={s.segmentRow}>
                {COMPANY_TYPES.map((type) => {
                  const active = form.companyType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[s.segment, active && s.segmentActive]}
                      onPress={() => setField('companyType', type)}
                    >
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Reprezentant legal *</Text>
              <StyledInput
                value={form.legalRepresentative}
                onChangeText={(v) => setField('legalRepresentative', v)}
                placeholder="Ex: Ion Popescu"
                autoCapitalize="words"
                s={s}
              />
            </View>
          </FieldGroup>
        </View>
      </>
    );
  }

  function renderStep2() {
    return (
      <View style={s.formCard}>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Email contact *</Text>
          <StyledInput
            value={form.contactEmail}
            onChangeText={(v) => setField('contactEmail', v)}
            placeholder="contact@firma.ro"
            keyboardType="email-address"
            autoCapitalize="none"
            s={s}
          />
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Telefon contact</Text>
          <StyledInput
            value={form.contactPhone}
            onChangeText={(v) => setField('contactPhone', v)}
            placeholder="07xx xxx xxx"
            keyboardType="phone-pad"
            s={s}
          />
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Strada, numar</Text>
          <StyledInput
            value={form.address}
            onChangeText={(v) => setField('address', v)}
            placeholder="Str. Exemplu, Nr. 1"
            s={s}
          />
        </View>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Oras</Text>
            <StyledInput
              value={form.city}
              onChangeText={(v) => setField('city', v)}
              placeholder="Cluj-Napoca"
              autoCapitalize="words"
              s={s}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Judet</Text>
            <StyledInput
              value={form.county}
              onChangeText={(v) => setField('county', v)}
              placeholder="Cluj"
              autoCapitalize="words"
              s={s}
            />
          </View>
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Descriere firma</Text>
          <StyledInput
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            placeholder="Descrierea firmei si a serviciilor oferite..."
            multiline
            numberOfLines={4}
            s={s}
          />
        </View>
      </View>
    );
  }

  function renderStep3() {
    return (
      <>
        {/* Fiscal details */}
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>Date fiscale</Text>
          <Text style={s.sectionSubtitle}>
            Necesare pentru emiterea facturilor. Pot fi completate si ulterior.
          </Text>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Nr. Registrul Comertului (J)</Text>
            <StyledInput
              value={form.regNumber}
              onChangeText={(v) => setField('regNumber', v)}
              placeholder="Ex: J40/1234/2020"
              autoCapitalize="characters"
              s={s}
            />
          </View>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Platitor TVA</Text>
            <Switch
              value={form.isVatPayer}
              onValueChange={(v) => setField('isVatPayer', v)}
              trackColor={{ false: s.switchTrackOff as unknown as string, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Banca</Text>
            <StyledInput
              value={form.bankName}
              onChangeText={(v) => setField('bankName', v)}
              placeholder="Ex: BCR, BRD, ING..."
              s={s}
            />
          </View>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>IBAN</Text>
            <StyledInput
              value={form.iban}
              onChangeText={(v) => setField('iban', v.toUpperCase())}
              placeholder="RO49AAAA1B31007593840000"
              autoCapitalize="characters"
              s={s}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={{ marginTop: spacing.md }}>
          <Text style={s.sectionTitle}>Categorii de servicii</Text>
          <Text style={s.sectionSubtitle}>
            Selecteaza cel putin o categorie de servicii oferite.
          </Text>
          {categoriesLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={s.categoryGrid}>
              {categories.map((cat) => {
                const selected = form.selectedCategoryIds.includes(cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    style={[s.categoryCard, selected && s.categoryCardSelected]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    {cat.icon ? <Text style={s.categoryIcon}>{cat.icon}</Text> : null}
                    <Text style={[s.categoryName, selected && s.categoryNameSelected]}>
                      {cat.nameRo}
                    </Text>
                    {selected && (
                      <View style={s.categoryCheck}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </>
    );
  }

  const stepTitles = ['Detalii firma', 'Contact & adresa', 'Date fiscale & categorii'];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={goBack} hitSlop={8} style={s.closeBtn}>
          <Feather name="chevron-left" size={24} color={dark ? '#9CA3AF' : colors.textSecondary} />
        </Pressable>
        <Text style={s.headerTitle}>Inregistreaza firma</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.stepContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {formError ? <Text style={s.errorText}>{formError}</Text> : null}
        </ScrollView>

      <View style={s.footer}>
        {step > 1 ? (
          <Pressable onPress={goBack} style={s.footerBackBtn} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
        <View style={s.footerStepWrap}>
          <Text style={s.stepIndicatorLabel}>Pasul</Text>
          <Text style={s.stepIndicatorNum}>{step} / {TOTAL_STEPS}</Text>
        </View>
        <Button
          label={step === TOTAL_STEPS ? 'Trimite cererea' : 'Continua'}
          onPress={goNext}
          loading={applying}
          disabled={!isStepValid(step)}
          size="lg"
          style={s.footerBtn}
        />
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
  const cardBg = dark ? '#1C1C1E' : '#fff';
  const border = dark ? '#2C2C2E' : colors.border;
  const textPrimary = dark ? '#F9FAFB' : colors.textPrimary;
  const textSecondary = dark ? '#9CA3AF' : colors.textSecondary;
  const placeholderColor = dark ? '#4B5563' : colors.textSecondary;
  const footerBg = dark ? '#0F0F11' : colors.background;
  const footerBorder = dark ? '#2C2C2E' : colors.border;
  const anafFoundBg = dark ? 'rgba(16,185,129,0.12)' : '#F0FDF4';
  const anafFoundBorder = dark ? 'rgba(16,185,129,0.3)' : '#A7F3D0';
  const cuiBtnDisabled = dark ? '#374151' : '#D1D5DB';
  const switchTrackOff = dark ? '#374151' : '#D1D5DB';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...typography.heading3, color: textPrimary },
    stepContent: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
    stepTitle: { ...typography.heading2, color: textPrimary, marginBottom: spacing.xs },
    sectionTitle: { ...typography.bodyMedium, color: textPrimary, marginBottom: spacing.xs },
    sectionSubtitle: { ...typography.small, color: textSecondary, marginBottom: spacing.md },

    // CUI lookup
    cuiCard: {
      backgroundColor: cardBg,
      borderRadius: radius.xl,
      padding: spacing.base,
      borderWidth: 1,
      borderColor: border,
      gap: spacing.md,
    },
    cuiHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    cuiTitle: { ...typography.smallMedium, color: textPrimary },
    cuiSubtitle: { ...typography.caption, color: textSecondary, marginTop: 2 },
    cuiRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    cuiInput: { flex: 1, marginBottom: 0 },
    cuiBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cuiBtnDisabled: { backgroundColor: cuiBtnDisabled },
    cuiBtnText: { ...typography.bodyMedium, color: '#fff' },
    anafFound: {
      backgroundColor: anafFoundBg,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: anafFoundBorder,
      gap: spacing.xs,
    },
    anafFoundHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    anafFoundLabel: { ...typography.smallMedium, color: '#10B981' },
    anafCompanyName: { ...typography.bodyMedium, color: textPrimary },
    anafDetail: { ...typography.small, color: textSecondary },
    cuiNotFound: {
      ...typography.small,
      color: colors.danger,
      marginTop: spacing.xs,
    },

    // Form card
    formCard: {
      backgroundColor: cardBg,
      borderRadius: radius.xl,
      padding: spacing.base,
      borderWidth: 1,
      borderColor: border,
      gap: spacing.lg,
    },
    fieldGroup: { gap: spacing.xs },
    fieldLabel: { ...typography.smallMedium, color: textSecondary },
    input: {
      borderWidth: 1.5,
      borderColor: border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      ...typography.body,
      color: textPrimary,
      backgroundColor: surface,
    },
    inputMultiline: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    // Expose for TextInput placeholderTextColor prop (used via cast)
    placeholderColor: placeholderColor as unknown as object,

    twoCol: { flexDirection: 'row', gap: spacing.md },

    // Segment (company type)
    segmentRow: {
      flexDirection: 'row',
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: border,
      alignSelf: 'flex-start',
    },
    segment: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: surface,
    },
    segmentActive: { backgroundColor: colors.primary },
    segmentText: { ...typography.bodyMedium, color: textPrimary },
    segmentTextActive: { color: '#fff' },

    // Switch row
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    switchLabel: { ...typography.body, color: textPrimary },
    switchTrackOff: switchTrackOff as unknown as object,

    // Categories
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
    categoryCard: {
      width: '47%',
      padding: spacing.base,
      borderRadius: radius.lg,
      backgroundColor: cardBg,
      borderWidth: 2,
      borderColor: border,
      alignItems: 'center',
      gap: spacing.xs,
    },
    categoryCardSelected: {
      borderColor: colors.primary,
      backgroundColor: dark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
    },
    categoryIcon: { fontSize: 28 },
    categoryName: { ...typography.smallMedium, color: textPrimary, textAlign: 'center' },
    categoryNameSelected: { color: colors.primary },
    categoryCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Footer
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingTop: spacing.md,
      paddingBottom: 0,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: footerBorder,
      backgroundColor: footerBg,
    },
    footerBackBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: dark ? '#2C2C2E' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerStepWrap: {
      flex: 1,
      paddingLeft: spacing.sm,
      justifyContent: 'center',
    },
    stepIndicatorLabel: {
      ...typography.caption,
      color: textSecondary,
    },
    stepIndicatorNum: {
      ...typography.bodyMedium,
      color: textPrimary,
    },
    footerBtn: {
      minWidth: 140,
    },

    // Error
    errorText: { ...typography.small, color: colors.danger, marginTop: spacing.sm },

    // Simple content (OTP + success)
    simpleContent: {
      padding: spacing['2xl'],
      paddingTop: spacing['3xl'],
      alignItems: 'center',
      gap: spacing.xl,
    },
    simpleCard: {
      width: '100%',
      backgroundColor: cardBg,
      borderRadius: radius.xl,
      padding: spacing.base,
      borderWidth: 1,
      borderColor: border,
    },
    backBtn: { alignSelf: 'flex-start' },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: radius.full,
      backgroundColor: dark ? 'rgba(37,99,235,0.2)' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successEmoji: { fontSize: 40 },
    successTitle: { ...typography.heading2, color: textPrimary, textAlign: 'center' },
    successSubtitle: {
      ...typography.body,
      color: textSecondary,
      textAlign: 'center',
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
      width: '100%',
      marginBottom: spacing.sm,
    },
    devCodeNote: { ...typography.caption, color: textSecondary, fontStyle: 'italic' },
  });
}
