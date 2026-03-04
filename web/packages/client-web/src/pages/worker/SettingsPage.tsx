import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Phone, FileText, Building2, Star, Briefcase, Camera, Loader2,
  Check, MapPin, Info, Brain, MessageSquare, Calendar, Layers,
  CheckCircle, XCircle, Globe,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FileUpload from '@/components/ui/FileUpload';
import DocumentCard from '@/components/ui/DocumentCard';
import PhoneVerificationWidget from '@/components/PhoneVerificationWidget';
import {
  MY_WORKER_PROFILE,
  MY_WORKER_STATS,
  UPDATE_WORKER_PROFILE,
  MY_WORKER_SERVICE_AREAS,
  MY_WORKER_REVIEWS,
  UPLOAD_WORKER_DOCUMENT,
  DELETE_WORKER_DOCUMENT,
  UPLOAD_WORKER_AVATAR,
  UPDATE_PROFILE,
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_VARIANT: Record<string, StatusVariant> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  PENDING_REVIEW: 'warning',
  SUSPENDED: 'danger',
  INACTIVE: 'default',
};

interface WorkerDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  rejectionReason?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewType: string;
  createdAt: string;
  booking: { id: string; referenceCode: string } | null;
  reviewer: { id: string; fullName: string } | null;
}

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t, i18n } = useTranslation(['dashboard', 'worker']);
  const { data: profileData, loading: profileLoading } = useQuery(MY_WORKER_PROFILE);
  const { data: statsData, loading: statsLoading } = useQuery(MY_WORKER_STATS);
  const { data: areasData, loading: areasLoading } = useQuery(MY_WORKER_SERVICE_AREAS);
  const { data: reviewsData } = useQuery(MY_WORKER_REVIEWS, {
    variables: { limit: 3, offset: 0 },
  });

  const profile = profileData?.myWorkerProfile;
  const stats = statsData?.myWorkerStats;
  const serviceAreas: { id: string; name: string; cityId: string; cityName: string }[] =
    areasData?.myWorkerServiceAreas ?? [];
  const reviews: Review[] = reviewsData?.myWorkerReviews?.reviews ?? [];
  const totalReviews: number = reviewsData?.myWorkerReviews?.totalCount ?? 0;
  const loading = profileLoading || statsLoading;

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  function formatMemberSince(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }

  function formatReviewDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }

  // ─── Editable form state ────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showVerifyWidget, setShowVerifyWidget] = useState(false);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const [updateProfile, { loading: saving }] = useMutation(UPDATE_WORKER_PROFILE, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('');
    setSaveError('');
    setPhoneError('');

    if (!phone.trim()) {
      setPhoneError(t('worker:settings.profileInfo.phoneRequired'));
      return;
    }
    if (!phone.startsWith('+')) {
      setPhoneError(t('worker:settings.profileInfo.phoneFormat'));
      return;
    }

    try {
      await updateProfile({ variables: { input: { phone, bio } } });
      setSaveSuccess(t('worker:settings.profileInfo.saveSuccess'));
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch {
      setSaveError(t('worker:settings.profileInfo.saveError'));
    }
  };

  // ─── Language preference state ────────────────────────────────────────
  const [selectedLang, setSelectedLang] = useState(i18n.language === 'en' ? 'en' : 'ro');
  const [langSuccess, setLangSuccess] = useState('');
  const [langError, setLangError] = useState('');

  const [updateUserProfile, { loading: savingLang }] = useMutation(UPDATE_PROFILE);

  const handleLangSave = async () => {
    setLangSuccess('');
    setLangError('');
    try {
      await updateUserProfile({ variables: { input: { preferredLanguage: selectedLang } } });
      await i18n.changeLanguage(selectedLang);
      setLangSuccess(t('worker:settings.language.saveSuccess'));
      setTimeout(() => setLangSuccess(''), 3000);
    } catch {
      setLangError(t('worker:settings.language.saveError'));
    }
  };

  // ─── Document upload state ────────────────────────────────────────────
  const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_WORKER_DOCUMENT, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [deleteDocument, { loading: deleting }] = useMutation(DELETE_WORKER_DOCUMENT, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [uploadAvatar, { loading: uploadingAvatar }] = useMutation(UPLOAD_WORKER_AVATAR, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    try {
      await uploadAvatar({ variables: { workerId: profile.id, file } });
    } catch {
      setAvatarPreview(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const [uploadingType, setUploadingType] = useState('');

  const handleUploadDoc = async (file: File, documentType: string) => {
    if (!profile) return;
    setUploadingType(documentType);
    try {
      await uploadDocument({
        variables: { workerId: profile.id, documentType, file },
      });
    } catch {
      // Error handled by Apollo
    } finally {
      setUploadingType('');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteDocument({ variables: { id: docId } });
    } catch {
      // Error handled by Apollo
    }
  };

  const REQUIRED_WORKER_DOCS: { type: string; label: string }[] = [
    { type: 'cazier_judiciar', label: t('worker:settings.documents.requiredDocs.cazier_judiciar') },
    { type: 'contract_munca', label: t('worker:settings.documents.requiredDocs.contract_munca') },
  ];

  // ─── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('worker:settings.pageTitle')}</h1>
        <LoadingSpinner text={t('worker:settings.loadingProfile')} />
      </div>
    );
  }

  const initial = profile?.fullName?.[0]?.toUpperCase() ?? '?';
  const personalityDone = !!profile?.personalityAssessment?.completedAt;
  const workerStatusLabel = t(`worker:settings.workerStatus.${profile?.status}`, { defaultValue: profile?.status || '--' });
  const workerStatusVariant = STATUS_VARIANT[profile?.status] || 'default';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('worker:settings.pageTitle')}</h1>

      {/* ── 1. Profile Header ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          {/* Editable avatar */}
          <button
            type="button"
            onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className={cn(
              'w-16 h-16 rounded-full relative overflow-hidden shrink-0 group',
              'border-2 border-gray-200 hover:border-blue-500 transition-all',
              uploadingAvatar ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {(avatarPreview || profile?.user?.avatarUrl) ? (
              <img
                src={avatarPreview || profile?.user?.avatarUrl}
                alt={profile?.fullName ?? 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                {initial}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{profile?.fullName ?? '--'}</h2>
            <p className="text-sm text-gray-400">{profile?.email ?? '--'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={workerStatusVariant}>
                {workerStatusLabel}
              </Badge>
              {profile?.company?.companyName && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.company.companyName}
                </span>
              )}
              {profile?.createdAt && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('worker:settings.memberSince', { date: formatMemberSince(profile.createdAt) })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Stats Row ──────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('worker:settings.stats.rating')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.averageRating ? `${Number(stats.averageRating).toFixed(1)} / 5` : '-- / 5'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {t('worker:settings.stats.reviewsCount', { count: stats.totalReviews ?? 0 })}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('worker:settings.stats.jobsCompleted')}</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalJobsCompleted ?? 0}</p>
                <p className="text-[11px] text-gray-400">
                  {t('worker:settings.stats.thisMonth', { count: stats.thisMonthJobs ?? 0 })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 3. Personality Test Status ────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', personalityDone ? 'bg-emerald-50' : 'bg-amber-50')}>
            <Brain className={cn('h-5 w-5', personalityDone ? 'text-emerald-500' : 'text-amber-500')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t('worker:settings.personalityTest.title')}</p>
            {personalityDone ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                <Check className="h-3 w-3" />
                {profile?.personalityAssessment?.completedAt
                  ? t('worker:settings.personalityTest.completed', { date: formatReviewDate(profile.personalityAssessment.completedAt) })
                  : t('worker:settings.personalityTest.completedNoDate')}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-0.5">
                {t('worker:settings.personalityTest.pendingActivation')}
              </p>
            )}
          </div>
          {!personalityDone && (
            <Link to="/worker/test-personalitate">
              <Button size="sm" variant="outline">{t('worker:settings.personalityTest.complete')}</Button>
            </Link>
          )}
        </div>
      </Card>

      {/* ── 4. Recent Reviews ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t('worker:settings.reviews.title')}</h2>
          {totalReviews > 0 && (
            <span className="text-xs text-gray-400 ml-auto">
              {t('worker:settings.reviews.totalCount', { count: totalReviews })}
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t('worker:settings.reviews.noReviews')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('worker:settings.reviews.noReviewsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm tracking-wider">{renderStars(review.rating)}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {review.reviewer?.fullName ?? t('worker:settings.reviews.reviewerFallback')}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">{formatReviewDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                )}
                {review.booking?.referenceCode && (
                  <p className="text-[11px] text-gray-400 mt-1">#{review.booking.referenceCode}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 5. Work Areas (read-only) ─────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t('worker:settings.workAreas.title')}</h2>
        </div>

        {areasLoading ? (
          <p className="text-sm text-gray-400">{t('worker:settings.workAreas.loading')}</p>
        ) : serviceAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t('worker:settings.workAreas.noAreas')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(
              serviceAreas.reduce<Record<string, { id: string; name: string }[]>>(
                (acc, area) => {
                  const city = area.cityName || t('worker:settings.workAreas.unknownCity');
                  if (!acc[city]) acc[city] = [];
                  acc[city].push({ id: area.id, name: area.name });
                  return acc;
                },
                {},
              ),
            ).map(([city, areas]) => (
              <div key={city}>
                <p className="text-sm font-medium text-gray-700 mb-2">{city}</p>
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <Badge key={area.id} variant="info">
                      {area.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            {t('worker:settings.workAreas.managedBy')}
          </p>
        </div>
      </Card>

      {/* ── 5b. Service Categories (read-only) ─────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t('worker:settings.categories.title')}</h2>
        </div>

        {profileLoading ? (
          <p className="text-sm text-gray-400">{t('worker:settings.categories.loading')}</p>
        ) : !profile?.serviceCategories || profile.serviceCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <Layers className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t('worker:settings.categories.noCategories')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.serviceCategories.map((cat: { id: string; nameRo: string; nameEn?: string; icon?: string }) => (
              <Badge key={cat.id} variant="info">
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {i18n.language === 'en' ? (cat.nameEn || cat.nameRo) : cat.nameRo}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            {t('worker:settings.categories.managedBy')}
          </p>
        </div>
      </Card>

      {/* ── 6. My Documents ───────────────────────────────────────────── */}
      {profile && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{t('worker:settings.documents.title')}</h2>
          </div>
          {profile.status === 'PENDING_REVIEW' && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              {t('worker:settings.documents.pendingReviewNotice')}
            </div>
          )}
          <div className="space-y-4">
            {REQUIRED_WORKER_DOCS.map((reqDoc) => {
              const docs: WorkerDocument[] = profile.documents ?? [];
              const existingDoc = docs.find((d: WorkerDocument) => d.documentType === reqDoc.type);
              return (
                <div key={reqDoc.type}>
                  {existingDoc ? (
                    <DocumentCard
                      id={existingDoc.id}
                      documentType={existingDoc.documentType}
                      documentTypeLabel={reqDoc.label}
                      fileName={existingDoc.fileName}
                      fileUrl={existingDoc.fileUrl}
                      status={existingDoc.status}
                      uploadedAt={existingDoc.uploadedAt}
                      rejectionReason={existingDoc.rejectionReason}
                      onDelete={handleDeleteDoc}
                      deleteLoading={deleting}
                    />
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-3">{reqDoc.label}</p>
                      <FileUpload
                        onFileSelect={(file) => handleUploadDoc(file, reqDoc.type)}
                        loading={uploading && uploadingType === reqDoc.type}
                        disabled={uploading}
                        label={t('worker:settings.documents.uploadLabel', { label: reqDoc.label })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── 7. Editable Profile Form ──────────────────────────────────── */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('worker:settings.profileInfo.title')}</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <div className="relative">
              <Phone className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
              <Input
                label={t('worker:settings.profileInfo.phoneLabel')}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
                placeholder={t('worker:settings.profileInfo.phonePlaceholder')}
                className="pl-10"
                error={phoneError}
              />
            </div>
            {/* Verification status badge */}
            {profile?.phoneVerified && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                <CheckCircle className="h-4 w-4" />
                {t('worker:settings.profileInfo.verifiedPhone')}
              </div>
            )}
            {profile?.phone && !profile?.phoneVerified && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                  <XCircle className="h-4 w-4" />
                  {t('worker:settings.profileInfo.unverifiedPhone')}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowVerifyWidget((v) => !v)}
                >
                  {showVerifyWidget
                    ? t('worker:settings.profileInfo.hideVerify')
                    : t('worker:settings.profileInfo.verifyNow')}
                </Button>
              </div>
            )}
            {showVerifyWidget && profile?.phone && (
              <div className="pt-2">
                <PhoneVerificationWidget
                  phone={phone || profile.phone}
                  onVerified={() => {
                    setShowVerifyWidget(false);
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('worker:settings.profileInfo.bioLabel')}</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('worker:settings.profileInfo.bioPlaceholder')}
                rows={4}
                className={cn(
                  'w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900',
                  'placeholder:text-gray-400 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                )}
              />
            </div>
          </div>
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <Button type="submit" loading={saving}>
            {t('worker:settings.profileInfo.saveButton')}
          </Button>
        </form>
      </Card>

      {/* ── 8. Language Preference ────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t('worker:settings.language.title')}</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSelectedLang('ro')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                selectedLang === 'ro'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              )}
            >
              {t('language.ro')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang('en')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                selectedLang === 'en'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              )}
            >
              {t('language.en')}
            </button>
          </div>
          {langSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              {langSuccess}
            </div>
          )}
          {langError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {langError}
            </div>
          )}
          <Button onClick={handleLangSave} loading={savingLang} variant="outline" className="w-full">
            {t('worker:settings.language.saveButton')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
