import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Calendar,
  Download,
  AlertCircle,
  AlertTriangle,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate, exportToCSV } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  ALL_PAYOUTS,
  TRIGGER_COMPANY_PAYOUT,
  TRIGGER_ALL_COMPANY_PAYOUTS,
  SEARCH_COMPANIES,
  UPDATE_PAYOUT_STATUS,
  UPDATE_ALL_CONNECT_PAYOUT_SCHEDULES,
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
  stripePayoutId: string | null;
  failureReason: string | null;
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

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
}

// ─── Status Maps ────────────────────────────────────────────────────────────

const payoutStatusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-400',
  PROCESSING: 'bg-blue-400',
  PAID: 'bg-emerald-500',
  FAILED: 'bg-red-400',
  CANCELLED: 'bg-gray-400',
};

// ─── Date helpers ────────────────────────────────────────────────────────────

function getBiweeklyPeriod(): { periodFrom: string; periodTo: string } {
  const today = new Date();
  const periodTo = new Date(today);
  periodTo.setDate(today.getDate() - 1);
  const periodFrom = new Date(today);
  periodFrom.setDate(today.getDate() - 14);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { periodFrom: fmt(periodFrom), periodTo: fmt(periodTo) };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const { t, i18n } = useTranslation(['dashboard', 'admin']);

  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const statusOptions = [
    { value: '', label: t('admin:payouts.allStatuses') },
    { value: 'PENDING', label: t('admin:payouts.statusLabels.PENDING') },
    { value: 'PROCESSING', label: t('admin:payouts.statusLabels.PROCESSING') },
    { value: 'PAID', label: t('admin:payouts.statusLabels.PAID') },
    { value: 'FAILED', label: t('admin:payouts.statusLabels.FAILED') },
    { value: 'CANCELLED', label: t('admin:payouts.statusLabels.CANCELLED') },
  ];

  // ─── UI state ────────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Per-company trigger modal
  const [modalOpen, setModalOpen] = useState(false);

  // Biweekly confirm dialog
  const [biweeklyConfirmOpen, setBiweeklyConfirmOpen] = useState(false);

  // Shared confirm dialog for row actions
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Override-status collapsible per row
  const [overrideOpenId, setOverrideOpenId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('');

  // Migration banner
  const [migrationDone, setMigrationDone] = useState(
    () => localStorage.getItem('payout_schedule_migrated') === 'true',
  );

  // Success banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

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

  // ─── Mutations ──────────────────────────────────────────────────────────

  const [triggerCompanyPayout, { loading: triggeringCompany }] = useMutation(
    TRIGGER_COMPANY_PAYOUT,
    {
      onCompleted: () => {
        setModalOpen(false);
        resetModal();
        refetch();
        setSuccessBanner('Plata a fost declanșată cu succes. Stripe confirmă în câteva minute.');
      },
    },
  );

  const [triggerAllPayouts, { loading: triggeringAll }] = useMutation(TRIGGER_ALL_COMPANY_PAYOUTS, {
    onCompleted: (result) => {
      const r = result?.triggerAllCompanyPayouts;
      if (r) {
        const totalAmount = (r.succeeded ?? []).reduce(
          (acc: number, p: Payout) => acc + p.amount,
          0,
        );
        setSuccessBanner(
          `Plăți declanșate pentru ${r.succeeded?.length ?? 0} companii (${formatCents(totalAmount)} lei). Stripe confirmă în câteva minute.`,
        );
      }
      setBiweeklyConfirmOpen(false);
      refetch();
    },
  });

  const [updatePayoutStatus, { loading: updatingStatus }] = useMutation(UPDATE_PAYOUT_STATUS, {
    onCompleted: () => {
      setOverrideOpenId(null);
      setOverrideStatus('');
      refetch();
    },
  });

  const [updateSchedules, { loading: updatingSchedules }] = useMutation(
    UPDATE_ALL_CONNECT_PAYOUT_SCHEDULES,
    {
      onCompleted: () => {
        localStorage.setItem('payout_schedule_migrated', 'true');
        setMigrationDone(true);
        setSuccessBanner('Programele de plată Stripe au fost actualizate la manual.');
      },
    },
  );

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

  // Auto-dismiss success banner
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => setSuccessBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // ─── Derived data ──────────────────────────────────────────────────────

  const payouts: Payout[] = data?.allPayouts ?? [];
  const totalCount = payouts.length;
  const paginatedPayouts = useMemo(
    () => payouts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [payouts, page],
  );
  const companyResults: CompanySearchResult[] = companiesData?.searchCompanies?.edges ?? [];

  const failedPayouts = useMemo(() => payouts.filter((p) => p.status === 'FAILED'), [payouts]);
  const failedPayoutsTotal = useMemo(
    () => failedPayouts.reduce((acc, p) => acc + p.amount, 0),
    [failedPayouts],
  );

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

  function handleTriggerCompany() {
    if (!selectedCompany || !periodFrom || !periodTo) return;
    triggerCompanyPayout({
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

  function handleUpdateStatus(payoutId: string, newStatus: string) {
    updatePayoutStatus({ variables: { payoutId, status: newStatus } });
  }

  function handleRetryPayout(payout: Payout) {
    if (!payout.company) return;
    triggerCompanyPayout({
      variables: {
        companyId: payout.company.id,
        periodFrom: payout.periodFrom,
        periodTo: payout.periodTo,
      },
    });
  }

  function handleTriggerAll() {
    const { periodFrom: pf, periodTo: pt } = getBiweeklyPeriod();
    triggerAllPayouts({ variables: { periodFrom: pf, periodTo: pt } });
  }

  function handleUpdateSchedules() {
    updateSchedules();
  }

  // ─── Row actions renderer ───────────────────────────────────────────────

  function renderActions(payout: Payout) {
    switch (payout.status) {
      case 'PENDING':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground !py-1 !px-2.5 !text-xs !rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmState({
                open: true,
                title: 'Anulează plata',
                description: `Anulezi plata de ${formatCents(payout.amount)} pentru ${payout.company?.companyName}?`,
                confirmLabel: 'Anulează plata',
                variant: 'danger',
                onConfirm: () => {
                  setConfirmState(null);
                  handleUpdateStatus(payout.id, 'CANCELLED');
                },
              });
            }}
          >
            Anulează
          </Button>
        );
      case 'PROCESSING':
        return (
          <span className="text-xs text-gray-400 italic flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Așteptăm Stripe
          </span>
        );
      case 'FAILED':
        return (
          <button
            className="inline-flex items-center justify-center gap-1 rounded-xl font-semibold transition-all duration-200 border-2 border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 text-xs cursor-pointer disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmState({
                open: true,
                title: 'Reîncearcă plata',
                description: `Reîncerci plata de ${formatCents(payout.amount)} pentru ${payout.company?.companyName}?`,
                confirmLabel: 'Reîncearcă',
                variant: 'primary',
                onConfirm: () => {
                  setConfirmState(null);
                  handleRetryPayout(payout);
                },
              });
            }}
          >
            Reîncearcă
          </button>
        );
      default:
        return null;
    }
  }

  // ─── Status label renderer ──────────────────────────────────────────────

  function renderStatusLabel(payout: Payout) {
    switch (payout.status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Procesare · Stripe
          </span>
        );
      case 'PAID':
        return (
          <span className="text-xs text-emerald-600">
            Plătit · {payout.paidAt ? formatDate(payout.paidAt) : '—'}
          </span>
        );
      case 'FAILED':
        return <span className="text-xs text-red-600 font-medium">Eșuat</span>;
      default:
        return (
          <span className="text-xs text-gray-500">
            {t(`admin:payouts.statusLabels.${payout.status}`, { defaultValue: payout.status })}
          </span>
        );
    }
  }

  const { periodFrom: biweeklyFrom, periodTo: biweeklyTo } = getBiweeklyPeriod();

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:payouts.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin:payouts.subtitle')}</p>
      </div>

      {/* Failed payouts alert */}
      {failedPayouts.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-red-700">
            <span className="font-semibold">Plăți eșuate — </span>
            {failedPayouts.length} plăți au eșuat —{' '}
            {formatCents(failedPayoutsTotal)} nevirate.{' '}
            <button
              onClick={() => {
                setStatusFilter('FAILED');
                setPage(0);
              }}
              className="underline font-medium cursor-pointer"
            >
              Filtrează eșuate
            </button>
          </div>
        </div>
      )}

      {/* Migration banner */}
      {!migrationDone && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Acțiune necesară</p>
            <p className="text-sm text-amber-700">
              Unele conturi Stripe sunt pe program zilnic automat. Actualizează-le la program manual.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdateSchedules}
                loading={updatingSchedules}
                className="!text-amber-700 !border-amber-300 hover:!bg-amber-100"
              >
                Actualizează toate conturile
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  localStorage.setItem('payout_schedule_migrated', 'true');
                  setMigrationDone(true);
                }}
                className="!text-amber-600"
              >
                Ignoră
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {successBanner && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700">{successBanner}</p>
        </div>
      )}

      {/* Filter + Action buttons */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
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
          onClick={() =>
            exportToCSV(
              payouts.map((p: Payout) => ({
                [t('admin:payouts.csvColumns.company')]: p.company?.companyName ?? '',
                [t('admin:payouts.csvColumns.periodFrom')]: p.periodFrom,
                [t('admin:payouts.csvColumns.periodTo')]: p.periodTo,
                [t('admin:payouts.csvColumns.amount')]: (p.amount / 100).toFixed(2),
                [t('admin:payouts.csvColumns.bookingCount')]: p.bookingCount,
                [t('admin:payouts.csvColumns.status')]: p.status,
                [t('admin:payouts.csvColumns.paidAt')]: p.paidAt
                  ? new Date(p.paidAt).toLocaleDateString(locale)
                  : '',
                [t('admin:payouts.csvColumns.createdAt')]: new Date(
                  p.createdAt,
                ).toLocaleDateString(locale),
              })),
              `plati-companii-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
        >
          <Download className="h-4 w-4" />
          {t('admin:payouts.exportCsv')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Plată pentru o companie
        </Button>
        <Button
          size="sm"
          onClick={() => setBiweeklyConfirmOpen(true)}
          loading={triggeringAll}
        >
          Declanșează plăți biweekly
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
          <p className="text-center text-gray-400 py-12">{t('admin:payouts.empty')}</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedPayouts.map((payout) => (
                <div key={payout.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${payoutStatusDotColor[payout.status] ?? 'bg-gray-300'}`}
                    />

                    {/* Company name + Stripe payout ID */}
                    <div className="min-w-0 max-w-[180px]">
                      <span className="text-sm font-semibold text-gray-900 truncate block">
                        {payout.company?.companyName ?? '-'}
                      </span>
                      {payout.stripePayoutId && (
                        <div className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                          <span>
                            {payout.stripePayoutId.slice(0, 8)}...{payout.stripePayoutId.slice(-4)}
                          </span>
                          <Copy
                            className="h-3 w-3 cursor-pointer hover:text-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(payout.stripePayoutId!);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(payout.periodFrom)} – {formatDate(payout.periodTo)}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {payout.bookingCount} {t('admin:payouts.bookingsAbbr')}
                    </span>
                    <span className="flex-1" />

                    {/* Amount + failure reason */}
                    <div className="text-right shrink-0">
                      <span className="text-sm font-medium text-gray-900 block w-20">
                        {formatCents(payout.amount)}
                      </span>
                      {payout.status === 'FAILED' && payout.failureReason && (
                        <div
                          className="text-xs text-red-600 mt-0.5 max-w-xs truncate"
                          title={payout.failureReason}
                        >
                          {payout.failureReason}
                        </div>
                      )}
                    </div>

                    {/* Status label */}
                    <span className="shrink-0 w-36 text-right hidden sm:block">
                      {renderStatusLabel(payout)}
                    </span>

                    {/* Action buttons */}
                    <span className="flex items-center gap-1.5 shrink-0 ml-2">
                      {renderActions(payout)}
                    </span>

                    {/* Override toggle */}
                    <button
                      className="ml-1 shrink-0 p-1 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                      title="Suprascrie status"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverrideOpenId(overrideOpenId === payout.id ? null : payout.id);
                        setOverrideStatus('');
                      }}
                    >
                      {overrideOpenId === payout.id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Override status section */}
                  {overrideOpenId === payout.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-medium shrink-0">
                        Suprascrie status
                      </span>
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                      >
                        <option value="">Alege status...</option>
                        {['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED']
                          .filter((s) => s !== payout.status)
                          .map((s) => (
                            <option key={s} value={s}>
                              {t(`admin:payouts.statusLabels.${s}`, { defaultValue: s })}
                            </option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!overrideStatus || updatingStatus}
                        loading={updatingStatus}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!overrideStatus) return;
                          setConfirmState({
                            open: true,
                            title: 'Suprascrie status',
                            description: `Schimbi manual statusul plății din "${payout.status}" în "${overrideStatus}"? Aceasta este o acțiune de urgență.`,
                            confirmLabel: 'Suprascrie',
                            variant: 'danger',
                            onConfirm: () => {
                              setConfirmState(null);
                              handleUpdateStatus(payout.id, overrideStatus);
                            },
                          });
                        }}
                        className="!py-1 !px-2.5 !text-xs !rounded-lg"
                      >
                        Aplică
                      </Button>
                    </div>
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
                noun={t('admin:payouts.noun')}
              />
            </div>
          </>
        )}
      </Card>

      {/* Biweekly confirm dialog */}
      <ConfirmDialog
        open={biweeklyConfirmOpen}
        onClose={() => setBiweeklyConfirmOpen(false)}
        onConfirm={handleTriggerAll}
        title="Declanșează plăți biweekly"
        description={`Perioadă: ${biweeklyFrom} – ${biweeklyTo}. Această acțiune va declanșa plăți pentru toate companiile cu tranzacții neplătite în ultimele 14 zile.`}
        confirmLabel="Declanșează plăți"
        variant="primary"
        loading={triggeringAll}
      />

      {/* Shared confirm dialog for row actions */}
      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          variant={confirmState.variant}
          loading={confirmState.loading}
        />
      )}

      {/* Per-company trigger modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetModal();
        }}
        title="Plată pentru o companie"
      >
        <div className="space-y-4">
          {/* Searchable company dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('admin:payouts.createModal.companyLabel')}
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
                placeholder={t('admin:payouts.createModal.companyPlaceholder')}
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Selected company indicator */}
            {selectedCompany && (
              <p className="mt-1 text-xs text-emerald-600">
                {t('admin:payouts.createModal.selectedCompany')}: {selectedCompany.companyName} (CUI:{' '}
                {selectedCompany.cui})
              </p>
            )}

            {/* Dropdown results */}
            {showDropdown && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {searchingCompanies ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    {t('admin:payouts.createModal.searching')}
                  </div>
                ) : companyResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    {t('admin:payouts.createModal.noResults')}
                  </div>
                ) : (
                  companyResults.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-gray-900">{company.companyName}</span>
                      <span className="ml-2 text-gray-400">CUI: {company.cui}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Input
            label={t('admin:payouts.createModal.periodFrom')}
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
          />
          <Input
            label={t('admin:payouts.createModal.periodTo')}
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
              {t('admin:payouts.createModal.dismiss')}
            </Button>
            <Button
              onClick={handleTriggerCompany}
              loading={triggeringCompany}
              disabled={!selectedCompany || !periodFrom || !periodTo}
            >
              Declanșează plată
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
