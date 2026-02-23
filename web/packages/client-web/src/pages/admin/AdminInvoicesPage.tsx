import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  FileText,
  Download,
  Plus,
  Receipt,
  TrendingUp,
  Hash,
  Banknote,
  Send,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ALL_INVOICES,
  GENERATE_COMMISSION_INVOICE,
  GENERATE_CREDIT_NOTE,
  INVOICE_ANALYTICS,
  CANCEL_INVOICE,
  TRANSMIT_TO_EFACTURA,
  REFRESH_EFACTURA_STATUS,
} from '@/graphql/operations';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRON(amount: number): string {
  return (amount / 100).toFixed(2) + ' lei';
}

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

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Status Maps ────────────────────────────────────────────────────────────

const invoiceStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  ISSUED: 'info',
  SENT: 'info',
  TRANSMITTED: 'warning',
  PAID: 'success',
  CANCELLED: 'danger',
  CREDIT_NOTE: 'info',
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

const efacturaStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  NOT_SENT: 'default',
  transmitted: 'warning',
  accepted: 'success',
  rejected: 'danger',
  error: 'danger',
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

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
    accent: { bg: 'bg-accent/10', text: 'text-accent' },
    danger: { bg: 'bg-danger/10', text: 'text-danger' },
  };
  const colors = colorMap[color] ?? colorMap.primary;

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.text}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminInvoicesPage() {
  const defaults = getMonthRange();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

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

  // Analytics
  const { data: analyticsData, loading: analyticsLoading } = useQuery(INVOICE_ANALYTICS, {
    variables: { from: defaults.from, to: defaults.to },
  });

  // Invoices list
  const { data, loading, refetch } = useQuery(ALL_INVOICES, {
    variables: {
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      companyId: companyFilter || undefined,
      first: 50,
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

  const analytics: InvoiceAnalyticsData | null = analyticsData?.invoiceAnalytics ?? null;
  const invoices: Invoice[] = data?.allInvoices?.edges ?? [];
  const totalCount: number = data?.allInvoices?.totalCount ?? 0;

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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
            <p className="text-gray-500 mt-1">
              Gestioneaza toate facturile emise pe platforma.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCreditNoteModalOpen(true)}>
              <FileText className="h-4 w-4" />
              Nota de credit
            </Button>
            <Button onClick={() => setCommissionModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Genereaza factura comision
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Hash}
            label="Facturi emise"
            value={String(analytics.totalIssued)}
            color="primary"
          />
          <StatCard
            icon={Banknote}
            label="Valoare totala"
            value={formatRON(analytics.totalAmount)}
            color="secondary"
          />
          <StatCard
            icon={TrendingUp}
            label="TVA total"
            value={formatRON(analytics.totalVat)}
            color="accent"
          />
          <StatCard
            icon={Receipt}
            label="Total pe platforma"
            value={String(totalCount) + ' facturi'}
            color="primary"
          />
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex items-end gap-4 mb-6">
        <div className="w-48">
          <Select
            label="Tip"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-64">
          <Input
            label="ID Companie"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Filtreaza dupa companie..."
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card padding={false}>
        <div className="flex items-center gap-3 px-3 md:px-6 pt-4 md:pt-6 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Toate facturile</h3>
          {totalCount > 0 && (
            <Badge variant="info">{totalCount}</Badge>
          )}
        </div>

        {loading ? (
          <div className="px-3 md:px-6 pb-4 md:pb-6">
            <LoadingSpinner text="Se incarca facturile..." />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nu exista facturi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-3 md:px-6 pb-3 font-medium">Nr. Factura</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">Tip</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">Data</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">Vanzator</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">Cumparator</th>
                  <th className="px-3 md:px-6 pb-3 font-medium text-right">Suma</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">Status</th>
                  <th className="px-3 md:px-6 pb-3 font-medium">E-Factura</th>
                  <th className="px-3 md:px-6 pb-3 font-medium text-right">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const efStatus = invoice.efacturaStatus || 'NOT_SENT';

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 md:px-6 py-3 text-gray-600">
                        <Badge variant="default">
                          {invoiceTypeLabel[invoice.invoiceType] ?? invoice.invoiceType}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-3 text-gray-600">
                        {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-3 md:px-6 py-3 text-gray-600">
                        {invoice.sellerCompanyName}
                      </td>
                      <td className="px-3 md:px-6 py-3 text-gray-600">
                        {invoice.buyerName}
                      </td>
                      <td className="px-3 md:px-6 py-3 text-right font-semibold text-gray-900">
                        {formatRON(invoice.totalAmount)}
                      </td>
                      <td className="px-3 md:px-6 py-3">
                        <Badge variant={invoiceStatusVariant[invoice.status] ?? 'default'}>
                          {invoiceStatusLabel[invoice.status] ?? invoice.status}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-3">
                        <Badge variant={efacturaStatusVariant[efStatus] ?? 'default'}>
                          {efacturaStatusLabel[efStatus] ?? efStatus}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Download PDF */}
                          {invoice.downloadUrl && (
                            <a
                              href={invoice.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Descarca PDF"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}

                          {/* Transmit to e-Factura */}
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
                                <Send className="h-4 w-4" />
                              </button>
                            )}

                          {/* Refresh e-Factura status */}
                          {invoice.efacturaStatus &&
                            invoice.efacturaStatus !== 'NOT_SENT' &&
                            invoice.efacturaStatus !== 'accepted' && (
                              <button
                                onClick={() => handleRefreshEfactura(invoice.id)}
                                disabled={refreshing}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                                title="Actualizeaza status e-Factura"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}

                          {/* Cancel invoice */}
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
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
