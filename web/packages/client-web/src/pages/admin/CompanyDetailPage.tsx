import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Hash,
  Clock,
  Users,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DocumentCard from '@/components/ui/DocumentCard';
import PersonalityScoreCard from '@/components/PersonalityScoreCard';
import {
  COMPANY,
  APPROVE_COMPANY,
  REJECT_COMPANY,
  SUSPEND_COMPANY,
  PENDING_COMPANY_APPLICATIONS,
  ALL_BOOKINGS,
  COMPANY_FINANCIAL_SUMMARY,
  ADMIN_UPDATE_COMPANY_PROFILE,
  ADMIN_UPDATE_COMPANY_STATUS,
  REVIEW_COMPANY_DOCUMENT,
  REVIEW_CLEANER_DOCUMENT,
  ACTIVATE_CLEANER,
  GENERATE_PERSONALITY_INSIGHTS,
} from '@/graphql/operations';

type DetailTab = 'detalii' | 'financiar' | 'comenzi' | 'documente' | 'echipa';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};

const statusLabel: Record<string, string> = {
  PENDING_APPROVAL: 'In asteptare',
  APPROVED: 'Aprobat',
  SUSPENDED: 'Suspendat',
  REJECTED: 'Respins',
};

const bookingStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const bookingStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  CONFIRMED: 'Confirmat',
  ASSIGNED: 'Asignat',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
};

const formatCurrency = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const companyDocTypeLabel: Record<string, string> = {
  certificat_constatator: 'Certificat Constatator',
  asigurare_raspundere_civila: 'Asigurare Raspundere Civila',
  cui_document: 'Document CUI',
};

const cleanerDocTypeLabel: Record<string, string> = {
  cazier_judiciar: 'Cazier Judiciar',
  contract_munca: 'Contract de Munca',
};

const cleanerStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  PENDING_REVIEW: 'warning',
  INACTIVE: 'default',
  INVITED: 'info',
};

