import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { Plus, Search, Calendar, Download } from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate, exportToCSV } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import {
  ALL_PAYOUTS,
  CREATE_MONTHLY_PAYOUT,
  SEARCH_COMPANIES,
  UPDATE_PAYOUT_STATUS,
} from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Payout {
  id: string;
  amount: number;
  currency: string;
  periodFrom: string;
  periodTo: string;
  bookingCount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  company: {
    id: string;
    companyName: string;
  } | null;
}

interface CompanySearchResult {
  id: string;
  companyName: string;
  cui: string;
}

// ─── Status Maps ────────────────────────────────────────────────────────────

const payoutStatusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  PROCESSING: 'bg-blue-400',
  PAID: 'bg-emerald-500',
  FAILED: 'bg-red-400',
  CANCELLED: 'bg-gray-400',
};

const payoutStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  PROCESSING: 'Se proceseaza',
  PAID: 'Platit',
  FAILED: 'Esuat',
  CANCELLED: 'Anulat',
};

const statusOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'PROCESSING', label: 'Se proceseaza' },
  { value: 'PAID', label: 'Platit' },
  { value: 'FAILED', label: 'Esuat' },
  { value: 'CANCELLED', label: 'Anulat' },
];

// Allowed status transitions: current status -> available next statuses
const payoutStatusTransitions: Record<string, { status: string; label: string; variant: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; confirm?: string }[]> = {
  PENDING: [
    { status: 'PROCESSING', label: 'Se proceseaza', variant: 'outline' },
    { status: 'CANCELLED', label: 'Anuleaza', variant: 'ghost', confirm: 'Esti sigur ca vrei sa anulezi aceasta plata?' },
  ],
  PROCESSING: [
    { status: 'PAID', label: 'Marcheaza platit', variant: 'primary', confirm: 'Confirmi ca plata a fost efectuata?' },
    { status: 'FAILED', label: 'Esuat', variant: 'danger' },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Modal form state
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(companySearch, 300);

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data, loading, refetch } = useQuery(ALL_PAYOUTS, {
    variables: {
      status: statusFilter || undefined,
      first: PAGE_SIZE,
    },
  });

  const [searchCompanies, { data: companiesData, loading: searchingCompanies }] =
    useLazyQuery(SEARCH_COMPANIES);

  const [createPayout, { loading: creating }] = useMutation(CREATE_MONTHLY_PAYOUT, {
    onCompleted: () => {
      setModalOpen(false);
      resetModal();
      refetch();
    },
  });

  const [updatePayoutStatus, { loading: updatingStatus }] = useMutation(UPDATE_PAYOUT_STATUS, {
    onCompleted: () => {
      refetch();
    },
  });

  // ─── Company search effect ──────────────────────────────────────────────

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchCompanies({ variables: { query: debouncedSearch, limit: 10 } });
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [debouncedSearch, searchCompanies]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Derived data ──────────────────────────────────────────────────────

  const payouts: Payout[] = data?.allPayouts ?? [];
  const totalCount = payouts.length;
  const paginatedPayouts = useMemo(
    () => payouts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [payouts, page],
  );
  const companyResults: CompanySearchResult[] =
    companiesData?.searchCompanies?.edges ?? [];

  // ─── Handlers ──────────────────────────────────────────────────────────

  function resetModal() {
    setSelectedCompany(null);
    setCompanySearch('');
    setShowDropdown(false);
    setPeriodFrom('');
    setPeriodTo('');
  }

  function handleSelectCompany(company: CompanySearchResult) {
    setSelectedCompany(company);
    setCompanySearch(company.companyName);
    setShowDropdown(false);
  }

  function handleCompanySearchChange(value: string) {
    setCompanySearch(value);
    if (selectedCompany) {
      setSelectedCompany(null);
    }
  }

  function handleCreate() {
    if (!selectedCompany || !periodFrom || !periodTo) return;
    createPayout({
      variables: {
        companyId: selectedCompany.id,
        periodFrom,
        periodTo,
      },
    });
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  function handlePayoutStatusUpdate(payoutId: string, newStatus: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    updatePayoutStatus({
      variables: {
        payoutId,
        status: newStatus,
      },
    });
  }

  return (
    <div>
      {/* Filter + Create button */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(
            payouts.map((p: Payout) => ({
              'Companie': p.company?.companyName ?? '',
              'Perioada De La': p.periodFrom,
              'Perioada Pana La': p.periodTo,
              'Suma (lei)': (p.amount / 100).toFixed(2),
              'Nr Rezervari': p.bookingCount,
              'Status': p.status,
              'Data Plata': p.paidAt ? new Date(p.paidAt).toLocaleDateString('ro-RO') : '',
              'Data Creare': new Date(p.createdAt).toLocaleDateString('ro-RO'),
            })),
            `plati-companii-${new Date().toISOString().slice(0, 10)}.csv`
          )}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Creeaza plata
        </Button>
      </div>

      {/* Payouts flat list */}
      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nu exista plati.</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${payoutStatusDotColor[payout.status] ?? 'bg-gray-300'}`} />
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                    {payout.company?.companyName ?? '-'}
                  </span>
                  <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Calendar className="h-3 w-3" />
                    {formatDate(payout.periodFrom)} – {formatDate(payout.periodTo)}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {payout.bookingCount} rez.
                  </span>
                  <span className="flex-1" />
                  {payout.paidAt && (
                    <span className="hidden md:block text-xs text-gray-400 shrink-0">
                      Platit: {formatDate(payout.paidAt)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                    {formatCents(payout.amount)}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 w-24 text-right hidden sm:block">
                    {payoutStatusLabel[payout.status] ?? payout.status}
                  </span>
                  {payoutStatusTransitions[payout.status] && (
                    <span className="flex items-center gap-1.5 shrink-0 ml-2">
                      {payoutStatusTransitions[payout.status].map((action) => (
                        <Button
                          key={action.status}
                          variant={action.variant}
                          size="sm"
                          disabled={updatingStatus}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayoutStatusUpdate(payout.id, action.status, action.confirm);
                          }}
                          className="!py-1 !px-2.5 !text-xs !rounded-lg"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4">
              <AdminPagination
                page={page}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                noun="plati"
              />
            </div>
          </>
        )}
      </Card>

      {/* Create Payout Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetModal();
        }}
        title="Creeaza plata lunara"
      >
        <div className="space-y-4">
          {/* Searchable company dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Companie
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => handleCompanySearchChange(e.target.value)}
                onFocus={() => {
                  if (companySearch.length >= 2 && !selectedCompany) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Cauta companie dupa nume sau CUI..."
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Selected company indicator */}
            {selectedCompany && (
              <p className="mt-1 text-xs text-emerald-600">
                Selectat: {selectedCompany.companyName} (CUI: {selectedCompany.cui})
              </p>
            )}

            {/* Dropdown results */}
            {showDropdown && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {searchingCompanies ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Se cauta...</div>
                ) : companyResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    Niciun rezultat gasit.
                  </div>
                ) : (
                  companyResults.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-gray-900">
                        {company.companyName}
                      </span>
                      <span className="ml-2 text-gray-400">CUI: {company.cui}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Input
            label="Perioada de la"
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
          />
          <Input
            label="Perioada pana la"
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                resetModal();
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!selectedCompany || !periodFrom || !periodTo}
            >
              Creeaza plata
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
