import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Mail, Phone, Star, Copy, Check, Users,
  Briefcase, TrendingUp, Calendar, DollarSign, ChevronDown,
  MapPin, CheckCircle, FileText, Upload as UploadIcon, AlertCircle, User, Brain,
  Shield, Sparkles, AlertTriangle, Layers, Pencil, Plus, Loader2, X,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MY_WORKERS, UPDATE_WORKER_STATUS, WORKER_PERFORMANCE,
  MY_COMPANY_SERVICE_AREAS, WORKER_SERVICE_AREAS, UPDATE_WORKER_SERVICE_AREAS,
  UPLOAD_WORKER_DOCUMENT, UPLOAD_WORKER_AVATAR,
  SERVICE_CATEGORIES, UPDATE_WORKER_SERVICE_CATEGORIES,
  UPDATE_WORKER_MAX_DAILY_BOOKINGS,
  UPDATE_WORKER_AVAILABILITY,
  WORKER_DATE_OVERRIDES,
  SET_WORKER_DATE_OVERRIDE_BY_ADMIN,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

type WorkerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED' | 'PENDING';
type MutableStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface WorkerDocument {
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

interface ServiceCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon: string;
}

interface Worker {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  bio?: string | null;
  user: { id: string; avatarUrl: string | null } | null;
  status: WorkerStatus;
  isCompanyAdmin: boolean;
  inviteToken: string | null;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  availability: AvailabilitySlot[];
  serviceCategories?: ServiceCategory[];
  createdAt: string;
  documents: WorkerDocument[];
  personalityAssessment?: PersonalityAssessment | null;
  company?: { id: string; companyName: string } | null;
  maxDailyBookings?: number | null;
}

