import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
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
} from '@/graphql/operations';

type DetailTab = 'detalii' | 'financiar' | 'comenzi' | 'documente' | 'echipa';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};

const statusLabel: Record<string, string> = {
  PENDING_REVIEW: 'In asteptare',
  APPROVED: 'Aprobat',
  SUSPENDED: 'Suspendat',
  REJECTED: 'Respins',
};

const bookingStatusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ASSIGNED: 'bg-blue-400',
  CONFIRMED: 'bg-blue-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
};

const bookingStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  CONFIRMED: 'Confirmat',
  ASSIGNED: 'Asignat',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
};

const companyDocTypeLabel: Record<string, string> = {
  certificat_constatator: 'Certificat Constatator',
  asigurare_raspundere_civila: 'Asigurare Raspundere Civila',
  cui_document: 'Document CUI',
};

const workerDocTypeLabel: Record<string, string> = {
  cazier_judiciar: 'Cazier Judiciar',
  contract_munca: 'Contract de Munca',
};

const workerStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  PENDING_REVIEW: 'warning',
  INACTIVE: 'default',
  INVITED: 'info',
};

const workerStatusLabel: Record<string, string> = {
  ACTIVE: 'Activ',
  PENDING_REVIEW: 'In asteptare',
  INACTIVE: 'Inactiv',
  INVITED: 'Invitat',
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
function getDocumentCompletionStatus(documents: CompanyDocument[]) {
  const missing: string[] = [];
  const pending: string[] = [];
  const rejected: string[] = [];

  REQUIRED_DOCS.forEach((type) => {
    const doc = documents.find((d) => d.documentType === type);
    const label = companyDocTypeLabel[type] ?? type;

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

  const company = data?.company;

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
        <p className="text-gray-400">Compania nu a fost găsită.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/companii')}>
          Inapoi la companii
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

  const companyDocuments: CompanyDocument[] = company?.documents ?? [];
  const companyWorkers: WorkerWithDocs[] = company?.workers ?? [];

  // Check document completion status for approval
  const docStatus = getDocumentCompletionStatus(companyDocuments);

  const tabOptions = [
    { value: 'detalii', label: 'Detalii' },
    { value: 'financiar', label: 'Financiar' },
    { value: 'comenzi', label: 'Comenzi' },
    { value: 'documente', label: 'Documente' },
    { value: 'echipa', label: 'Echipa' },
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
              {statusLabel[company.status] ?? company.status}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informatii companie</h3>
              <div className="grid grid-cols-2 gap-4">
                <EditableInfoItem
                  icon={Building2}
                  label="Nume companie"
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
                <InfoItem icon={Building2} label="Tip companie" value={company.companyType} />
                <InfoItem icon={Building2} label="Reprezentant legal" value={company.legalRepresentative} />
                <EditableInfoItem
                  icon={Mail}
                  label="Email contact"
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
                  label="Telefon"
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
                  label="Adresa"
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
                <InfoItem icon={MapPin} label="Localitate" value={`${company.city}, ${company.county}`} />
              </div>
              {company.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Descriere</p>
                  <p className="text-sm text-gray-600">{company.description}</p>
                </div>
              )}
            </Card>

            {/* Zone de serviciu */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zone de serviciu</h3>
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
                  Nu exista informatii despre zona de serviciu.
                </p>
              )}
              <p className="text-xs text-gray-400">
                Zonele de serviciu sunt gestionate de administratorul firmei.
              </p>
            </Card>

            {/* Service Categories */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Categorii servicii</h3>
              </div>
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
                  Nicio categorie de servicii configurata.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Categoriile sunt gestionate de administratorul firmei.
              </p>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rating</p>
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
                    <p className="text-sm text-gray-500">Lucrari</p>
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
                  Status documente obligatorii
                </h3>

                <div className="space-y-3 mb-4">
                  {REQUIRED_DOCS.map((type) => {
                    const doc = companyDocuments.find((d) => d.documentType === type);
                    const label = companyDocTypeLabel[type] ?? type;

                    return (
                      <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">{label}</span>

                        {!doc && <Badge variant="default">Neîncarcat</Badge>}
                        {doc?.status === 'PENDING' && <Badge variant="warning">În așteptare</Badge>}
                        {doc?.status === 'APPROVED' && (
                          <Badge variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprobat
                          </Badge>
                        )}
                        {doc?.status === 'REJECTED' && <Badge variant="danger">Respins</Badge>}
                      </div>
                    );
                  })}
                </div>

                {docStatus.ready ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">Toate documentele sunt aprobate. Compania poate fi aprobată.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2 text-sm text-amber-800">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Compania nu poate fi aprobată încă</p>
                        {docStatus.missing.length > 0 && (
                          <p className="text-xs mb-1">
                            <strong>Lipsă:</strong> {docStatus.missing.join(', ')}
                          </p>
                        )}
                        {docStatus.pending.length > 0 && (
                          <p className="text-xs mb-1">
                            <strong>În așteptare:</strong> {docStatus.pending.join(', ')}
                          </p>
                        )}
                        {docStatus.rejected.length > 0 && (
                            <p className="text-xs">
                            <strong>Respinse:</strong> {docStatus.rejected.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actiuni</h3>
              <div className="space-y-3">
                {company.status === 'PENDING_REVIEW' && (
                  <>
                    <Button
                      variant="secondary"
                      className={`w-full${!docStatus.ready ? ' opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      onClick={handleApprove}
                      loading={approving}
                      disabled={!docStatus.ready}
                      title={!docStatus.ready ? 'Încarcă toate documentele obligatorii înainte de aprobare' : undefined}
                    >
                      Aprobă compania
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => setRejectModal(true)}
                    >
                      Respinge compania
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
                      Suspenda compania
                    </Button>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-2">Schimba status</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange('SUSPENDED')}
                        loading={updatingStatus}
                      >
                        Trece la Suspendat
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
                      Reactiveaza compania
                    </Button>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-2">Schimba status</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange('APPROVED')}
                        loading={updatingStatus}
                      >
                        Trece la Aprobat
                      </Button>
                    </div>
                  </>
                )}
                {company.status === 'REJECTED' && (
                  <p className="text-sm text-gray-500">
                    Compania a fost respinsa.
                    {company.rejectionReason && (
                      <span className="block mt-1 text-danger">
                        Motiv: {company.rejectionReason}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Inregistrata pe</h3>
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
                    <p className="text-xs text-gray-500 leading-tight">Rezervări finalizate</p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">{financial.completedBookings}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">Venit total</p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">{formatCurrency(financial.totalRevenue)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Percent className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">Comision total</p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">{formatCurrency(financial.totalCommission)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 md:pl-6">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Wallet className="h-4.5 w-4.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">Plata neta</p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">{formatCurrency(financial.netPayout)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-center text-gray-400 py-8">
                Nu exista date financiare disponibile.
              </p>
            </Card>
          )}

          {/* Commission Override */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Comision platforma
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
                  <label className="text-sm text-gray-500 mb-1 block">Comision personalizat (%)</label>
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
                    disabled={commissionValue.trim() === '' || isNaN(parseFloat(commissionValue)) || parseFloat(commissionValue) < 0 || parseFloat(commissionValue) > 100}
                  >
                    Salveaza
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCommission}
                    loading={settingCommission}
                  >
                    Reseteaza la implicit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditCommission}
                  >
                    Anuleaza
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                {company.commissionOverridePct != null
                  ? `${company.commissionOverridePct}% (personalizat)`
                  : '25% (implicit)'}
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
            <p className="text-center text-gray-400 py-12">Aceasta companie nu are comenzi.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/admin/comenzi/${booking.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${bookingStatusDotColor[booking.status] ?? 'bg-gray-300'}`} />
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
                    {bookingStatusLabel[booking.status] ?? booking.status}
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
              <p className="text-sm text-gray-400">Niciun document incarcat.</p>
            ) : (
              <div className="space-y-3">
                {companyDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    id={doc.id}
                    documentType={doc.documentType}
                    documentTypeLabel={companyDocTypeLabel[doc.documentType] ?? doc.documentType}
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
            <p className="text-sm text-gray-400">Niciun angajat inregistrat.</p>
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
                            <Badge
                              variant={
                                workerStatusVariant[worker.status] ?? 'default'
                              }
                            >
                              {workerStatusLabel[worker.status] ?? worker.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{worker.email}</p>
                          {!worker.user?.avatarUrl && worker.status === 'PENDING_REVIEW' && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="h-3 w-3" />
                              Lipsă fotografie profil
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
                          Activeaza
                        </Button>
                      )}
                    </div>

                    {/* Personality Assessment */}
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Test de personalitate</h5>
                      <PersonalityScoreCard
                        assessment={worker.personalityAssessment}
                        compact={false}
                        onGenerateInsights={() => handleGenerateInsights(worker.id)}
                        generatingInsights={generatingInsights}
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Documente</h5>
                      {worker.documents.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Niciun document incarcat.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {worker.documents.map((doc) => (
                            <DocumentCard
                              key={doc.id}
                              id={doc.id}
                              documentType={doc.documentType}
                              documentTypeLabel={
                                workerDocTypeLabel[doc.documentType] ?? doc.documentType
                              }
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
        onClose={() => { setDocRejectModal({ open: false, docId: '', docType: 'company' }); setDocRejectReason(''); }}
        title="Respinge document"
      >
        <div className="space-y-4">
          <Input
            label="Motivul respingerii"
            placeholder="Explica motivul respingerii documentului..."
            value={docRejectReason}
            onChange={(e) => setDocRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => { setDocRejectModal({ open: false, docId: '', docType: 'company' }); setDocRejectReason(''); }}
            >
              Anuleaza
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDocReject}
              loading={reviewingCompanyDoc || reviewingWorkerDoc}
              disabled={!docRejectReason.trim()}
            >
              Respinge
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => { setRejectModal(false); setReason(''); }}
        title="Respinge compania"
      >
        <div className="space-y-4">
          <Input
            label="Motivul respingerii"
            placeholder="Explica motivul respingerii..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setRejectModal(false); setReason(''); }}>
              Anuleaza
            </Button>
            <Button variant="danger" onClick={handleReject} loading={rejecting} disabled={!reason.trim()}>
              Respinge
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        open={suspendModal}
        onClose={() => { setSuspendModal(false); setReason(''); }}
        title="Suspenda compania"
      >
        <div className="space-y-4">
          <Input
            label="Motivul suspendarii"
            placeholder="Explica motivul suspendarii..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setSuspendModal(false); setReason(''); }}>
              Anuleaza
            </Button>
            <Button variant="danger" onClick={handleSuspend} loading={suspending} disabled={!reason.trim()}>
              Suspenda
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

