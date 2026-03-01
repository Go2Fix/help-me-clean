import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  FileText,
  Download,
  Plus,
  TrendingUp,
  Banknote,
  Send,
  XCircle,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Search,
  X,
  Calendar,
  Receipt,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatCents, formatDate } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import {
  ALL_INVOICES,
  GENERATE_COMMISSION_INVOICE,
  GENERATE_CREDIT_NOTE,
  INVOICE_ANALYTICS,
  CANCEL_INVOICE,
  MARK_INVOICE_AS_PAID,
  TRANSMIT_TO_EFACTURA,
  REFRESH_EFACTURA_STATUS,
  SEARCH_COMPANIES,
} from '@/graphql/operations';

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  return { from, to };
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoiceType: string;
  invoiceNumber: string;
  status: string;
  sellerCompanyName: string;
  buyerName: string;
  totalAmount: number;
  currency: string;
  efacturaStatus: string | null;
  downloadUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

interface InvoiceAnalyticsData {
  totalIssued: number;
  totalAmount: number;
  totalVat: number;
  byStatus: { status: string; count: number; totalAmount: number }[];
  byType: { type: string; count: number; totalAmount: number }[];
}

interface CompanyOption {
  id: string;
  companyName: string;
  cui: string;
}

// ─── Status Maps ───────────────────────────────────────────────────────────

const invoiceStatusDotColor: Record<string, string> = {
  DRAFT: 'bg-gray-400',
  ISSUED: 'bg-blue-400',
  SENT: 'bg-blue-500',
  TRANSMITTED: 'bg-amber-400',
  PAID: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
  CREDIT_NOTE: 'bg-indigo-400',
};

const invoiceStatusLabel: Record<string, string> = {
  DRAFT: 'Ciorna',
  ISSUED: 'Emisa',
  SENT: 'Trimisa',
  TRANSMITTED: 'Transmisa e-Factura',
  PAID: 'Platita',
  CANCELLED: 'Anulata',
  CREDIT_NOTE: 'Nota de credit',
};

const invoiceTypeLabel: Record<string, string> = {
  CLIENT_SERVICE: 'Serviciu client',
  PLATFORM_COMMISSION: 'Comision platforma',
};

const efacturaStatusLabel: Record<string, string> = {
  NOT_SENT: 'Netransmisa',
  transmitted: 'Transmisa',
  accepted: 'Acceptata',
  rejected: 'Respinsa',
  error: 'Eroare',
};

const statusOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'DRAFT', label: 'Ciorna' },
  { value: 'ISSUED', label: 'Emisa' },
  { value: 'SENT', label: 'Trimisa' },
  { value: 'TRANSMITTED', label: 'Transmisa e-Factura' },
  { value: 'PAID', label: 'Platita' },
  { value: 'CANCELLED', label: 'Anulata' },
  { value: 'CREDIT_NOTE', label: 'Nota de credit' },
];

const typeOptions = [
  { value: '', label: 'Toate tipurile' },
  { value: 'CLIENT_SERVICE', label: 'Serviciu client' },
  { value: 'PLATFORM_COMMISSION', label: 'Comision platforma' },
];

// ─── Company Search Dropdown ───────────────────────────────────────────────

