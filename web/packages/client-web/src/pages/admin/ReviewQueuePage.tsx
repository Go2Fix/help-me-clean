import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  FileText,
  Users,
  Tag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import {
  PENDING_COMPANY_APPLICATIONS,
  PENDING_COMPANY_DOCUMENTS,
  PENDING_WORKER_DOCUMENTS,
  PENDING_CATEGORY_REQUESTS,
  REVIEW_COMPANY_DOCUMENT,
  REVIEW_WORKER_DOCUMENT,
  REVIEW_CATEGORY_REQUEST,
  APPROVE_COMPANY,
  REJECT_COMPANY,
} from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  companyName: string;
  cui: string;
  companyType: string;
  city: string;
  county: string;
  createdAt: string;
  documents: { id: string; documentType: string; status: string }[];
}

interface CompanyDoc {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
  company: { id: string; companyName: string };
}

interface WorkerDoc {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
  worker: { id: string; fullName: string; company?: { id: string; companyName: string } };
}

interface CategoryRequest {
  id: string;
  requestType: 'ACTIVATE' | 'DEACTIVATE';
  status: string;
  createdAt: string;
  company: { id: string; companyName: string };
  category: { id: string; nameRo: string; nameEn: string; icon?: string };
}

// ─── Tab options ─────────────────────────────────────────────────────────────

type QueueTab = 'aplicatii' | 'documente-companie' | 'documente-angajat' | 'categorii';

const TABS: { value: QueueTab; label: string; icon: React.ElementType }[] = [
  { value: 'aplicatii', label: 'Aplicații companii', icon: Building2 },
  { value: 'documente-companie', label: 'Documente companii', icon: FileText },
  { value: 'documente-angajat', label: 'Documente angajați', icon: Users },
  { value: 'categorii', label: 'Cereri categorii', icon: Tag },
];

const VALID_TABS = TABS.map((t) => t.value);

const DOC_TYPE_LABELS: Record<string, string> = {
  registration_certificate: 'Certificat de înregistrare',
  fiscal_record: 'Cazier fiscal',
  id_copy: 'Copie act de identitate',
  other: 'Alt document',
};

