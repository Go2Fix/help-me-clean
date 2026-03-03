import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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
  cardExpMonth?: number;
  cardExpYear?: number;
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

function formatExpiry(month?: number, year?: number): string {
  if (month == null || year == null) return '';
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentMethodsPage() {
  const { isAuthenticated } = useAuth();
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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metode de plată</h1>
          <p className="text-gray-500 mt-1">
            Gestioneaza cardurile salvate pentru plati rapide.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/cont/plati/istoric">
            <Button variant="outline" size="sm">
              Istoric plati
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Adauga card
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && <LoadingSpinner text="Se incarca metodele de plata..." />}

      {/* Payment Methods List */}
      {!loading && methods.length > 0 && (
        <div className="space-y-4">
          {methods.map((pm) => (
            <Card key={pm.id} className="relative">
              {/* Delete Confirmation Overlay */}
              {deleteConfirmId === pm.id && (
                <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      Stergi acest card?
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Anuleaza
                      </Button>
                      <Button
                        size="sm"
                        className="bg-danger hover:bg-danger/90 text-white"
                        loading={deleting}
                        onClick={() => handleDelete(pm.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sterge
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">
                      {formatBrand(pm.cardBrand)}
                    </span>
                    {pm.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                        <Star className="h-3 w-3" />
                        Implicit
                      </span>
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
                      title="Seteaza ca implicit"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(pm.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-danger transition cursor-pointer"
                    title="Sterge"
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
            Nu ai niciun card salvat
          </h3>
          <p className="text-gray-500 mb-6">
            Adauga un card pentru a plati rezervarile rapid si sigur.
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Adauga card
          </Button>
        </div>
      )}

      {/* Add Card Modal */}
      <AddCardModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCardAdded}
      />
    </div>
  );
}
