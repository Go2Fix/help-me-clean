import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Star, Copy, Check, Users,
  Briefcase, TrendingUp, Calendar, DollarSign, ChevronDown,
  MapPin, CheckCircle, FileText, Upload as UploadIcon, AlertCircle, User, Brain,
  Shield, Sparkles, AlertTriangle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MY_CLEANERS, UPDATE_CLEANER_STATUS, CLEANER_PERFORMANCE,
  MY_COMPANY_SERVICE_AREAS, CLEANER_SERVICE_AREAS, UPDATE_CLEANER_SERVICE_AREAS,
  UPLOAD_CLEANER_DOCUMENT, UPLOAD_CLEANER_AVATAR,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

type CleanerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED' | 'PENDING';
type MutableStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface CleanerDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  reviewedAt?: string | null;
  rejectionReason: string | null;
}

interface PersonalityInsights {
  summary: string;
  strengths: string[];
  concerns: string[];
  teamFitAnalysis: string;
  recommendedAction: string;
  confidence: string;
  aiModel: string;
  generatedAt: string;
}

interface PersonalityAssessment {
  id: string;
  facetScores: Array<{
    facetCode: string;
    facetName: string;
    score: number;
    maxScore: number;
    isFlagged: boolean;
  }>;
  integrityAvg: number;
  workQualityAvg: number;
  hasConcerns: boolean;
  flaggedFacets: string[];
  completedAt: string;
  insights?: PersonalityInsights | null;
}

interface Cleaner {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  bio?: string | null;
  user: { id: string; avatarUrl: string | null } | null;
  status: CleanerStatus;
  isCompanyAdmin: boolean;
  inviteToken: string | null;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  availability: AvailabilitySlot[];
  createdAt: string;
  documents: CleanerDocument[];
  personalityAssessment?: PersonalityAssessment | null;
  company?: { id: string; companyName: string } | null;
}

interface CleanerPerformance {
  cleanerId: string;
  fullName: string;
  ratingAvg: number;
  totalCompletedJobs: number;
  thisMonthCompleted: number;
  totalEarnings: number;
  thisMonthEarnings: number;
}

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success', INVITED: 'info', PENDING: 'warning', PENDING_REVIEW: 'warning', SUSPENDED: 'danger', INACTIVE: 'default',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ', INVITED: 'Invitat', PENDING: 'In asteptare', PENDING_REVIEW: 'In asteptare', SUSPENDED: 'Suspendat', INACTIVE: 'Inactiv',
};

const dayNames: Record<number, string> = {
  0: 'Duminica', 1: 'Luni', 2: 'Marti', 3: 'Miercuri', 4: 'Joi', 5: 'Vineri', 6: 'Sambata',
};

const fmtCurrency = (n: number) => `${n.toFixed(0)} RON`;

const DOC_TYPES: Record<string, { label: string; description: string }> = {
  cazier_judiciar: { label: 'Cazier Judiciar', description: 'PDF, max 10MB' },
  contract_munca: { label: 'Contract de Munca', description: 'PDF, max 10MB' },
};

const docStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const docStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 'lg' }: { src?: string | null; name: string; size?: 'sm' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(' ').map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase() || '?';
  const sizeClass = size === 'lg' ? 'h-20 w-20' : 'h-12 w-12';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg';
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 border-2 border-gray-200`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center shrink-0`}>
      <span className={`${textSize} font-semibold text-primary`}>{initials}</span>
    </div>
  );
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({
  currentStatus,
  onChange,
  disabled = false,
}: {
  currentStatus: CleanerStatus;
  onChange: (newStatus: MutableStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mutableStatuses: MutableStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:ring-2 ring-offset-1',
          statusBadgeVariant[currentStatus] === 'success' && 'bg-emerald-100 text-emerald-700 hover:ring-emerald-300',
          statusBadgeVariant[currentStatus] === 'danger' && 'bg-red-100 text-red-700 hover:ring-red-300',
          statusBadgeVariant[currentStatus] === 'default' && 'bg-gray-100 text-gray-700 hover:ring-gray-300',
          statusBadgeVariant[currentStatus] === 'info' && 'bg-blue-100 text-blue-700 hover:ring-blue-300',
          statusBadgeVariant[currentStatus] === 'warning' && 'bg-amber-100 text-amber-700 hover:ring-amber-300',
        )}
      >
        {statusLabel[currentStatus] || currentStatus}
        {!disabled && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
          {mutableStatuses.map((status) => (
            <button
              type="button"
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                onChange(status);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer',
                currentStatus === status && 'bg-gray-100 font-medium',
              )}
            >
              <span
                className={cn(
                  status === 'ACTIVE' && 'text-emerald-700',
                  status === 'INACTIVE' && 'text-gray-700',
                  status === 'SUSPENDED' && 'text-red-700',
                )}
              >
                {statusLabel[status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────
  const [copiedToken, setCopiedToken] = useState(false);
  const [statusModal, setStatusModal] = useState<{ newStatus: MutableStatus } | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const [saveAreasSuccess, setSaveAreasSuccess] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [docTypeModal, setDocTypeModal] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data, loading, refetch } = useQuery(MY_CLEANERS);

  const [fetchPerformance, { data: perfData, loading: perfLoading }] = useLazyQuery<{
    cleanerPerformance: CleanerPerformance;
  }>(CLEANER_PERFORMANCE);

  const { data: companyAreasData, loading: loadingCompanyAreas } = useQuery<{
    myCompanyServiceAreas: CityArea[];
  }>(MY_COMPANY_SERVICE_AREAS);

  const [fetchCleanerAreas, { loading: loadingCleanerAreas }] = useLazyQuery<{
    cleanerServiceAreas: CityArea[];
  }>(CLEANER_SERVICE_AREAS);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_CLEANER_STATUS);
  const [updateCleanerAreas, { loading: savingAreas }] = useMutation(UPDATE_CLEANER_SERVICE_AREAS);
  const [uploadDocument] = useMutation(UPLOAD_CLEANER_DOCUMENT);
  const [uploadAvatar] = useMutation(UPLOAD_CLEANER_AVATAR);

  // ─── Derived data ──────────────────────────────────────────────────────
  const cleaners: Cleaner[] = data?.myCleaners ?? [];
  const cleaner = cleaners.find((c) => c.id === id) ?? null;
  const perf = perfData?.cleanerPerformance ?? null;
  const companyAreas: CityArea[] = companyAreasData?.myCompanyServiceAreas ?? [];

  // Group company areas by city
  const areasByCity = companyAreas.reduce<Record<string, { cityName: string; areas: CityArea[] }>>((acc, area) => {
    if (!acc[area.cityId]) {
      acc[area.cityId] = { cityName: area.cityName, areas: [] };
    }
    acc[area.cityId].areas.push(area);
    return acc;
  }, {});

  // ─── Effects ────────────────────────────────────────────────────────────

  // Fetch performance data when cleaner is loaded
  useEffect(() => {
    if (cleaner) {
      fetchPerformance({ variables: { cleanerId: cleaner.id } });
    }
  }, [cleaner, fetchPerformance]);

  // Fetch cleaner service areas when cleaner is loaded
  useEffect(() => {
    if (cleaner) {
      fetchCleanerAreas({ variables: { cleanerId: cleaner.id } }).then((res) => {
        const areas = res.data?.cleanerServiceAreas ?? [];
        if (areas.length > 0) {
          setSelectedAreaIds(new Set(areas.map((a) => a.id)));
        } else {
          setSelectedAreaIds(new Set(companyAreas.map((a) => a.id)));
        }
      });
    }
  }, [cleaner, fetchCleanerAreas, companyAreas]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCopyToken = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }, []);

  const handleStatusChange = async () => {
    if (!statusModal || !cleaner) return;
    try {
      await updateStatus({ variables: { id: cleaner.id, status: statusModal.newStatus } });
      setStatusModal(null);
      refetch();
    } catch {
      /* handled by Apollo */
    }
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
    setSaveAreasSuccess(false);
  };

  const toggleAllForCity = (cityId: string) => {
    const cityAreas = areasByCity[cityId]?.areas ?? [];
    const allSelected = cityAreas.every((a) => selectedAreaIds.has(a.id));
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      for (const area of cityAreas) {
        if (allSelected) {
          next.delete(area.id);
        } else {
          next.add(area.id);
        }
      }
      return next;
    });
    setSaveAreasSuccess(false);
  };

  const handleSaveAreas = async () => {
    if (!cleaner) return;
    try {
      await updateCleanerAreas({
        variables: {
          cleanerId: cleaner.id,
          areaIds: Array.from(selectedAreaIds),
        },
      });
      setSaveAreasSuccess(true);
      setTimeout(() => setSaveAreasSuccess(false), 3000);
    } catch {
      /* Apollo error handling */
    }
  };

  const handleDocumentUpload = (file: File) => {
    setDocTypeModal(file);
  };

  const handleDocTypeSelect = async (type: string) => {
    if (!docTypeModal || !cleaner) return;
    setUploadingDoc(type);
    try {
      await uploadDocument({ variables: { cleanerId: cleaner.id, documentType: type, file: docTypeModal } });
      refetch();
      setDocTypeModal(null);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!cleaner) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar({ variables: { cleanerId: cleaner.id, file } });
      refetch();
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-full overflow-hidden">
        <button
          onClick={() => navigate('/firma/echipa')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Inapoi la echipa
        </button>
        <LoadingSpinner text="Se incarca profilul..." />
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────────────────────────

  if (!cleaner) {
    return (
      <div className="max-w-full overflow-hidden">
        <button
          onClick={() => navigate('/firma/echipa')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Inapoi la echipa
        </button>
        <Card>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Lucrator negasit</h3>
            <p className="text-gray-500 mb-4">Lucratorul nu a fost gasit in echipa ta.</p>
            <Button onClick={() => navigate('/firma/echipa')}>Inapoi la echipa</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Derived from cleaner ─────────────────────────────────────────────

  const canChangeStatus = cleaner.status === 'ACTIVE' || cleaner.status === 'INACTIVE' || cleaner.status === 'SUSPENDED';
  const slots = (cleaner.availability ?? []).filter((s) => s.isAvailable).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const requiredDocs = ['cazier_judiciar', 'contract_munca'];
  const uploadedDocTypes = new Set(cleaner.documents?.map((d) => d.documentType) ?? []);
  const missingDocs = requiredDocs.filter((t) => !uploadedDocTypes.has(t));

  const stats = perf
    ? [
        { bg: 'bg-blue-50', icon: Briefcase, iconCls: 'text-blue-600', label: 'Total joburi', value: perf.totalCompletedJobs, valCls: 'text-blue-900' },
        { bg: 'bg-emerald-50', icon: Calendar, iconCls: 'text-emerald-600', label: 'Luna aceasta', value: perf.thisMonthCompleted, valCls: 'text-emerald-900' },
        { bg: 'bg-amber-50', icon: DollarSign, iconCls: 'text-amber-600', label: 'Castiguri totale', value: fmtCurrency(perf.totalEarnings), valCls: 'text-amber-900' },
        { bg: 'bg-purple-50', icon: TrendingUp, iconCls: 'text-purple-600', label: 'Castiguri luna', value: fmtCurrency(perf.thisMonthEarnings), valCls: 'text-purple-900' },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-full overflow-hidden">
      {/* 1. Back button */}
      <button
        onClick={() => navigate('/firma/echipa')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Inapoi la echipa
      </button>

      {/* 2. Header Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <Avatar src={cleaner.user?.avatarUrl} name={cleaner.fullName} size="lg" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words min-w-0">{cleaner.fullName}</h1>
              <StatusBadge
                currentStatus={cleaner.status}
                onChange={(newStatus) => setStatusModal({ newStatus })}
                disabled={!canChangeStatus}
              />
              {cleaner.isCompanyAdmin && <Badge variant="info">Admin</Badge>}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              <Star className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-gray-700">
                {cleaner.ratingAvg ? Number(cleaner.ratingAvg).toFixed(1) : '--'}
              </span>
              <span className="text-sm text-gray-400 ml-1">
                ({cleaner.totalJobsCompleted} joburi completate)
              </span>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5 mb-3 min-w-0">
              {cleaner.email && (
                <a
                  href={`mailto:${cleaner.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors min-w-0"
                >
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{cleaner.email}</span>
                </a>
              )}
              {cleaner.phone && (
                <a
                  href={`tel:${cleaner.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  {cleaner.phone}
                </a>
              )}
            </div>

            {/* Bio */}
            {cleaner.bio && (
              <p className="text-sm text-gray-600 mb-3">{cleaner.bio}</p>
            )}

            {/* Invite token (for INVITED status) */}
            {cleaner.status === 'INVITED' && cleaner.inviteToken && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Cod invitatie</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-gray-700 truncate select-all">
                    {cleaner.inviteToken}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToken(cleaner.inviteToken!)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                    title="Copiaza codul"
                  >
                    {copiedToken
                      ? <Check className="h-3.5 w-3.5 text-secondary" />
                      : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                </div>
                {copiedToken && <p className="text-xs text-secondary mt-1">Copiat!</p>}
              </div>
            )}

            {/* Join date */}
            <p className="text-xs text-gray-400">
              Membru din {formatDate(cleaner.createdAt)}
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {perfLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-4">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-14" />
              </div>
            ))
          : stats.map((s) => (
              <div key={s.label} className={cn(s.bg, 'rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden')}>
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                  <s.icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0', s.iconCls)} />
                  <span className={cn('text-[10px] sm:text-xs font-medium truncate', s.iconCls)}>{s.label}</span>
                </div>
                <p className={cn('text-lg sm:text-xl font-bold truncate', s.valCls)}>{s.value}</p>
              </div>
            ))}
      </div>

      {/* 4. Availability Schedule Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Program disponibilitate</h2>
        </div>
        {slots.length > 0 ? (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 rounded-xl gap-2"
              >
                <span className="text-sm font-medium text-gray-700 truncate">
                  {dayNames[slot.dayOfWeek] ?? `Ziua ${slot.dayOfWeek}`}
                </span>
                <span className="text-sm text-gray-500 shrink-0">{slot.startTime} - {slot.endTime}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Niciun program de disponibilitate setat.</p>
          </div>
        )}
      </Card>

      {/* 5. Service Areas Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Zone de lucru</h2>
        </div>

        {loadingCompanyAreas || loadingCleanerAreas ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : companyAreas.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Firma ta nu are zone de lucru configurate.</p>
            <p className="text-xs text-gray-400 mt-1">Adauga zone in pagina de setari a firmei.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {Object.entries(areasByCity).map(([cityId, { cityName, areas }]) => {
                const allSelected = areas.every((a) => selectedAreaIds.has(a.id));
                const someSelected = areas.some((a) => selectedAreaIds.has(a.id));
                return (
                  <div key={cityId}>
                    {/* City header with select all */}
                    <button
                      type="button"
                      onClick={() => toggleAllForCity(cityId)}
                      className="flex items-center gap-2 mb-2 group cursor-pointer w-full text-left"
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                          allSelected
                            ? 'bg-primary border-primary'
                            : someSelected
                              ? 'bg-primary/30 border-primary'
                              : 'border-gray-300 group-hover:border-primary/50',
                        )}
                      >
                        {(allSelected || someSelected) && (
                          <Check className="h-2.5 w-2.5 text-white" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {cityName}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {areas.filter((a) => selectedAreaIds.has(a.id)).length}/{areas.length}
                      </span>
                    </button>

                    {/* Area checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 pl-1">
                      {areas.map((area) => {
                        const checked = selectedAreaIds.has(area.id);
                        return (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => toggleArea(area.id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer',
                              checked
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                            )}
                          >
                            <div
                              className={cn(
                                'h-3.5 w-3.5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                                checked ? 'bg-primary border-primary' : 'border-gray-300',
                              )}
                            >
                              {checked && <Check className="h-2 w-2 text-white" />}
                            </div>
                            <span
                              className={cn(
                                'text-sm truncate',
                                checked ? 'text-gray-900 font-medium' : 'text-gray-600',
                              )}
                            >
                              {area.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <p className="text-xs text-gray-400 mt-3">
              {selectedAreaIds.size} din {companyAreas.length} zone selectate
            </p>

            {/* Success message */}
            {saveAreasSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg mt-3">
                <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">
                  Zonele de lucru au fost salvate cu succes!
                </p>
              </div>
            )}

            {/* Save button */}
            <div className="mt-4">
              <Button onClick={handleSaveAreas} loading={savingAreas}>
                Salveaza zonele
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 6. Documents Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Documente</h2>
        </div>

        {/* Existing documents */}
        {cleaner.documents && cleaner.documents.length > 0 ? (
          <div className="space-y-2 mb-4">
            {cleaner.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl"
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {DOC_TYPES[doc.documentType]?.label || doc.documentType}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                  {doc.status === 'REJECTED' && doc.rejectionReason && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3" />
                      {doc.rejectionReason}
                    </p>
                  )}
                </div>
                <Badge variant={docStatusVariant[doc.status] || 'default'} className="shrink-0">
                  {docStatusLabel[doc.status] || doc.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Niciun document incarcat inca.</p>
        )}

        {/* Upload button for missing docs */}
        {missingDocs.length > 0 && (
          <>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleDocumentUpload(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-600"
              disabled={uploadingDoc !== null}
              onClick={() => docInputRef.current?.click()}
            >
              <UploadIcon className="h-4 w-4" />
              {uploadingDoc ? 'Se incarca...' : `Incarca document (${missingDocs.length} lipsa)`}
            </button>
          </>
        )}

        {/* Avatar upload section */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Fotografie profil</p>
          {cleaner.user?.avatarUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={cleaner.user.avatarUrl}
                alt={cleaner.fullName}
                className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200"
              />
              <div>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Incarcata
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAvatarUpload(file);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Schimba
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAvatarUpload(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-600"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                <User className="h-4 w-4" />
                {uploadingAvatar ? 'Se incarca...' : 'Incarca fotografie'}
              </button>
            </>
          )}
        </div>
      </Card>

      {/* 7. Personality Assessment Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Test de personalitate</h2>
        </div>
        {cleaner.personalityAssessment ? (
          <div className="space-y-4">
            {/* Domain summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">Integritate</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {cleaner.personalityAssessment.integrityAvg.toFixed(1)}
                  <span className="text-xs text-gray-400 ml-0.5 font-normal">/ 20</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-gray-600">Calitate munca</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {cleaner.personalityAssessment.workQualityAvg.toFixed(1)}
                  <span className="text-xs text-gray-400 ml-0.5 font-normal">/ 20</span>
                </p>
              </div>
            </div>

            {/* Facet scores — compact grid */}
            {cleaner.personalityAssessment.facetScores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scoruri detaliate</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cleaner.personalityAssessment.facetScores.map((facet) => (
                    <div
                      key={facet.facetCode}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border text-sm',
                        facet.isFlagged
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-100',
                      )}
                    >
                      <span className={cn('font-medium truncate mr-2', facet.isFlagged ? 'text-red-700' : 'text-gray-700')}>
                        {facet.facetName}
                      </span>
                      <span className={cn('tabular-nums shrink-0 font-semibold', facet.isFlagged ? 'text-red-600' : 'text-gray-600')}>
                        {facet.score}/{facet.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {cleaner.personalityAssessment.insights && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">Analiza AI</span>
                  <Badge
                    variant={
                      cleaner.personalityAssessment.insights.recommendedAction === 'approve' ? 'success' :
                      cleaner.personalityAssessment.insights.recommendedAction === 'reject' ? 'danger' : 'warning'
                    }
                  >
                    {cleaner.personalityAssessment.insights.recommendedAction === 'approve' ? 'Recomandat' :
                     cleaner.personalityAssessment.insights.recommendedAction === 'reject' ? 'Nu se recomanda' : 'Revizie atenta'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-3">{cleaner.personalityAssessment.insights.summary}</p>

                {cleaner.personalityAssessment.insights.strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-emerald-800 mb-1">Puncte forte:</p>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {cleaner.personalityAssessment.insights.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cleaner.personalityAssessment.insights.concerns.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Zone de atentie:</p>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {cleaner.personalityAssessment.insights.concerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cleaner.personalityAssessment.insights.teamFitAnalysis && (
                  <div className="p-2.5 rounded-lg bg-white/60 border border-purple-100 mb-2">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Potrivire echipa:</p>
                    <p className="text-sm text-gray-600">{cleaner.personalityAssessment.insights.teamFitAnalysis}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {cleaner.personalityAssessment.insights.aiModel} &bull; {new Date(cleaner.personalityAssessment.insights.generatedAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
            )}

            {/* Concerns warning (no insights) */}
            {!cleaner.personalityAssessment.insights && cleaner.personalityAssessment.hasConcerns && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Scoruri scazute detectate</p>
                  <p className="text-xs text-amber-700">{cleaner.personalityAssessment.flaggedFacets.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Completion date */}
            <p className="text-xs text-gray-400">
              Completat: {new Date(cleaner.personalityAssessment.completedAt).toLocaleDateString('ro-RO', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Testul de personalitate nu a fost completat inca.
            </p>
          </div>
        )}
      </Card>

      {/* 8. Status Change Confirmation Modal */}
      <Modal
        open={statusModal !== null}
        onClose={() => setStatusModal(null)}
        title="Schimba status"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Esti sigur ca vrei sa schimbi statusul lui{' '}
            <span className="font-semibold text-gray-900">{cleaner.fullName}</span> in{' '}
            <span className="font-semibold text-gray-900">
              {statusModal ? statusLabel[statusModal.newStatus] : ''}
            </span>
            ?
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStatusModal(null)} className="flex-1">
              Anuleaza
            </Button>
            <Button onClick={handleStatusChange} loading={updatingStatus} className="flex-1">
              Confirma
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Type Selection Modal */}
      <Modal
        open={docTypeModal !== null}
        onClose={() => setDocTypeModal(null)}
        title="Selecteaza tipul de document"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Alege tipul documentului pe care il incarci:
          </p>
          <div className="space-y-2">
            {missingDocs.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleDocTypeSelect(type)}
                disabled={uploadingDoc !== null}
                className="w-full flex items-start gap-3 p-3 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left cursor-pointer"
              >
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{DOC_TYPES[type].label}</p>
                  <p className="text-xs text-gray-500">{DOC_TYPES[type].description}</p>
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setDocTypeModal(null)} className="w-full">
            Anuleaza
          </Button>
        </div>
      </Modal>
    </div>
  );
}
