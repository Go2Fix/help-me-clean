import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Check, Pencil, Trash2, Star, X } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AddressAutocomplete, { type ParsedAddress } from '@/components/ui/AddressAutocomplete';
import {
  MY_ADDRESSES,
  ADD_ADDRESS,
  UPDATE_ADDRESS,
  DELETE_ADDRESS,
  SET_DEFAULT_ADDRESS,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedAddress {
  id: string;
  label?: string;
  streetAddress: string;
  city: string;
  county: string;
  postalCode?: string;
  floor?: string;
  apartment?: string;
  coordinates?: { latitude: number; longitude: number } | null;
  isDefault: boolean;
}

interface AddressFormData {
  label: string;
  streetAddress: string;
  city: string;
  county: string;
  postalCode: string;
  floor: string;
  apartment: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

const EMPTY_FORM: AddressFormData = {
  label: '',
  streetAddress: '',
  city: '',
  county: '',
  postalCode: '',
  floor: '',
  apartment: '',
  latitude: null,
  longitude: null,
  isDefault: false,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation(['dashboard', 'client']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);

  // ─── Queries & Mutations ────────────────────────────────────────────────

  const { data, loading, refetch } = useQuery<{ myAddresses: SavedAddress[] }>(
    MY_ADDRESSES,
    { skip: !isAuthenticated },
  );

  const [addAddress, { loading: adding }] = useMutation(ADD_ADDRESS, {
    onCompleted: () => {
      closeForm();
      refetch();
    },
    onError: () => {
      setFormError(t('client:addresses.error.saveFailed'));
    },
  });

  const [updateAddress, { loading: updating }] = useMutation(UPDATE_ADDRESS, {
    onCompleted: () => {
      closeForm();
      refetch();
    },
    onError: () => {
      setFormError(t('client:addresses.error.updateFailed'));
    },
  });

  const [deleteAddress, { loading: deleting }] = useMutation(DELETE_ADDRESS, {
    onCompleted: () => {
      setDeleteConfirmId(null);
      refetch();
    },
  });

  const [setDefaultAddress] = useMutation(SET_DEFAULT_ADDRESS, {
    onCompleted: () => refetch(),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const closeForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAddForm(false);
    setFormError('');
  }, []);

  const openAddForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAddForm(true);
    setFormError('');
  }, []);

  const openEditForm = useCallback((addr: SavedAddress) => {
    setForm({
      label: addr.label || '',
      streetAddress: addr.streetAddress,
      city: addr.city,
      county: addr.county,
      postalCode: addr.postalCode || '',
      floor: addr.floor || '',
      apartment: addr.apartment || '',
      latitude: addr.coordinates?.latitude ?? null,
      longitude: addr.coordinates?.longitude ?? null,
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setShowAddForm(true);
    setFormError('');
  }, []);

  const handleAutocompleteSelect = useCallback((parsed: ParsedAddress) => {
    setForm((prev) => ({
      ...prev,
      streetAddress: parsed.streetAddress,
      city: parsed.city,
      county: parsed.county,
      postalCode: parsed.postalCode,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');

      if (!form.streetAddress.trim() || !form.city.trim() || !form.county.trim()) {
        setFormError(t('client:addresses.validation.required'));
        return;
      }

      const input = {
        label: form.label.trim() || undefined,
        streetAddress: form.streetAddress.trim(),
        city: form.city.trim(),
        county: form.county.trim(),
        postalCode: form.postalCode.trim() || undefined,
        floor: form.floor.trim() || undefined,
        apartment: form.apartment.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
      };

      if (editingId) {
        await updateAddress({ variables: { id: editingId, input } });
      } else {
        const { data: addData } = await addAddress({ variables: { input } });
        if (form.isDefault && addData?.addAddress?.id) {
          await setDefaultAddress({ variables: { id: addData.addAddress.id } });
        }
      }
    },
    [form, editingId, addAddress, updateAddress, setDefaultAddress],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteAddress({ variables: { id } });
    },
    [deleteAddress],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      await setDefaultAddress({ variables: { id } });
    },
    [setDefaultAddress],
  );

  const addresses = data?.myAddresses ?? [];
  const isSaving = adding || updating;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('client:addresses.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('client:addresses.subtitle')}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4" />
            {t('client:addresses.addAddress')}
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? t('client:addresses.form.editTitle') : t('client:addresses.form.addTitle')}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('client:addresses.form.labelField')}
              placeholder={t('client:addresses.form.labelPlaceholder')}
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />

            <AddressAutocomplete
              label={t('client:addresses.form.streetAddress')}
              placeholder={t('client:addresses.form.streetPlaceholder')}
              value={form.streetAddress}
              onChange={(val) => setForm((prev) => ({ ...prev, streetAddress: val }))}
              onAddressSelect={handleAutocompleteSelect}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('client:addresses.form.city')}
                placeholder={t('client:addresses.form.cityPlaceholder')}
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
              <Input
                label={t('client:addresses.form.county')}
                placeholder={t('client:addresses.form.countyPlaceholder')}
                value={form.county}
                onChange={(e) => setForm((prev) => ({ ...prev, county: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t('client:addresses.form.postalCode')}
                placeholder={t('client:addresses.form.postalPlaceholder')}
                value={form.postalCode}
                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
              <Input
                label={t('client:addresses.form.floor')}
                placeholder={t('client:addresses.form.floorPlaceholder')}
                value={form.floor}
                onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
              />
              <Input
                label={t('client:addresses.form.apartment')}
                placeholder={t('client:addresses.form.apartmentPlaceholder')}
                value={form.apartment}
                onChange={(e) => setForm((prev) => ({ ...prev, apartment: e.target.value }))}
              />
            </div>

            {!editingId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  {t('client:addresses.form.setDefault')}
                </label>
              </div>
            )}

            {form.latitude != null && form.longitude != null && (
              <p className="text-xs text-gray-400">
                {t('client:addresses.form.coordinates', { lat: form.latitude.toFixed(5), lng: form.longitude.toFixed(5) })}
              </p>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSaving}>
                <Check className="h-4 w-4" />
                {editingId ? t('client:addresses.form.saveChanges') : t('client:addresses.form.saveAddress')}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>
                {t('client:addresses.form.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading State */}
      {loading && !data && <LoadingSpinner text={t('client:addresses.loading')} />}

      {/* Address List */}
      {!loading && addresses.length > 0 && (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <Card key={addr.id} className="relative">
              {/* Delete Confirmation Overlay */}
              {deleteConfirmId === addr.id && (
                <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      {t('client:addresses.deleteConfirm')}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        {t('client:addresses.form.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-danger hover:bg-danger/90 text-white"
                        loading={deleting}
                        onClick={() => handleDelete(addr.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('client:addresses.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {addr.label && (
                      <span className="text-sm font-medium text-gray-900">
                        {addr.label}
                      </span>
                    )}
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                        <Star className="h-3 w-3" />
                        {t('client:addresses.default')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {addr.streetAddress}
                    {addr.floor && `, ${t('client:addresses.floor', { floor: addr.floor })}`}
                    {addr.apartment && `, ${t('client:addresses.apartment', { apt: addr.apartment })}`}
                  </div>
                  <div className="text-sm text-gray-400">
                    {addr.city}, {addr.county}
                    {addr.postalCode && `, ${addr.postalCode}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className={cn(
                        'p-2 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition cursor-pointer',
                      )}
                      title={t('client:addresses.setDefault')}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditForm(addr)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-primary/5 hover:text-primary transition cursor-pointer"
                    title={t('client:addresses.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(addr.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-danger transition cursor-pointer"
                    title={t('client:addresses.delete')}
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
      {!loading && addresses.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <MapPin className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('client:addresses.empty.title')}
          </h3>
          <p className="text-gray-500 mb-6">
            {t('client:addresses.empty.description')}
          </p>
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4" />
            {t('client:addresses.empty.addButton')}
          </Button>
        </div>
      )}
    </div>
  );
}
