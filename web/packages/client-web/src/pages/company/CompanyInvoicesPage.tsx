import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  FileText,
  Download,
  Send,
  XCircle,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  COMPANY_INVOICES,
  GENERATE_BOOKING_INVOICE,
  CANCEL_INVOICE,
  TRANSMIT_TO_EFACTURA,
} from '@/graphql/operations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRON(amountCents: number): string {
  return (amountCents / 100).toFixed(2) + ' lei';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', {
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

const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Ciorna',
  ISSUED: 'Emisa',
  SENT: 'Trimisa',
  TRANSMITTED: 'Transmisa e-Factura',
  PAID: 'Platita',
  CANCELLED: 'Anulata',
  CREDIT_NOTE: 'Nota de credit',
};

type EfacturaStatus = 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

const efacturaStatusBadge: Record<EfacturaStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  NOT_SENT: 'default',
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  ERROR: 'danger',
};

const efacturaStatusLabel: Record<EfacturaStatus, string> = {
  NOT_SENT: 'Netransmisa',
  PENDING: 'In procesare',
  ACCEPTED: 'Acceptata',
  REJECTED: 'Respinsa',
  ERROR: 'Eroare',
};

const statusFilterOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'DRAFT', label: 'Ciorna' },
  { value: 'ISSUED', label: 'Emisa' },
  { value: 'SENT', label: 'Trimisa' },
  { value: 'TRANSMITTED', label: 'Transmisa e-Factura' },
  { value: 'PAID', label: 'Platita' },
  { value: 'CANCELLED', label: 'Anulata' },
  { value: 'CREDIT_NOTE', label: 'Nota de credit' },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompanyInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

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
      first: 50,
    },
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
          <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
          <p className="text-gray-500 mt-1">
            Gestioneaza facturile firmei tale.
          </p>
        </div>
        <Button onClick={() => setGenerateModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Genereaza factura
        </Button>
      </div>

      {/* Status filter dropdown */}
      <div className="mb-6">
        <div className="w-full sm:w-64">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filtreaza dupa status"
          />
        </div>
      </div>

      {/* Invoice table */}
      <Card padding={false}>
        {loading ? (
          <LoadingSpinner text="Se incarca facturile..." />
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 px-6">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nicio factura</h3>
            <p className="text-gray-500">
              Nu exista facturi {statusFilter ? 'pentru filtrul selectat' : 'inregistrate inca'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Nr. factura
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                    Data
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                    Cumparator
                  </th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Suma
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                    E-Factura
                  </th>
                  <th className="px-2 md:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                    Actiuni
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
                      {formatDate(invoice.issuedAt || invoice.createdAt)}
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
                            title="Descarca PDF"
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
                              title="Transmite la e-Factura"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                          <button
                            onClick={() => openCancelModal(invoice.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Anuleaza factura"
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

      {/* Generate Invoice Modal */}
      <Modal
        open={generateModalOpen}
        onClose={() => {
          setGenerateModalOpen(false);
          setGenerateBookingId('');
        }}
        title="Genereaza factura"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Introdu ID-ul rezervarii finalizate pentru care doresti sa generezi o factura.
          </p>
          <Input
            label="ID Rezervare"
            value={generateBookingId}
            onChange={(e) => setGenerateBookingId(e.target.value)}
            placeholder="ex: abc123-def456..."
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
              Anuleaza
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!generateBookingId.trim()}
              className="flex-1"
            >
              <FileText className="h-4 w-4" />
              Genereaza
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
        title="Confirma anularea"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Esti sigur ca doresti sa anulezi aceasta factura? Aceasta actiune nu poate fi anulata.
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
              Renunta
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelling}
              className="flex-1"
            >
              <XCircle className="h-4 w-4" />
              Anuleaza factura
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
