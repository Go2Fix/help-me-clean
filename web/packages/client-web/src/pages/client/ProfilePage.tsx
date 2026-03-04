import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  User,
  Save,
  Check,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  Gift,
  Users,
  Mail,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AvatarUpload from '@/components/ui/AvatarUpload';
import PhoneVerificationWidget from '@/components/PhoneVerificationWidget';
import {
  UPDATE_PROFILE,
  UPLOAD_AVATAR,
  DELETE_MY_ACCOUNT,
  MY_REFERRAL_STATUS,
} from '@/graphql/operations';

// ─── Language options ────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: 'ro', label: 'Română' },
  { value: 'en', label: 'English' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, logout, refetchUser } = useAuth();
  const { t, i18n } = useTranslation(['dashboard', 'client']);
  const [showVerifyWidget, setShowVerifyWidget] = useState(false);

  // ─── Schema (built inside component so t() is available) ────────────────

  const profileSchema = z.object({
    fullName: z.string().min(2, t('client:profile.schema.nameMin')),
    phone: z
      .string()
      .min(1, t('client:profile.schema.phoneRequired'))
      .regex(/^\+/, t('client:profile.schema.phoneFormat')),
    preferredLanguage: z.string().optional(),
  });

  type ProfileFormValues = {
    fullName: string;
    phone: string;
    preferredLanguage?: string;
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      preferredLanguage: 'ro',
    },
  });

  const currentPhone = watch('phone');

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || 'ro',
      });
    }
  }, [user, reset]);

  const [updateProfile, { loading: updating, data: updateData }] =
    useMutation(UPDATE_PROFILE);

  const [uploadAvatar, { loading: uploadingAvatar }] = useMutation(UPLOAD_AVATAR, {
    onCompleted: () => {
      refetchUser();
    },
  });

  // ─── Delete account ────────────────────────────────────────────────────────

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT, {
    onCompleted: () => {
      logout();
    },
  });

  // ─── Profile submit ────────────────────────────────────────────────────────

  const saved = !!updateData;

  // Auth guard
  if (authLoading) {
    return <LoadingSpinner text={t('client:profile.verifyingAuth')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: '/cont/setari' }} replace />;
  }

  const onSubmit = async (values: ProfileFormValues) => {
    await updateProfile({
      variables: {
        input: {
          fullName: values.fullName,
          phone: values.phone || undefined,
          preferredLanguage: values.preferredLanguage || undefined,
        },
      },
    });
    // Apply language change immediately
    if (values.preferredLanguage && values.preferredLanguage !== i18n.language) {
      void i18n.changeLanguage(values.preferredLanguage);
    }
    refetchUser();
  };

  const handleVerified = () => {
    setShowVerifyWidget(false);
    refetchUser();
  };

  const handleAvatarUpload = async (file: File) => {
    await uploadAvatar({
      variables: { file },
    });
  };

  return (
    <div className="py-2 sm:py-8">
      <div className="max-w-2xl mx-auto sm:px-2">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('client:profile.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('client:profile.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
              <AvatarUpload
                currentUrl={user?.avatarUrl}
                onUpload={handleAvatarUpload}
                loading={uploadingAvatar}
                size="xl"
              />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('client:profile.avatar.title')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('client:profile.avatar.description')}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {t('client:profile.avatar.formats')}
                </p>
              </div>
            </div>
          </Card>

          {/* Profile Form */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {t('client:profile.personalInfo.title')}
                </h2>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label={t('client:profile.personalInfo.fullName')}
                placeholder={t('client:profile.personalInfo.fullNamePlaceholder')}
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <div className="space-y-2">
                <Input
                  label={t('client:profile.personalInfo.phone')}
                  type="tel"
                  placeholder={t('client:profile.personalInfo.phonePlaceholder')}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                {/* Verification status badge */}
                {user?.phone && user.phoneVerified && (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    {t('client:profile.personalInfo.phoneVerified')}
                  </div>
                )}
                {user?.phone && !user.phoneVerified && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                      <XCircle className="h-4 w-4" />
                      {t('client:profile.personalInfo.phoneUnverified')}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowVerifyWidget((v) => !v)}
                    >
                      {showVerifyWidget
                        ? t('client:profile.personalInfo.hideVerify')
                        : t('client:profile.personalInfo.verifyNow')}
                    </Button>
                  </div>
                )}
                {showVerifyWidget && user?.phone && (
                  <div className="pt-2">
                    <PhoneVerificationWidget
                      phone={currentPhone || user.phone}
                      onVerified={handleVerified}
                    />
                  </div>
                )}
              </div>

              <Select
                label={t('client:profile.personalInfo.preferredLanguage')}
                options={LANGUAGE_OPTIONS}
                error={errors.preferredLanguage?.message}
                {...register('preferredLanguage')}
              />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="submit"
                  loading={updating}
                  disabled={!isDirty && !updating}
                >
                  <Save className="h-4 w-4" />
                  {t('client:profile.personalInfo.saveChanges')}
                </Button>
                {saved && !isDirty && (
                  <span className="flex items-center gap-1.5 text-sm text-secondary font-medium">
                    <Check className="h-4 w-4" />
                    {t('client:profile.personalInfo.savedSuccess')}
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Referral Section */}
          <ReferralCard />

          {/* Delete Account */}
          <Card className="border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {t('client:profile.deleteAccount.title')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('client:profile.deleteAccount.subtitle')}
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('client:profile.deleteAccount.description')}
                </p>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('client:profile.deleteAccount.deleteButton')}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-3">
                  {t('client:profile.deleteAccount.confirmPrompt')}
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('client:profile.deleteAccount.confirmPlaceholder')}
                  className="mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    {t('client:profile.deleteAccount.cancel')}
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                    loading={deletingAccount}
                    disabled={deleteConfirmText !== 'STERGE'}
                    onClick={() => deleteMyAccount()}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('client:profile.deleteAccount.confirmButton')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── ReferralCard ─────────────────────────────────────────────────────────────

