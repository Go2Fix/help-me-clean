import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  ClipboardList,
  Calendar,
  Pencil,
  Check,
  X,
  TrendingUp,
  Percent,
  Wallet,
  Users,
  User,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  CheckCircle,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DocumentCard from '@/components/ui/DocumentCard';
import PersonalityScoreCard from '@/components/PersonalityScoreCard';
import ANAFVerificationCard from '@/components/ANAFVerificationCard';
import {
  COMPANY,
  APPROVE_COMPANY,
  REJECT_COMPANY,
  SUSPEND_COMPANY,
  VERIFY_COMPANY_WITH_ANAF,
  PENDING_COMPANY_APPLICATIONS,
  ALL_BOOKINGS,
  COMPANY_FINANCIAL_SUMMARY,
  ADMIN_UPDATE_COMPANY_PROFILE,
  ADMIN_UPDATE_COMPANY_STATUS,
  SET_COMPANY_COMMISSION_OVERRIDE,
  REVIEW_COMPANY_DOCUMENT,
  REVIEW_WORKER_DOCUMENT,
  ACTIVATE_WORKER,
  GENERATE_PERSONALITY_INSIGHTS,
  SERVICE_CATEGORIES,
  ADMIN_UPDATE_COMPANY_CATEGORIES,
  PENDING_CATEGORY_REQUESTS,
  REVIEW_CATEGORY_REQUEST,
} from '@/graphql/operations';

type DetailTab = 'detalii' | 'financiar' | 'comenzi' | 'documente' | 'echipa';

interface AdminCategoryRequest {
  id: string;
  requestType: 'ACTIVATE' | 'DEACTIVATE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
  company: { id: string; companyName: string };
  category: { id: string; nameRo: string; nameEn: string; icon?: string };
}

interface ServiceCategoryItem {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  icon?: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};

const bookingStatusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ASSIGNED: 'bg-blue-400',
  CONFIRMED: 'bg-blue-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
};

const workerStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  PENDING_REVIEW: 'warning',
  INACTIVE: 'default',
  INVITED: 'info',
};

interface CompanyDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
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
}

interface WorkerWithDocs {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  user: { id: string; avatarUrl: string | null } | null;
  status: string;
  documents: CompanyDocument[];
  personalityAssessment?: PersonalityAssessment | null;
}

