import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Building2, Save, FileText, MapPin, Clock, ChevronDown, ChevronRight, CheckSquare, Square, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Loader2, Layers, Globe } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import DocumentCard from '@/components/ui/DocumentCard';
import AvatarUpload from '@/components/ui/AvatarUpload';
import TimeInput24h from '@/components/ui/TimeInput24h';
import { cn } from '@go2fix/shared';
import {
  MY_COMPANY,
  UPDATE_COMPANY_PROFILE,
  UPDATE_PROFILE,
  MY_COMPANY_WORK_SCHEDULE,
  ACTIVE_CITIES,
  MY_COMPANY_SERVICE_AREAS,
  UPDATE_COMPANY_SERVICE_AREAS,
  MY_CONNECT_STATUS,
  INITIATE_CONNECT_ONBOARDING,
  REFRESH_CONNECT_ONBOARDING,
  UPLOAD_COMPANY_DOCUMENT,
  DELETE_COMPANY_DOCUMENT,
  UPLOAD_COMPANY_LOGO,
  SERVICE_CATEGORIES,
  MY_COMPANY_CATEGORY_REQUESTS,
  REQUEST_CATEGORY_ACCESS,
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const companyStatusVariant: Record<string, StatusVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
};

interface CompanyDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// ─── Service Area Types ──────────────────────────────────────────────────────

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

interface City {
  id: string;
  name: string;
  county: string;
  isActive: boolean;
  areas: CityArea[];
}

// ─── Work Schedule ───────────────────────────────────────────────────────────

interface WorkScheduleDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkDay: boolean;
}

interface ServiceCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
}

interface CategoryRequest {
  id: string;
  requestType: 'ACTIVATE' | 'DEACTIVATE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    nameRo: string;
    nameEn: string;
    icon?: string;
    slug: string;
  };
}

