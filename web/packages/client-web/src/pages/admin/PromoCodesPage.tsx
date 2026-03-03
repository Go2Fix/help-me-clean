import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { LIST_PROMO_CODES, CREATE_PROMO_CODE, UPDATE_PROMO_CODE } from '@/graphql/operations';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usesCount: number;
  maxUsesPerUser: number;
  isActive: boolean;
  activeFrom: string;
  activeUntil: string | null;
  createdAt: string;
}

interface FormData {
  code: string;
  description: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxUses: string;
  maxUsesPerUser: string;
  activeFrom: string;
  activeUntil: string;
}

const EMPTY_FORM: FormData = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minOrderAmount: '0',
  maxUses: '',
  maxUsesPerUser: '1',
  activeFrom: new Date().toISOString().split('T')[0],
  activeUntil: '',
};

export default function PromoCodesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const { data, loading, refetch } = useQuery(LIST_PROMO_CODES, {
    variables: { limit, offset: page * limit },
  });

  const [createPromoCode, { loading: creating }] = useMutation(CREATE_PROMO_CODE);
  const [updatePromoCode] = useMutation(UPDATE_PROMO_CODE);

  const promoCodes: PromoCode[] = data?.listPromoCodes?.edges ?? [];
  const totalCount: number = data?.listPromoCodes?.totalCount ?? 0;

  const handleCreate = async () => {
    try {
      await createPromoCode({
        variables: {
          input: {
            code: formData.code.trim().toUpperCase(),
            description: formData.description || null,
            discountType: formData.discountType,
            discountValue: parseFloat(formData.discountValue),
            minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
            maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
            maxUsesPerUser: parseInt(formData.maxUsesPerUser) || 1,
            activeFrom: formData.activeFrom || null,
            activeUntil: formData.activeUntil || null,
          },
        },
      });
      setShowCreateModal(false);
      refetch();
      setFormData(EMPTY_FORM);
    } catch (err) {
      console.error('Failed to create promo code:', err);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updatePromoCode({ variables: { id, input: { isActive: !isActive } } });
      refetch();
    } catch (err) {
      console.error('Failed to update promo code:', err);
    }
  };

  const formatDiscount = (pc: PromoCode) =>
    pc.discountType === 'percent' ? `${pc.discountValue}%` : `${pc.discountValue} RON`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coduri promoționale</h1>
          <p className="text-gray-500 mt-1">Gestionează codurile de reducere pentru campanii</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Cod nou
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Se încarcă...</div>
        ) : promoCodes.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Niciun cod promoțional creat încă</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Cod</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Reducere</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Min. comandă</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Utilizări</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Valabil până</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((pc) => (
                  <tr key={pc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {pc.code}
                      </span>
                      {pc.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{pc.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatDiscount(pc)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {pc.minOrderAmount > 0 ? `${pc.minOrderAmount} RON` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pc.usesCount}{pc.maxUses ? `/${pc.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pc.activeUntil
                        ? new Date(pc.activeUntil).toLocaleDateString('ro-RO')
                        : 'Fără limită'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={pc.isActive ? 'success' : 'default'}>
                        {pc.isActive ? 'Activ' : 'Inactiv'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(pc.id, pc.isActive)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={pc.isActive ? 'Dezactivează' : 'Activează'}
                      >
                        {pc.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > limit && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Total: {totalCount}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * limit >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Următor
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Cod promoțional nou"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cod *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))
              }
              placeholder="ex: SPRING25"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono uppercase"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descriere</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Campanie primăvară 2025"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tip reducere</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="percent">Procent (%)</option>
                <option value="fixed_amount">Sumă fixă (RON)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Valoare *</label>
              <input
                type="number"
                min="0.01"
                max={formData.discountType === 'percent' ? '100' : undefined}
                step="0.01"
                value={formData.discountValue}
                onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))}
                placeholder={formData.discountType === 'percent' ? '10' : '50'}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Comandă minimă (RON)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData((p) => ({ ...p, minOrderAmount: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Max. utilizări totale
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData((p) => ({ ...p, maxUses: e.target.value }))}
                placeholder="Nelimitat"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Valabil de la</label>
              <input
                type="date"
                value={formData.activeFrom}
                onChange={(e) => setFormData((p) => ({ ...p, activeFrom: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Valabil până la
              </label>
              <input
                type="date"
                value={formData.activeUntil}
                onChange={(e) => setFormData((p) => ({ ...p, activeUntil: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
            >
              Anulează
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={creating || !formData.code || !formData.discountValue}
            >
              {creating ? 'Se creează...' : 'Creează cod'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
