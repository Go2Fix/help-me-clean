import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { Wallet, Plus, Search } from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ALL_PAYOUTS,
  CREATE_MONTHLY_PAYOUT,
  SEARCH_COMPANIES,
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

const payoutStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
};

const payoutStatusLabel: Record<string, string> = {
  PENDING: 'In asteptare',
  PROCESSING: 'Se proceseaza',
  PAID: 'Platit',
  FAILED: 'Esuat',
};

const statusOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'PROCESSING', label: 'Se proceseaza' },
  { value: 'PAID', label: 'Platit' },
  { value: 'FAILED', label: 'Esuat' },
];

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
  const paginatedPayouts = payouts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plati catre companii</h1>
            <p className="text-gray-500 mt-1">
              Gestioneaza platile lunare catre companiile partenere.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Creeaza plata lunara
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6 w-48">
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          placeholder="Filtreaza dupa status"
        />
      </div>

      {/* Payouts List */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Toate platile</h3>
          {totalCount > 0 && (
            <Badge variant="info">{totalCount}</Badge>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Se incarca platile..." />
        ) : payouts.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nu exista plati.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">Companie</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Perioada</th>
                    <th className="pb-3 font-medium text-right">Suma</th>
                    <th className="pb-3 font-medium text-center">Rezervari</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Data platii</th>
                    <th className="pb-3 font-medium">Creat pe</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-900">
                        {payout.company?.companyName ?? '-'}
                      </td>
                      <td className="py-3 text-gray-600 hidden md:table-cell">
                        {formatDate(payout.periodFrom)} - {formatDate(payout.periodTo)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        {formatCents(payout.amount)}
                      </td>
                      <td className="py-3 text-center text-gray-600">
                        {payout.bookingCount}
                      </td>
                      <td className="py-3 text-gray-600 hidden md:table-cell">
                        {payout.paidAt ? formatDate(payout.paidAt) : '\u2014'}
                      </td>
                      <td className="py-3 text-gray-600">
                        {formatDate(payout.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <Badge variant={payoutStatusVariant[payout.status] ?? 'default'}>
                          {payoutStatusLabel[payout.status] ?? payout.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={page}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              noun="plati"
            />
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