function docLabel(type: string) {
  return DOC_TYPE_LABELS[type] ?? type;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Shared reject modal ──────────────────────────────────────────────────────

function RejectModal({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">Poți adăuga un motiv opțional.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Motivul respingerii (opțional)"
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Respinge
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="h-12 w-12 mb-3 text-gray-200" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Tab 1: Company Applications ─────────────────────────────────────────────

function ApplicationsTab() {
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ pendingCompanyApplications: Company[] }>(
    PENDING_COMPANY_APPLICATIONS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [approveCompany, { loading: approving }] = useMutation(APPROVE_COMPANY, {
    onCompleted: () => { void refetch(); },
  });
  const [rejectCompany, { loading: rejecting }] = useMutation(REJECT_COMPANY, {
    onCompleted: () => { void refetch(); setRejectModal(null); },
  });

  const companies = data?.pendingCompanyApplications ?? [];

  if (loading) return <LoadingSpinner />;
  if (!companies.length) return <EmptyState icon={Building2} message="Nu există aplicații în așteptare" />;

  return (
    <>
      <div className="space-y-3">
        {companies.map((c) => {
          const docsApproved = c.documents.filter((d) => d.status === 'APPROVED').length;
          const docsTotal = c.documents.length;
          const allDocsReady = docsTotal > 0 && docsApproved === docsTotal;
          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-900">{c.companyName}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {c.companyType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">CUI: {c.cui} · {c.city}, {c.county}</p>
                  <p className="text-xs text-gray-400">Înregistrat: {formatDate(c.createdAt)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allDocsReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {docsApproved}/{docsTotal} documente aprobate
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    to={`/admin/companii/${c.id}?tab=documente`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Revizuiește
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                  {allDocsReady && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void approveCompany({ variables: { id: c.id } })}
                        disabled={approving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprobă
                      </button>
                      <button
                        onClick={() => setRejectModal(c.id)}
                        disabled={rejecting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Respinge
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {rejectModal && (
        <RejectModal
          title="Respinge aplicația companiei"
          loading={rejecting}
          onCancel={() => setRejectModal(null)}
          onConfirm={(reason) =>
            void rejectCompany({ variables: { id: rejectModal, reason: reason || 'Aplicație respinsă.' } })
          }
        />
      )}
    </>
  );
}

// ─── Tab 2: Company Documents ─────────────────────────────────────────────────

function CompanyDocsTab() {
  const apiBase =
    (import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined)?.replace('/query', '') ??
    'http://localhost:8080';

  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ pendingCompanyDocuments: CompanyDoc[] }>(
    PENDING_COMPANY_DOCUMENTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [reviewDoc, { loading: reviewing }] = useMutation(REVIEW_COMPANY_DOCUMENT, {
    onCompleted: () => { void refetch(); setRejectModal(null); },
  });

  const docs = data?.pendingCompanyDocuments ?? [];

  if (loading) return <LoadingSpinner />;
  if (!docs.length) return <EmptyState icon={FileText} message="Nu există documente în așteptare" />;

  return (
    <>
      <div className="space-y-3">
        {docs.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900 truncate">{doc.fileName}</span>
                </div>
                <p className="text-xs text-gray-500">{docLabel(doc.documentType)}</p>
                <Link
                  to={`/admin/companii/${doc.company.id}?tab=documente`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {doc.company.companyName}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`${apiBase}/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                  title="Vizualizează"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => void reviewDoc({ variables: { id: doc.id, approved: true } })}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprobă
                </button>
                <button
                  onClick={() => setRejectModal(doc.id)}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Respinge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rejectModal && (
        <RejectModal
          title="Respinge documentul"
          loading={reviewing}
          onCancel={() => setRejectModal(null)}
          onConfirm={(reason) =>
            void reviewDoc({
              variables: { id: rejectModal, approved: false, rejectionReason: reason || undefined },
            })
          }
        />
      )}
    </>
  );
}

// ─── Tab 3: Worker Documents ──────────────────────────────────────────────────

function WorkerDocsTab() {
  const apiBase =
    (import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined)?.replace('/query', '') ??
    'http://localhost:8080';

  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ pendingWorkerDocuments: WorkerDoc[] }>(
    PENDING_WORKER_DOCUMENTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [reviewDoc, { loading: reviewing }] = useMutation(REVIEW_WORKER_DOCUMENT, {
    onCompleted: () => { void refetch(); setRejectModal(null); },
  });

  const docs = data?.pendingWorkerDocuments ?? [];

  if (loading) return <LoadingSpinner />;
  if (!docs.length) return <EmptyState icon={Users} message="Nu există documente angajați în așteptare" />;

  return (
    <>
      <div className="space-y-3">
        {docs.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900 truncate">{doc.fileName}</span>
                </div>
                <p className="text-xs text-gray-500">{docLabel(doc.documentType)}</p>
                <p className="text-xs text-blue-600">{doc.worker.fullName}</p>
                {doc.worker.company && (
                  <p className="text-xs text-gray-400">{doc.worker.company.companyName}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`${apiBase}/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                  title="Vizualizează"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => void reviewDoc({ variables: { id: doc.id, approved: true } })}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprobă
                </button>
                <button
                  onClick={() => setRejectModal(doc.id)}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Respinge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rejectModal && (
        <RejectModal
          title="Respinge documentul angajatului"
          loading={reviewing}
          onCancel={() => setRejectModal(null)}
          onConfirm={(reason) =>
            void reviewDoc({
              variables: { id: rejectModal, approved: false, rejectionReason: reason || undefined },
            })
          }
        />
      )}
    </>
  );
}

// ─── Tab 4: Category Requests ─────────────────────────────────────────────────

function CategoryRequestsTab() {
  const { i18n } = useTranslation();
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ pendingCategoryRequests: CategoryRequest[] }>(
    PENDING_CATEGORY_REQUESTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [reviewRequest, { loading: reviewing }] = useMutation(REVIEW_CATEGORY_REQUEST, {
    onCompleted: () => { void refetch(); setRejectModal(null); },
  });

  const requests = data?.pendingCategoryRequests ?? [];

  if (loading) return <LoadingSpinner />;
  if (!requests.length) return <EmptyState icon={Tag} message="Nu există cereri de categorii în așteptare" />;

  return (
    <>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{req.company.companyName}</span>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    {req.category.icon} {i18n.language === 'en' ? req.category.nameEn : req.category.nameRo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      req.requestType === 'ACTIVATE'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {req.requestType === 'ACTIVATE' ? 'Activare' : 'Dezactivare'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => void reviewRequest({ variables: { requestId: req.id, action: 'APPROVE' } })}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprobă
                </button>
                <button
                  onClick={() => setRejectModal(req.id)}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Respinge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rejectModal && (
        <RejectModal
          title="Respinge cererea de categorie"
          loading={reviewing}
          onCancel={() => setRejectModal(null)}
          onConfirm={(note) =>
            void reviewRequest({
              variables: { requestId: rejectModal, action: 'REJECT', note: note || undefined },
            })
          }
        />
      )}
    </>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as QueueTab | null;
  const [activeTab, setActiveTab] = useState<QueueTab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'aplicatii',
  );

  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'aplicatii' ? {} : { tab }, { replace: true });
  };

  const activeTabConfig = TABS.find((t) => t.value === activeTab)!;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-blue-50">
            <Inbox className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aprobări</h1>
        </div>
        <p className="text-gray-500 text-sm ml-11">
          Toate acțiunile care necesită revizuire — aplicații, documente și cereri de categorii.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleTabChange(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <activeTabConfig.icon className="h-4 w-4" />
        <span>
          {activeTab === 'aplicatii' && 'Companii noi care așteaptă aprobare. Verifică documentele înainte de a activa.'}
          {activeTab === 'documente-companie' && 'Documente încărcate de companii — aprobă sau respinge individual.'}
          {activeTab === 'documente-angajat' && 'Documente încărcate de angajați — necesare pentru activarea contului.'}
          {activeTab === 'categorii' && 'Cereri pentru adăugarea sau eliminarea categoriilor de servicii.'}
        </span>
      </div>

      {/* Tab content */}
      {activeTab === 'aplicatii' && <ApplicationsTab />}
      {activeTab === 'documente-companie' && <CompanyDocsTab />}
      {activeTab === 'documente-angajat' && <WorkerDocsTab />}
      {activeTab === 'categorii' && <CategoryRequestsTab />}
    </div>
  );
}
