import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, XCircle, MapPin, Star, Search } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import {
  PENDING_COMPANY_APPLICATIONS,
  SEARCH_COMPANIES,
  APPROVE_COMPANY,
  REJECT_COMPANY,
} from '@/graphql/operations';

type Tab = 'pending' | 'approved' | 'all';

const PAGE_SIZE = 20;

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
}

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; companyId: string }>({
    open: false,
    companyId: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvedPage, setApprovedPage] = useState(0);
  const [allPage, setAllPage] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset pagination when search changes
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      setApprovedPage(0);
      setAllPage(0);
      prevSearchRef.current = debouncedSearch;
    }
  }, [debouncedSearch]);

  // Pending applications (no search/pagination)
  const { data: pendingData, loading: pendingLoading } = useQuery(PENDING_COMPANY_APPLICATIONS);

  // Approved companies via SEARCH_COMPANIES
  const { data: approvedData, loading: approvedLoading } = useQuery(SEARCH_COMPANIES, {
    variables: {
      query: debouncedSearch || undefined,
      status: 'APPROVED',
      limit: PAGE_SIZE,
      offset: approvedPage * PAGE_SIZE,
    },
  });

  // All companies via SEARCH_COMPANIES
  const { data: allData, loading: allLoading } = useQuery(SEARCH_COMPANIES, {
    variables: {
      query: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: allPage * PAGE_SIZE,
    },
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

  const approvedTotalPages = Math.max(1, Math.ceil(approvedTotalCount / PAGE_SIZE));
  const allTotalPages = Math.max(1, Math.ceil(allTotalCount / PAGE_SIZE));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'In asteptare', count: pendingApps.length },
    { key: 'approved', label: 'Aprobate', count: approvedTotalCount },
    { key: 'all', label: 'Toate', count: allTotalCount },
  ];

  const loading =
    activeTab === 'pending'
      ? pendingLoading
      : activeTab === 'approved'
        ? approvedLoading
        : allLoading;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Companii</h1>
        <p className="text-gray-500 mt-1">Gestioneaza companiile de pe platforma.</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa nume companie sau CUI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Tab */}
      {!loading && activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingApps.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 py-8">
                Nu exista aplicatii in asteptare.
              </p>
            </Card>
          ) : (
            pendingApps.map((app) => (
              <Card key={app.id}>
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start gap-4 cursor-pointer flex-1"
                    onClick={() => navigate(`/admin/companii/${app.id}`)}
                  >
                    <div className="p-3 rounded-xl bg-accent/10">
                      <Building2 className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.companyName}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        CUI: {app.cui} &middot; {app.companyType}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {app.city}, {app.county}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Reprezentant: {app.legalRepresentative}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Depusa pe {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApprove(app.id)}
                      loading={approving}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aproba
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRejectModal({ open: true, companyId: app.id })}
                    >
                      <XCircle className="h-4 w-4" />
                      Respinge
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Approved Tab */}
      {!loading && activeTab === 'approved' && (
        <div className="space-y-4">
          {approvedCompanies.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 py-8">
                {debouncedSearch
                  ? 'Nicio companie gasita pentru cautarea curenta.'
                  : 'Nu exista companii aprobate.'}
              </p>
            </Card>
          ) : (
            <>
              {approvedCompanies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  onClick={() => navigate(`/admin/companii/${company.id}`)}
                />
              ))}
              <Pagination
                currentPage={approvedPage}
                totalPages={approvedTotalPages}
                totalCount={approvedTotalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setApprovedPage}
              />
            </>
          )}
        </div>
      )}

      {/* All Tab */}
      {!loading && activeTab === 'all' && (
        <div className="space-y-4">
          {allCompanies.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 py-8">
                {debouncedSearch
                  ? 'Nicio companie gasita pentru cautarea curenta.'
                  : 'Nu exista companii.'}
              </p>
            </Card>
          ) : (
            <>
              {allCompanies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  onClick={() => navigate(`/admin/companii/${company.id}`)}
                />
              ))}
              <Pagination
                currentPage={allPage}
                totalPages={allTotalPages}
                totalCount={allTotalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setAllPage}
              />
            </>
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
        title="Respinge aplicatia"
      >
        <div className="space-y-4">
          <Input
            label="Motivul respingerii"
            placeholder="Explica motivul respingerii..."
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
              Anuleaza
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              loading={rejecting}
              disabled={!rejectReason.trim()}
            >
              Respinge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CompanyRow({ company, onClick }: { company: CompanyEdge; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{company.companyName}</h3>
            <p className="text-sm text-gray-500">
              CUI: {company.cui} &middot; {company.companyType}
            </p>
            <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {company.city}, {company.county}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {company.ratingAvg != null && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="h-4 w-4 text-accent fill-accent" />
              {Number(company.ratingAvg).toFixed(1)}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {company.totalJobsCompleted} lucrari
          </div>
          <Badge variant={statusVariant[company.status] ?? 'default'}>
            {statusLabel[company.status] ?? company.status}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const from = currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, totalCount);

  if (totalCount <= pageSize) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-gray-500">
        {from}-{to} din {totalCount} companii
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-gray-600 px-2">
          {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Urmator
        </Button>
      </div>
    </div>
  );
}