interface ReferralStatus {
  referralCode: string | null;
  completedCount: number;
  requiredCount: number;
  availableDiscounts: number;
  cycleStartedAt: string | null;
}

function ReferralCard() {
  const { t } = useTranslation(['dashboard', 'client']);
  const { data, loading } = useQuery<{ myReferralStatus: ReferralStatus }>(
    MY_REFERRAL_STATUS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [copied, setCopied] = useState(false);

  const status = data?.myReferralStatus;
  const code = status?.referralCode ?? null;
  const completedCount = status?.completedCount ?? 0;
  const requiredCount = status?.requiredCount ?? 3;
  const availableDiscounts = status?.availableDiscounts ?? 0;

  const shareUrl = `https://go2fix.ro/inregistrare?ref=${code ?? ''}`;
  const shareMessage = code
    ? `Încearcă Go2Fix - servicii de curățenie profesionale! Folosește codul meu ${code} la înregistrare: ${shareUrl}`
    : '';

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently ignore clipboard errors
    }
  };

  const handleWhatsApp = () => {
    if (!shareMessage) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    if (!shareMessage) return;
    const subject = encodeURIComponent('Încearcă Go2Fix - servicii de curățenie profesionale!');
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {t('client:profile.referral.title')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('client:profile.referral.subtitle')}
          </p>
        </div>
      </div>

      {loading && !status ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : code ? (
        <div className="space-y-5">
          {/* Code display + share buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 font-mono text-lg font-bold text-gray-900 tracking-widest">
              {code}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className={cn(copied && 'border-secondary text-secondary')}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied
                ? t('client:profile.referral.copied', { defaultValue: 'Copiat!' })
                : t('client:profile.referral.copy', { defaultValue: 'Copiază' })}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleEmail}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {t('client:profile.referral.progressTitle')}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (completedCount / requiredCount) * 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 shrink-0">
                {t('client:profile.referral.bookings', { count: requiredCount, completedCount })}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400 shrink-0" />
                {completedCount > 0 ? (
                  <span>
                    <span className="font-semibold text-gray-900">{completedCount}</span>
                    {' '}{t('client:profile.referral.usedCode')}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {t('client:profile.referral.noUsersYet')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-6">
                {t('client:profile.referral.needMore', { required: requiredCount })}
              </p>
            </div>
          </div>

          {/* Available discounts */}
          {availableDiscounts > 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-emerald-800">
                    {t('client:profile.referral.availableDiscounts')}
                  </p>
                  <Badge variant="success">
                    {t('client:profile.referral.discount', { count: availableDiscounts })}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {t('client:profile.referral.discountNote')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Gift className="h-4 w-4 shrink-0" />
              <span>
                {t('client:profile.referral.noDiscountsYet', { required: requiredCount })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <Gift className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">
            {t('client:profile.referral.noCode')}
          </p>
        </div>
      )}
    </Card>
  );
}
