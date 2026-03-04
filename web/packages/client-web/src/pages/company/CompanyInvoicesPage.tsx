import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Send,
  XCircle,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  COMPANY_INVOICES,
  COMPANY_RECEIVED_INVOICES,
  GENERATE_BOOKING_INVOICE,
  CANCEL_INVOICE,
  TRANSMIT_TO_EFACTURA,
} from '@/graphql/operations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRON(amountCents: number): string {
  return (amountCents / 100).toFixed(2) + ' lei';
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Status Maps ──────────────────────────────────────────────────────────────

type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'TRANSMITTED' | 'PAID' | 'CANCELLED' | 'CREDIT_NOTE';

const invoiceStatusBadge: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  ISSUED: 'info',
  SENT: 'info',
  TRANSMITTED: 'warning',
  PAID: 'success',
  CANCELLED: 'danger',
  CREDIT_NOTE: 'info',
};

type EfacturaStatus = 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

const efacturaStatusBadge: Record<EfacturaStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  NOT_SENT: 'default',
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  ERROR: 'danger',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceEdge {
  id: string;
  invoiceType: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  buyerName: string;
  totalAmount: number;
  currency: string;
  efacturaStatus: EfacturaStatus | null;
  downloadUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

interface ReceivedInvoiceEdge {
  id: string;
  invoiceType: string;
  invoiceNumber: string;
  status: string;
  sellerCompanyName: string;
  buyerName: string;
  totalAmount: number;
  currency: string;
  downloadUrl: string | null;
  issuedAt: string | null;
  createdAt: string;
}

type InvoicesTab = 'issued' | 'received';

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function CompanyInvoicesPage() {
  const { t, i18n } = useTranslation(['dashboard', 'company']);
  const locale = i18n.language === 'en' ? 'en-GB' : 'ro-RO';

  const invoiceStatusLabel: Record<InvoiceStatus, string> = {
    DRAFT: t('company:invoices.status.draft'),
    ISSUED: t('company:invoices.status.issued'),
    SENT: t('company:invoices.status.sent'),
    TRANSMITTED: t('company:invoices.status.transmitted'),
    PAID: t('company:invoices.status.paid'),
    CANCELLED: t('company:invoices.status.cancelled'),
    CREDIT_NOTE: t('company:invoices.status.creditNote'),
  };

  const efacturaStatusLabel: Record<EfacturaStatus, string> = {
    NOT_SENT: t('company:invoices.efactura.notSent'),
    PENDING: t('company:invoices.efactura.pending'),
    ACCEPTED: t('company:invoices.efactura.accepted'),
    REJECTED: t('company:invoices.efactura.rejected'),
    ERROR: t('company:invoices.efactura.error'),
  };

  const statusFilterOptions = [
    { value: '', label: t('company:invoices.allStatuses') },
    { value: 'DRAFT', label: t('company:invoices.status.draft') },
    { value: 'ISSUED', label: t('company:invoices.status.issued') },
    { value: 'SENT', label: t('company:invoices.status.sent') },
    { value: 'TRANSMITTED', label: t('company:invoices.status.transmitted') },
    { value: 'PAID', label: t('company:invoices.status.paid') },
    { value: 'CANCELLED', label: t('company:invoices.status.cancelled') },
    { value: 'CREDIT_NOTE', label: t('company:invoices.status.creditNote') },
  ];

  const [activeTab, setActiveTab] = useState<InvoicesTab>('issued');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [issuedPage, setIssuedPage] = useState(0);
  const [receivedPage, setReceivedPage] = useState(0);

  // Modal state for generating an invoice
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateBookingId, setGenerateBookingId] = useState('');

  // Modal state for cancel confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<string | null>(null);

  // Queries
  const { data, loading, refetch } = useQuery(COMPANY_INVOICES, {
    variables: {
      status: statusFilter || undefined,
      first: PAGE_SIZE,
      after: issuedPage > 0 ? String(issuedPage * PAGE_SIZE) : undefined,
    },
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'issued',
  });

  const {
    data: receivedData,
    loading: receivedLoading,
  } = useQuery(COMPANY_RECEIVED_INVOICES, {
    variables: {
      first: PAGE_SIZE,
      after: receivedPage > 0 ? String(receivedPage * PAGE_SIZE) : undefined,
    },
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'received',
  });

  // Mutations
  const [generateInvoice, { loading: generating }] = useMutation(GENERATE_BOOKING_INVOICE, {
    onCompleted: () => {
      setGenerateModalOpen(false);
      setGenerateBookingId('');
      refetch();
    },
  });

  const [cancelInvoice, { loading: cancelling }] = useMutation(CANCEL_INVOICE, {
    onCompleted: () => {
      setCancelModalOpen(false);
      setCancelInvoiceId(null);
      refetch();
    },
  });

  const [transmitToEfactura, { loading: transmitting }] = useMutation(TRANSMIT_TO_EFACTURA, {
    onCompleted: () => {
      refetch();
    },
  });

  const invoices: InvoiceEdge[] = data?.companyInvoices?.edges ?? [];
  const issuedTotalCount: number = data?.companyInvoices?.totalCount ?? 0;
  const issuedTotalPages = Math.max(1, Math.ceil(issuedTotalCount / PAGE_SIZE));
  const issuedHasNext = data?.companyInvoices?.pageInfo?.hasNextPage ?? false;

  const receivedInvoices: ReceivedInvoiceEdge[] = receivedData?.companyReceivedInvoices?.edges ?? [];
  const receivedTotalCount: number = receivedData?.companyReceivedInvoices?.totalCount ?? 0;
  const receivedTotalPages = Math.max(1, Math.ceil(receivedTotalCount / PAGE_SIZE));
  const receivedHasNext = receivedData?.companyReceivedInvoices?.pageInfo?.hasNextPage ?? false;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!generateBookingId.trim()) return;
    try {
      await generateInvoice({
        variables: { bookingId: generateBookingId.trim() },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleCancel = async () => {
    if (!cancelInvoiceId) return;
    try {
      await cancelInvoice({
        variables: { id: cancelInvoiceId },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleTransmit = async (invoiceId: string) => {
    try {
      await transmitToEfactura({
        variables: { id: invoiceId },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openCancelModal = (invoiceId: string) => {
    setCancelInvoiceId(invoiceId);
    setCancelModalOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('company:invoices.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('company:invoices.subtitle')}
          </p>
        </div>
        {activeTab === 'issued' && (
          <Button onClick={() => setGenerateModalOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            {t('company:invoices.generateBtn')}
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('issued')}
          className={cn(
            'pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer',
            activeTab === 'issued'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          {t('company:invoices.tabIssued')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={cn(
            'pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer',
            activeTab === 'received'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          {t('company:invoices.tabReceived')}
        </button>
      </div>

      {/* ─── Issued Invoices Tab ─────────────────────────────────────────── */}
      {activeTab === 'issued' && (
        <>
          {/* Status filter dropdown */}
          <div className="mb-6">
            <div className="w-full sm:w-64">
              <Select
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setIssuedPage(0); }}
                label={t('company:invoices.filterStatus')}
              />
            </div>
          </div>

          {/* Invoice table */}
          <Card padding={false}>
            {loading ? (
              <LoadingSpinner text={t('company:invoices.loadingIssued')} />
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 px-6">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">{t('company:invoices.emptyIssued')}</h3>
                <p className="text-gray-500">
                  {statusFilter ? t('company:invoices.emptyIssuedFilter') : t('company:invoices.emptyIssuedNone')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-gray-100">
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colNumber')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                        {t('company:invoices.colDate')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                        {t('company:invoices.colBuyer')}
                      </th>
                      <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colAmount')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colStatus')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                        {t('company:invoices.colEfactura')}
                      </th>
                      <th className="px-2 md:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                        {t('company:invoices.colActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-900 text-xs md:text-sm">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden sm:table-cell">
                          {formatDate(invoice.issuedAt || invoice.createdAt, locale)}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-900 hidden md:table-cell">
                          {invoice.buyerName || '--'}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right font-bold text-gray-900 text-xs md:text-sm whitespace-nowrap">
                          {formatRON(invoice.totalAmount)}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <Badge variant={invoiceStatusBadge[invoice.status] ?? 'default'}>
                            {invoiceStatusLabel[invoice.status] ?? invoice.status}
                          </Badge>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                          {invoice.efacturaStatus ? (
                            <Badge
                              variant={
                                efacturaStatusBadge[invoice.efacturaStatus as EfacturaStatus] ?? 'default'
                              }
                            >
                              {efacturaStatusLabel[invoice.efacturaStatus as EfacturaStatus] ??
                                invoice.efacturaStatus}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-2 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-1">
                            {invoice.downloadUrl && (
                              <button
                                onClick={() => handleDownload(invoice.downloadUrl!)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title={t('company:invoices.downloadPdf')}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            {invoice.status !== 'CANCELLED' &&
                              (!invoice.efacturaStatus ||
                                invoice.efacturaStatus === 'NOT_SENT' ||
                                invoice.efacturaStatus === 'ERROR') && (
                                <button
                                  onClick={() => handleTransmit(invoice.id)}
                                  disabled={transmitting}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                                  title={t('company:invoices.transmitEfactura')}
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              )}
                            {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                              <button
                                onClick={() => openCancelModal(invoice.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title={t('company:invoices.cancelInvoice')}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Issued Pagination */}
          {issuedTotalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <span className="text-sm text-gray-500">
                {t('company:invoices.pagination', {
                  total: issuedTotalCount,
                  noun: issuedTotalCount === 1 ? t('company:invoices.invoiceNoun') : t('company:invoices.invoicesNoun'),
                  page: issuedPage + 1,
                  totalPages: issuedTotalPages,
                })}
              </span>
              {issuedTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={issuedPage === 0}
                    onClick={() => setIssuedPage((p) => p - 1)}
                  >
                    {t('pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!issuedHasNext}
                    onClick={() => setIssuedPage((p) => p + 1)}
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Received Invoices Tab ───────────────────────────────────────── */}
      {activeTab === 'received' && (
        <>
        <Card padding={false}>
          {receivedLoading ? (
            <LoadingSpinner text={t('company:invoices.loadingReceived')} />
          ) : receivedInvoices.length === 0 ? (
            <div className="text-center py-12 px-6">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t('company:invoices.emptyReceived')}</h3>
              <p className="text-gray-500">
                {t('company:invoices.emptyReceivedDesc')}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-gray-100">
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colNumber')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                        {t('company:invoices.colDate')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                        {t('company:invoices.colIssuer')}
                      </th>
                      <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colAmount')}
                      </th>
                      <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('company:invoices.colStatus')}
                      </th>
                      <th className="px-2 md:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                        {t('company:invoices.colDownload')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {receivedInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-900 text-xs md:text-sm">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden sm:table-cell">
                          {formatDate(invoice.issuedAt || invoice.createdAt, locale)}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-900 hidden md:table-cell">
                          {invoice.sellerCompanyName}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right font-bold text-gray-900 text-xs md:text-sm whitespace-nowrap">
                          {formatRON(invoice.totalAmount)}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <Badge variant={invoiceStatusBadge[invoice.status as InvoiceStatus] ?? 'default'}>
                            {invoiceStatusLabel[invoice.status as InvoiceStatus] ?? invoice.status}
                          </Badge>
                        </td>
                        <td className="px-2 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                          <div className="flex items-center justify-end">
                            {invoice.downloadUrl ? (
                              <button
                                onClick={() => handleDownload(invoice.downloadUrl!)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title={t('company:invoices.downloadPdf')}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* Received Pagination */}
        {receivedTotalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <span className="text-sm text-gray-500">
              {t('company:invoices.pagination', {
                  total: receivedTotalCount,
                  noun: receivedTotalCount === 1 ? t('company:invoices.invoiceNoun') : t('company:invoices.invoicesNoun'),
                  page: receivedPage + 1,
                  totalPages: receivedTotalPages,
                })}
            </span>
            {receivedTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={receivedPage === 0}
                  onClick={() => setReceivedPage((p) => p - 1)}
                >
                  {t('pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!receivedHasNext}
                  onClick={() => setReceivedPage((p) => p + 1)}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* Generate Invoice Modal */}
      <Modal
        open={generateModalOpen}
        onClose={() => {
          setGenerateModalOpen(false);
          setGenerateBookingId('');
        }}
        title={t('company:invoices.generateModal.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('company:invoices.generateModal.desc')}
          </p>
          <Input
            label={t('company:invoices.generateModal.idLabel')}
            value={generateBookingId}
            onChange={(e) => setGenerateBookingId(e.target.value)}
            placeholder={t('company:invoices.generateModal.idPlaceholder')}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setGenerateModalOpen(false);
                setGenerateBookingId('');
              }}
              className="flex-1"
            >
              {t('company:invoices.generateModal.cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!generateBookingId.trim()}
              className="flex-1"
            >
              <FileText className="h-4 w-4" />
              {t('company:invoices.generateModal.generate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Invoice Confirmation Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelInvoiceId(null);
        }}
        title={t('company:invoices.cancelModal.title')}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              {t('company:invoices.cancelModal.warning')}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelInvoiceId(null);
              }}
              className="flex-1"
            >
              {t('company:invoices.cancelModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelling}
              className="flex-1"
            >
              <XCircle className="h-4 w-4" />
              {t('company:invoices.cancelModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