interface WorkerPerformance {
  workerId: string;
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

// ─── Schedule constants & types ──────────────────────────────────────────────

const WEEK_DAY_ORDER_COMPANY = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

interface EditableScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface WorkerDateOverride {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

function fmtDateISO(d: Date): string { return d.toISOString().split('T')[0]; }
function addDaysHelper(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success', INVITED: 'info', PENDING: 'warning', PENDING_REVIEW: 'warning', SUSPENDED: 'danger', INACTIVE: 'default',
};

const fmtCurrency = (n: number) => `${n.toFixed(0)} RON`;

const docStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function formatDate(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
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
  currentStatus: WorkerStatus;
  onChange: (newStatus: MutableStatus) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('company');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const statusLabel: Record<string, string> = {
    ACTIVE: t('team.statusActive'),
    INVITED: t('team.statusInvited'),
    PENDING: t('team.statusPending'),
    PENDING_REVIEW: t('team.statusPending'),
    SUSPENDED: t('team.statusSuspended'),
    INACTIVE: t('team.statusInactive'),
  };

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
  const { t, i18n } = useTranslation('company');
  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const statusLabel: Record<string, string> = {
    ACTIVE: t('team.statusActive'),
    INVITED: t('team.statusInvited'),
    PENDING: t('team.statusPending'),
    PENDING_REVIEW: t('team.statusPending'),
    SUSPENDED: t('team.statusSuspended'),
    INACTIVE: t('team.statusInactive'),
  };

  const dayNames: Record<number, string> = {
    0: t('workerDetail.days.0'),
    1: t('workerDetail.days.1'),
    2: t('workerDetail.days.2'),
    3: t('workerDetail.days.3'),
    4: t('workerDetail.days.4'),
    5: t('workerDetail.days.5'),
    6: t('workerDetail.days.6'),
  };

  const docStatusLabel: Record<string, string> = {
    PENDING: t('documents.statusPending'),
    APPROVED: t('documents.statusApproved'),
    REJECTED: t('documents.statusRejected'),
  };

  const DOC_TYPES: Record<string, { label: string; description: string }> = {
    cazier_judiciar: { label: t('workerDetail.documents.docTypes.cazier_judiciar'), description: 'PDF, max 10MB' },
    contract_munca: { label: t('workerDetail.documents.docTypes.contract_munca'), description: 'PDF, max 10MB' },
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const todayISO = fmtDateISO(new Date());
  const plus30ISO = fmtDateISO(addDaysHelper(new Date(), 30));

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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [saveCategoriesSuccess, setSaveCategoriesSuccess] = useState(false);
  const [saveCategoriesError, setSaveCategoriesError] = useState('');
  const [maxDailyBookings, setMaxDailyBookings] = useState<string>('');
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [editableSlots, setEditableSlots] = useState<EditableScheduleSlot[]>([]);
  const [schedFeedback, setSchedFeedback] = useState<'success' | 'error' | null>(null);
  const [schedError, setSchedError] = useState('');

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data, loading, refetch } = useQuery(MY_WORKERS);

  const [fetchPerformance, { data: perfData, loading: perfLoading }] = useLazyQuery<{
    workerPerformance: WorkerPerformance;
  }>(WORKER_PERFORMANCE);

  const { data: companyAreasData, loading: loadingCompanyAreas } = useQuery<{
    myCompanyServiceAreas: CityArea[];
  }>(MY_COMPANY_SERVICE_AREAS);

  const [fetchWorkerAreas, { loading: loadingWorkerAreas }] = useLazyQuery<{
    workerServiceAreas: CityArea[];
  }>(WORKER_SERVICE_AREAS);

  const { data: workerOverridesData, refetch: refetchWorkerOverrides } = useQuery(WORKER_DATE_OVERRIDES, {
    variables: { workerId: id!, from: todayISO, to: plus30ISO },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const workerOverrides: WorkerDateOverride[] = (workerOverridesData?.workerDateOverrides ?? []).filter(
    (o: WorkerDateOverride) => !o.isAvailable,
  );

  // ─── Mutations ──────────────────────────────────────────────────────────
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_WORKER_STATUS);
  const [updateWorkerAreas, { loading: savingAreas }] = useMutation(UPDATE_WORKER_SERVICE_AREAS);
  const [uploadDocument] = useMutation(UPLOAD_WORKER_DOCUMENT);
  const [uploadAvatar] = useMutation(UPLOAD_WORKER_AVATAR);
  const [updateWorkerMaxDailyBookings] = useMutation(UPDATE_WORKER_MAX_DAILY_BOOKINGS);
  const [updateWorkerAvailability, { loading: savingSchedule }] = useMutation(UPDATE_WORKER_AVAILABILITY);
  const [setWorkerDateOverrideByAdmin, { loading: savingAdminOverride }] = useMutation(
    SET_WORKER_DATE_OVERRIDE_BY_ADMIN,
    { onCompleted: () => refetchWorkerOverrides() },
  );

  // ─── Service Categories ───────────────────────────────────────────────
  const { data: categoriesData, loading: categoriesLoading } = useQuery(SERVICE_CATEGORIES);
  const [updateWorkerCategories, { loading: savingCategories }] = useMutation(UPDATE_WORKER_SERVICE_CATEGORIES, {
    refetchQueries: [{ query: MY_WORKERS }],
  });
  const allCategories: ServiceCategory[] = (categoriesData?.serviceCategories ?? []).filter(
    (c: ServiceCategory & { isActive: boolean }) => c.isActive,
  );

  // ─── Derived data ──────────────────────────────────────────────────────
  const workers: Worker[] = data?.myWorkers ?? [];
  const worker = workers.find((c) => c.id === id) ?? null;
  const perf = perfData?.workerPerformance ?? null;
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

  // Fetch performance data when worker is loaded
  useEffect(() => {
    if (worker) {
      fetchPerformance({ variables: { workerId: worker.id } });
    }
  }, [worker, fetchPerformance]);

  // Fetch worker service areas when worker is loaded
  useEffect(() => {
    if (worker) {
      fetchWorkerAreas({ variables: { workerId: worker.id } }).then((res) => {
        const areas = res.data?.workerServiceAreas ?? [];
        if (areas.length > 0) {
          setSelectedAreaIds(new Set(areas.map((a) => a.id)));
        } else {
          setSelectedAreaIds(new Set(companyAreas.map((a) => a.id)));
        }
      });
    }
  }, [worker, fetchWorkerAreas, companyAreas]);

  // Initialize selected categories from worker data
  useEffect(() => {
    if (worker?.serviceCategories) {
      setSelectedCategoryIds(new Set(worker.serviceCategories.map((c) => c.id)));
    }
  }, [worker]);

  // Initialize max daily bookings from worker data
  useEffect(() => {
    if (worker) {
      setMaxDailyBookings(worker.maxDailyBookings != null ? String(worker.maxDailyBookings) : '');
    }
  }, [worker]);

  // Initialize editable schedule slots from worker data
  useEffect(() => {
    if (worker) {
      const slots = WEEK_DAY_ORDER_COMPANY.map((dow) => {
        const existing = (worker.availability ?? []).find((s: AvailabilitySlot) => s.dayOfWeek === dow);
        return {
          dayOfWeek: dow,
          startTime: existing?.startTime ?? '08:00',
          endTime: existing?.endTime ?? '18:00',
          isAvailable: existing?.isAvailable ?? false,
        };
      });
      setEditableSlots(slots);
    }
  }, [worker]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCopyToken = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }, []);

  const handleStatusChange = async () => {
    if (!statusModal || !worker) return;
    try {
      await updateStatus({ variables: { id: worker.id, status: statusModal.newStatus } });
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
    if (!worker) return;
    try {
      await updateWorkerAreas({
        variables: {
          workerId: worker.id,
          areaIds: Array.from(selectedAreaIds),
        },
      });
      setSaveAreasSuccess(true);
      setTimeout(() => setSaveAreasSuccess(false), 3000);
    } catch {
      /* Apollo error handling */
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSaveCategories = async () => {
    if (!worker) return;
    setSaveCategoriesSuccess(false);
    setSaveCategoriesError('');
    try {
      await updateWorkerCategories({
        variables: {
          workerId: worker.id,
          categoryIds: Array.from(selectedCategoryIds),
        },
      });
      setSaveCategoriesSuccess(true);
      setTimeout(() => setSaveCategoriesSuccess(false), 3000);
    } catch {
      setSaveCategoriesError(t('workerDetail.categories.saveError'));
      setTimeout(() => setSaveCategoriesError(''), 4000);
    }
  };

  const handleUpdateMaxDailyBookings = async () => {
    if (!worker) return;
    const limit = maxDailyBookings ? parseInt(maxDailyBookings, 10) : null;
    try {
      await updateWorkerMaxDailyBookings({
        variables: { workerId: worker.id, limit },
        refetchQueries: [{ query: MY_WORKERS }],
      });
    } catch (err) {
      console.error('Failed to update max daily bookings:', err);
    }
  };

  const handleScheduleSlotChange = useCallback(
    (dayOfWeek: number, field: keyof EditableScheduleSlot, value: string | boolean) => {
      setEditableSlots((prev) =>
        prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const handleSaveSchedule = async () => {
    if (!worker) return;
    setSchedFeedback(null);
    setSchedError('');
    try {
      await updateWorkerAvailability({
        variables: {
          workerId: worker.id,
          slots: editableSlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
          })),
        },
      });
      setSchedFeedback('success');
      setScheduleEditMode(false);
      refetch();
      setTimeout(() => setSchedFeedback(null), 3000);
    } catch {
      setSchedError('Eroare la salvarea programului. Încearcă din nou.');
      setSchedFeedback('error');
    }
  };

  const handleCancelScheduleEdit = () => {
    if (worker) {
      const slots = WEEK_DAY_ORDER_COMPANY.map((dow) => {
        const existing = (worker.availability ?? []).find((s: AvailabilitySlot) => s.dayOfWeek === dow);
        return {
          dayOfWeek: dow,
          startTime: existing?.startTime ?? '08:00',
          endTime: existing?.endTime ?? '18:00',
          isAvailable: existing?.isAvailable ?? false,
        };
      });
      setEditableSlots(slots);
    }
    setSchedError('');
    setSchedFeedback(null);
    setScheduleEditMode(false);
  };

  const handleDocumentUpload = (file: File) => {
    setDocTypeModal(file);
  };

  const handleDocTypeSelect = async (type: string) => {
    if (!docTypeModal || !worker) return;
    setUploadingDoc(type);
    try {
      await uploadDocument({ variables: { workerId: worker.id, documentType: type, file: docTypeModal } });
      refetch();
      setDocTypeModal(null);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!worker) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar({ variables: { workerId: worker.id, file } });
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
          <ArrowLeft className="h-4 w-4" /> {t('workerDetail.backToTeam')}
        </button>
        <LoadingSpinner text={t('workerDetail.loading')} />
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────────────────────────

  if (!worker) {
    return (
      <div className="max-w-full overflow-hidden">
        <button
          onClick={() => navigate('/firma/echipa')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> {t('workerDetail.backToTeam')}
        </button>
        <Card>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('workerDetail.notFound')}</h3>
            <p className="text-gray-500 mb-4">{t('workerDetail.notFoundDesc')}</p>
            <Button onClick={() => navigate('/firma/echipa')}>{t('workerDetail.backToTeam')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Derived from worker ─────────────────────────────────────────────

  const canChangeStatus = worker.status === 'ACTIVE' || worker.status === 'INACTIVE' || worker.status === 'SUSPENDED';
  const requiredDocs = ['cazier_judiciar', 'contract_munca'];
  const uploadedDocTypes = new Set(worker.documents?.map((d) => d.documentType) ?? []);
  const missingDocs = requiredDocs.filter((docType) => !uploadedDocTypes.has(docType));

  const stats = perf
    ? [
        { bg: 'bg-blue-50', icon: Briefcase, iconCls: 'text-blue-600', label: t('workerDetail.stats.totalJobs'), value: perf.totalCompletedJobs, valCls: 'text-blue-900' },
        { bg: 'bg-emerald-50', icon: Calendar, iconCls: 'text-emerald-600', label: t('workerDetail.stats.thisMonth'), value: perf.thisMonthCompleted, valCls: 'text-emerald-900' },
        { bg: 'bg-amber-50', icon: DollarSign, iconCls: 'text-amber-600', label: t('workerDetail.stats.totalEarnings'), value: fmtCurrency(perf.totalEarnings), valCls: 'text-amber-900' },
        { bg: 'bg-purple-50', icon: TrendingUp, iconCls: 'text-purple-600', label: t('workerDetail.stats.monthEarnings'), value: fmtCurrency(perf.thisMonthEarnings), valCls: 'text-purple-900' },
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
        <ArrowLeft className="h-4 w-4" /> {t('workerDetail.backToTeam')}
      </button>

      {/* 2. Header Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <Avatar src={worker.user?.avatarUrl} name={worker.fullName} size="lg" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words min-w-0">{worker.fullName}</h1>
              <StatusBadge
                currentStatus={worker.status}
                onChange={(newStatus) => setStatusModal({ newStatus })}
                disabled={!canChangeStatus}
              />
              {worker.isCompanyAdmin && <Badge variant="info">Admin</Badge>}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              <Star className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-gray-700">
                {worker.ratingAvg ? Number(worker.ratingAvg).toFixed(1) : '--'}
              </span>
              <span className="text-sm text-gray-400 ml-1">
                {t('workerDetail.jobsCompleted', { count: worker.totalJobsCompleted })}
              </span>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5 mb-3 min-w-0">
              {worker.email && (
                <a
                  href={`mailto:${worker.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors min-w-0"
                >
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{worker.email}</span>
                </a>
              )}
              {worker.phone && (
                <a
                  href={`tel:${worker.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  {worker.phone}
                </a>
              )}
            </div>

            {/* Bio */}
            {worker.bio && (
              <p className="text-sm text-gray-600 mb-3">{worker.bio}</p>
            )}

            {/* Invite token (for INVITED status) */}
            {worker.status === 'INVITED' && worker.inviteToken && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">{t('workerDetail.inviteCode')}</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-gray-700 truncate select-all">
                    {worker.inviteToken}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToken(worker.inviteToken!)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                    title={t('workerDetail.copyCode')}
                  >
                    {copiedToken
                      ? <Check className="h-3.5 w-3.5 text-secondary" />
                      : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                </div>
                {copiedToken && <p className="text-xs text-secondary mt-1">{t('workerDetail.copied')}</p>}
              </div>
            )}

            {/* Join date */}
            <p className="text-xs text-gray-400">
              {t('workerDetail.memberSince', { date: formatDate(worker.createdAt, locale) })}
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
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-gray-900">{t('workerDetail.availability.title')}</h2>
          </div>
          {!scheduleEditMode && (
            <Button variant="outline" size="sm" onClick={() => setScheduleEditMode(true)}>
              <Pencil className="h-4 w-4" />
              {t('workerDetail.availability.editSchedule')}
            </Button>
          )}
        </div>

        {scheduleEditMode ? (
          /* Edit mode */
          <div>
            <div className="space-y-2 mb-4">
              {editableSlots.map((slot) => {
                const dayName = dayNames[slot.dayOfWeek] ?? `Zi ${slot.dayOfWeek}`;
                return (
                  <div
                    key={slot.dayOfWeek}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      slot.isAvailable ? 'bg-emerald-50/50' : 'bg-gray-50',
                    )}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleScheduleSlotChange(slot.dayOfWeek, 'isAvailable', !slot.isAvailable)}
                      className={cn(
                        'relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer',
                        slot.isAvailable ? 'bg-emerald-500' : 'bg-gray-300',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          slot.isAvailable && 'translate-x-5',
                        )}
                      />
                    </button>
                    {/* Day name */}
                    <span className={cn(
                      'text-sm font-medium w-24 shrink-0',
                      slot.isAvailable ? 'text-gray-900' : 'text-gray-400',
                    )}>
                      {dayName}
                    </span>
                    {/* Time inputs */}
                    {slot.isAvailable ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleScheduleSlotChange(slot.dayOfWeek, 'startTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 w-[110px] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                        <span className="text-gray-400 text-xs">–</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleScheduleSlotChange(slot.dayOfWeek, 'endTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 w-[110px] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Indisponibil</span>
                    )}
                  </div>
                );
              })}
            </div>
            {schedError && (
              <p className="text-sm text-red-600 mb-3">{schedError}</p>
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveSchedule} loading={savingSchedule}>
                <Check className="h-4 w-4" />
                {t('workerDetail.availability.saveSchedule')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelScheduleEdit} disabled={savingSchedule}>
                <X className="h-4 w-4" />
                {t('workerDetail.availability.cancelEdit')}
              </Button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div>
            {editableSlots.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t('workerDetail.availability.empty')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {WEEK_DAY_ORDER_COMPANY.map((dow) => {
                  const slot = editableSlots.find((s) => s.dayOfWeek === dow);
                  const isAvail = slot?.isAvailable ?? false;
                  const name = dayNames[dow] ?? `Zi ${dow}`;
                  return (
                    <div
                      key={dow}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl',
                        isAvail ? 'bg-emerald-50/50' : 'bg-gray-50',
                      )}
                    >
                      <span className={cn(
                        'text-sm font-medium w-24 shrink-0',
                        isAvail ? 'text-gray-900' : 'text-gray-400',
                      )}>
                        {name}
                      </span>
                      {isAvail && slot ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-gray-100 text-gray-400 rounded-full px-3 py-1 text-xs">
                          Indisponibil
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {schedFeedback === 'success' && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-emerald-600">
                <Check className="h-4 w-4" />
                {t('workerDetail.availability.saveSuccess')}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 4b. Worker Day-Off Overrides Card */}
      <WorkerDayOffManager
        overrides={workerOverrides}
        onAdd={async (date, isFullDay, start, end) => {
          if (!worker) return;
          await setWorkerDateOverrideByAdmin({
            variables: {
              workerId: worker.id,
              date,
              isAvailable: false,
              startTime: isFullDay ? '00:00' : start,
              endTime: isFullDay ? '23:59' : end,
            },
          });
        }}
        onCancel={async (date) => {
          if (!worker) return;
          await setWorkerDateOverrideByAdmin({
            variables: {
              workerId: worker.id,
              date,
              isAvailable: true,
              startTime: '08:00',
              endTime: '20:00',
            },
          });
        }}
        saving={savingAdminOverride}
      />

      {/* 5. Service Areas Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">{t('workerDetail.areas.title')}</h2>
        </div>

        {loadingCompanyAreas || loadingWorkerAreas ? (
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
            <p className="text-sm text-gray-500">{t('workerDetail.areas.noCompanyAreas')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('workerDetail.areas.noCompanyAreasHint')}</p>
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
              {t('workerDetail.areas.selected', { selected: selectedAreaIds.size, total: companyAreas.length })}
            </p>

            {/* Success message */}
            {saveAreasSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg mt-3">
                <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">
                  {t('workerDetail.areas.saveSuccess')}
                </p>
              </div>
            )}

            {/* Save button */}
            <div className="mt-4">
              <Button onClick={handleSaveAreas} loading={savingAreas}>
                {t('workerDetail.areas.saveBtn')}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 5b. Service Categories Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">{t('workerDetail.categories.title')}</h2>
        </div>

        {categoriesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : allCategories.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('workerDetail.categories.empty')}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {t('workerDetail.categories.subtitle')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allCategories.map((cat: ServiceCategory) => {
                const isSelected = selectedCategoryIds.has(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border',
                      isSelected
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(cat.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600/30"
                    />
                    {cat.icon && <span className="text-lg">{cat.icon}</span>}
                    <span className={cn(
                      'text-sm',
                      isSelected ? 'font-medium text-gray-900' : 'text-gray-700',
                    )}>
                      {cat.nameRo}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-3">
              {selectedCategoryIds.size === 0
                ? t('workerDetail.categories.noneSelected')
                : selectedCategoryIds.size === 1
                  ? t('workerDetail.categories.selected', { count: selectedCategoryIds.size })
                  : t('workerDetail.categories.selectedPlural', { count: selectedCategoryIds.size })}
            </p>

            {saveCategoriesSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg mt-3">
                <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">
                  {t('workerDetail.categories.saveSuccess')}
                </p>
              </div>
            )}

            {saveCategoriesError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {saveCategoriesError}
              </div>
            )}

            <div className="mt-4">
              <Button onClick={handleSaveCategories} loading={savingCategories}>
                {t('workerDetail.categories.saveBtn')}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 5c. Max Daily Bookings Card */}
      <Card className="mb-6 p-5">
        <h3 className="font-semibold text-gray-900 mb-1">{t('workerDetail.maxDailyBookings.title')}</h3>
        <p className="text-sm text-gray-500 mb-3">{t('workerDetail.maxDailyBookings.subtitle')}</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="20"
            value={maxDailyBookings}
            onChange={(e) => setMaxDailyBookings(e.target.value)}
            placeholder={t('workerDetail.maxDailyBookings.placeholder')}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
          <Button
            size="sm"
            onClick={() => handleUpdateMaxDailyBookings()}
          >
            {t('workerDetail.maxDailyBookings.saveBtn')}
          </Button>
        </div>
      </Card>

      {/* 6. Documents Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">{t('workerDetail.documents.title')}</h2>
        </div>

        {/* Existing documents */}
        {worker.documents && worker.documents.length > 0 ? (
          <div className="space-y-2 mb-4">
            {worker.documents.map((doc) => (
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
          <p className="text-sm text-gray-400 mb-4">{t('workerDetail.documents.noDocuments')}</p>
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
              {uploadingDoc ? t('workerDetail.documents.uploading') : t('workerDetail.documents.uploadMissing', { count: missingDocs.length })}
            </button>
          </>
        )}

        {/* Avatar upload section */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">{t('workerDetail.documents.profilePhoto')}</p>
          {worker.user?.avatarUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={worker.user.avatarUrl}
                alt={worker.fullName}
                className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200"
              />
              <div>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('workerDetail.documents.photoUploaded')}
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
                  {t('workerDetail.documents.changePhoto')}
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
                {uploadingAvatar ? t('workerDetail.documents.uploading') : t('workerDetail.documents.uploadPhoto')}
              </button>
            </>
          )}
        </div>
      </Card>

      {/* 7. Personality Assessment Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">{t('workerDetail.personality.title')}</h2>
        </div>
        {worker.personalityAssessment ? (
          <div className="space-y-4">
            {/* Domain summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">{t('workerDetail.personality.integrity')}</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {worker.personalityAssessment.integrityAvg.toFixed(1)}
                  <span className="text-xs text-gray-400 ml-0.5 font-normal">/ 20</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-gray-600">{t('workerDetail.personality.workQuality')}</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {worker.personalityAssessment.workQualityAvg.toFixed(1)}
                  <span className="text-xs text-gray-400 ml-0.5 font-normal">/ 20</span>
                </p>
              </div>
            </div>

            {/* Facet scores — compact grid */}
            {worker.personalityAssessment.facetScores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('workerDetail.personality.detailedScores')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {worker.personalityAssessment.facetScores.map((facet) => (
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
            {worker.personalityAssessment.insights && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">{t('workerDetail.personality.aiAnalysis')}</span>
                  <Badge
                    variant={
                      worker.personalityAssessment.insights.recommendedAction === 'approve' ? 'success' :
                      worker.personalityAssessment.insights.recommendedAction === 'reject' ? 'danger' : 'warning'
                    }
                  >
                    {worker.personalityAssessment.insights.recommendedAction === 'approve'
                      ? t('workerDetail.personality.recommended')
                      : worker.personalityAssessment.insights.recommendedAction === 'reject'
                        ? t('workerDetail.personality.notRecommended')
                        : t('workerDetail.personality.carefulReview')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-3">{worker.personalityAssessment.insights.summary}</p>

                {worker.personalityAssessment.insights.strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-emerald-800 mb-1">{t('workerDetail.personality.strengths')}</p>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {worker.personalityAssessment.insights.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {worker.personalityAssessment.insights.concerns.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-amber-800 mb-1">{t('workerDetail.personality.concerns')}</p>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {worker.personalityAssessment.insights.concerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {worker.personalityAssessment.insights.teamFitAnalysis && (
                  <div className="p-2.5 rounded-lg bg-white/60 border border-purple-100 mb-2">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">{t('workerDetail.personality.teamFit')}</p>
                    <p className="text-sm text-gray-600">{worker.personalityAssessment.insights.teamFitAnalysis}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {worker.personalityAssessment.insights.aiModel} &bull; {new Date(worker.personalityAssessment.insights.generatedAt).toLocaleDateString(locale)}
                </p>
              </div>
            )}

            {/* Concerns warning (no insights) */}
            {!worker.personalityAssessment.insights && worker.personalityAssessment.hasConcerns && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">{t('workerDetail.personality.lowScores')}</p>
                  <p className="text-xs text-amber-700">{worker.personalityAssessment.flaggedFacets.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Completion date */}
            <p className="text-xs text-gray-400">
              {t('workerDetail.personality.completed', { date: new Date(worker.personalityAssessment.completedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) })}
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('workerDetail.personality.empty')}
            </p>
          </div>
        )}
      </Card>

      {/* 8. Status Change Confirmation Modal */}
      <Modal
        open={statusModal !== null}
        onClose={() => setStatusModal(null)}
        title={t('workerDetail.statusModal.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('workerDetail.statusModal.confirm', {
              name: worker.fullName,
              status: statusModal ? statusLabel[statusModal.newStatus] : '',
            })}
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStatusModal(null)} className="flex-1">
              {t('workerDetail.statusModal.cancel')}
            </Button>
            <Button onClick={handleStatusChange} loading={updatingStatus} className="flex-1">
              {t('workerDetail.statusModal.confirmBtn')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Type Selection Modal */}
      <Modal
        open={docTypeModal !== null}
        onClose={() => setDocTypeModal(null)}
        title={t('workerDetail.docTypeModal.title')}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('workerDetail.docTypeModal.subtitle')}
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
            {t('workerDetail.docTypeModal.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── WorkerDayOffManager ─────────────────────────────────────────────────────

interface WorkerDayOffManagerProps {
  overrides: WorkerDateOverride[];
  onAdd: (date: string, isFullDay: boolean, start: string, end: string) => Promise<void>;
  onCancel: (date: string) => Promise<void>;
  saving: boolean;
}

function WorkerDayOffManager({ overrides, onAdd, onCancel, saving }: WorkerDayOffManagerProps) {
  const { i18n } = useTranslation('company');
  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('20:00');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const minDate = fmtDateISO(new Date());
  const sorted = [...overrides].sort((a, b) => a.date.localeCompare(b.date));

  const handleAdd = async () => {
    if (!formDate) return;
    setToast(null);
    try {
      await onAdd(formDate, isFullDay, formStart, formEnd);
      setShowForm(false);
      setFormDate('');
      setIsFullDay(true);
      setFormStart('08:00');
      setFormEnd('20:00');
      setToast({ type: 'success', message: 'Zi liberă adăugată.' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Eroare la adăugare. Încearcă din nou.' });
    }
  };

  const handleCancel = async (date: string) => {
    setToast(null);
    try {
      await onCancel(date);
      setToast({ type: 'success', message: 'Zi liberă anulată.' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Eroare la anulare.' });
    }
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Zile libere lucrător</h2>
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Adaugă
          </Button>
        )}
      </div>

      {toast && (
        <div className={cn(
          'text-sm font-medium mb-4 px-3 py-2 rounded-lg',
          toast.type === 'success' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50',
        )}>
          {toast.message}
        </div>
      )}

      {showForm && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data</label>
              <input
                type="date"
                value={formDate}
                min={minDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFullDay(!isFullDay)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer',
                  isFullDay ? 'bg-blue-600' : 'bg-gray-300',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                  isFullDay && 'translate-x-5',
                )} />
              </button>
              <span className="text-sm text-gray-700">Ziua întreagă</span>
            </div>
            {!isFullDay && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">De la</label>
                  <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Până la</label>
                  <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full bg-white outline-none" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} loading={saving} disabled={!formDate}>
                <Check className="h-4 w-4" />
                Salvează
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormDate(''); }}>
                <X className="h-4 w-4" />
                Anulează
              </Button>
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nu există zile libere programate în următoarele 30 de zile.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((override) => {
            const dateStr = override.date?.split('T')[0] ?? override.date;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const isFullDayOff = override.startTime === '00:00' && (override.endTime === '23:59' || override.endTime === '23:59:00');
            return (
              <div key={override.id} className="flex items-center justify-between px-3 py-2.5 bg-red-50/50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-red-600">{dateObj.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {dateObj.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isFullDayOff ? 'Zi liberă întreagă' : `Liber: ${override.startTime} – ${override.endTime}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(dateStr)}
                  disabled={saving}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Anulează'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
