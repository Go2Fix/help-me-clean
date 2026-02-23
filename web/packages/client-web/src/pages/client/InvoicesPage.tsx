import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  FileText,
  Download,
  Building2,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MY_INVOICES,
  MY_BILLING_PROFILE,
  UPSERT_BILLING_PROFILE,
  INVOICE_DETAIL,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceEdge {
  id: string;
  invoiceType: string;
  invoiceNumber: string;
  status: string;
  sellerCompanyName: string;
  buyerName: string;
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  downloadUrl?: string;
  issuedAt: string;
  createdAt: string;
}

interface InvoicesData {
  myInvoices: {
    edges: InvoiceEdge[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

interface BillingProfile {
  id: string;
  isCompany: boolean;
  companyName?: string;
  cui?: string;
  regNumber?: string;
  address?: string;
  city?: string;
  county?: string;
  isVatPayer?: boolean;
  bankName?: string;
  iban?: string;
  isDefault: boolean;
}

interface BillingProfileData {
  myBillingProfile: BillingProfile | null;
}

interface BillingFormData {
  isCompany: boolean;
  companyName: string;
  cui: string;
  regNumber: string;
  address: string;
  city: string;
  county: string;
  isVatPayer: boolean;
  bankName: string;
  iban: string;
}

interface InvoiceDetailItem {
  id: string;
  descriptionRo: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineTotalWithVat: number;
}

interface InvoiceDetail {
  id: string;
  invoiceType: string;
  invoiceNumber: string;
  status: string;
  sellerCompanyName: string;
  sellerCui: string;
  buyerName: string;
  buyerCui?: string;
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  efacturaStatus?: string;
  downloadUrl?: string;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
  lineItems: InvoiceDetailItem[];
  booking?: {
    id: string;
    referenceCode: string;
    serviceName: string;
  };
  company?: {
    id: string;
    companyName: string;
  };
  createdAt: string;
}

interface InvoiceDetailData {
  invoiceDetail: InvoiceDetail;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const EMPTY_BILLING_FORM: BillingFormData = {
  isCompany: false,
  companyName: '',
  cui: '',
  regNumber: '',
  address: '',
  city: '',
  county: '',
  isVatPayer: false,
  bankName: '',
  iban: '',
};

function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2) + ' lei';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
  ISSUED: { label: 'Emisa', variant: 'success' },
  DRAFT: { label: 'Ciorna', variant: 'default' },
  SENT: { label: 'Trimisa', variant: 'info' },
  TRANSMITTED: { label: 'Transmisa e-Factura', variant: 'warning' },
  CANCELLED: { label: 'Anulata', variant: 'danger' },
  PAID: { label: 'Platita', variant: 'success' },
  CREDIT_NOTE: { label: 'Nota de credit', variant: 'info' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { isAuthenticated } = useAuth();
  const [billingForm, setBillingForm] = useState<BillingFormData>(EMPTY_BILLING_FORM);
  const [billingEditing, setBillingEditing] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // ─── Queries & Mutations ────────────────────────────────────────────────

  const { data: invoicesData, loading: loadingInvoices, fetchMore } = useQuery<InvoicesData>(
    MY_INVOICES,
    {
      variables: { first: PAGE_SIZE },
      skip: !isAuthenticated,
    },
  );

  const { data: billingData, loading: loadingBilling, refetch: refetchBilling } =
    useQuery<BillingProfileData>(MY_BILLING_PROFILE, {
      skip: !isAuthenticated,
      onCompleted: (d) => {
        if (d.myBillingProfile) {
          setBillingForm({
            isCompany: d.myBillingProfile.isCompany,
            companyName: d.myBillingProfile.companyName || '',
            cui: d.myBillingProfile.cui || '',
            regNumber: d.myBillingProfile.regNumber || '',
            address: d.myBillingProfile.address || '',
            city: d.myBillingProfile.city || '',
            county: d.myBillingProfile.county || '',
            isVatPayer: d.myBillingProfile.isVatPayer || false,
            bankName: d.myBillingProfile.bankName || '',
            iban: d.myBillingProfile.iban || '',
          });
        }
      },
    });

  const [fetchInvoiceDetail, { data: detailData, loading: loadingDetail }] =
    useLazyQuery<InvoiceDetailData>(INVOICE_DETAIL);

  const [upsertBilling, { loading: savingBilling }] = useMutation(UPSERT_BILLING_PROFILE, {
    onCompleted: () => {
      setBillingEditing(false);
      setBillingError('');
      refetchBilling();
    },
    onError: () => {
      setBillingError('Nu am putut salva datele de facturare. Te rugam sa incerci din nou.');
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (!invoicesData?.myInvoices.pageInfo.endCursor) return;

    fetchMore({
      variables: {
        first: PAGE_SIZE,
        after: invoicesData.myInvoices.pageInfo.endCursor,
      },
    });
  }, [invoicesData, fetchMore]);

  const handleBillingSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBillingError('');

      if (billingForm.isCompany) {
        if (!billingForm.companyName.trim() || !billingForm.cui.trim()) {
          setBillingError('Numele companiei si CUI-ul sunt obligatorii pentru facturare B2B.');
          return;
        }
      }

      const input: Record<string, unknown> = {
        isCompany: billingForm.isCompany,
      };

      if (billingForm.isCompany) {
        input.companyName = billingForm.companyName.trim();
        input.cui = billingForm.cui.trim();
        input.regNumber = billingForm.regNumber.trim() || undefined;
        input.address = billingForm.address.trim() || undefined;
        input.city = billingForm.city.trim() || undefined;
        input.county = billingForm.county.trim() || undefined;
        input.isVatPayer = billingForm.isVatPayer;
        input.bankName = billingForm.bankName.trim() || undefined;
        input.iban = billingForm.iban.trim() || undefined;
      }

      await upsertBilling({ variables: { input } });
    },
    [billingForm, upsertBilling],
  );

  const handleToggleType = useCallback((isCompany: boolean) => {
    setBillingForm((prev) => ({ ...prev, isCompany }));
  }, []);

  const handleToggleInvoice = useCallback(
    (invoiceId: string) => {
      if (expandedInvoiceId === invoiceId) {
        setExpandedInvoiceId(null);
      } else {
        setExpandedInvoiceId(invoiceId);
        fetchInvoiceDetail({ variables: { id: invoiceId } });
      }
    },
    [expandedInvoiceId, fetchInvoiceDetail],
  );

  const invoices = invoicesData?.myInvoices.edges ?? [];
  const filteredInvoices = statusFilter
    ? invoices.filter((inv) => inv.status === statusFilter)
    : invoices;
  const hasMore = invoicesData?.myInvoices.pageInfo.hasNextPage ?? false;
  const billing = billingData?.myBillingProfile;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Facturile mele</h1>
        <p className="text-gray-500 mt-1">
          Descarca facturile si gestioneaza datele de facturare.
        </p>
      </div>

      {/* Billing Profile Section */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profil de facturare</h2>
          {!billingEditing && !loadingBilling && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBillingEditing(true)}
            >
              {billing ? 'Modifica' : 'Configureaza'}
            </Button>
          )}
        </div>

        {loadingBilling && <LoadingSpinner size="sm" text="Se incarca..." />}

        {!loadingBilling && !billingEditing && billing && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {billing.isCompany ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {billing.isCompany ? 'Persoana juridica (B2B)' : 'Persoana fizica (B2C)'}
              </p>
              {billing.isCompany && (
                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                  {billing.companyName && <p>{billing.companyName}</p>}
                  {billing.cui && <p>CUI: {billing.cui}</p>}
                  {billing.regNumber && <p>Nr. Reg.: {billing.regNumber}</p>}
                  {billing.address && (
                    <p>
                      {billing.address}
                      {billing.city && `, ${billing.city}`}
                      {billing.county && `, ${billing.county}`}
                    </p>
                  )}
                  {billing.iban && <p>IBAN: {billing.iban}</p>}
                  {billing.bankName && <p>Banca: {billing.bankName}</p>}
                  {billing.isVatPayer && (
                    <Badge variant="info">Platitor TVA</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loadingBilling && !billingEditing && !billing && (
          <p className="text-sm text-gray-500">
            Nu ai configurat inca un profil de facturare. Apasa pe &quot;Configureaza&quot; pentru a incepe.
          </p>
        )}

        {billingEditing && (
          <form onSubmit={handleBillingSave} className="space-y-4">
            {/* B2C / B2B Toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleType(false)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                  !billingForm.isCompany
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                Persoana fizica (B2C)
              </button>
              <button
                type="button"
                onClick={() => handleToggleType(true)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                  billingForm.isCompany
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                Persoana juridica (B2B)
              </button>
            </div>

            {/* B2B Fields */}
            {billingForm.isCompany && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nume companie *"
                    placeholder="SC Exemplu SRL"
                    value={billingForm.companyName}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                  />
                  <Input
                    label="CUI *"
                    placeholder="RO12345678"
                    value={billingForm.cui}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, cui: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nr. Reg. Comertului"
                    placeholder="J40/1234/2024"
                    value={billingForm.regNumber}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, regNumber: e.target.value }))
                    }
                  />
                  <Input
                    label="Adresa sediu"
                    placeholder="Str. Exemplu nr. 1"
                    value={billingForm.address}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Oras"
                    placeholder="Bucuresti"
                    value={billingForm.city}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                  <Input
                    label="Judet"
                    placeholder="Bucuresti"
                    value={billingForm.county}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, county: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Banca"
                    placeholder="ING Bank"
                    value={billingForm.bankName}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, bankName: e.target.value }))
                    }
                  />
                  <Input
                    label="IBAN"
                    placeholder="RO12INGB..."
                    value={billingForm.iban}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, iban: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isVatPayer"
                    checked={billingForm.isVatPayer}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, isVatPayer: e.target.checked }))
                    }
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="isVatPayer" className="text-sm text-gray-700">
                    Platitor de TVA
                  </label>
                </div>
              </>
            )}

            {!billingForm.isCompany && (
              <p className="text-sm text-gray-500">
                Facturile vor fi emise pe numele tau de persoana fizica, conform datelor din profilul contului tau.
              </p>
            )}

            {billingError && (
              <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700">
                {billingError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={savingBilling}>
                <Check className="h-4 w-4" />
                Salveaza
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBillingEditing(false);
                  setBillingError('');
                  // Reset form to current billing data
                  if (billing) {
                    setBillingForm({
                      isCompany: billing.isCompany,
                      companyName: billing.companyName || '',
                      cui: billing.cui || '',
                      regNumber: billing.regNumber || '',
                      address: billing.address || '',
                      city: billing.city || '',
                      county: billing.county || '',
                      isVatPayer: billing.isVatPayer || false,
                      bankName: billing.bankName || '',
                      iban: billing.iban || '',
                    });
                  } else {
                    setBillingForm(EMPTY_BILLING_FORM);
                  }
                }}
              >
                Anuleaza
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Invoices Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Facturi emise</h2>
        {invoicesData && invoicesData.myInvoices.totalCount > 0 && (
          <span className="text-sm text-gray-500">
            {invoicesData.myInvoices.totalCount}{' '}
            {invoicesData.myInvoices.totalCount === 1 ? 'factura' : 'facturi'}
          </span>
        )}
      </div>

      {/* Status Filter */}
      {invoices.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Toate facturile</option>
            <option value="ISSUED">Emise</option>
            <option value="PAID">Platite</option>
            <option value="CANCELLED">Anulate</option>
            <option value="CREDIT_NOTE">Nota credit</option>
          </select>
        </div>
      )}

      {/* Loading Invoices */}
      {loadingInvoices && !invoicesData && (
        <LoadingSpinner text="Se incarca facturile..." />
      )}

      {/* Invoices Table */}
      {!loadingInvoices && filteredInvoices.length > 0 && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">Nr. factura</th>
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">Data</th>
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500 hidden sm:table-cell">Furnizor</th>
                  <th className="text-right px-3 md:px-6 py-3 font-medium text-gray-500">Suma (RON)</th>
                  <th className="text-center px-3 md:px-6 py-3 font-medium text-gray-500 hidden sm:table-cell">Status</th>
                  <th className="px-3 md:px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => {
                  const cfg = INVOICE_STATUS_CONFIG[inv.status] ?? {
                    label: inv.status,
                    variant: 'default' as const,
                  };
                  const isExpanded = expandedInvoiceId === inv.id;
                  const detail = isExpanded && detailData?.invoiceDetail?.id === inv.id
                    ? detailData.invoiceDetail
                    : null;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => handleToggleInvoice(inv.id)}
                      >
                        <td className="px-3 md:px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-gray-600 whitespace-nowrap">
                          {formatDate(inv.issuedAt)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                          {inv.sellerCompanyName}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                          {formatAmount(inv.totalAmount)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-center hidden sm:table-cell">
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex items-center gap-1">
                            {inv.downloadUrl && (
                              <a
                                href={inv.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg text-gray-400 hover:bg-primary/5 hover:text-primary transition inline-flex"
                                title="Descarca PDF"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-3 md:px-6 py-5 bg-gray-50">
                            {loadingDetail && !detail && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Se incarca detaliile...
                              </div>
                            )}

                            {detail && (
                              <div className="space-y-4">
                                {/* Mobile-only: status + supplier */}
                                <div className="flex flex-wrap items-center gap-3 sm:hidden">
                                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                  <span className="text-sm text-gray-600">{inv.sellerCompanyName}</span>
                                </div>

                                {/* Seller / Buyer info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Furnizor</p>
                                    <p className="text-sm font-medium text-gray-900">{detail.sellerCompanyName}</p>
                                    <p className="text-xs text-gray-500">CUI: {detail.sellerCui}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Cumparator</p>
                                    <p className="text-sm font-medium text-gray-900">{detail.buyerName}</p>
                                    {detail.buyerCui && (
                                      <p className="text-xs text-gray-500">CUI: {detail.buyerCui}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Line items */}
                                {detail.lineItems.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">Articole</p>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-3 py-2 font-medium text-gray-500">Descriere</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500">Cant.</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500 hidden sm:table-cell">Pret unit.</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                          {detail.lineItems.map((item) => (
                                            <tr key={item.id}>
                                              <td className="px-3 py-2 text-gray-900">{item.descriptionRo}</td>
                                              <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                                              <td className="px-3 py-2 text-right text-gray-600 hidden sm:table-cell">
                                                {formatAmount(item.unitPrice)}
                                              </td>
                                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                {formatAmount(item.lineTotalWithVat)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Totals */}
                                <div className="flex justify-end">
                                  <div className="text-sm space-y-1 min-w-[180px]">
                                    <div className="flex justify-between text-gray-600">
                                      <span>Subtotal:</span>
                                      <span>{formatAmount(detail.subtotalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>TVA ({detail.vatRate}%):</span>
                                      <span>{formatAmount(detail.vatAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                                      <span>Total:</span>
                                      <span>{formatAmount(detail.totalAmount)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Booking reference + Due date + Notes */}
                                <div className="flex flex-wrap gap-4 text-sm">
                                  {detail.booking && (
                                    <div>
                                      <span className="text-gray-500">Rezervare: </span>
                                      <span className="font-medium text-gray-900">
                                        {detail.booking.referenceCode} - {detail.booking.serviceName}
                                      </span>
                                    </div>
                                  )}
                                  {detail.dueDate && (
                                    <div>
                                      <span className="text-gray-500">Scadenta: </span>
                                      <span className="font-medium text-gray-900">{formatDate(detail.dueDate)}</span>
                                    </div>
                                  )}
                                </div>

                                {detail.notes && (
                                  <p className="text-sm text-gray-600 italic">{detail.notes}</p>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3 pt-1">
                                  {detail.downloadUrl && (
                                    <a
                                      href={detail.downloadUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button size="sm" variant="primary">
                                        <Download className="h-4 w-4" />
                                        Descarca PDF
                                      </Button>
                                    </a>
                                  )}
                                  {detail.booking && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/cont/comenzi/${detail.booking!.id}`;
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Vezi rezervarea
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="px-3 md:px-6 py-4 border-t border-gray-100 text-center">
              <Button variant="ghost" onClick={handleLoadMore}>
                Incarca mai multe
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Empty State */}
      {!loadingInvoices && filteredInvoices.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nicio factura emisa
          </h3>
          <p className="text-gray-500">
            Facturile vor fi generate automat dupa finalizarea si plata rezervarilor.
          </p>
        </div>
      )}
    </div>
  );
}