interface EditableField {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

type EditableFieldKey = keyof EditableField;

interface BookingEdge {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  estimatedTotal: number;
  paymentStatus: string;
  createdAt: string;
  client: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  company: {
    id: string;
    companyName: string;
  } | null;
}

// Required company documents for approval
const REQUIRED_DOCS = ['certificat_constatator', 'asigurare_raspundere_civila', 'cui_document'];

// Helper function to check if all required documents are uploaded and approved
function getDocumentCompletionStatus(
  documents: CompanyDocument[],
  getDocLabel: (type: string) => string,
) {
  const missing: string[] = [];
  const pending: string[] = [];
  const rejected: string[] = [];

  REQUIRED_DOCS.forEach((type) => {
    const doc = documents.find((d) => d.documentType === type);
    const label = getDocLabel(type);

    if (!doc) {
      missing.push(label);
    } else if (doc.status === 'PENDING') {
      pending.push(label);
    } else if (doc.status === 'REJECTED') {
      rejected.push(label);
    }
  });

  const ready = missing.length === 0 && pending.length === 0 && rejected.length === 0;

  return { ready, missing, pending, rejected };
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'admin']);

  const [activeTab, setActiveTab] = useState<DetailTab>('detalii');
  const [rejectModal, setRejectModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [reason, setReason] = useState('');

  // Inline editing state
  const [editingField, setEditingField] = useState<EditableFieldKey | null>(null);
  const [editValue, setEditValue] = useState('');

  // Commission override editing state
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionValue, setCommissionValue] = useState('');

  // Category management state
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [catEditMode, setCatEditMode] = useState(false);
  const [catRejectModal, setCatRejectModal] = useState<{ requestId: string } | null>(null);
  const [catRejectNote, setCatRejectNote] = useState('');

  // Document rejection modal state
  const [docRejectModal, setDocRejectModal] = useState<{
    open: boolean;
    docId: string;
    docType: 'company' | 'worker';
  }>({ open: false, docId: '', docType: 'company' });
  const [docRejectReason, setDocRejectReason] = useState('');

  const { data, loading } = useQuery(COMPANY, { variables: { id } });

  const { data: financialData, loading: financialLoading } = useQuery(COMPANY_FINANCIAL_SUMMARY, {
    variables: { companyId: id },
    skip: activeTab !== 'financiar',
  });

  const { data: bookingsData, loading: bookingsLoading } = useQuery(ALL_BOOKINGS, {
    variables: { companyId: id, first: 50 },
    skip: activeTab !== 'comenzi',
  });

  const refetchQueries = [
    { query: COMPANY, variables: { id } },
    { query: PENDING_COMPANY_APPLICATIONS },
  ];

  const [approveCompany, { loading: approving }] = useMutation(APPROVE_COMPANY, { refetchQueries });
  const [rejectCompany, { loading: rejecting }] = useMutation(REJECT_COMPANY, { refetchQueries });
  const [suspendCompany, { loading: suspending }] = useMutation(SUSPEND_COMPANY, { refetchQueries });

  const [verifyWithANAF, { loading: verifyingANAF }] = useMutation(VERIFY_COMPANY_WITH_ANAF, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [updateProfile, { loading: updatingProfile }] = useMutation(ADMIN_UPDATE_COMPANY_PROFILE, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [updateStatus, { loading: updatingStatus }] = useMutation(ADMIN_UPDATE_COMPANY_STATUS, {
    refetchQueries: [
      { query: COMPANY, variables: { id } },
      { query: PENDING_COMPANY_APPLICATIONS },
    ],
  });

  const [reviewCompanyDoc, { loading: reviewingCompanyDoc }] = useMutation(REVIEW_COMPANY_DOCUMENT, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [reviewWorkerDoc, { loading: reviewingWorkerDoc }] = useMutation(REVIEW_WORKER_DOCUMENT, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [activateWorker, { loading: activatingWorker }] = useMutation(ACTIVATE_WORKER, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [generateInsights, { loading: generatingInsights }] = useMutation(GENERATE_PERSONALITY_INSIGHTS, {
    refetchQueries: [
      { query: COMPANY, variables: { id } }
    ],
    awaitRefetchQueries: true,
  });

  const [setCommissionOverride, { loading: settingCommission }] = useMutation(SET_COMPANY_COMMISSION_OVERRIDE, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  // Category queries and mutations
  const { data: allCatsData } = useQuery(SERVICE_CATEGORIES, { fetchPolicy: 'cache-first' });
  const { data: pendingRequestsData, refetch: refetchPendingRequests } = useQuery(PENDING_CATEGORY_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [adminUpdateCategories, { loading: updatingCategories }] = useMutation(ADMIN_UPDATE_COMPANY_CATEGORIES, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
    onCompleted: () => { setCatEditMode(false); },
  });
  const [reviewCategoryRequest, { loading: reviewingCatRequest }] = useMutation(REVIEW_CATEGORY_REQUEST, {
    onCompleted: () => {
      void refetchPendingRequests();
    },
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const company = data?.company;

  const getDocLabel = (type: string) =>
    t(`admin:companyDetail.docTypeLabels.${type}`, { defaultValue: type });

  const getWorkerDocLabel = (type: string) =>
    t(`admin:companyDetail.workerDocTypeLabels.${type}`, { defaultValue: type });

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">{t('admin:companyDetail.notFound')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/companii')}>
          {t('admin:companyDetail.backToCompanies')}
        </Button>
      </div>
    );
  }

  const handleApprove = async () => {
    await approveCompany({ variables: { id } });
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    await rejectCompany({ variables: { id, reason: reason.trim() } });
    setRejectModal(false);
    setReason('');
  };

  const handleSuspend = async () => {
    if (!reason.trim()) return;
    await suspendCompany({ variables: { id, reason: reason.trim() } });
    setSuspendModal(false);
    setReason('');
  };

  const handleStartEdit = (field: EditableFieldKey) => {
    setEditingField(field);
    setEditValue(company[field] || '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editValue.trim()) return;
    // Send all required fields, with current values for unchanged fields
    await updateProfile({
      variables: {
        input: {
          id,
          companyName: editingField === 'companyName' ? editValue.trim() : company.companyName,
          cui: company.cui,
          address: editingField === 'address' ? editValue.trim() : company.address,
          contactPhone: editingField === 'contactPhone' ? editValue.trim() : company.contactPhone,
          contactEmail: editingField === 'contactEmail' ? editValue.trim() : company.contactEmail,
        },
      },
    });
    setEditingField(null);
    setEditValue('');
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({ variables: { id, status: newStatus } });
  };

  const handleApproveCompanyDoc = async (docId: string) => {
    await reviewCompanyDoc({ variables: { id: docId, approved: true } });
  };

  const handleRejectCompanyDoc = (docId: string) => {
    setDocRejectModal({ open: true, docId, docType: 'company' });
  };

  const handleApproveWorkerDoc = async (docId: string) => {
    await reviewWorkerDoc({ variables: { id: docId, approved: true } });
  };

  const handleRejectWorkerDoc = (docId: string) => {
    setDocRejectModal({ open: true, docId, docType: 'worker' });
  };

  const handleConfirmDocReject = async () => {
    if (!docRejectReason.trim()) return;
    if (docRejectModal.docType === 'company') {
      await reviewCompanyDoc({
        variables: { id: docRejectModal.docId, approved: false, rejectionReason: docRejectReason.trim() },
      });
    } else {
      await reviewWorkerDoc({
        variables: { id: docRejectModal.docId, approved: false, rejectionReason: docRejectReason.trim() },
      });
    }
    setDocRejectModal({ open: false, docId: '', docType: 'company' });
    setDocRejectReason('');
  };

  const handleActivateWorker = async (workerId: string) => {
    await activateWorker({ variables: { id: workerId } });
  };

  const handleGenerateInsights = async (workerId: string) => {
    await generateInsights({ variables: { workerId } });
  };

  const handleStartEditCommission = () => {
    setEditingCommission(true);
    setCommissionValue(company.commissionOverridePct != null ? String(company.commissionOverridePct) : '');
  };

  const handleCancelEditCommission = () => {
    setEditingCommission(false);
    setCommissionValue('');
  };

  const handleSaveCommission = async () => {
    const pct = commissionValue.trim() === '' ? null : parseFloat(commissionValue);
    await setCommissionOverride({ variables: { id, pct } });
    setEditingCommission(false);
    setCommissionValue('');
  };

  const handleResetCommission = async () => {
    await setCommissionOverride({ variables: { id, pct: null } });
    setEditingCommission(false);
    setCommissionValue('');
  };

  const handleStartCatEdit = () => {
    const currentIds = new Set(
      ((company?.serviceCategories ?? []) as ServiceCategoryItem[]).map((c) => c.id),
    );
    setSelectedCatIds(currentIds);
    setCatEditMode(true);
  };

  const handleSaveCatEdit = async () => {
    await adminUpdateCategories({
      variables: { companyId: id, categoryIds: Array.from(selectedCatIds) },
    });
  };

  const handleApproveCatRequest = async (requestId: string) => {
    await reviewCategoryRequest({ variables: { requestId, action: 'APPROVE' } });
  };

  const handleRejectCatRequest = async () => {
    if (!catRejectModal) return;
    await reviewCategoryRequest({
      variables: { requestId: catRejectModal.requestId, action: 'REJECT', note: catRejectNote },
    });
    setCatRejectModal(null);
    setCatRejectNote('');
  };

  const companyDocuments: CompanyDocument[] = company?.documents ?? [];
  const companyWorkers: WorkerWithDocs[] = company?.workers ?? [];

  // Check document completion status for approval
  const docStatus = getDocumentCompletionStatus(companyDocuments, getDocLabel);

  const tabOptions = [
    { value: 'detalii', label: t('admin:companyDetail.tabs.details') },
    { value: 'financiar', label: t('admin:companyDetail.tabs.financial') },
    { value: 'comenzi', label: t('admin:companyDetail.tabs.bookings') },
    { value: 'documente', label: t('admin:companyDetail.tabs.documents') },
    { value: 'echipa', label: t('admin:companyDetail.tabs.team') },
  ];

  const financial = financialData?.companyFinancialSummary;
  const bookings: BookingEdge[] = bookingsData?.allBookings?.edges ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/companii')}
          className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{company.companyName}</h1>
            <Badge variant={statusVariant[company.status] ?? 'default'}>
              {t(`admin:companyDetail.statusLabels.${company.status}`, { defaultValue: company.status })}
            </Badge>
          </div>
          <p className="text-gray-500 mt-0.5">CUI: {company.cui}</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="mb-6 w-48">
        <Select
          options={tabOptions}
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as DetailTab)}
        />
      </div>

      {/* Detalii Tab */}
      {activeTab === 'detalii' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <ANAFVerificationCard
              anafData={company.anafVerification}
              submittedName={company.companyName}
              submittedAddress={company.address}
              onReVerify={() => verifyWithANAF({ variables: { id } })}
              reVerifyLoading={verifyingANAF}
            />

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin:companyDetail.details.infoTitle')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <EditableInfoItem
                  icon={Building2}
                  label={t('admin:companyDetail.details.companyName')}
                  value={company.companyName}
                  fieldKey="companyName"
                  editingField={editingField}
                  editValue={editValue}
                  saving={updatingProfile}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditValueChange={setEditValue}
                />
                <InfoItem
                  icon={Building2}
                  label={t('admin:companyDetail.details.companyType')}
                  value={company.companyType}
                />
                <InfoItem
                  icon={Building2}
                  label={t('admin:companyDetail.details.legalRep')}
                  value={company.legalRepresentative}
                />
                <EditableInfoItem
                  icon={Mail}
                  label={t('admin:companyDetail.details.email')}
                  value={company.contactEmail}
                  fieldKey="contactEmail"
                  editingField={editingField}
                  editValue={editValue}
                  saving={updatingProfile}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditValueChange={setEditValue}
                />
                <EditableInfoItem
                  icon={Phone}
                  label={t('admin:companyDetail.details.phone')}
                  value={company.contactPhone}
                  fieldKey="contactPhone"
                  editingField={editingField}
                  editValue={editValue}
                  saving={updatingProfile}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditValueChange={setEditValue}
                />
                <EditableInfoItem
                  icon={MapPin}
                  label={t('admin:companyDetail.details.address')}
                  value={company.address}
                  fieldKey="address"
                  editingField={editingField}
                  editValue={editValue}
                  saving={updatingProfile}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditValueChange={setEditValue}
                />
                <InfoItem
                  icon={MapPin}
                  label={`${t('admin:companyDetail.details.city')} / ${t('admin:companyDetail.details.county')}`}
                  value={`${company.city}, ${company.county}`}
                />
              </div>
              {company.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {t('admin:companyDetail.details.description')}
                  </p>
                  <p className="text-sm text-gray-600">{company.description}</p>
                </div>
              )}
            </Card>

            {/* Service Zones */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin:companyDetail.serviceZones.title')}
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {company.city && (
                  <Badge variant="info">{company.city}</Badge>
                )}
                {company.county && (
                  <Badge variant="default">{company.county}</Badge>
                )}
              </div>
              {!company.city && !company.county && (
                <p className="text-sm text-gray-400 mb-3">
                  {t('admin:companyDetail.serviceZones.noInfo')}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {t('admin:companyDetail.serviceZones.managedBy')}
              </p>
            </Card>

            {/* Service Categories */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('admin:companyDetail.serviceCategories.title')}
                  </h3>
                </div>
                {!catEditMode && (
                  <button
                    type="button"
                    onClick={handleStartCatEdit}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Editează categorii
                  </button>
                )}
              </div>

              {catEditMode ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">Selectați categoriile active pentru această companie:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {((allCatsData?.serviceCategories ?? []) as ServiceCategoryItem[])
                      .filter((c) => (c as ServiceCategoryItem & { isActive?: boolean }).isActive !== false)
                      .map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCatIds.has(cat.id)}
                            onChange={(e) => {
                              setSelectedCatIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(cat.id);
                                else next.delete(cat.id);
                                return next;
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          {cat.icon && <span>{cat.icon}</span>}
                          <span className="text-sm text-gray-700">{cat.nameRo}</span>
                        </label>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveCatEdit()}
                      disabled={updatingCategories}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {updatingCategories ? 'Se salvează...' : 'Salvează'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatEditMode(false)}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
                    >
                      Anulează
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {company.serviceCategories && company.serviceCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {company.serviceCategories.map((cat: { id: string; slug: string; nameRo: string; icon?: string }) => (
                        <Badge key={cat.id} variant="info">
                          {cat.icon && <span className="mr-1">{cat.icon}</span>}
                          {cat.nameRo}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {t('admin:companyDetail.serviceCategories.noCategories')}
                    </p>
                  )}
                </>
              )}

              {/* Pending category requests for this company */}
              {(() => {
                const companyReqs = ((pendingRequestsData?.pendingCategoryRequests ?? []) as AdminCategoryRequest[])
                  .filter((r) => r.company.id === id);
                if (companyReqs.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Cereri în așteptare</p>
                    <div className="space-y-2">
                      {companyReqs.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200"
                        >
                          <div>
                            <span className="text-sm text-gray-800">
                              {req.category.icon} {req.category.nameRo}
                            </span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                              req.requestType === 'ACTIVATE'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {req.requestType === 'ACTIVATE' ? 'Activare' : 'Dezactivare'}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleApproveCatRequest(req.id)}
                              disabled={reviewingCatRequest}
                              className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Aprobă
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatRejectModal({ requestId: req.id })}
                              disabled={reviewingCatRequest}
                              className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              Respinge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Category reject modal */}
            {catRejectModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold mb-4">Respinge cererea de categorie</h3>
                  <textarea
                    value={catRejectNote}
                    onChange={(e) => setCatRejectNote(e.target.value)}
                    placeholder="Motivul respingerii (opțional)"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => { setCatRejectModal(null); setCatRejectNote(''); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Anulează
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRejectCatRequest()}
                      disabled={reviewingCatRequest}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Respinge
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('admin:companyDetail.stats.rating')}</p>
                    <p className="text-xl font-bold text-gray-900">
                      {company.ratingAvg ? Number(company.ratingAvg).toFixed(1) : '--'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-secondary/10">
                    <ClipboardList className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('admin:companyDetail.stats.jobs')}</p>
                    <p className="text-xl font-bold text-gray-900">{company.totalJobsCompleted}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Document Status Summary (only for PENDING_APPROVAL) */}
            {company.status === 'PENDING_REVIEW' && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {t('admin:companyDetail.docSummary.title')}
                </h3>

                <div className="space-y-3 mb-4">
                  {REQUIRED_DOCS.map((type) => {
                    const doc = companyDocuments.find((d) => d.documentType === type);
                    const label = getDocLabel(type);

                    return (
                      <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">{label}</span>

                        {!doc && (
                          <Badge variant="default">
                            {t('admin:companyDetail.docSummary.notUploaded')}
                          </Badge>
                        )}
                        {doc?.status === 'PENDING' && (
                          <Badge variant="warning">
                            {t('admin:companyDetail.docStatusLabels.PENDING')}
                          </Badge>
                        )}
                        {doc?.status === 'APPROVED' && (
                          <Badge variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('admin:companyDetail.docStatusLabels.APPROVED')}
                          </Badge>
                        )}
                        {doc?.status === 'REJECTED' && (
                          <Badge variant="danger">
                            {t('admin:companyDetail.docStatusLabels.REJECTED')}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {docStatus.ready ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">
                        {t('admin:companyDetail.docSummary.allApproved')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2 text-sm text-amber-800">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">
                          {t('admin:companyDetail.docSummary.cannotApprove')}
                        </p>
                        {docStatus.missing.length > 0 && (
                          <p className="text-xs mb-1">
                            <strong>{t('admin:companyDetail.docSummary.missing')}:</strong>{' '}
                            {docStatus.missing.join(', ')}
                          </p>
                        )}
                        {docStatus.pending.length > 0 && (
                          <p className="text-xs mb-1">
                            <strong>{t('admin:companyDetail.docSummary.pending')}:</strong>{' '}
                            {docStatus.pending.join(', ')}
                          </p>
                        )}
                        {docStatus.rejected.length > 0 && (
                          <p className="text-xs">
                            <strong>{t('admin:companyDetail.docSummary.rejected')}:</strong>{' '}
                            {docStatus.rejected.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin:companyDetail.actionsCard.title')}
              </h3>
              <div className="space-y-3">
                {company.status === 'PENDING_REVIEW' && (
                  <>
                    <Button
                      variant="secondary"
                      className={`w-full${!docStatus.ready ? ' opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      onClick={handleApprove}
                      loading={approving}
                      disabled={!docStatus.ready}
                      title={
                        !docStatus.ready
                          ? t('admin:companyDetail.actionsCard.approveDisabledTitle')
                          : undefined
                      }
                    >
                      {t('admin:companyDetail.actionsCard.approveCompany')}
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => setRejectModal(true)}
                    >
                      {t('admin:companyDetail.actionsCard.rejectCompany')}
                    </Button>
                  </>
                )}
                {company.status === 'APPROVED' && (
                  <>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => setSuspendModal(true)}
                    >
                      {t('admin:companyDetail.actionsCard.suspendCompany')}
                    </Button>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-2">
                        {t('admin:companyDetail.actionsCard.changeStatus')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange('SUSPENDED')}
                        loading={updatingStatus}
                      >
                        {t('admin:companyDetail.actionsCard.moveToSuspended')}
                      </Button>
                    </div>
                  </>
                )}
                {company.status === 'SUSPENDED' && (
                  <>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleApprove}
                      loading={approving}
                    >
                      {t('admin:companyDetail.actionsCard.reactivateCompany')}
                    </Button>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-2">
                        {t('admin:companyDetail.actionsCard.changeStatus')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange('APPROVED')}
                        loading={updatingStatus}
                      >
                        {t('admin:companyDetail.actionsCard.moveToApproved')}
                      </Button>
                    </div>
                  </>
                )}
                {company.status === 'REJECTED' && (
                  <p className="text-sm text-gray-500">
                    {t('admin:companyDetail.actionsCard.rejectedNote')}
                    {company.rejectionReason && (
                      <span className="block mt-1 text-danger">
                        {t('admin:companyDetail.actionsCard.rejectionReasonLabel')}:{' '}
                        {company.rejectionReason}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {t('admin:companyDetail.details.registeredAt')}
              </h3>
              <div className="flex items-center gap-2 text-gray-900">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(company.createdAt)}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Financiar Tab */}
      {activeTab === 'financiar' && (
        <div>
          {financialLoading ? (
            <Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 py-3">
                    <div className="h-9 w-9 bg-gray-200 rounded-lg shrink-0" />
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                      <div className="h-5 bg-gray-200 rounded w-10" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : financial ? (
            <Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">
                      {t('admin:companyDetail.financial.completedBookings')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">
                      {financial.completedBookings}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">
                      {t('admin:companyDetail.financial.totalRevenue')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">
                      {formatCurrency(financial.totalRevenue)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Percent className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">
                      {t('admin:companyDetail.financial.totalCommission')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">
                      {formatCurrency(financial.totalCommission)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Wallet className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">
                      {t('admin:companyDetail.financial.netPayout')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">
                      {formatCurrency(financial.netPayout)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-center text-gray-400 py-8">
                {t('admin:companyDetail.financial.noData')}
              </p>
            </Card>
          )}

          {/* Commission Override */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {t('admin:companyDetail.commission.title')}
              </h3>
              {!editingCommission && (
                <button
                  onClick={handleStartEditCommission}
                  className="p-1 rounded text-gray-400 hover:text-primary transition cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            {editingCommission ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    {t('admin:companyDetail.commission.label')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCommission();
                      if (e.key === 'Escape') handleCancelEditCommission();
                    }}
                    autoFocus
                    placeholder="25"
                    className="w-full rounded-lg border border-primary bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCommission}
                    loading={settingCommission}
                    disabled={
                      commissionValue.trim() === '' ||
                      isNaN(parseFloat(commissionValue)) ||
                      parseFloat(commissionValue) < 0 ||
                      parseFloat(commissionValue) > 100
                    }
                  >
                    {t('admin:companyDetail.commission.save')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCommission}
                    loading={settingCommission}
                  >
                    {t('admin:companyDetail.commission.resetToDefault')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditCommission}
                  >
                    {t('admin:companyDetail.commission.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                {company.commissionOverridePct != null
                  ? `${company.commissionOverridePct}% (${t('admin:companyDetail.commission.custom')})`
                  : `25% (${t('admin:companyDetail.commission.default')})`}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Comenzi Tab */}
      {activeTab === 'comenzi' && (
        <Card padding={false}>
          {bookingsLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                  <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              {t('admin:companyDetail.bookingsTab.noBookings')}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/admin/comenzi/${booking.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${bookingStatusDotColor[booking.status] ?? 'bg-gray-300'}`}
                  />
                  <span className="text-sm font-semibold text-gray-900 w-20 shrink-0">
                    {booking.referenceCode}
                  </span>
                  <span className="text-sm text-gray-700 truncate min-w-0">
                    {booking.serviceName || booking.serviceType}
                  </span>
                  <span className="flex-1" />
                  {booking.client && (
                    <Link
                      to={`/admin/utilizatori/${booking.client.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden md:flex items-center gap-1 text-xs text-gray-400 hover:text-primary shrink-0"
                    >
                      <User className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{booking.client.fullName}</span>
                    </Link>
                  )}
                  <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Calendar className="h-3 w-3" />
                    {formatDate(booking.scheduledDate)}
                    {booking.scheduledStartTime ? `, ${booking.scheduledStartTime}` : ''}
                  </span>
                  <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                    {formatCurrency(booking.estimatedTotal)}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 w-24 text-right hidden sm:block">
                    {t(`admin:companyDetail.bookingStatusLabels.${booking.status}`, {
                      defaultValue: booking.status,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Documente Tab */}
      {activeTab === 'documente' && (
        <div className="space-y-8">
          {/* Section A - Company Documents */}
          <div>
            {companyDocuments.length === 0 ? (
              <p className="text-sm text-gray-400">
                {t('admin:companyDetail.documents.noDocuments')}
              </p>
            ) : (
              <div className="space-y-3">
                {companyDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    id={doc.id}
                    documentType={doc.documentType}
                    documentTypeLabel={getDocLabel(doc.documentType)}
                    fileName={doc.fileName}
                    fileUrl={doc.fileUrl}
                    status={doc.status}
                    uploadedAt={doc.uploadedAt}
                    rejectionReason={doc.rejectionReason}
                    onApprove={handleApproveCompanyDoc}
                    onReject={handleRejectCompanyDoc}
                    reviewLoading={reviewingCompanyDoc}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Echipa Tab */}
      {activeTab === 'echipa' && (
        <div>
          {companyWorkers.length === 0 ? (
            <p className="text-sm text-gray-400">
              {t('admin:companyDetail.team.noWorkers')}
            </p>
          ) : (
            <div className="space-y-4">
              {companyWorkers.map((worker) => {
                const allDocsApproved =
                  worker.documents.length > 0 &&
                  worker.documents.every((d) => d.status === 'APPROVED');
                const hasPersonalityAssessment = !!worker.personalityAssessment;
                const canActivate =
                  worker.status === 'PENDING_REVIEW' && allDocsApproved && hasPersonalityAssessment;

                return (
                  <Card key={worker.id}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {worker.user?.avatarUrl ? (
                          <img
                            src={worker.user.avatarUrl}
                            alt={worker.fullName}
                            className="w-14 h-14 rounded-xl object-cover border-2 border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            {worker.user?.id ? (
                              <Link
                                to={`/admin/utilizatori/${worker.user.id}`}
                                className="font-semibold text-gray-900 hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {worker.fullName}
                              </Link>
                            ) : (
                              <h4 className="font-semibold text-gray-900">
                                {worker.fullName}
                              </h4>
                            )}
                            <Badge variant={workerStatusVariant[worker.status] ?? 'default'}>
                              {t(`admin:companyDetail.workerStatusLabels.${worker.status}`, {
                                defaultValue: worker.status,
                              })}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{worker.email}</p>
                          {!worker.user?.avatarUrl && worker.status === 'PENDING_REVIEW' && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="h-3 w-3" />
                              {t('admin:companyDetail.team.missingPhoto')}
                            </p>
                          )}
                        </div>
                      </div>
                      {canActivate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleActivateWorker(worker.id)}
                          loading={activatingWorker}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1.5" />
                          {t('admin:companyDetail.team.activateWorker')}
                        </Button>
                      )}
                    </div>

                    {/* Personality Assessment */}
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">
                        {t('admin:companyDetail.team.personalityTest')}
                      </h5>
                      <PersonalityScoreCard
                        assessment={worker.personalityAssessment}
                        compact={false}
                        onGenerateInsights={() => handleGenerateInsights(worker.id)}
                        generatingInsights={generatingInsights}
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">
                        {t('admin:companyDetail.team.documents')}
                      </h5>
                      {worker.documents.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          {t('admin:companyDetail.team.noDocuments')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {worker.documents.map((doc) => (
                            <DocumentCard
                              key={doc.id}
                              id={doc.id}
                              documentType={doc.documentType}
                              documentTypeLabel={getWorkerDocLabel(doc.documentType)}
                              fileName={doc.fileName}
                              fileUrl={doc.fileUrl}
                              status={doc.status}
                              uploadedAt={doc.uploadedAt}
                              rejectionReason={doc.rejectionReason}
                              onApprove={handleApproveWorkerDoc}
                              onReject={handleRejectWorkerDoc}
                              reviewLoading={reviewingWorkerDoc}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Document Reject Modal */}
      <Modal
        open={docRejectModal.open}
        onClose={() => {
          setDocRejectModal({ open: false, docId: '', docType: 'company' });
          setDocRejectReason('');
        }}
        title={t('admin:companyDetail.docRejectModal.title')}
      >
        <div className="space-y-4">
          <Input
            label={t('admin:companyDetail.docRejectModal.reasonLabel')}
            placeholder={t('admin:companyDetail.docRejectModal.reasonPlaceholder')}
            value={docRejectReason}
            onChange={(e) => setDocRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDocRejectModal({ open: false, docId: '', docType: 'company' });
                setDocRejectReason('');
              }}
            >
              {t('admin:companyDetail.docRejectModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDocReject}
              loading={reviewingCompanyDoc || reviewingWorkerDoc}
              disabled={!docRejectReason.trim()}
            >
              {t('admin:companyDetail.docRejectModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => {
          setRejectModal(false);
          setReason('');
        }}
        title={t('admin:companyDetail.rejectModal.title')}
      >
        <div className="space-y-4">
          <Input
            label={t('admin:companyDetail.rejectModal.reasonLabel')}
            placeholder={t('admin:companyDetail.rejectModal.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectModal(false);
                setReason('');
              }}
            >
              {t('admin:companyDetail.rejectModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={rejecting}
              disabled={!reason.trim()}
            >
              {t('admin:companyDetail.rejectModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        open={suspendModal}
        onClose={() => {
          setSuspendModal(false);
          setReason('');
        }}
        title={t('admin:companyDetail.suspendModal.title')}
      >
        <div className="space-y-4">
          <Input
            label={t('admin:companyDetail.suspendModal.reasonLabel')}
            placeholder={t('admin:companyDetail.suspendModal.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setSuspendModal(false);
                setReason('');
              }}
            >
              {t('admin:companyDetail.suspendModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleSuspend}
              loading={suspending}
              disabled={!reason.trim()}
            >
              {t('admin:companyDetail.suspendModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900">{value || '--'}</p>
      </div>
    </div>
  );
}

function EditableInfoItem({
  icon: Icon,
  label,
  value,
  fieldKey,
  editingField,
  editValue,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditValueChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  fieldKey: EditableFieldKey;
  editingField: EditableFieldKey | null;
  editValue: string;
  saving: boolean;
  onStartEdit: (field: EditableFieldKey) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditValueChange: (value: string) => void;
}) {
  const isEditing = editingField === fieldKey;

  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-gray-400 mt-2.5 shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              autoFocus
              className="flex-1 rounded-lg border border-primary bg-white px-2.5 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={onSaveEdit}
              disabled={saving || !editValue.trim()}
              className="p-1 rounded-lg text-secondary hover:bg-secondary/10 transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-gray-900">{value || '--'}</p>
          <button
            onClick={() => onStartEdit(fieldKey)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-primary transition-all cursor-pointer"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
