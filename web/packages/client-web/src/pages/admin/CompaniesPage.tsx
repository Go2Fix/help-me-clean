import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle, XCircle, MapPin, Star, Search, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/utils/format';
import {
  PENDING_COMPANY_APPLICATIONS,
  SEARCH_COMPANIES,
  APPROVE_COMPANY,
  REJECT_COMPANY,
  COMPANY_SCORECARDS,
} from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

type Tab = 'pending' | 'approved' | 'all' | 'performance';

const PAGE_SIZE = 20;

const statusDotColor: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-400',
  APPROVED: 'bg-emerald-500',
  SUSPENDED: 'bg-red-400',
  REJECTED: 'bg-red-400',
};

const companyTypeLabel: Record<string, string> = {
  SRL: 'SRL',
  PFA: 'PFA',
  II: 'II',
  IF: 'IF',
  SA: 'SA',
};

const REQUIRED_DOCS = ['certificat_constatator', 'asigurare_raspundere_civila', 'cui_document'];

function areDocsReady(documents: { documentType: string; status: string }[]): boolean {
  return REQUIRED_DOCS.every((type) =>
    documents.some((d) => d.documentType === type && d.status === 'APPROVED'),
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompanyEdge {
  id: string;
  companyName: string;
  cui: string;
  companyType: string;
  status: string;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  contactEmail: string;
  contactPhone: string;
  city: string;
  county: string;
  createdAt: string;
}

interface Scorecard {
  id: string;
  companyName: string;
  status: string;
  completedCount: number;
  cancelledCount: number;
  totalBookings: number;
  totalRevenue: number;
  completionRate: number;
  cancellationRate: number;
  avgRating: number;
  reviewCount: number;
}

interface PendingApp {
  id: string;
  companyName: string;
  cui: string;
  companyType: string;
  legalRepresentative: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  county: string;
  description: string;
  status: string;
  createdAt: string;
  documents: { id: string; documentType: string; status: string }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'admin']);

  const tabOptions = [
    { value: 'pending', label: t('admin:companies.tabs.pending') },
    { value: 'approved', label: t('admin:companies.tabs.approved') },
    { value: 'all', label: t('admin:companies.tabs.all') },
    { value: 'performance', label: t('admin:companies.tabs.performance') },
  ];

  const statusFilterOptions = [
    { value: '', label: t('admin:companies.statusFilter.allStatuses') },
    { value: 'PENDING_REVIEW', label: t('admin:companies.statusFilter.pendingReview') },
    { value: 'APPROVED', label: t('admin:companies.statusFilter.approved') },
    { value: 'SUSPENDED', label: t('admin:companies.statusFilter.suspended') },
    { value: 'REJECTED', label: t('admin:companies.statusFilter.rejected') },
  ];

  function getDocHint(documents: { documentType: string; status: string }[]): string | null {
    const missing = REQUIRED_DOCS.filter((type) => !documents.some((d) => d.documentType === type));
    if (missing.length > 0) return t('admin:companies.docsHints.missing');
    const pending = REQUIRED_DOCS.filter((type) =>
      documents.some((d) => d.documentType === type && d.status === 'PENDING'),
    );
    if (pending.length > 0) return t('admin:companies.docsHints.pending');
    const rejected = REQUIRED_DOCS.filter((type) =>
      documents.some((d) => d.documentType === type && d.status === 'REJECTED'),
    );
    if (rejected.length > 0) return t('admin:companies.docsHints.rejected');
    return null;
  }

  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; companyId: string }>({
    open: false,
    companyId: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvedPage, setApprovedPage] = useState(0);
  const [allPage, setAllPage] = useState(0);
  const [sortBy, setSortBy] = useState<'revenue' | 'rating' | 'completion'>('revenue');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const prevSearchRef = useRef(debouncedSearch);
  const prevStatusRef = useRef(statusFilter);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch || prevStatusRef.current !== statusFilter) {
      setApprovedPage(0);
      setAllPage(0);
      prevSearchRef.current = debouncedSearch;
      prevStatusRef.current = statusFilter;
    }
  }, [debouncedSearch, statusFilter]);

  const { data: pendingData, loading: pendingLoading } = useQuery(PENDING_COMPANY_APPLICATIONS);

  const { data: approvedData, loading: approvedLoading } = useQuery(SEARCH_COMPANIES, {
    variables: {
      query: debouncedSearch || undefined,
      status: 'APPROVED',
      limit: PAGE_SIZE,
      offset: approvedPage * PAGE_SIZE,
    },
  });

  const { data: allData, loading: allLoading } = useQuery(SEARCH_COMPANIES, {
    variables: {
      query: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit: PAGE_SIZE,
      offset: allPage * PAGE_SIZE,
    },
  });

  const { data: scorecardsData, loading: scorecardsLoading } = useQuery(COMPANY_SCORECARDS, {
    variables: { limit: 50 },
    skip: activeTab !== 'performance',
  });

  const [approveCompany, { loading: approving }] = useMutation(APPROVE_COMPANY, {
    refetchQueries: [
      { query: PENDING_COMPANY_APPLICATIONS },
      {
        query: SEARCH_COMPANIES,
        variables: {
          query: debouncedSearch || undefined,
          status: 'APPROVED',
          limit: PAGE_SIZE,
          offset: approvedPage * PAGE_SIZE,
        },
      },
      {
        query: SEARCH_COMPANIES,
        variables: {
          query: debouncedSearch || undefined,
          status: statusFilter || undefined,
          limit: PAGE_SIZE,
          offset: allPage * PAGE_SIZE,
        },
      },
    ],
  });

  const [rejectCompany, { loading: rejecting }] = useMutation(REJECT_COMPANY, {
    refetchQueries: [
      { query: PENDING_COMPANY_APPLICATIONS },
      {
        query: SEARCH_COMPANIES,
        variables: {
          query: debouncedSearch || undefined,
          status: statusFilter || undefined,
          limit: PAGE_SIZE,
          offset: allPage * PAGE_SIZE,
        },
      },
    ],
  });

  const handleApprove = async (id: string) => {
    await approveCompany({ variables: { id } });
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    await rejectCompany({
      variables: { id: rejectModal.companyId, reason: rejectReason.trim() },
    });
    setRejectModal({ open: false, companyId: '' });
    setRejectReason('');
  };

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const pendingApps: PendingApp[] = pendingData?.pendingCompanyApplications ?? [];
  const approvedCompanies: CompanyEdge[] = approvedData?.searchCompanies?.edges ?? [];
  const approvedTotalCount: number = approvedData?.searchCompanies?.totalCount ?? 0;
  const allCompanies: CompanyEdge[] = allData?.searchCompanies?.edges ?? [];
  const allTotalCount: number = allData?.searchCompanies?.totalCount ?? 0;

  const loading =
    activeTab === 'pending'
      ? pendingLoading
      : activeTab === 'approved'
        ? approvedLoading
        : activeTab === 'performance'
          ? scorecardsLoading
          : allLoading;

  const sortOptions = [
    { value: 'revenue', label: t('admin:companies.performance.sortRevenue') },
    { value: 'rating', label: t('admin:companies.performance.sortRating') },
    { value: 'completion', label: t('admin:companies.performance.sortCompletion') },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:companies.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin:companies.subtitle')}</p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin:companies.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <Select
          options={tabOptions}
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value as Tab)}
        />
        {activeTab === 'all' && (
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        )}
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <Card padding={false}>
          {loading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-4 animate-pulse flex items-center gap-3">
                  <div className="h-9 w-9 bg-gray-200 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-28" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : pendingApps.length === 0 ? (
            <p className="text-center text-gray-400 py-16">{t('admin:companies.empty.noPending')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingApps.map((app) => {
                const docHint = getDocHint(app.documents);
                return (
                  <div key={app.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/admin/companii/${app.id}`)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Building2 className="h-4.5 w-4.5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{app.companyName}</span>
                          <span className="text-xs text-gray-400 shrink-0">{companyTypeLabel[app.companyType] ?? app.companyType}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>CUI: {app.cui}</span>
                          <span className="hidden sm:flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{app.city}, {app.county}
                          </span>
                          <span className="hidden md:inline">{app.legalRepresentative}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs text-gray-400 shrink-0 hidden md:block">
                      {formatDate(app.createdAt)}
                    </span>

                    {docHint && (
                      <span className={`text-xs shrink-0 hidden lg:block ${
                        docHint === t('admin:companies.docsHints.missing') || docHint === t('admin:companies.docsHints.rejected') ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {docHint}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApprove(app.id)}
                        loading={approving}
                        disabled={!areDocsReady(app.documents)}
                        title={!areDocsReady(app.documents) ? t('admin:companies.actions.approveDisabledTitle') : undefined}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('admin:companies.actions.approve')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRejectModal({ open: true, companyId: app.id })}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('admin:companies.actions.reject')}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Approved Tab */}
      {activeTab === 'approved' && (
        <>
          <Card padding={false}>
            {loading ? (
              <ListSkeleton />
            ) : approvedCompanies.length === 0 ? (
              <p className="text-center text-gray-400 py-16">
                {debouncedSearch ? t('admin:companies.empty.noFound') : t('admin:companies.empty.noApproved')}
              </p>
            ) : (
              <CompanyList companies={approvedCompanies} onRowClick={(id) => navigate(`/admin/companii/${id}`)} showStatus={false} statusLabel={(s) => t(`admin:companies.statusLabels.${s}`, { defaultValue: s })} />
            )}
          </Card>
          {!loading && approvedTotalCount > 0 && (
            <AdminPagination
              page={approvedPage}
              totalCount={approvedTotalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setApprovedPage}
              noun={t('admin:nav.companies').toLowerCase()}
            />
          )}
        </>
      )}

      {/* All Tab */}
      {activeTab === 'all' && (
        <>
          <Card padding={false}>
            {loading ? (
              <ListSkeleton />
            ) : allCompanies.length === 0 ? (
              <p className="text-center text-gray-400 py-16">
                {debouncedSearch || statusFilter ? t('admin:companies.empty.noFound') : t('admin:companies.empty.noCompanies')}
              </p>
            ) : (
              <CompanyList companies={allCompanies} onRowClick={(id) => navigate(`/admin/companii/${id}`)} showStatus statusLabel={(s) => t(`admin:companies.statusLabels.${s}`, { defaultValue: s })} />
            )}
          </Card>
          {!loading && allTotalCount > 0 && (
            <AdminPagination
              page={allPage}
              totalCount={allTotalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setAllPage}
              noun={t('admin:nav.companies').toLowerCase()}
            />
          )}
        </>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">{t('admin:companies.performance.sortBy')}</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortBy === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {scorecardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...(scorecardsData?.companyScorecards ?? [] as Scorecard[])]
                .sort((a: Scorecard, b: Scorecard) => {
                  if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
                  if (sortBy === 'rating') return b.avgRating - a.avgRating;
                  return b.completionRate - a.completionRate;
                })
                .map((sc: Scorecard) => (
                  <div
                    key={sc.id}
                    onClick={() => navigate(`/admin/companii/${sc.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                          {sc.companyName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('admin:companies.performance.totalBookings', { count: sc.totalBookings })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold text-amber-700">
                          {sc.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('admin:companies.performance.completionRate')}</span>
                        <span className="font-medium text-gray-700">{sc.completionRate.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(sc.completionRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('admin:companies.performance.cancellationRate')}</span>
                        <span
                          className={`font-medium ${sc.cancellationRate > 10 ? 'text-red-600' : 'text-gray-700'}`}
                        >
                          {sc.cancellationRate.toFixed(0)}%
                          {sc.cancellationRate > 10 && ` ${t('admin:companies.performance.highCancellation')}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${sc.cancellationRate > 10 ? 'bg-red-400' : 'bg-gray-300'}`}
                          style={{ width: `${Math.min(sc.cancellationRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {t('admin:companies.performance.reviews', { count: sc.reviewCount })}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(sc.totalRevenue / 100).toFixed(0)} RON
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        open={rejectModal.open}
        onClose={() => {
          setRejectModal({ open: false, companyId: '' });
          setRejectReason('');
        }}
        title={t('admin:companies.rejectModal.title')}
      >
        <div className="space-y-4">
          <Input
            label={t('admin:companies.rejectModal.reasonLabel')}
            placeholder={t('admin:companies.rejectModal.reasonPlaceholder')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectModal({ open: false, companyId: '' });
                setRejectReason('');
              }}
            >
              {t('admin:companies.rejectModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              loading={rejecting}
              disabled={!rejectReason.trim()}
            >
              {t('admin:companies.rejectModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── List Components ────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
          <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
          <div className="h-4 bg-gray-200 rounded w-36" />
          <div className="h-3 bg-gray-200 rounded w-20 hidden md:block" />
          <div className="flex-1" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function CompanyList({
  companies,
  onRowClick,
  showStatus,
  statusLabel,
}: {
  companies: CompanyEdge[];
  onRowClick: (id: string) => void;
  showStatus: boolean;
  statusLabel: (s: string) => string;
}) {
  const { t } = useTranslation('admin');
  return (
    <div className="divide-y divide-gray-100">
      {companies.map((company) => (
        <div
          key={company.id}
          onClick={() => onRowClick(company.id)}
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          {showStatus && (
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColor[company.status] ?? 'bg-gray-300'}`} />
          )}

          <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
            {company.companyName}
          </span>

          <span className="text-xs text-gray-400 shrink-0">
            {companyTypeLabel[company.companyType] ?? company.companyType}
          </span>

          <span className="flex-1" />

          <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <MapPin className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{company.city}, {company.county}</span>
          </span>

          {company.ratingAvg != null ? (
            <span className="hidden md:flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <Star className="h-3 w-3 text-accent fill-accent" />
              {Number(company.ratingAvg).toFixed(1)}
            </span>
          ) : (
            <span className="hidden md:block text-xs text-gray-300 shrink-0 w-8 text-center">—</span>
          )}

          <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
            {company.totalJobsCompleted} {t('companies.table.jobs')}
          </span>

          {showStatus && (
            <span className="text-xs text-gray-500 shrink-0 w-20 text-right hidden sm:block">
              {statusLabel(company.status)}
            </span>
          )}

          <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
        </div>
      ))}
    </div>
  );
}
