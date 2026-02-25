import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  Phone, FileText, Building2, Star, Briefcase, Camera, Loader2,
  Check, MapPin, Info, Brain, MessageSquare, Calendar, Layers,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FileUpload from '@/components/ui/FileUpload';
import DocumentCard from '@/components/ui/DocumentCard';
import {
  MY_WORKER_PROFILE,
  MY_WORKER_STATS,
  UPDATE_WORKER_PROFILE,
  MY_WORKER_SERVICE_AREAS,
  MY_WORKER_REVIEWS,
  UPLOAD_WORKER_DOCUMENT,
  DELETE_WORKER_DOCUMENT,
  UPLOAD_WORKER_AVATAR,
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const statusVariant: Record<string, StatusVariant> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  PENDING_REVIEW: 'warning',
  SUSPENDED: 'danger',
  INACTIVE: 'default',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ',
  INVITED: 'Invitat',
  PENDING_REVIEW: 'In asteptare',
  SUSPENDED: 'Suspendat',
  INACTIVE: 'Inactiv',
};

const REQUIRED_WORKER_DOCS: { type: string; label: string }[] = [
  { type: 'cazier_judiciar', label: 'Cazier Judiciar' },
  { type: 'contract_munca', label: 'Contract de Munca' },
];

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

function formatMemberSince(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatReviewDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
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

  // ─── Editable form state ────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

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
    try {
      await updateProfile({ variables: { input: { phone, bio } } });
      setSaveSuccess('Profil actualizat cu succes!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch {
      setSaveError('Eroare la salvare. Incearca din nou.');
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

  // ─── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profil & Setari</h1>
        <LoadingSpinner text="Se incarca profilul..." />
      </div>
    );
  }

  const initial = profile?.fullName?.[0]?.toUpperCase() ?? '?';
  const personalityDone = !!profile?.personalityAssessment?.completedAt;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Profil & Setari</h1>

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
              <Badge variant={statusVariant[profile?.status] || 'default'}>
                {statusLabel[profile?.status] || profile?.status || '--'}
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
                  Membru din {formatMemberSince(profile.createdAt)}
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
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.averageRating ? `${Number(stats.averageRating).toFixed(1)} / 5` : '-- / 5'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {stats.totalReviews ?? 0} recenzii
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
                <p className="text-xs text-gray-500">Joburi finalizate</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalJobsCompleted ?? 0}</p>
                <p className="text-[11px] text-gray-400">
                  {stats.thisMonthJobs ?? 0} luna aceasta
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
            <p className="text-sm font-semibold text-gray-900">Test de personalitate</p>
            {personalityDone ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                <Check className="h-3 w-3" />
                Completat{profile?.personalityAssessment?.completedAt
                  ? ` pe ${formatReviewDate(profile.personalityAssessment.completedAt)}`
                  : ''}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-0.5">
                Necesar pentru activare
              </p>
            )}
          </div>
          {!personalityDone && (
            <Link to="/worker/test-personalitate">
              <Button size="sm" variant="outline">Completeaza</Button>
            </Link>
          )}
        </div>
      </Card>

      {/* ── 4. Recent Reviews ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recenzii recente</h2>
          {totalReviews > 0 && (
            <span className="text-xs text-gray-400 ml-auto">{totalReviews} total</span>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nicio recenzie inca.</p>
            <p className="text-xs text-gray-400 mt-1">Recenziile vor aparea dupa finalizarea comenzilor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm tracking-wider">{renderStars(review.rating)}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {review.reviewer?.fullName ?? 'Client'}
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
          <h2 className="text-lg font-semibold text-gray-900">Zonele mele de lucru</h2>
        </div>

        {areasLoading ? (
          <p className="text-sm text-gray-400">Se incarca zonele...</p>
        ) : serviceAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nicio zona atribuita inca.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(
              serviceAreas.reduce<Record<string, { id: string; name: string }[]>>(
                (acc, area) => {
                  const city = area.cityName || 'Necunoscut';
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
            Zonele de lucru sunt gestionate de administratorul firmei tale.
          </p>
        </div>
      </Card>

      {/* ── 5b. Service Categories (read-only) ─────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Categoriile mele de servicii</h2>
        </div>

        {profileLoading ? (
          <p className="text-sm text-gray-400">Se incarca categoriile...</p>
        ) : !profile?.serviceCategories || profile.serviceCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
              <Layers className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nicio categorie atribuita inca.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.serviceCategories.map((cat: { id: string; nameRo: string; icon?: string }) => (
              <Badge key={cat.id} variant="info">
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.nameRo}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Categoriile de servicii sunt gestionate de administratorul firmei tale.
          </p>
        </div>
      </Card>

      {/* ── 6. My Documents ───────────────────────────────────────────── */}
      {profile && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Documentele mele</h2>
          </div>
          {profile.status === 'PENDING_REVIEW' && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Incarca documentele necesare pentru a fi activat de administrator.
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
                        label={`Incarca ${reqDoc.label}`}
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
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Informatii profil</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="relative">
            <Phone className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
            <Input
              label="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Numar de telefon"
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descrie-te pe scurt..."
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
            Salveaza modificarile
          </Button>
        </form>
      </Card>
    </div>
  );
}
