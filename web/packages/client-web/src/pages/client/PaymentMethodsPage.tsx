import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AddCardModal from '@/components/payment/AddCardModal';
import {
  MY_PAYMENT_METHODS,
  DELETE_PAYMENT_METHOD,
  SET_DEFAULT_PAYMENT_METHOD,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  cardLastFour: string;
  cardBrand: string;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  isDefault: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

function formatBrand(brand: string): string {
  return BRAND_LABELS[brand.toLowerCase()] || brand;
}

function formatExpiry(month?: number | null, year?: number | null): string {
  if (month == null || year == null) return '';
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

/**
 * Returns true if the card expires within the next 60 days.
 * Uses the first day of the expiry month as the expiry boundary.
 */
function isExpiringSoon(expMonth?: number | null, expYear?: number | null): boolean {
  if (!expMonth || !expYear) return false;
  const expDate = new Date(expYear, expMonth - 1, 1); // first of expiry month
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  return expDate <= sixtyDaysFromNow;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentMethodsPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation(['dashboard', 'client']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ─── Queries & Mutations ────────────────────────────────────────────────

  const { data, loading, refetch } = useQuery<{ myPaymentMethods: PaymentMethod[] }>(
    MY_PAYMENT_METHODS,
    { skip: !isAuthenticated },
  );

  const [deletePaymentMethod, { loading: deleting }] = useMutation(DELETE_PAYMENT_METHOD, {
    onCompleted: () => {
      setDeleteConfirmId(null);
      refetch();
    },
  });

  const [setDefaultPaymentMethod] = useMutation(SET_DEFAULT_PAYMENT_METHOD, {
    onCompleted: () => refetch(),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      await deletePaymentMethod({ variables: { id } });
    },
    [deletePaymentMethod],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      await setDefaultPaymentMethod({ variables: { id } });
    },
    [setDefaultPaymentMethod],
  );

  const handleCardAdded = useCallback(() => {
    setShowAddModal(false);
    refetch();
  }, [refetch]);

  const methods = data?.myPaymentMethods ?? [];

  // Find the card being deleted (for dialog description)
  const cardBeingDeleted = methods.find((pm) => pm.id === deleteConfirmId);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('client:payments.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('client:payments.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/cont/plati/istoric">
            <Button variant="outline" size="sm">
              {t('client:payments.paymentHistory')}
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('client:payments.addCard')}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && <LoadingSpinner text={t('client:payments.loading')} />}

      {/* Payment Methods List */}
      {!loading && methods.length > 0 && (
        <div className="space-y-4">
          {methods.map((pm) => (
            <Card key={pm.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatBrand(pm.cardBrand)}
                    </span>
                    {pm.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                        <Star className="h-3 w-3" />
                        {t('client:payments.default')}
                      </span>
                    )}
                    {/* Expiry warning badge */}
                    {isExpiringSoon(pm.cardExpMonth, pm.cardExpYear) && (
                      <Badge variant="warning" className="text-xs">Expiră curând</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    **** **** **** {pm.cardLastFour}
                    {(pm.cardExpMonth != null && pm.cardExpYear != null) && (
                      <span className="text-gray-400 ml-3">
                        Exp. {formatExpiry(pm.cardExpMonth, pm.cardExpYear)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!pm.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(pm.id)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition cursor-pointer"
                      title={t('client:payments.setDefault')}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(pm.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-danger transition cursor-pointer"
                    title="Șterge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && methods.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('client:payments.empty.title')}
          </h3>
          <p className="text-gray-500 mb-6">
            {t('client:payments.empty.description')}
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('client:payments.empty.addButton')}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Șterge cardul?"
        description={
          cardBeingDeleted
            ? `Ești sigur că vrei să ștergi cardul ${formatBrand(cardBeingDeleted.cardBrand)} **** ${cardBeingDeleted.cardLastFour}? Această acțiune nu poate fi anulată.`
            : 'Ești sigur că vrei să ștergi acest card? Această acțiune nu poate fi anulată.'
        }
        confirmLabel="Șterge"
        cancelLabel="Anulează"
        variant="danger"
        loading={deleting}
      />

      {/* Add Card Modal */}
      <AddCardModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCardAdded}
      />
    </div>
  );
}