function CompanySearchDropdown({
  selectedCompanyId,
  selectedCompanyName,
  onSelect,
  onClear,
}: {
  selectedCompanyId: string;
  selectedCompanyName: string;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(searchText, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [searchCompanies, { data: searchData, loading: searching }] =
    useLazyQuery(SEARCH_COMPANIES);

  useEffect(() => {
    if (debouncedSearch.length >= 1) {
      searchCompanies({ variables: { query: debouncedSearch, limit: 10 } });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedSearch, searchCompanies]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const companies: CompanyOption[] = searchData?.searchCompanies?.edges ?? [];

  if (selectedCompanyId) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Companie
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
          <span className="text-gray-900 truncate flex-1">{selectedCompanyName}</span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Sterge filtrul"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Companie
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => {
            if (debouncedSearch.length >= 1) setIsOpen(true);
          }}
          placeholder="Cauta companie..."
          className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {searching ? (
            <div className="px-4 py-3 text-sm text-gray-500">Se cauta...</div>
          ) : companies.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Niciun rezultat</div>
          ) : (
            companies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  onSelect(company.id, company.companyName);
                  setSearchText('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="font-medium text-gray-900">{company.companyName}</span>
                <span className="ml-2 text-gray-400">CUI: {company.cui}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AdminInvoicesPage() {
  const monthRange = getMonthRange();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dateFrom, setDateFrom] = useState(monthRange.from);
  const [dateTo, setDateTo] = useState(monthRange.to);

  // Pagination
  const [page, setPage] = useState(0);

  // Commission invoice modal
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [payoutIdForCommission, setPayoutIdForCommission] = useState('');

  // Credit note modal
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [creditInvoiceId, setCreditInvoiceId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<string | null>(null);

  // Reset page when filters change
  const resetPage = () => setPage(0);

  // Analytics
  const { data: analyticsData, loading: analyticsLoading } = useQuery(INVOICE_ANALYTICS, {
    variables: { from: dateFrom, to: dateTo },
  });

  // Invoices list
  const { data, loading, refetch } = useQuery(ALL_INVOICES, {
    variables: {
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      companyId: companyId || undefined,
      first: PAGE_SIZE,
    },
  });

  const [generateCommission, { loading: generatingCommission }] = useMutation(
    GENERATE_COMMISSION_INVOICE,
    {
      onCompleted: () => {
        setCommissionModalOpen(false);
        setPayoutIdForCommission('');
        refetch();
      },
    },
  );

  const [generateCreditNote, { loading: generatingCredit }] = useMutation(
    GENERATE_CREDIT_NOTE,
    {
      onCompleted: () => {
        setCreditNoteModalOpen(false);
        setCreditInvoiceId('');
        setCreditAmount('');
        setCreditReason('');
        refetch();
      },
    },
  );

  const [cancelInvoice, { loading: cancelling }] = useMutation(CANCEL_INVOICE, {
    onCompleted: () => {
      setCancelModalOpen(false);
      setCancelInvoiceId(null);
      refetch();
    },
  });

  const [transmitToEfactura, { loading: transmitting }] = useMutation(TRANSMIT_TO_EFACTURA, {
    onCompleted: () => refetch(),
  });

  const [refreshEfacturaStatus, { loading: refreshing }] = useMutation(REFRESH_EFACTURA_STATUS, {
    onCompleted: () => refetch(),
  });

  const [markAsPaid, { loading: markingPaid }] = useMutation(MARK_INVOICE_AS_PAID, {
    refetchQueries: ['AllInvoices', 'InvoiceAnalytics'],
  });

  const analytics: InvoiceAnalyticsData | null = analyticsData?.invoiceAnalytics ?? null;
  const allInvoices: Invoice[] = data?.allInvoices?.edges ?? [];
  const totalCount: number = data?.allInvoices?.totalCount ?? 0;

  // Client-side date filtering + pagination
  const filteredInvoices = allInvoices.filter((inv) => {
    const invDate = (inv.issuedAt || inv.createdAt).split('T')[0];
    if (dateFrom && invDate < dateFrom) return false;
    if (dateTo && invDate > dateTo) return false;
    return true;
  });

  const filteredTotal = filteredInvoices.length;
  const paginatedInvoices = filteredInvoices.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  // Handlers
  const handleGenerateCommission = () => {
    if (!payoutIdForCommission) return;
    generateCommission({ variables: { payoutId: payoutIdForCommission } });
  };

  const handleGenerateCreditNote = () => {
    if (!creditInvoiceId || !creditAmount || !creditReason) return;
    generateCreditNote({
      variables: {
        invoiceId: creditInvoiceId,
        amount: Math.round(parseFloat(creditAmount) * 100),
        reason: creditReason,
      },
    });
  };

  const handleCancel = async () => {
    if (!cancelInvoiceId) return;
    try {
      await cancelInvoice({ variables: { id: cancelInvoiceId } });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleTransmit = async (invoiceId: string) => {
    try {
      await transmitToEfactura({ variables: { id: invoiceId } });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleRefreshEfactura = async (invoiceId: string) => {
    try {
      await refreshEfacturaStatus({ variables: { id: invoiceId } });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await markAsPaid({ variables: { id: invoiceId } });
    } catch {
      // Error handled by Apollo
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
        <p className="text-gray-500 mt-1">Gestioneaza toate facturile emise pe platforma.</p>
      </div>

      {/* Analytics Summary */}
      {analyticsLoading ? (
        <Card className="mb-6">
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
      ) : analytics ? (
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {[
              { icon: FileText, label: 'Facturi emise', value: String(analytics.totalIssued) },
              { icon: Banknote, label: 'Valoare totala', value: formatCents(analytics.totalAmount) },
              { icon: TrendingUp, label: 'TVA total', value: formatCents(analytics.totalVat) },
              { icon: Receipt, label: 'Total platforma', value: `${totalCount} facturi` },
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 py-3 ${idx > 0 ? 'md:pl-6' : ''}`}>
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <item.icon className="h-4.5 w-4.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 leading-tight">{item.label}</p>
                  <p className="text-lg font-semibold text-gray-900 leading-tight">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          />
        </div>
        <div className="w-56">
          <CompanySearchDropdown
            selectedCompanyId={companyId}
            selectedCompanyName={companyName}
            onSelect={(id, name) => { setCompanyId(id); setCompanyName(name); resetPage(); }}
            onClear={() => { setCompanyId(''); setCompanyName(''); resetPage(); }}
          />
        </div>
        <div className="flex items-end gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
          />
          <span className="text-gray-400 pb-2.5">&mdash;</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
          />
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreditNoteModalOpen(true)}>
            <FileText className="h-4 w-4" />
            Nota de credit
          </Button>
          <Button size="sm" onClick={() => setCommissionModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Factura comision
          </Button>
        </div>
      </div>

      {/* Invoices flat list */}
      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-2.5 w-2.5 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nu exista facturi.</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedInvoices.map((invoice) => {
                const efStatus = invoice.efacturaStatus || 'NOT_SENT';

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${invoiceStatusDotColor[invoice.status] ?? 'bg-gray-300'}`} />
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {invoiceTypeLabel[invoice.invoiceType] ?? invoice.invoiceType}
                    </span>
                    <span className="hidden md:block text-sm text-gray-700 truncate max-w-[140px]" title={invoice.buyerName}>
                      {invoice.buyerName}
                    </span>
                    <span className="flex-1" />
                    {efStatus !== 'NOT_SENT' && (
                      <span className="hidden md:block text-xs text-gray-400 shrink-0">
                        eF: {efacturaStatusLabel[efStatus] ?? efStatus}
                      </span>
                    )}
                    <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(invoice.issuedAt || invoice.createdAt)}
                    </span>
                    <span className="text-sm font-medium text-gray-900 shrink-0 w-20 text-right">
                      {formatCents(invoice.totalAmount)}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0 w-28 text-right hidden sm:block">
                      {invoiceStatusLabel[invoice.status] ?? invoice.status}
                    </span>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {invoice.downloadUrl && (
                        <a
                          href={invoice.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Descarca PDF"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {invoice.status !== 'CANCELLED' &&
                        (!invoice.efacturaStatus ||
                          invoice.efacturaStatus === 'NOT_SENT' ||
                          invoice.efacturaStatus === 'error') && (
                          <button
                            onClick={() => handleTransmit(invoice.id)}
                            disabled={transmitting}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Transmite la e-Factura"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                      {invoice.efacturaStatus &&
                        invoice.efacturaStatus !== 'NOT_SENT' &&
                        invoice.efacturaStatus !== 'accepted' && (
                          <button
                            onClick={() => handleRefreshEfactura(invoice.id)}
                            disabled={refreshing}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Actualizeaza status e-Factura"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      {(invoice.status === 'ISSUED' || invoice.status === 'TRANSMITTED') && (
                        <button
                          onClick={() => handleMarkAsPaid(invoice.id)}
                          disabled={markingPaid}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Marcheaza platita"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {invoice.status !== 'CANCELLED' &&
                        invoice.status !== 'PAID' &&
                        invoice.status !== 'CREDIT_NOTE' && (
                          <button
                            onClick={() => {
                              setCancelInvoiceId(invoice.id);
                              setCancelModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Anuleaza factura"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4">
              <AdminPagination
                page={page}
                totalCount={filteredTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                noun="facturi"
              />
            </div>
          </>
        )}
      </Card>

      {/* Cancel Invoice Confirmation Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelInvoiceId(null);
        }}
        title="Confirma anularea"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Esti sigur ca doresti sa anulezi aceasta factura? Aceasta actiune nu poate fi anulata.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelInvoiceId(null);
              }}
            >
              Renunta
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling}>
              <XCircle className="h-4 w-4" />
              Anuleaza factura
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Commission Invoice Modal */}
      <Modal
        open={commissionModalOpen}
        onClose={() => setCommissionModalOpen(false)}
        title="Genereaza factura comision"
      >
        <div className="space-y-4">
          <Input
            label="ID Payout (plata lunara)"
            value={payoutIdForCommission}
            onChange={(e) => setPayoutIdForCommission(e.target.value)}
            placeholder="ex. uuid-payout"
          />
          <p className="text-sm text-gray-500">
            Se va genera o factura de comision pe baza platii lunare selectate.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCommissionModalOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleGenerateCommission}
              loading={generatingCommission}
              disabled={!payoutIdForCommission}
            >
              Genereaza factura
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credit Note Modal */}
      <Modal
        open={creditNoteModalOpen}
        onClose={() => setCreditNoteModalOpen(false)}
        title="Emite nota de credit"
      >
        <div className="space-y-4">
          <Input
            label="ID Factura originala"
            value={creditInvoiceId}
            onChange={(e) => setCreditInvoiceId(e.target.value)}
            placeholder="ex. uuid-factura"
          />
          <Input
            label="Suma (lei)"
            type="number"
            step="0.01"
            min="0"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="ex. 150.00"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motiv
            </label>
            <textarea
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              rows={3}
              placeholder="Descrie motivul notei de credit..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreditNoteModalOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleGenerateCreditNote}
              loading={generatingCredit}
              disabled={!creditInvoiceId || !creditAmount || !creditReason}
            >
              Emite nota de credit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
