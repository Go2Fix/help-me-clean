import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { Building2, Save, FileText, MapPin, Clock, ChevronDown, ChevronRight, CheckSquare, Square, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
} from '@/graphql/operations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const companyStatusVariant: Record<string, StatusVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
};

const companyStatusLabel: Record<string, string> = {
  APPROVED: 'Aprobata',
  PENDING_REVIEW: 'In curs de verificare',
  REJECTED: 'Respinsa',
  SUSPENDED: 'Suspendata',
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

const REQUIRED_COMPANY_DOCS: { type: string; label: string }[] = [
  { type: 'certificat_constatator', label: 'Certificat Constatator' },
  { type: 'asigurare_raspundere_civila', label: 'Asigurare Raspundere Civila' },
  { type: 'cui_document', label: 'Document CUI' },
];

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

/** Display order: Mon(1)..Sun(0) */
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_NAMES: Record<number, string> = {
  0: 'Duminica',
  1: 'Luni',
  2: 'Marti',
  3: 'Miercuri',
  4: 'Joi',
  5: 'Vineri',
  6: 'Sambata',
};

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
      setConnectSuccess('Inregistrarea Stripe a fost finalizata cu succes! Statusul va fi actualizat in cateva momente.');
      refetchConnect();
      setSearchParams({}, { replace: true });
      setTimeout(() => setConnectSuccess(''), 6000);
    } else if (stripeParam === 'refresh') {
      setConnectError('Sesiunea de inregistrare a expirat. Apasa butonul de mai jos pentru a reincerca.');
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
      setConnectError('Nu am putut initia inregistrarea Stripe. Incearca din nou.');
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
      setConnectError('Nu am putut reinitia inregistrarea Stripe. Incearca din nou.');
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
      setSuccessMessage('Setarile au fost salvate cu succes.');
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
      setScheduleSuccessMessage('Programul de lucru a fost salvat cu succes.');
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
      setAreasSuccessMessage('Zonele de acoperire au fost salvate cu succes.');
      setTimeout(() => setAreasSuccessMessage(''), 3000);
    } catch {
      setAreasErrorMessage('Eroare la salvarea zonelor. Incearca din nou.');
      setTimeout(() => setAreasErrorMessage(''), 4000);
    }
  };

  const getSelectedCountForCity = (city: City): number => {
    return city.areas.filter((a) => selectedAreaIds.has(a.id)).length;
  };

  const allSelectedInCity = (city: City): boolean => {
    return city.areas.length > 0 && city.areas.every((a) => selectedAreaIds.has(a.id));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Setari</h1>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Setari</h1>
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio firma inregistrata</h3>
            <p className="text-gray-500">Nu ai o firma inregistrata inca.</p>
          </div>
        </Card>
      </div>
    );
  }

  const documents: CompanyDocument[] = company.documents ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Setari</h1>

      {/* Logo Upload */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Logo firma</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Logo-ul firmei va fi afisat in profilul public si pe facturile generate.
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
              Incarca logo-ul companiei tale
            </p>
            <p className="text-xs text-gray-400">
              Recomandat: 800x600 pixeli. Formate acceptate: JPG, PNG, WEBP. Max 10MB
            </p>
          </div>
        </div>
      </Card>

      {/* Company Info (read-only) */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{company.companyName}</h2>
            <p className="text-sm text-gray-500 mt-1">CUI: {company.cui}</p>
          </div>
          <Badge variant={companyStatusVariant[company.status] || 'default'}>
            {companyStatusLabel[company.status] || company.status}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Tip firma</p>
            <p className="font-medium">{company.companyType || '--'}</p>
          </div>
          <div>
            <p className="text-gray-500">Reprezentant legal</p>
            <p className="font-medium">{company.legalRepresentative || '--'}</p>
          </div>
          <div>
            <p className="text-gray-500">Adresa</p>
            <p className="font-medium">
              {[company.city, company.county].filter(Boolean).join(', ') || '--'}
            </p>
          </div>
        </div>
        {company.rejectionReason && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <p className="font-medium mb-1">Motiv respingere:</p>
            <p>{company.rejectionReason}</p>
          </div>
        )}
      </Card>

      {/* Stripe Connect Integration */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Integrare Stripe</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Conecteaza-ti contul Stripe pentru a primi plati de la clienti. Stripe proceseaza platile in mod sigur si transfera fondurile in contul tau bancar.
        </p>

        {connectLoading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Se incarca statusul Stripe...</span>
          </div>
        ) : connectStatus?.onboardingStatus === 'COMPLETE' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Cont Stripe conectat</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {connectStatus.accountId ? `ID: ${connectStatus.accountId}` : 'Integrat cu succes'}
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
                Plati {connectStatus.chargesEnabled ? 'active' : 'inactive'}
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
                Transferuri {connectStatus.payoutsEnabled ? 'active' : 'inactive'}
              </div>
            </div>
          </div>
        ) : connectStatus?.onboardingStatus === 'PENDING' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Inregistrare in curs</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Finalizeaza inregistrarea in Stripe pentru a primi plati.
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefreshOnboarding}
              loading={refreshingOnboarding}
            >
              <ExternalLink className="h-4 w-4" />
              Finalizeaza inregistrarea
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleInitiateOnboarding}
            loading={initiatingOnboarding}
          >
            <ExternalLink className="h-4 w-4" />
            Conecteaza cu Stripe
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
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Editeaza profilul firmei</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descriere firma</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={cn(
                'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900',
                'placeholder:text-gray-400 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600',
              )}
              placeholder="Descrierea firmei tale..."
            />
          </div>
          <Input label="Email contact" type="email" value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@firma.ro" />
          <Input label="Telefon contact" value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)} placeholder="+40 7XX XXX XXX" />
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            Salveaza modificarile
          </Button>
        </form>
      </Card>

      {/* Work Schedule */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Program implicit de lucru</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Seteaza orele implicite de lucru ale firmei. Acestea vor fi folosite ca baza la programarea curateniilor.
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
            Salveaza programul
          </Button>
        </div>
      </Card>

      {/* Documents */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Documente firma</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Incarca documentele necesare pentru aprobarea firmei tale. Toate documentele vor fi verificate de administrator.
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
                      label={`Incarca ${reqDoc.label}`}
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">Alte documente</h3>
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

      {/* Service Areas */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Zone de acoperire</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Selecteaza zonele in care firma ta ofera servicii de curatenie. Clientii din aceste zone vor putea solicita serviciile tale.
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
            <p className="text-sm text-gray-500">Nu exista orase active momentan.</p>
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
                          {totalCount} {totalCount === 1 ? 'zona' : 'zone'}
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
                            Selecteaza toate
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
                            Deselecteaza toate
                          </button>
                        </div>
                      )}

                      {totalCount === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Nicio zona definita pentru acest oras.</p>
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
                ? 'Nicio zona selectata'
                : `${selectedAreaIds.size} ${selectedAreaIds.size === 1 ? 'zona selectata' : 'zone selectate'}`}
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
              Salveaza zonele
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