const cleanerStatusLabel: Record<string, string> = {
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

interface CleanerWithDocs {
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

  // Document rejection modal state
  const [docRejectModal, setDocRejectModal] = useState<{
    open: boolean;
    docId: string;
    docType: 'company' | 'cleaner';
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

  const [reviewCleanerDoc, { loading: reviewingCleanerDoc }] = useMutation(REVIEW_CLEANER_DOCUMENT, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [activateCleaner, { loading: activatingCleaner }] = useMutation(ACTIVATE_CLEANER, {
    refetchQueries: [{ query: COMPANY, variables: { id } }],
  });

  const [generateInsights, { loading: generatingInsights }] = useMutation(GENERATE_PERSONALITY_INSIGHTS, {
    refetchQueries: [
      { query: COMPANY, variables: { id } }
    ],
    awaitRefetchQueries: true,
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
        <p className="text-gray-400">Compania nu a fost gasita.</p>
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

  const handleApproveCleanerDoc = async (docId: string) => {
    await reviewCleanerDoc({ variables: { id: docId, approved: true } });
  };

  const handleRejectCleanerDoc = (docId: string) => {
    setDocRejectModal({ open: true, docId, docType: 'cleaner' });
  };

  const handleConfirmDocReject = async () => {
    if (!docRejectReason.trim()) return;
    if (docRejectModal.docType === 'company') {
      await reviewCompanyDoc({
        variables: { id: docRejectModal.docId, approved: false, rejectionReason: docRejectReason.trim() },
      });
    } else {
      await reviewCleanerDoc({
        variables: { id: docRejectModal.docId, approved: false, rejectionReason: docRejectReason.trim() },
      });
    }
    setDocRejectModal({ open: false, docId: '', docType: 'company' });
    setDocRejectReason('');
  };

  const handleActivateCleaner = async (cleanerId: string) => {
    await activateCleaner({ variables: { id: cleanerId } });
  };

  const handleGenerateInsights = async (cleanerId: string) => {
    await generateInsights({ variables: { cleanerId } });
  };

  const companyDocuments: CompanyDocument[] = company?.documents ?? [];
  const companyCleaner: CleanerWithDocs[] = company?.cleaners ?? [];

  // Check document completion status for approval
  const docStatus = getDocumentCompletionStatus(companyDocuments);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'detalii', label: 'Detalii' },
    { key: 'financiar', label: 'Financiar' },
    { key: 'comenzi', label: 'Comenzi' },
    { key: 'documente', label: 'Documente' },
    { key: 'echipa', label: 'Echipa' },
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

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detalii Tab */}
      {activeTab === 'detalii' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
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
                {company.maxServiceRadiusKm != null && (
                  <Badge variant="success">
                    Raza: {company.maxServiceRadiusKm} km
                  </Badge>
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
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Raza</p>
                    <p className="text-xl font-bold text-gray-900">{company.maxServiceRadiusKm ?? '--'} km</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Document Status Summary (only for PENDING_APPROVAL) */}
            {company.status === 'PENDING_APPROVAL' && (
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
                {company.status === 'PENDING_APPROVAL' && (
                  <>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleApprove}
                      loading={approving}
                      disabled={!docStatus.ready}
                    >
                      Aproba compania
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
                {new Date(company.createdAt).toLocaleDateString('ro-RO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Financiar Tab */}
      {activeTab === 'financiar' && (
        <div>
          {financialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <div className="animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 rounded-xl mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-32" />
                  </div>
                </Card>
              ))}
            </div>
          ) : financial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FinancialCard
                icon={ClipboardList}
                label="Rezervari Finalizate"
                value={String(financial.completedBookings)}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <FinancialCard
                icon={TrendingUp}
                label="Venit Total"
                value={formatCurrency.format(financial.totalRevenue)}
                iconBg="bg-secondary/10"
                iconColor="text-secondary"
              />
              <FinancialCard
                icon={Percent}
                label="Comision Total"
                value={formatCurrency.format(financial.totalCommission)}
                iconBg="bg-accent/10"
                iconColor="text-accent"
              />
              <FinancialCard
                icon={Wallet}
                label="Plata Neta"
                value={formatCurrency.format(financial.netPayout)}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
            </div>
          ) : (
            <Card>
              <p className="text-center text-gray-400 py-8">
                Nu exista date financiare disponibile.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Comenzi Tab */}
      {activeTab === 'comenzi' && (
        <div>
          {bookingsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <div className="animate-pulse flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-28" />
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 py-8">
                Aceasta companie nu are comenzi.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/admin/comenzi/${booking.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Hash className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {booking.referenceCode}
                          </h4>
                          <Badge variant={bookingStatusVariant[booking.status] ?? 'default'}>
                            {bookingStatusLabel[booking.status] ?? booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {booking.serviceName || booking.serviceType}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(booking.scheduledDate).toLocaleDateString('ro-RO')}
                          </span>
                          {booking.scheduledStartTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.scheduledStartTime}
                            </span>
                          )}
                          {booking.client && (
                            <span>Client: {booking.client.fullName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency.format(booking.estimatedTotal)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
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
          {companyCleaner.length === 0 ? (
            <p className="text-sm text-gray-400">Niciun angajat inregistrat.</p>
          ) : (
            <div className="space-y-4">
              {companyCleaner.map((cleaner) => {
                const allDocsApproved =
                  cleaner.documents.length > 0 &&
                  cleaner.documents.every((d) => d.status === 'APPROVED');
                const hasPersonalityAssessment = !!cleaner.personalityAssessment;
                const canActivate =
                  cleaner.status === 'PENDING_REVIEW' && allDocsApproved && hasPersonalityAssessment;

                return (
                  <Card key={cleaner.id}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {cleaner.user?.avatarUrl ? (
                          <img
                            src={cleaner.user.avatarUrl}
                            alt={cleaner.fullName}
                            className="w-14 h-14 rounded-xl object-cover border-2 border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {cleaner.fullName}
                            </h4>
                            <Badge
                              variant={
                                cleanerStatusVariant[cleaner.status] ?? 'default'
                              }
                            >
                              {cleanerStatusLabel[cleaner.status] ?? cleaner.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{cleaner.email}</p>
                          {!cleaner.user?.avatarUrl && cleaner.status === 'PENDING_REVIEW' && (
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
                          onClick={() => handleActivateCleaner(cleaner.id)}
                          loading={activatingCleaner}
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
                        assessment={cleaner.personalityAssessment as any}
                        compact={false}
                        onGenerateInsights={() => handleGenerateInsights(cleaner.id)}
                        generatingInsights={generatingInsights}
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Documente</h5>
                      {cleaner.documents.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Niciun document incarcat.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {cleaner.documents.map((doc) => (
                            <DocumentCard
                              key={doc.id}
                              id={doc.id}
                              documentType={doc.documentType}
                              documentTypeLabel={
                                cleanerDocTypeLabel[doc.documentType] ?? doc.documentType
                              }
                              fileName={doc.fileName}
                              fileUrl={doc.fileUrl}
                              status={doc.status}
                              uploadedAt={doc.uploadedAt}
                              rejectionReason={doc.rejectionReason}
                              onApprove={handleApproveCleanerDoc}
                              onReject={handleRejectCleanerDoc}
                              reviewLoading={reviewingCleanerDoc}
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
              loading={reviewingCompanyDoc || reviewingCleanerDoc}
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

function FinancialCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-xl', iconBg)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </Card>
  );
}
