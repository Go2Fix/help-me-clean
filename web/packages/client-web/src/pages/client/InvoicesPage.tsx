import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
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
import { downloadClientInvoicePDF } from '@/components/invoice/ClientInvoicePDF';
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
  sellerRegNumber?: string;
  sellerAddress: string;
  sellerCity: string;
  sellerCounty: string;
  sellerIsVatPayer: boolean;
  sellerBankName?: string;
  sellerIban?: string;
  buyerName: string;
  buyerCui?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerCounty?: string;
  buyerIsVatPayer?: boolean;
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

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const INVOICE_STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  ISSUED: 'success',
  DRAFT: 'default',
  SENT: 'info',
  TRANSMITTED: 'warning',
  CANCELLED: 'danger',
  PAID: 'success',
  CREDIT_NOTE: 'info',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation(['dashboard', 'client']);
  const [billingForm, setBillingForm] = useState<BillingFormData>(EMPTY_BILLING_FORM);
  const [billingEditing, setBillingEditing] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // ─── Queries & Mutations ────────────────────────────────────────────────

  const { data: invoicesData, loading: loadingInvoices } = useQuery<InvoicesData>(
    MY_INVOICES,
    {
      variables: {
        first: PAGE_SIZE,
        after: page > 0 ? String(page * PAGE_SIZE) : undefined,
      },
      fetchPolicy: 'cache-and-network',
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
      setBillingError(t('client:invoices.billing.error'));
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const invoiceTotalCount = invoicesData?.myInvoices?.totalCount ?? 0;
  const invoiceTotalPages = Math.max(1, Math.ceil(invoiceTotalCount / PAGE_SIZE));
  const hasNextPage = invoicesData?.myInvoices?.pageInfo?.hasNextPage ?? false;

  const handleBillingSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBillingError('');

      if (billingForm.isCompany) {
        if (!billingForm.companyName.trim() || !billingForm.cui.trim()) {
          setBillingError(t('client:invoices.billing.validationB2B'));
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
  const billing = billingData?.myBillingProfile;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('client:invoices.title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('client:invoices.subtitle')}
        </p>
      </div>

      {/* Billing Profile Section */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('client:invoices.billing.title')}</h2>
          {!billingEditing && !loadingBilling && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBillingEditing(true)}
            >
              {billing ? t('client:invoices.billing.modify') : t('client:invoices.billing.configure')}
            </Button>
          )}
        </div>

        {loadingBilling && <LoadingSpinner size="sm" text={t('client:invoices.billing.loading')} />}

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
                {billing.isCompany ? t('client:invoices.billing.company') : t('client:invoices.billing.individual')}
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
                  {billing.bankName && <p>{t('client:invoices.billing.form.bank')}: {billing.bankName}</p>}
                  {billing.isVatPayer && (
                    <Badge variant="info">{t('client:invoices.billing.vatPayer')}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loadingBilling && !billingEditing && !billing && (
          <p className="text-sm text-gray-500">
            {t('client:invoices.billing.noBilling')}
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
                {t('client:invoices.billing.form.individualTab')}
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
                {t('client:invoices.billing.form.companyTab')}
              </button>
            </div>

            {/* B2B Fields */}
            {billingForm.isCompany && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('client:invoices.billing.form.companyName')}
                    placeholder={t('client:invoices.billing.form.companyNamePlaceholder')}
                    value={billingForm.companyName}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                  />
                  <Input
                    label={t('client:invoices.billing.form.cui')}
                    placeholder={t('client:invoices.billing.form.cuiPlaceholder')}
                    value={billingForm.cui}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, cui: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('client:invoices.billing.form.regNumber')}
                    placeholder={t('client:invoices.billing.form.regNumberPlaceholder')}
                    value={billingForm.regNumber}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, regNumber: e.target.value }))
                    }
                  />
                  <Input
                    label={t('client:invoices.billing.form.address')}
                    placeholder={t('client:invoices.billing.form.addressPlaceholder')}
                    value={billingForm.address}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('client:invoices.billing.form.city')}
                    placeholder={t('client:invoices.billing.form.cityPlaceholder')}
                    value={billingForm.city}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                  <Input
                    label={t('client:invoices.billing.form.county')}
                    placeholder={t('client:invoices.billing.form.countyPlaceholder')}
                    value={billingForm.county}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, county: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('client:invoices.billing.form.bank')}
                    placeholder={t('client:invoices.billing.form.bankPlaceholder')}
                    value={billingForm.bankName}
                    onChange={(e) =>
                      setBillingForm((prev) => ({ ...prev, bankName: e.target.value }))
                    }
                  />
                  <Input
                    label={t('client:invoices.billing.form.iban')}
                    placeholder={t('client:invoices.billing.form.ibanPlaceholder')}
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
                    {t('client:invoices.billing.form.vatPayer')}
                  </label>
                </div>
              </>
            )}

            {!billingForm.isCompany && (
              <p className="text-sm text-gray-500">
                {t('client:invoices.billing.form.individualNote')}
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
                {t('client:invoices.billing.form.save')}
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
                {t('client:invoices.billing.form.cancel')}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Invoices Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('client:invoices.issuedInvoices')}</h2>
      </div>

      {/* Status Filter */}
      {invoices.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t('client:invoices.filter.all')}</option>
            <option value="ISSUED">{t('client:invoices.filter.issued')}</option>
            <option value="PAID">{t('client:invoices.filter.paid')}</option>
            <option value="CANCELLED">{t('client:invoices.filter.cancelled')}</option>
            <option value="CREDIT_NOTE">{t('client:invoices.filter.creditNote')}</option>
          </select>
        </div>
      )}

      {/* Loading Invoices */}
      {loadingInvoices && !invoicesData && (
        <LoadingSpinner text={t('client:invoices.loading')} />
      )}

      {/* Invoices Table */}
      {!loadingInvoices && filteredInvoices.length > 0 && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">{t('client:invoices.table.invoiceNumber')}</th>
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500">{t('client:invoices.table.date')}</th>
                  <th className="text-left px-3 md:px-6 py-3 font-medium text-gray-500 hidden sm:table-cell">{t('client:invoices.table.supplier')}</th>
                  <th className="text-right px-3 md:px-6 py-3 font-medium text-gray-500">{t('client:invoices.table.amount')}</th>
                  <th className="text-center px-3 md:px-6 py-3 font-medium text-gray-500 hidden sm:table-cell">{t('client:invoices.table.status')}</th>
                  <th className="px-3 md:px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => {
                  const statusVariant = INVOICE_STATUS_VARIANTS[inv.status] ?? 'default';
                  const statusLabel = t(`client:invoices.status.${inv.status}`, { defaultValue: inv.status });
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
                          {formatDate(inv.issuedAt, i18n.language)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                          {inv.sellerCompanyName}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                          {formatAmount(inv.totalAmount)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-center hidden sm:table-cell">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              className="p-2 rounded-lg text-gray-400 hover:bg-primary/5 hover:text-primary transition inline-flex"
                              title={t('client:invoices.table.downloadPdf')}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (inv.downloadUrl) {
                                  window.open(inv.downloadUrl, '_blank');
                                } else {
                                  // Expand to load detail then generate PDF
                                  setExpandedInvoiceId(inv.id);
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </button>
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
                                {t('client:invoices.detail.loading')}
                              </div>
                            )}

                            {detail && (
                              <div className="space-y-4">
                                {/* Mobile-only: status + supplier */}
                                <div className="flex flex-wrap items-center gap-3 sm:hidden">
                                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                                  <span className="text-sm text-gray-600">{inv.sellerCompanyName}</span>
                                </div>

                                {/* Seller / Buyer info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">{t('client:invoices.detail.supplier')}</p>
                                    <p className="text-sm font-medium text-gray-900">{detail.sellerCompanyName}</p>
                                    <p className="text-xs text-gray-500">CUI: {detail.sellerCui}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">{t('client:invoices.detail.buyer')}</p>
                                    <p className="text-sm font-medium text-gray-900">{detail.buyerName}</p>
                                    {detail.buyerCui && (
                                      <p className="text-xs text-gray-500">CUI: {detail.buyerCui}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Line items */}
                                {detail.lineItems.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">{t('client:invoices.detail.items')}</p>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-3 py-2 font-medium text-gray-500">{t('client:invoices.detail.itemDescription')}</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500">{t('client:invoices.detail.itemQty')}</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500 hidden sm:table-cell">{t('client:invoices.detail.itemUnitPrice')}</th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-500">{t('client:invoices.detail.itemTotal')}</th>
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
                                      <span>{t('client:invoices.detail.subtotal')}</span>
                                      <span>{formatAmount(detail.subtotalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>{t('client:invoices.detail.vat', { rate: detail.vatRate })}</span>
                                      <span>{formatAmount(detail.vatAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                                      <span>{t('client:invoices.detail.total')}</span>
                                      <span>{formatAmount(detail.totalAmount)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Booking reference + Due date + Notes */}
                                <div className="flex flex-wrap gap-4 text-sm">
                                  {detail.booking && (
                                    <div>
                                      <span className="text-gray-500">{t('client:invoices.detail.booking')}</span>
                                      <span className="font-medium text-gray-900">
                                        {detail.booking.referenceCode} - {detail.booking.serviceName}
                                      </span>
                                    </div>
                                  )}
                                  {detail.dueDate && (
                                    <div>
                                      <span className="text-gray-500">{t('client:invoices.detail.dueDate')}</span>
                                      <span className="font-medium text-gray-900">{formatDate(detail.dueDate, i18n.language)}</span>
                                    </div>
                                  )}
                                </div>

                                {detail.notes && (
                                  <p className="text-sm text-gray-600 italic">{detail.notes}</p>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3 pt-1">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (detail.downloadUrl) {
                                        window.open(detail.downloadUrl, '_blank');
                                      } else {
                                        await downloadClientInvoicePDF({
                                          invoiceNumber: detail.invoiceNumber,
                                          issuedAt: detail.issuedAt,
                                          dueDate: detail.dueDate,
                                          sellerCompanyName: detail.sellerCompanyName,
                                          sellerCui: detail.sellerCui,
                                          sellerRegNumber: detail.sellerRegNumber,
                                          sellerAddress: detail.sellerAddress,
                                          sellerCity: detail.sellerCity,
                                          sellerCounty: detail.sellerCounty,
                                          sellerIsVatPayer: detail.sellerIsVatPayer,
                                          sellerBankName: detail.sellerBankName,
                                          sellerIban: detail.sellerIban,
                                          buyerName: detail.buyerName,
                                          buyerCui: detail.buyerCui,
                                          buyerAddress: detail.buyerAddress,
                                          buyerCity: detail.buyerCity,
                                          buyerCounty: detail.buyerCounty,
                                          buyerIsVatPayer: detail.buyerIsVatPayer,
                                          subtotalAmount: detail.subtotalAmount,
                                          vatRate: detail.vatRate,
                                          vatAmount: detail.vatAmount,
                                          totalAmount: detail.totalAmount,
                                          currency: detail.currency,
                                          notes: detail.notes,
                                          lineItems: detail.lineItems,
                                        });
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                    {t('client:invoices.detail.downloadPdf')}
                                  </Button>
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
                                      {t('client:invoices.detail.viewBooking')}
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

        </Card>
      )}

      {/* Pagination */}
      {invoiceTotalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
          <span className="text-sm text-gray-500">
            {invoiceTotalCount} {t('client:invoices.pagination.invoice', { count: invoiceTotalCount })} &middot; {t('pagination.page', { current: page + 1, total: invoiceTotalPages })}
          </span>
          {invoiceTotalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('pagination.next')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loadingInvoices && filteredInvoices.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('client:invoices.empty.title')}
          </h3>
          <p className="text-gray-500">
            {t('client:invoices.empty.description')}
          </p>
        </div>
      )}
    </div>
  );
}