/** Display order: Mon(1)..Sun(0) */
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function buildDefaultSchedule(): WorkScheduleDay[] {
  return DAY_DISPLAY_ORDER.map((dow) => ({
    dayOfWeek: dow,
    startTime: '08:00',
    endTime: '17:00',
    isWorkDay: dow >= 1 && dow <= 5, // Mon-Fri on, Sat-Sun off
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t, i18n } = useTranslation('company');

  // ─── Translated constants (inside component for i18n) ─────────────────────
  const companyStatusLabel: Record<string, string> = {
    APPROVED: t('settings.companyStatus.approved'),
    PENDING_REVIEW: t('settings.companyStatus.pending'),
    REJECTED: t('settings.companyStatus.rejected'),
    SUSPENDED: t('settings.companyStatus.suspended'),
  };

  const REQUIRED_COMPANY_DOCS: { type: string; label: string }[] = [
    { type: 'certificat_constatator', label: t('settings.documents.docs.certificat_constatator') },
    { type: 'asigurare_raspundere_civila', label: t('settings.documents.docs.asigurare_raspundere_civila') },
    { type: 'cui_document', label: t('settings.documents.docs.cui_document') },
  ];

  const DAY_NAMES: Record<number, string> = {
    0: t('settings.schedule.days.0'),
    1: t('settings.schedule.days.1'),
    2: t('settings.schedule.days.2'),
    3: t('settings.schedule.days.3'),
    4: t('settings.schedule.days.4'),
    5: t('settings.schedule.days.5'),
    6: t('settings.schedule.days.6'),
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading } = useQuery(MY_COMPANY);
  const [updateCompany, { loading: saving }] = useMutation(UPDATE_COMPANY_PROFILE);
  const company = data?.myCompany;

  // Stripe Connect
  const { data: connectData, loading: connectLoading, refetch: refetchConnect } = useQuery(MY_CONNECT_STATUS);
  const [initiateOnboarding, { loading: initiatingOnboarding }] = useMutation(INITIATE_CONNECT_ONBOARDING);
  const [refreshOnboarding, { loading: refreshingOnboarding }] = useMutation(REFRESH_CONNECT_ONBOARDING);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');

  // Language preference
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language === 'en' ? 'en' : 'ro');
  const [langSuccess, setLangSuccess] = useState('');
  const [savingLang, setSavingLang] = useState(false);

  const connectStatus = connectData?.myConnectStatus;

  // Document upload
  const [uploadLogo, { loading: uploadingLogo }] = useMutation(UPLOAD_COMPANY_LOGO, {
    refetchQueries: [{ query: MY_COMPANY }],
  });
  const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_COMPANY_DOCUMENT, {
    refetchQueries: [{ query: MY_COMPANY }],
  });
  const [deleteDocument, { loading: deleting }] = useMutation(DELETE_COMPANY_DOCUMENT, {
    refetchQueries: [{ query: MY_COMPANY }],
  });
  const [uploadingType, setUploadingType] = useState('');

  const handleUploadLogo = async (file: File) => {
    await uploadLogo({
      variables: { file },
    });
  };

  const handleUploadDocument = async (file: File, documentType: string) => {
    if (!company) return;
    setUploadingType(documentType);
    try {
      await uploadDocument({
        variables: {
          companyId: company.id,
          documentType,
          file,
        },
      });
    } catch {
      // Error handled by Apollo
    } finally {
      setUploadingType('');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument({ variables: { id: docId } });
    } catch {
      // Error handled by Apollo
    }
  };

  // Handle Stripe redirect query params
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'complete') {
      setConnectSuccess(t('settings.stripe.successMsg'));
      refetchConnect();
      setSearchParams({}, { replace: true });
      setTimeout(() => setConnectSuccess(''), 6000);
    } else if (stripeParam === 'refresh') {
      setConnectError(t('settings.stripe.sessionExpired'));
      setSearchParams({}, { replace: true });
      setTimeout(() => setConnectError(''), 8000);
    }
  }, [searchParams, setSearchParams, refetchConnect]);

  const handleInitiateOnboarding = async () => {
    setConnectError('');
    try {
      const { data: result } = await initiateOnboarding();
      const url = result?.initiateConnectOnboarding?.url;
      if (url) {
        window.location.href = url;
      }
    } catch {
      setConnectError(t('settings.stripe.errorInitiate'));
    }
  };

  const handleRefreshOnboarding = async () => {
    setConnectError('');
    try {
      const { data: result } = await refreshOnboarding();
      const url = result?.refreshConnectOnboarding?.url;
      if (url) {
        window.location.href = url;
      }
    } catch {
      setConnectError(t('settings.stripe.errorRefresh'));
    }
  };

  const { data: scheduleData } = useQuery(MY_COMPANY_WORK_SCHEDULE);

  // Service areas queries & mutation
  const { data: citiesData, loading: citiesLoading } = useQuery(ACTIVE_CITIES, {
    fetchPolicy: 'cache-first',
  });
  const { data: companyAreasData, loading: areasLoading } = useQuery(MY_COMPANY_SERVICE_AREAS);
  const [updateServiceAreas, { loading: savingAreas }] = useMutation(UPDATE_COMPANY_SERVICE_AREAS, {
    refetchQueries: [{ query: MY_COMPANY_SERVICE_AREAS }],
  });

  // Service categories
  const { data: categoriesData, loading: categoriesLoading, refetch: refetchCategories } = useQuery(SERVICE_CATEGORIES);
  const { data: requestsData, refetch: refetchRequests } = useQuery(MY_COMPANY_CATEGORY_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [requestCategoryAccess, { loading: requestingCategory }] = useMutation(REQUEST_CATEGORY_ACCESS);
  const allCategories: ServiceCategory[] = ((categoriesData?.serviceCategories ?? []) as ServiceCategory[]).filter(
    (c) => c.isActive,
  );
  const categoryRequests: CategoryRequest[] = (requestsData?.myCompanyCategoryRequests ?? []) as CategoryRequest[];

  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [schedule, setSchedule] = useState<WorkScheduleDay[]>(buildDefaultSchedule);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Service areas state
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [areasSuccessMessage, setAreasSuccessMessage] = useState('');
  const [areasErrorMessage, setAreasErrorMessage] = useState('');

  // Service categories state
  const [categoriesSuccessMessage, setCategoriesSuccessMessage] = useState('');
  const [categoriesErrorMessage, setCategoriesErrorMessage] = useState('');

  useEffect(() => {
    if (company) {
      setDescription(company.description || '');
      setContactEmail(company.contactEmail || '');
      setContactPhone(company.contactPhone || '');
    }
  }, [company]);

  useEffect(() => {
    if (scheduleData?.myCompanyWorkSchedule) {
      const fetched = scheduleData.myCompanyWorkSchedule as Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isWorkDay: boolean;
      }>;
      setSchedule((prev) =>
        prev.map((day) => {
          const match = fetched.find((f) => f.dayOfWeek === day.dayOfWeek);
          return match
            ? { ...day, startTime: match.startTime, endTime: match.endTime, isWorkDay: match.isWorkDay }
            : day;
        }),
      );
    }
  }, [scheduleData]);

  // Initialize selected areas from company's current service areas
  useEffect(() => {
    if (companyAreasData?.myCompanyServiceAreas) {
      const ids = new Set(
        (companyAreasData.myCompanyServiceAreas as CityArea[]).map((a) => a.id),
      );
      setSelectedAreaIds(ids);
    }
  }, [companyAreasData]);

  const cities: City[] = useMemo(
    () => (citiesData?.activeCities as City[] | undefined) ?? [],
    [citiesData],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    try {
      await updateCompany({
        variables: {
          input: {
            description,
            contactPhone,
            contactEmail,
          },
        },
      });
      setSuccessMessage(t('settings.profile.saveSuccess'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      // Error handled by Apollo
    }
  };

  const updateScheduleDay = (dayOfWeek: number, patch: Partial<WorkScheduleDay>) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  };

  const handleSaveSchedule = async () => {
    setScheduleSuccessMessage('');
    setSavingSchedule(true);
    try {
      await updateCompany({
        variables: {
          input: {
            workSchedule: schedule.map(({ dayOfWeek, startTime, endTime, isWorkDay }) => ({
              dayOfWeek,
              startTime,
              endTime,
              isWorkDay,
            })),
          },
        },
      });
      setScheduleSuccessMessage(t('settings.schedule.saveSuccess'));
      setTimeout(() => setScheduleSuccessMessage(''), 3000);
    } catch {
      // Error handled by Apollo
    } finally {
      setSavingSchedule(false);
    }
  };

  // ─── Service Area Handlers ─────────────────────────────────────────────────

  const toggleCity = (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
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
  };

  const selectAllInCity = (city: City) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      for (const area of city.areas) {
        next.add(area.id);
      }
      return next;
    });
  };

  const deselectAllInCity = (city: City) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      for (const area of city.areas) {
        next.delete(area.id);
      }
      return next;
    });
  };

  const handleSaveAreas = async () => {
    setAreasSuccessMessage('');
    setAreasErrorMessage('');
    try {
      await updateServiceAreas({
        variables: {
          areaIds: Array.from(selectedAreaIds),
        },
      });
      setAreasSuccessMessage(t('settings.areas.saveSuccess'));
      setTimeout(() => setAreasSuccessMessage(''), 3000);
    } catch {
      setAreasErrorMessage(t('settings.areas.saveError'));
      setTimeout(() => setAreasErrorMessage(''), 4000);
    }
  };

  const getSelectedCountForCity = (city: City): number => {
    return city.areas.filter((a) => selectedAreaIds.has(a.id)).length;
  };

  const allSelectedInCity = (city: City): boolean => {
    return city.areas.length > 0 && city.areas.every((a) => selectedAreaIds.has(a.id));
  };

  // ─── Service Category Handlers ──────────────────────────────────────────

  const handleRequestCategory = async (categoryId: string, requestType: 'ACTIVATE' | 'DEACTIVATE') => {
    setCategoriesSuccessMessage('');
    setCategoriesErrorMessage('');
    try {
      await requestCategoryAccess({ variables: { categoryId, requestType } });
      await Promise.all([refetchCategories(), refetchRequests()]);
      setCategoriesSuccessMessage(
        requestType === 'ACTIVATE'
          ? 'Cererea de activare a fost trimisă cu succes.'
          : 'Cererea de dezactivare a fost trimisă cu succes.',
      );
      setTimeout(() => setCategoriesSuccessMessage(''), 4000);
    } catch {
      setCategoriesErrorMessage('A apărut o eroare. Vă rugăm să încercați din nou.');
      setTimeout(() => setCategoriesErrorMessage(''), 4000);
    }
  };

  // ─── Language Handler ──────────────────────────────────────────────────────

  const handleSaveLanguage = async () => {
    setSavingLang(true);
    setLangSuccess('');
    try {
      await updateProfile({ variables: { input: { preferredLanguage: selectedLanguage } } });
      await i18n.changeLanguage(selectedLanguage);
      setLangSuccess(t('settings.language.saveSuccess'));
      setTimeout(() => setLangSuccess(''), 3000);
    } catch {
      // Error handled by Apollo
    } finally {
      setSavingLang(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('settings.noCompany')}</h3>
            <p className="text-gray-500">{t('settings.noCompanyDesc')}</p>
          </div>
        </Card>
      </div>
    );
  }

  const documents: CompanyDocument[] = company.documents ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>

      {/* Logo Upload */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.logo.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.logo.subtitle')}
        </p>

        <div className="flex items-center gap-8">
          <AvatarUpload
            currentUrl={company.logoUrl}
            onUpload={handleUploadLogo}
            loading={uploadingLogo}
            size="xl"
          />
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              {t('settings.logo.uploadLabel')}
            </p>
            <p className="text-xs text-gray-400">
              {t('settings.logo.uploadHint')}
            </p>
          </div>
        </div>
      </Card>

      {/* Company Info (read-only) */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{company.companyName}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('settings.companyInfo.cuiLabel', { cui: company.cui })}</p>
          </div>
          <Badge variant={companyStatusVariant[company.status] || 'default'}>
            {companyStatusLabel[company.status] || company.status}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">{t('settings.companyInfo.typeLabel')}</p>
            <p className="font-medium">{company.companyType || '--'}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('settings.companyInfo.representativeLabel')}</p>
            <p className="font-medium">{company.legalRepresentative || '--'}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('settings.companyInfo.addressLabel')}</p>
            <p className="font-medium">
              {[company.city, company.county].filter(Boolean).join(', ') || '--'}
            </p>
          </div>
        </div>
        {company.rejectionReason && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <p className="font-medium mb-1">{t('settings.companyInfo.rejectionReasonLabel')}</p>
            <p>{company.rejectionReason}</p>
          </div>
        )}
      </Card>

      {/* Stripe Connect Integration */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.stripe.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.stripe.subtitle')}
        </p>

        {connectLoading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">{t('settings.stripe.loading')}</span>
          </div>
        ) : connectStatus?.onboardingStatus === 'COMPLETE' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">{t('settings.stripe.connected')}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {connectStatus.accountId
                    ? t('settings.stripe.connectedId', { id: connectStatus.accountId })
                    : t('settings.stripe.connectedDesc')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-sm',
                connectStatus.chargesEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500',
              )}>
                {connectStatus.chargesEnabled ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {connectStatus.chargesEnabled ? t('settings.stripe.paymentsActive') : t('settings.stripe.paymentsInactive')}
              </div>
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-sm',
                connectStatus.payoutsEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500',
              )}>
                {connectStatus.payoutsEnabled ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {connectStatus.payoutsEnabled ? t('settings.stripe.payoutsActive') : t('settings.stripe.payoutsInactive')}
              </div>
            </div>
          </div>
        ) : connectStatus?.onboardingStatus === 'PENDING' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{t('settings.stripe.incomplete')}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {t('settings.stripe.incompleteDesc')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefreshOnboarding}
              loading={refreshingOnboarding}
            >
              <ExternalLink className="h-4 w-4" />
              {t('settings.stripe.finalize')}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleInitiateOnboarding}
            loading={initiatingOnboarding}
          >
            <ExternalLink className="h-4 w-4" />
            {t('settings.stripe.connect')}
          </Button>
        )}

        {connectSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {connectSuccess}
          </div>
        )}
        {connectError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {connectError}
          </div>
        )}
      </Card>

      {/* Editable profile settings */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.profile.title')}</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.profile.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={cn(
                'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900',
                'placeholder:text-gray-400 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600',
              )}
              placeholder={t('settings.profile.descriptionPlaceholder')}
            />
          </div>
          <Input label={t('settings.profile.emailLabel')} type="email" value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)} placeholder={t('settings.profile.emailPlaceholder')} />
          <Input label={t('settings.profile.phoneLabel')} value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)} placeholder={t('settings.profile.phonePlaceholder')} />
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            {t('settings.profile.saveBtn')}
          </Button>
        </form>
      </Card>

      {/* Work Schedule */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.schedule.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.schedule.subtitle')}
        </p>
        <div className="space-y-3">
          {schedule.map((day) => (
            <div
              key={day.dayOfWeek}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-colors',
                day.isWorkDay ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100',
              )}
            >
              <div className="flex items-center gap-3 sm:w-36 shrink-0">
                <input
                  type="checkbox"
                  checked={day.isWorkDay}
                  onChange={(e) => updateScheduleDay(day.dayOfWeek, { isWorkDay: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600/30"
                />
                <span className={cn(
                  'text-sm font-medium',
                  day.isWorkDay ? 'text-gray-900' : 'text-gray-400',
                )}>
                  {DAY_NAMES[day.dayOfWeek]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TimeInput24h
                  value={day.startTime}
                  onChange={(v) => updateScheduleDay(day.dayOfWeek, { startTime: v })}
                  disabled={!day.isWorkDay}
                />
                <span className="text-sm text-gray-400">-</span>
                <TimeInput24h
                  value={day.endTime}
                  onChange={(v) => updateScheduleDay(day.dayOfWeek, { endTime: v })}
                  disabled={!day.isWorkDay}
                />
              </div>
            </div>
          ))}
        </div>
        {scheduleSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {scheduleSuccessMessage}
          </div>
        )}
        <div className="mt-5">
          <Button onClick={handleSaveSchedule} loading={savingSchedule}>
            <Save className="h-4 w-4" />
            {t('settings.schedule.saveBtn')}
          </Button>
        </div>
      </Card>

      {/* Documents */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.documents.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.documents.subtitle')}
        </p>

        <div className="space-y-4">
          {REQUIRED_COMPANY_DOCS.map((reqDoc) => {
            const existingDoc = documents.find((d) => d.documentType === reqDoc.type);
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
                    onDelete={handleDeleteDocument}
                    deleteLoading={deleting}
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-3">{reqDoc.label}</p>
                    <FileUpload
                      onFileSelect={(file) => handleUploadDocument(file, reqDoc.type)}
                      loading={uploading && uploadingType === reqDoc.type}
                      disabled={uploading}
                      label={t('settings.documents.uploadLabel', { docLabel: reqDoc.label })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show any extra docs not in required list */}
        {documents.filter((d) => !REQUIRED_COMPANY_DOCS.some((r) => r.type === d.documentType)).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('settings.documents.otherDocs')}</h3>
            <div className="space-y-3">
              {documents
                .filter((d) => !REQUIRED_COMPANY_DOCS.some((r) => r.type === d.documentType))
                .map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    id={doc.id}
                    documentType={doc.documentType}
                    documentTypeLabel={doc.documentType}
                    fileName={doc.fileName}
                    fileUrl={doc.fileUrl}
                    status={doc.status}
                    uploadedAt={doc.uploadedAt}
                    rejectionReason={doc.rejectionReason}
                  />
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Service Categories */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.categories.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Gestionați categoriile de servicii oferite de compania dvs. prin cereri de activare sau dezactivare.
        </p>

        {categoriesLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Categorii Active */}
            {(() => {
              const activeCategories = (company?.serviceCategories ?? []) as ServiceCategory[];
              return activeCategories.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    Categorii Active
                  </h3>
                  <div className="space-y-2">
                    {activeCategories.map((cat) => {
                      const hasPendingDeactivate = categoryRequests.some(
                        (r) => r.category.id === cat.id && r.requestType === 'DEACTIVATE' && r.status === 'PENDING',
                      );
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50"
                        >
                          <div className="flex items-center gap-2">
                            {cat.icon && <span className="text-lg">{cat.icon}</span>}
                            <span className="text-sm font-medium text-emerald-900">
                              {i18n.language === 'en' ? cat.nameEn : cat.nameRo}
                            </span>
                          </div>
                          {!hasPendingDeactivate && (
                            <button
                              type="button"
                              onClick={() => void handleRequestCategory(cat.id, 'DEACTIVATE')}
                              disabled={requestingCategory}
                              className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            >
                              Solicită dezactivare
                            </button>
                          )}
                          {hasPendingDeactivate && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                              Dezactivare în așteptare
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-sm text-gray-500">Nu aveți categorii active momentan.</p>
                </div>
              );
            })()}

            {/* Categorii Disponibile */}
            {(() => {
              const activeIds = new Set(
                ((company?.serviceCategories ?? []) as ServiceCategory[]).map((c) => c.id),
              );
              const available = allCategories.filter((c) => !activeIds.has(c.id));
              return available.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    Categorii Disponibile
                  </h3>
                  <div className="space-y-2">
                    {available.map((cat) => {
                      const hasPendingActivate = categoryRequests.some(
                        (r) => r.category.id === cat.id && r.requestType === 'ACTIVATE' && r.status === 'PENDING',
                      );
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {cat.icon && <span className="text-lg">{cat.icon}</span>}
                            <span className="text-sm text-gray-700">
                              {i18n.language === 'en' ? cat.nameEn : cat.nameRo}
                            </span>
                          </div>
                          {!hasPendingActivate && (
                            <button
                              type="button"
                              onClick={() => void handleRequestCategory(cat.id, 'ACTIVATE')}
                              disabled={requestingCategory}
                              className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              Solicită acces
                            </button>
                          )}
                          {hasPendingActivate && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                              Cerere în așteptare
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Cereri Trimise */}
            {categoryRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  Cereri Trimise
                </h3>
                <div className="space-y-2">
                  {categoryRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {req.category.icon && <span className="text-base shrink-0">{req.category.icon}</span>}
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate block">
                            {i18n.language === 'en' ? req.category.nameEn : req.category.nameRo}
                          </span>
                          <span className="text-xs text-gray-400">
                            {req.requestType === 'ACTIVATE' ? 'Activare' : 'Dezactivare'} &middot;{' '}
                            {new Date(req.createdAt).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            În așteptare
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Aprobat
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Respins
                            </span>
                            {req.reviewNote && (
                              <p className="text-xs text-gray-500 mt-1 max-w-[200px] text-right">{req.reviewNote}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Feedback messages */}
        {categoriesSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {categoriesSuccessMessage}
          </div>
        )}
        {categoriesErrorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {categoriesErrorMessage}
          </div>
        )}
      </Card>

      {/* Service Areas */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.areas.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.areas.subtitle')}
        </p>

        {citiesLoading || areasLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-14 bg-gray-100 rounded-xl" />
            <div className="h-14 bg-gray-100 rounded-xl" />
            <div className="h-14 bg-gray-100 rounded-xl" />
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t('settings.areas.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cities.map((city) => {
              const isExpanded = expandedCities.has(city.id);
              const selectedCount = getSelectedCountForCity(city);
              const totalCount = city.areas.length;
              const allSelected = allSelectedInCity(city);

              return (
                <div key={city.id} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* City header */}
                  <button
                    type="button"
                    onClick={() => toggleCity(city.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                      'hover:bg-gray-50',
                      isExpanded && 'bg-gray-50 border-b border-gray-200',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900">{city.name}</span>
                      <span className="text-xs text-gray-400">{city.county}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {selectedCount} / {totalCount}
                        </span>
                      )}
                      {selectedCount === 0 && totalCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {totalCount} {totalCount === 1 ? t('settings.areas.zoneNoun') : t('settings.areas.zonesNoun')}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded area list */}
                  {isExpanded && (
                    <div className="px-4 py-3">
                      {/* Select all / Deselect all actions */}
                      {totalCount > 0 && (
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                          <button
                            type="button"
                            onClick={() => selectAllInCity(city)}
                            disabled={allSelected}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                              allSelected
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-700',
                            )}
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                            {t('settings.areas.selectAll')}
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            type="button"
                            onClick={() => deselectAllInCity(city)}
                            disabled={selectedCount === 0}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                              selectedCount === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700',
                            )}
                          >
                            <Square className="h-3.5 w-3.5" />
                            {t('settings.areas.deselectAll')}
                          </button>
                        </div>
                      )}

                      {totalCount === 0 ? (
                        <p className="text-xs text-gray-400 py-2">{t('settings.areas.noZonesForCity')}</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {city.areas.map((area) => {
                            const isSelected = selectedAreaIds.has(area.id);
                            return (
                              <label
                                key={area.id}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                                  isSelected
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-gray-50 border border-transparent hover:bg-gray-100',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleArea(area.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600/30"
                                />
                                <span className={cn(
                                  'text-sm',
                                  isSelected ? 'font-medium text-blue-900' : 'text-gray-700',
                                )}>
                                  {area.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary of total selected */}
        {cities.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>
              {selectedAreaIds.size === 0
                ? t('settings.areas.noneSelected')
                : selectedAreaIds.size === 1
                  ? t('settings.areas.selected', { count: selectedAreaIds.size })
                  : t('settings.areas.selectedPlural', { count: selectedAreaIds.size })}
            </span>
          </div>
        )}

        {/* Feedback messages */}
        {areasSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {areasSuccessMessage}
          </div>
        )}
        {areasErrorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {areasErrorMessage}
          </div>
        )}

        {/* Save button */}
        {cities.length > 0 && (
          <div className="mt-5">
            <Button onClick={handleSaveAreas} loading={savingAreas}>
              <Save className="h-4 w-4" />
              {t('settings.areas.saveBtn')}
            </Button>
          </div>
        )}
      </Card>

      {/* Language Preference */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.language.title')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.language.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex gap-3">
            <label className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-pointer border transition-all text-sm',
              selectedLanguage === 'ro'
                ? 'border-blue-200 bg-blue-50 text-blue-900 font-medium'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
            )}>
              <input
                type="radio"
                name="language"
                value="ro"
                checked={selectedLanguage === 'ro'}
                onChange={() => setSelectedLanguage('ro')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-600/30"
              />
              {t('settings.language.ro')}
            </label>
            <label className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-pointer border transition-all text-sm',
              selectedLanguage === 'en'
                ? 'border-blue-200 bg-blue-50 text-blue-900 font-medium'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
            )}>
              <input
                type="radio"
                name="language"
                value="en"
                checked={selectedLanguage === 'en'}
                onChange={() => setSelectedLanguage('en')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-600/30"
              />
              {t('settings.language.en')}
            </label>
          </div>
          <Button onClick={handleSaveLanguage} loading={savingLang} variant="secondary">
            <Save className="h-4 w-4" />
            {t('settings.language.saveBtn')}
          </Button>
        </div>

        {langSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {langSuccess}
          </div>
        )}
      </Card>
    </div>
  );
}
