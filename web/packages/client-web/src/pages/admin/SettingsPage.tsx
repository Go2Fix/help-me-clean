import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Pencil, Check, X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  PLATFORM_SETTINGS,
  UPDATE_PLATFORM_SETTING,
  ALL_SERVICES,
  ALL_EXTRAS,
  UPDATE_SERVICE_DEFINITION,
  CREATE_SERVICE_DEFINITION,
  UPDATE_SERVICE_EXTRA,
  CREATE_SERVICE_EXTRA,
  ALL_CITIES,
  CREATE_CITY,
  TOGGLE_CITY_ACTIVE,
  CREATE_CITY_AREA,
  DELETE_CITY_AREA,
  PLATFORM_MODE,
  WAITLIST_STATS,
  WAITLIST_LEADS,
  RECURRING_DISCOUNTS,
  UPDATE_RECURRING_DISCOUNT,
  ALL_SERVICE_CATEGORIES,
  CREATE_SERVICE_CATEGORY,
  UPDATE_SERVICE_CATEGORY,
  PRICE_AUDIT_LOG,
  UPDATE_CITY_PRICING_MULTIPLIER,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'general' | 'services' | 'extras' | 'cities' | 'categories' | 'discounts' | 'audit' | 'platform';

interface PlatformSetting {
  key: string;
  value: string;
  valueType?: string;
  description?: string;
  updatedAt?: string;
}

interface ServiceDef {
  id: string;
  serviceType: string;
  nameRo: string;
  nameEn: string;
  basePricePerHour: number;
  minHours: number;
  hoursPerRoom: number;
  hoursPerBathroom: number;
  hoursPer100Sqm: number;
  houseMultiplier: number;
  petDurationMinutes: number;
  icon?: string;
  isActive: boolean;
  includedItems: string[];
  categoryId?: string | null;
  pricingModel: 'HOURLY' | 'PER_SQM';
  pricePerSqm?: number | null;
}

interface ExtraDef {
  id: string;
  nameRo: string;
  nameEn: string;
  price: number;
  durationMinutes: number;
  icon?: string;
  isActive: boolean;
  allowMultiple: boolean;
  unitLabel?: string | null;
  categoryId?: string | null;
}

interface RecurringDiscount {
  recurrenceType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  discountPct: number;
  isActive: boolean;
}

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

interface City {
  id: string;
  name: string;
  county: string;
  isActive: boolean;
  pricingMultiplier: number;
  areas: CityArea[];
}

interface ServiceCategory {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  descriptionRo?: string | null;
  descriptionEn?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  commissionPct?: number | null;
  sortOrder: number;
  isActive: boolean;
  formFields?: string | null;
  services: { id: string; nameRo: string }[];
}

interface PriceAuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedByName?: string | null;
  changedByEmail?: string | null;
  changedAt: string;
}

interface WaitlistLead {
  id: string;
  leadType: string;
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  city?: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const tabs: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Setari Generale' },
  { key: 'services', label: 'Servicii' },
  { key: 'extras', label: 'Extra-uri' },
  { key: 'cities', label: 'Orase' },
  { key: 'categories', label: 'Categorii' },
  { key: 'discounts', label: 'Reduceri abonamente' },
  { key: 'audit', label: 'Jurnal Preturi' },
  { key: 'platform', label: 'Platforma' },
];

const SETTING_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Business', keys: ['platform_commission_pct', 'vat_rate_pct', 'min_booking_hours', 'max_booking_hours', 'default_hourly_rate', 'booking_auto_cancel_hours', 'require_company_approval'] },
  { title: 'Anulare / Reprogramare', keys: ['cancel_free_hours_before', 'cancel_late_refund_pct', 'reschedule_free_hours_before', 'reschedule_max_per_booking'] },
  { title: 'Contact', keys: ['support_email', 'support_phone'] },
  { title: 'Politici', keys: ['privacy_url', 'terms_url'] },
];

const SETTING_LABELS: Record<string, string> = {
  platform_commission_pct: 'Comision platforma (%)',
  vat_rate_pct: 'Cota TVA (%)',
  min_booking_hours: 'Ore minime rezervare',
  max_booking_hours: 'Ore maxime rezervare',
  default_hourly_rate: 'Tarif orar implicit (RON)',
  booking_auto_cancel_hours: 'Anulare automata rezervare (ore)',
  require_company_approval: 'Aprobare companie necesara',
  cancel_free_hours_before: 'Anulare gratuita inainte de (ore)',
  cancel_late_refund_pct: 'Rambursare anulare tarzie (%)',
  reschedule_free_hours_before: 'Reprogramare gratuita inainte de (ore)',
  reschedule_max_per_booking: 'Max reprogramari per rezervare',
  support_email: 'Email suport',
  support_phone: 'Telefon suport',
  privacy_url: 'URL Politica confidentialitate',
  terms_url: 'URL Termeni si conditii',
};

const NUMBER_KEYS = new Set(['platform_commission_pct', 'vat_rate_pct', 'min_booking_hours', 'max_booking_hours', 'default_hourly_rate', 'booking_auto_cancel_hours', 'cancel_free_hours_before', 'cancel_late_refund_pct', 'reschedule_free_hours_before', 'reschedule_max_per_booking']);

const SERVICE_TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'DEEP', label: 'Curatenie generala' },
  { value: 'POST_CONSTRUCTION', label: 'Post-constructie' },
  { value: 'OFFICE', label: 'Birou' },
  { value: 'MOVE_IN_OUT', label: 'Mutare' },
];

const PRICING_MODEL_OPTIONS = [
  { value: 'HOURLY', label: 'Orar' },
  { value: 'PER_SQM', label: 'Pe mp' },
];

const AUDIT_ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'service_definition', label: 'Serviciu' },
  { value: 'service_extra', label: 'Extra' },
  { value: 'service_category', label: 'Categorie' },
  { value: 'platform_setting', label: 'Setare platforma' },
  { value: 'city_pricing', label: 'Pret oras' },
  { value: 'company_commission', label: 'Comision companie' },
];

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  service_definition: 'Serviciu',
  service_extra: 'Extra',
  service_category: 'Categorie',
  platform_setting: 'Setare platforma',
  city_pricing: 'Pret oras',
  company_commission: 'Comision companie',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-32" />
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 py-3 px-4">
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
        checked ? 'bg-emerald-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

// ─── Tab: Setari Generale ────────────────────────────────────────────────────

function GeneralTab() {
  const { data, loading } = useQuery<{ platformSettings: PlatformSetting[] }>(PLATFORM_SETTINGS);
  const [updateSetting] = useMutation(UPDATE_PLATFORM_SETTING, {
    refetchQueries: [{ query: PLATFORM_SETTINGS }],
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const settingsMap = new Map<string, PlatformSetting>();
  (data?.platformSettings ?? []).forEach((s) => settingsMap.set(s.key, s));

  const handleEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await updateSetting({ variables: { key, value: editValue } });
      setSavedKey(key);
      setEditingKey(null);
      setEditValue('');
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      {SETTING_GROUPS.map((group) => (
        <Card key={group.title}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.title}</h3>
          <div className="divide-y divide-gray-100">
            {group.keys.map((key) => {
              const setting = settingsMap.get(key);
              const value = setting?.value ?? '';
              const isEditing = editingKey === key;
              const isNumber = NUMBER_KEYS.has(key);

              return (
                <div key={key} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700">{SETTING_LABELS[key] ?? key}</p>
                    {setting?.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <input
                          type={isNumber ? 'number' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(key);
                            if (e.key === 'Escape') handleCancel();
                          }}
                          autoFocus
                          className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                        <button
                          onClick={() => handleSave(key)}
                          disabled={saving}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {savedKey === key && (
                          <Badge variant="success">Salvat</Badge>
                        )}
                        <span className="text-sm text-gray-900 font-medium max-w-[200px] truncate">
                          {value || <span className="text-gray-300 italic">nesetat</span>}
                        </span>
                        <button
                          onClick={() => handleEdit(key, value)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Servicii ───────────────────────────────────────────────────────────

function ServicesTab() {
  const { data, loading } = useQuery<{ allServices: ServiceDef[] }>(ALL_SERVICES);
  const { data: categoriesData } = useQuery<{ allServiceCategories: ServiceCategory[] }>(ALL_SERVICE_CATEGORIES);
  const [updateService] = useMutation(UPDATE_SERVICE_DEFINITION, {
    refetchQueries: [{ query: ALL_SERVICES }],
  });
  const [createService] = useMutation(CREATE_SERVICE_DEFINITION, {
    refetchQueries: [{ query: ALL_SERVICES }],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ nameRo: '', nameEn: '', basePricePerHour: 0, minHours: 0, hoursPerRoom: 0.5, hoursPerBathroom: 0.5, hoursPer100Sqm: 1.0, houseMultiplier: 1.3, petDurationMinutes: 15, includedItems: [] as string[], categoryId: '' as string, pricingModel: 'HOURLY' as string, pricePerSqm: 0 });
  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newService, setNewService] = useState({ serviceType: 'STANDARD', nameRo: '', nameEn: '', basePricePerHour: 0, minHours: 2, hoursPerRoom: 0.5, hoursPerBathroom: 0.5, hoursPer100Sqm: 1.0, houseMultiplier: 1.3, petDurationMinutes: 15, isActive: true, includedItems: [] as string[], categoryId: '' as string, pricingModel: 'HOURLY' as string, pricePerSqm: 0 });
  const [newModalItem, setNewModalItem] = useState('');
  const [creating, setCreating] = useState(false);

  const services = data?.allServices ?? [];
  const categories = categoriesData?.allServiceCategories ?? [];
  const categoryOptions = [{ value: '', label: '-- Fara categorie --' }, ...categories.map((c) => ({ value: c.id, label: c.nameRo }))];

  const startEdit = (s: ServiceDef) => {
    setEditingId(s.id);
    setEditFields({ nameRo: s.nameRo, nameEn: s.nameEn, basePricePerHour: s.basePricePerHour, minHours: s.minHours, hoursPerRoom: s.hoursPerRoom, hoursPerBathroom: s.hoursPerBathroom, hoursPer100Sqm: s.hoursPer100Sqm, houseMultiplier: s.houseMultiplier, petDurationMinutes: s.petDurationMinutes, includedItems: s.includedItems ?? [], categoryId: s.categoryId ?? '', pricingModel: s.pricingModel ?? 'HOURLY', pricePerSqm: s.pricePerSqm ?? 0 });
    setNewIncludedItem('');
  };

  const saveEdit = async (s: ServiceDef) => {
    await updateService({ variables: { input: { id: s.id, ...editFields, categoryId: editFields.categoryId || null, pricePerSqm: editFields.pricingModel === 'PER_SQM' ? editFields.pricePerSqm : null, isActive: s.isActive } } });
    setEditingId(null);
  };

  const toggleActive = async (s: ServiceDef) => {
    await updateService({ variables: { input: { id: s.id, nameRo: s.nameRo, nameEn: s.nameEn, basePricePerHour: s.basePricePerHour, minHours: s.minHours, hoursPerRoom: s.hoursPerRoom, hoursPerBathroom: s.hoursPerBathroom, hoursPer100Sqm: s.hoursPer100Sqm, houseMultiplier: s.houseMultiplier, petDurationMinutes: s.petDurationMinutes, isActive: !s.isActive, includedItems: s.includedItems ?? [], categoryId: s.categoryId ?? null, pricingModel: s.pricingModel ?? 'HOURLY', pricePerSqm: s.pricePerSqm ?? null } } });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createService({ variables: { input: { ...newService, categoryId: newService.categoryId || null, pricePerSqm: newService.pricingModel === 'PER_SQM' ? newService.pricePerSqm : null } } });
      setShowModal(false);
      setNewService({ serviceType: 'STANDARD', nameRo: '', nameEn: '', basePricePerHour: 0, minHours: 2, hoursPerRoom: 0.5, hoursPerBathroom: 0.5, hoursPer100Sqm: 1.0, houseMultiplier: 1.3, petDurationMinutes: 15, isActive: true, includedItems: [], categoryId: '', pricingModel: 'HOURLY', pricePerSqm: 0 });
      setNewModalItem('');
    } finally {
      setCreating(false);
    }
  };

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.nameRo ?? null;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{services.length} servicii definite</p>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Adauga serviciu
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <TableSkeleton />
        ) : services.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Niciun serviciu definit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume RO</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume EN</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Categorie</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Model</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Pret/Ora</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Pret/mp</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Ore Min.</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3" title="Ore per camera">h/Cam</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3" title="Ore per baie">h/Baie</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3" title="Multiplicator casa">Casa x</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Activ</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                    <>
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameRo}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameRo: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{s.nameRo}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameEn}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameEn: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{s.nameEn}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editFields.categoryId}
                            onChange={(e) => setEditFields((f) => ({ ...f, categoryId: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                          >
                            {categoryOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-600 text-xs">{getCategoryName(s.categoryId) ?? <span className="text-gray-300 italic">--</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <select
                            value={editFields.pricingModel}
                            onChange={(e) => setEditFields((f) => ({ ...f, pricingModel: e.target.value }))}
                            className="w-20 rounded-lg border border-gray-300 px-1 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                          >
                            {PRICING_MODEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={s.pricingModel === 'PER_SQM' ? 'info' : 'default'}>
                            {s.pricingModel === 'PER_SQM' ? 'Pe mp' : 'Orar'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.basePricePerHour}
                            onChange={(e) => setEditFields((f) => ({ ...f, basePricePerHour: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-900">{s.basePricePerHour} RON</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing && editFields.pricingModel === 'PER_SQM' ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editFields.pricePerSqm}
                            onChange={(e) => setEditFields((f) => ({ ...f, pricePerSqm: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{s.pricingModel === 'PER_SQM' && s.pricePerSqm ? `${s.pricePerSqm} RON` : <span className="text-gray-300">--</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.minHours}
                            onChange={(e) => setEditFields((f) => ({ ...f, minHours: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{s.minHours}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input type="number" step="0.05" value={editFields.hoursPerRoom} onChange={(e) => setEditFields((f) => ({ ...f, hoursPerRoom: Number(e.target.value) }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        ) : (
                          <span className="text-gray-600">{s.hoursPerRoom}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input type="number" step="0.05" value={editFields.hoursPerBathroom} onChange={(e) => setEditFields((f) => ({ ...f, hoursPerBathroom: Number(e.target.value) }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        ) : (
                          <span className="text-gray-600">{s.hoursPerBathroom}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input type="number" step="0.05" value={editFields.houseMultiplier} onChange={(e) => setEditFields((f) => ({ ...f, houseMultiplier: Number(e.target.value) }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        ) : (
                          <span className="text-gray-600">{s.houseMultiplier}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Toggle checked={s.isActive} onChange={() => toggleActive(s)} />
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(s)} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(s)} className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition cursor-pointer">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="bg-blue-50/50 border-b border-blue-100">
                        <td colSpan={12} className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Ce include serviciul</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editFields.includedItems.map((item, idx) => (
                              <span key={idx} className="flex items-center gap-1 text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-2.5 py-0.5">
                                {item}
                                <button
                                  type="button"
                                  onClick={() => setEditFields((f) => ({ ...f, includedItems: f.includedItems.filter((_, i) => i !== idx) }))}
                                  className="ml-0.5 text-blue-400 hover:text-blue-700 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <input
                            value={newIncludedItem}
                            onChange={(e) => setNewIncludedItem(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newIncludedItem.trim()) {
                                setEditFields((f) => ({ ...f, includedItems: [...f.includedItems, newIncludedItem.trim()] }));
                                setNewIncludedItem('');
                                e.preventDefault();
                              }
                            }}
                            placeholder="Adauga element si apasa Enter"
                            className="max-w-xs rounded-lg border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adauga serviciu">
        <div className="space-y-4">
          <Select
            label="Tip serviciu"
            options={SERVICE_TYPE_OPTIONS}
            value={newService.serviceType}
            onChange={(e) => setNewService((s) => ({ ...s, serviceType: e.target.value }))}
          />
          <Select
            label="Categorie"
            options={categoryOptions}
            value={newService.categoryId}
            onChange={(e) => setNewService((s) => ({ ...s, categoryId: e.target.value }))}
          />
          <Input
            label="Nume RO"
            value={newService.nameRo}
            onChange={(e) => setNewService((s) => ({ ...s, nameRo: e.target.value }))}
          />
          <Input
            label="Nume EN"
            value={newService.nameEn}
            onChange={(e) => setNewService((s) => ({ ...s, nameEn: e.target.value }))}
          />
          <Select
            label="Model pret"
            options={PRICING_MODEL_OPTIONS}
            value={newService.pricingModel}
            onChange={(e) => setNewService((s) => ({ ...s, pricingModel: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pret/Ora (RON)"
              type="number"
              value={newService.basePricePerHour}
              onChange={(e) => setNewService((s) => ({ ...s, basePricePerHour: Number(e.target.value) }))}
            />
            {newService.pricingModel === 'PER_SQM' && (
              <Input
                label="Pret/mp (RON)"
                type="number"
                step={0.1}
                value={newService.pricePerSqm}
                onChange={(e) => setNewService((s) => ({ ...s, pricePerSqm: Number(e.target.value) }))}
              />
            )}
            <Input
              label="Ore minime"
              type="number"
              value={newService.minHours}
              onChange={(e) => setNewService((s) => ({ ...s, minHours: Number(e.target.value) }))}
            />
          </div>
          <p className="text-xs font-medium text-gray-500 mt-2">Configurare durata estimata</p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="h/Camera"
              type="number"
              step={0.05}
              value={newService.hoursPerRoom}
              onChange={(e) => setNewService((s) => ({ ...s, hoursPerRoom: Number(e.target.value) }))}
            />
            <Input
              label="h/Baie"
              type="number"
              step={0.05}
              value={newService.hoursPerBathroom}
              onChange={(e) => setNewService((s) => ({ ...s, hoursPerBathroom: Number(e.target.value) }))}
            />
            <Input
              label="h/100mp"
              type="number"
              step={0.1}
              value={newService.hoursPer100Sqm}
              onChange={(e) => setNewService((s) => ({ ...s, hoursPer100Sqm: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Multiplicator casa"
              type="number"
              step={0.05}
              value={newService.houseMultiplier}
              onChange={(e) => setNewService((s) => ({ ...s, houseMultiplier: Number(e.target.value) }))}
            />
            <Input
              label="Min. animale"
              type="number"
              value={newService.petDurationMinutes}
              onChange={(e) => setNewService((s) => ({ ...s, petDurationMinutes: Number(e.target.value) }))}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Ce include serviciul</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {newService.includedItems.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-0.5">
                  {item}
                  <button
                    type="button"
                    onClick={() => setNewService((s) => ({ ...s, includedItems: s.includedItems.filter((_, i) => i !== idx) }))}
                    className="ml-0.5 text-blue-400 hover:text-blue-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={newModalItem}
              onChange={(e) => setNewModalItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newModalItem.trim()) {
                  setNewService((s) => ({ ...s, includedItems: [...s.includedItems, newModalItem.trim()] }));
                  setNewModalItem('');
                  e.preventDefault();
                }
              }}
              placeholder="Adauga element si apasa Enter"
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newService.isActive}
              onChange={(e) => setNewService((s) => ({ ...s, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-700">Activ</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Anuleaza</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newService.nameRo.trim() || !newService.nameEn.trim()}
            >
              Creeaza
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Tab: Extra-uri ──────────────────────────────────────────────────────────

function ExtrasTab() {
  const { data, loading } = useQuery<{ allExtras: ExtraDef[] }>(ALL_EXTRAS);
  const { data: categoriesData } = useQuery<{ allServiceCategories: ServiceCategory[] }>(ALL_SERVICE_CATEGORIES);
  const [updateExtra] = useMutation(UPDATE_SERVICE_EXTRA, {
    refetchQueries: [{ query: ALL_EXTRAS }],
  });
  const [createExtra] = useMutation(CREATE_SERVICE_EXTRA, {
    refetchQueries: [{ query: ALL_EXTRAS }],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ nameRo: '', nameEn: '', price: 0, durationMinutes: 0, allowMultiple: false, unitLabel: '', categoryId: '' as string });
  const [showModal, setShowModal] = useState(false);
  const [newExtra, setNewExtra] = useState({ nameRo: '', nameEn: '', price: 0, durationMinutes: 0, isActive: true, allowMultiple: false, unitLabel: '', categoryId: '' as string });
  const [creating, setCreating] = useState(false);

  const extras = data?.allExtras ?? [];
  const categories = categoriesData?.allServiceCategories ?? [];
  const categoryOptions = [{ value: '', label: 'Global (toate categoriile)' }, ...categories.map((c) => ({ value: c.id, label: c.nameRo }))];

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.nameRo ?? null;
  };

  const startEdit = (e: ExtraDef) => {
    setEditingId(e.id);
    setEditFields({ nameRo: e.nameRo, nameEn: e.nameEn, price: e.price, durationMinutes: e.durationMinutes, allowMultiple: e.allowMultiple, unitLabel: e.unitLabel ?? '', categoryId: e.categoryId ?? '' });
  };

  const saveEdit = async (ex: ExtraDef) => {
    await updateExtra({ variables: { input: { id: ex.id, ...editFields, unitLabel: editFields.unitLabel || null, categoryId: editFields.categoryId || null, isActive: ex.isActive } } });
    setEditingId(null);
  };

  const toggleActive = async (e: ExtraDef) => {
    await updateExtra({ variables: { input: { id: e.id, nameRo: e.nameRo, nameEn: e.nameEn, price: e.price, durationMinutes: e.durationMinutes, isActive: !e.isActive, allowMultiple: e.allowMultiple, unitLabel: e.unitLabel ?? null, categoryId: e.categoryId ?? null } } });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createExtra({ variables: { input: { ...newExtra, unitLabel: newExtra.unitLabel || null, categoryId: newExtra.categoryId || null } } });
      setShowModal(false);
      setNewExtra({ nameRo: '', nameEn: '', price: 0, durationMinutes: 0, isActive: true, allowMultiple: false, unitLabel: '', categoryId: '' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{extras.length} extra-uri definite</p>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Adauga extra
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <TableSkeleton />
        ) : extras.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Niciun extra definit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume RO</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume EN</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Pret (RON)</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3" title="Durata adaugata (minute)">Durata(min)</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Categorie</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Tip</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Activ</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {extras.map((ex) => {
                  const isEditing = editingId === ex.id;
                  return (
                    <tr key={ex.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameRo}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameRo: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(ex); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{ex.nameRo}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameEn}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameEn: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(ex); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{ex.nameEn}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.price}
                            onChange={(e) => setEditFields((f) => ({ ...f, price: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(ex); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-900">{ex.price} RON</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.durationMinutes}
                            onChange={(e) => setEditFields((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(ex); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{ex.durationMinutes} min</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editFields.categoryId}
                            onChange={(e) => setEditFields((f) => ({ ...f, categoryId: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                          >
                            {categoryOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-600 text-xs">{getCategoryName(ex.categoryId) ?? <span className="text-gray-300 italic">Global</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex flex-col items-center gap-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editFields.allowMultiple}
                                onChange={(e) => setEditFields((f) => ({ ...f, allowMultiple: e.target.checked, unitLabel: e.target.checked ? f.unitLabel : '' }))}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
                              />
                              <span className="text-xs text-gray-600">Multiple</span>
                            </label>
                            {editFields.allowMultiple && (
                              <input
                                value={editFields.unitLabel}
                                onChange={(e) => setEditFields((f) => ({ ...f, unitLabel: e.target.value }))}
                                placeholder="ex: dulap"
                                className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            )}
                          </div>
                        ) : (
                          ex.allowMultiple ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              x{ex.unitLabel ?? '?'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Toggle
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Toggle checked={ex.isActive} onChange={() => toggleActive(ex)} />
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(ex)} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(ex)} className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition cursor-pointer">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adauga extra">
        <div className="space-y-4">
          <Select
            label="Categorie"
            options={categoryOptions}
            value={newExtra.categoryId}
            onChange={(e) => setNewExtra((s) => ({ ...s, categoryId: e.target.value }))}
          />
          <Input
            label="Nume RO"
            value={newExtra.nameRo}
            onChange={(e) => setNewExtra((s) => ({ ...s, nameRo: e.target.value }))}
          />
          <Input
            label="Nume EN"
            value={newExtra.nameEn}
            onChange={(e) => setNewExtra((s) => ({ ...s, nameEn: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pret (RON)"
              type="number"
              value={newExtra.price}
              onChange={(e) => setNewExtra((s) => ({ ...s, price: Number(e.target.value) }))}
            />
            <Input
              label="Durata (min)"
              type="number"
              value={newExtra.durationMinutes}
              onChange={(e) => setNewExtra((s) => ({ ...s, durationMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newExtra.allowMultiple}
                onChange={(e) => setNewExtra((s) => ({ ...s, allowMultiple: e.target.checked, unitLabel: e.target.checked ? s.unitLabel : '' }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-gray-700">Permite cantitate multipla</span>
            </label>
            {newExtra.allowMultiple && (
              <Input
                label="Unitate (ex: dulap, geam)"
                value={newExtra.unitLabel}
                onChange={(e) => setNewExtra((s) => ({ ...s, unitLabel: e.target.value }))}
                placeholder="ex: dulap"
              />
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newExtra.isActive}
              onChange={(e) => setNewExtra((s) => ({ ...s, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-700">Activ</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Anuleaza</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newExtra.nameRo.trim() || !newExtra.nameEn.trim()}
            >
              Creeaza
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Tab: Orase ─────────────────────────────────────────────────────────────

function CitiesTab() {
  const { data, loading } = useQuery<{ allCities: City[] }>(ALL_CITIES);
  const [createCity] = useMutation(CREATE_CITY, {
    refetchQueries: [{ query: ALL_CITIES }],
  });
  const [toggleCityActive] = useMutation(TOGGLE_CITY_ACTIVE, {
    refetchQueries: [{ query: ALL_CITIES }],
  });
  const [createCityArea] = useMutation(CREATE_CITY_AREA, {
    refetchQueries: [{ query: ALL_CITIES }],
  });
  const [deleteCityArea] = useMutation(DELETE_CITY_AREA, {
    refetchQueries: [{ query: ALL_CITIES }],
  });
  const [updateMultiplier] = useMutation(UPDATE_CITY_PRICING_MULTIPLIER, {
    refetchQueries: [{ query: ALL_CITIES }],
  });

  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [showCityModal, setShowCityModal] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', county: '' });
  const [creatingCity, setCreatingCity] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaCityId, setAreaCityId] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [creatingArea, setCreatingArea] = useState(false);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);
  const [confirmDeleteAreaId, setConfirmDeleteAreaId] = useState<string | null>(null);
  const [editingMultiplierId, setEditingMultiplierId] = useState<string | null>(null);
  const [editMultiplierValue, setEditMultiplierValue] = useState('');
  const [savingMultiplier, setSavingMultiplier] = useState(false);

  const cities = data?.allCities ?? [];

  const toggleExpanded = (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  const handleCreateCity = async () => {
    setCreatingCity(true);
    try {
      await createCity({ variables: { name: newCity.name, county: newCity.county } });
      setShowCityModal(false);
      setNewCity({ name: '', county: '' });
    } finally {
      setCreatingCity(false);
    }
  };

  const handleToggleActive = async (city: City) => {
    await toggleCityActive({ variables: { id: city.id, isActive: !city.isActive } });
  };

  const openAreaModal = (cityId: string) => {
    setAreaCityId(cityId);
    setNewAreaName('');
    setShowAreaModal(true);
  };

  const handleCreateArea = async () => {
    if (!areaCityId) return;
    setCreatingArea(true);
    try {
      await createCityArea({ variables: { cityId: areaCityId, name: newAreaName } });
      setShowAreaModal(false);
      setNewAreaName('');
      setAreaCityId(null);
    } finally {
      setCreatingArea(false);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    setDeletingAreaId(areaId);
    try {
      await deleteCityArea({ variables: { id: areaId } });
    } finally {
      setDeletingAreaId(null);
      setConfirmDeleteAreaId(null);
    }
  };

  const startEditMultiplier = (city: City) => {
    setEditingMultiplierId(city.id);
    setEditMultiplierValue(String(city.pricingMultiplier));
  };

  const saveMultiplier = async (cityId: string) => {
    const val = parseFloat(editMultiplierValue);
    if (isNaN(val) || val <= 0) return;
    setSavingMultiplier(true);
    try {
      await updateMultiplier({ variables: { id: cityId, pricingMultiplier: val } });
      setEditingMultiplierId(null);
      setEditMultiplierValue('');
    } finally {
      setSavingMultiplier(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{cities.length} orase definite</p>
        <Button size="sm" onClick={() => setShowCityModal(true)}>
          <Plus className="h-4 w-4" />
          Adauga oras
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <TableSkeleton />
        ) : cities.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Niciun oras definit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3 w-10" />
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Oras</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Judet</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Multiplicator</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Activ</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Zone</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cities.map((city) => {
                  const isExpanded = expandedCities.has(city.id);
                  const isEditingMultiplier = editingMultiplierId === city.id;
                  return (
                    <tr key={city.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div>
                          {/* City row */}
                          <div className="flex items-center hover:bg-gray-50/50 transition-colors">
                            <div className="px-4 py-3 w-10">
                              <button
                                onClick={() => toggleExpanded(city.id)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <span className="font-medium text-gray-900">{city.name}</span>
                            </div>
                            <div className="px-4 py-3" style={{ minWidth: '120px' }}>
                              <span className="text-gray-600">{city.county}</span>
                            </div>
                            <div className="px-4 py-3 text-right" style={{ minWidth: '140px' }}>
                              {isEditingMultiplier ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={editMultiplierValue}
                                    onChange={(e) => setEditMultiplierValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveMultiplier(city.id);
                                      if (e.key === 'Escape') setEditingMultiplierId(null);
                                    }}
                                    autoFocus
                                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                  <button
                                    onClick={() => saveMultiplier(city.id)}
                                    disabled={savingMultiplier}
                                    className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingMultiplierId(null)}
                                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditMultiplier(city)}
                                  className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-primary transition cursor-pointer"
                                  title="Editeaza multiplicator"
                                >
                                  {city.pricingMultiplier}x
                                  <Pencil className="h-3 w-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                            <div className="px-4 py-3 text-center" style={{ minWidth: '80px' }}>
                              <Toggle checked={city.isActive} onChange={() => handleToggleActive(city)} />
                            </div>
                            <div className="px-4 py-3 text-center" style={{ minWidth: '80px' }}>
                              <Badge variant={city.areas.length > 0 ? 'info' : 'default'}>
                                {city.areas.length}
                              </Badge>
                            </div>
                            <div className="px-4 py-3 w-10">
                              <button
                                onClick={() => openAreaModal(city.id)}
                                className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition cursor-pointer"
                                title="Adauga zona"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded areas */}
                          {isExpanded && (
                            <div className="px-14 pb-4 pt-1">
                              {city.areas.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Nicio zona definita.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {city.areas.map((area) => (
                                    <span
                                      key={area.id}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium"
                                    >
                                      {area.name}
                                      {confirmDeleteAreaId === area.id ? (
                                        <span className="inline-flex items-center gap-1 ml-1">
                                          <button
                                            onClick={() => handleDeleteArea(area.id)}
                                            disabled={deletingAreaId === area.id}
                                            className="text-red-600 hover:text-red-800 font-semibold transition cursor-pointer text-xs"
                                          >
                                            Da
                                          </button>
                                          <span className="text-gray-400">/</span>
                                          <button
                                            onClick={() => setConfirmDeleteAreaId(null)}
                                            className="text-gray-500 hover:text-gray-700 font-semibold transition cursor-pointer text-xs"
                                          >
                                            Nu
                                          </button>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteAreaId(area.id)}
                                          className="text-blue-400 hover:text-red-500 transition cursor-pointer"
                                          title="Sterge zona"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
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

      {/* Modal: Adauga oras */}
      <Modal open={showCityModal} onClose={() => setShowCityModal(false)} title="Adauga oras">
        <div className="space-y-4">
          <Input
            label="Nume oras"
            value={newCity.name}
            onChange={(e) => setNewCity((s) => ({ ...s, name: e.target.value }))}
            placeholder="ex: Cluj-Napoca"
          />
          <Input
            label="Judet"
            value={newCity.county}
            onChange={(e) => setNewCity((s) => ({ ...s, county: e.target.value }))}
            placeholder="ex: Cluj"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCityModal(false)}>Anuleaza</Button>
            <Button
              onClick={handleCreateCity}
              loading={creatingCity}
              disabled={!newCity.name.trim() || !newCity.county.trim()}
            >
              Creeaza
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Adauga zona */}
      <Modal open={showAreaModal} onClose={() => setShowAreaModal(false)} title="Adauga zona">
        <div className="space-y-4">
          <Input
            label="Nume zona"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="ex: Centru, Manastur, Marasti"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAreaModal(false)}>Anuleaza</Button>
            <Button
              onClick={handleCreateArea}
              loading={creatingArea}
              disabled={!newAreaName.trim()}
            >
              Creeaza
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Tab: Categorii ─────────────────────────────────────────────────────────

function CategoriesTab() {
  const { data, loading } = useQuery<{ allServiceCategories: ServiceCategory[] }>(ALL_SERVICE_CATEGORIES);
  const [createCategory] = useMutation(CREATE_SERVICE_CATEGORY, {
    refetchQueries: [{ query: ALL_SERVICE_CATEGORIES }],
  });
  const [updateCategory] = useMutation(UPDATE_SERVICE_CATEGORY, {
    refetchQueries: [{ query: ALL_SERVICE_CATEGORIES }],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ nameRo: '', nameEn: '', descriptionRo: '', descriptionEn: '', icon: '', imageUrl: '', commissionPct: 0, sortOrder: 0, isActive: true, formFields: '' });
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ slug: '', nameRo: '', nameEn: '', descriptionRo: '', descriptionEn: '', icon: '', imageUrl: '', commissionPct: 0, sortOrder: 0, isActive: true, formFields: '' });
  const [creating, setCreating] = useState(false);

  const categories = data?.allServiceCategories ?? [];

  const startEdit = (c: ServiceCategory) => {
    setEditingId(c.id);
    setEditFields({
      nameRo: c.nameRo,
      nameEn: c.nameEn,
      descriptionRo: c.descriptionRo ?? '',
      descriptionEn: c.descriptionEn ?? '',
      icon: c.icon ?? '',
      imageUrl: c.imageUrl ?? '',
      commissionPct: c.commissionPct ?? 0,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      formFields: c.formFields ?? '',
    });
  };

  const saveEdit = async (c: ServiceCategory) => {
    await updateCategory({
      variables: {
        input: {
          id: c.id,
          nameRo: editFields.nameRo,
          nameEn: editFields.nameEn,
          descriptionRo: editFields.descriptionRo || null,
          descriptionEn: editFields.descriptionEn || null,
          icon: editFields.icon || null,
          imageUrl: editFields.imageUrl || null,
          commissionPct: editFields.commissionPct || null,
          sortOrder: editFields.sortOrder,
          isActive: editFields.isActive,
          formFields: editFields.formFields || null,
        },
      },
    });
    setEditingId(null);
  };

  const toggleActive = async (c: ServiceCategory) => {
    await updateCategory({
      variables: {
        input: {
          id: c.id,
          nameRo: c.nameRo,
          nameEn: c.nameEn,
          descriptionRo: c.descriptionRo ?? null,
          descriptionEn: c.descriptionEn ?? null,
          icon: c.icon ?? null,
          imageUrl: c.imageUrl ?? null,
          commissionPct: c.commissionPct ?? null,
          sortOrder: c.sortOrder,
          isActive: !c.isActive,
          formFields: c.formFields ?? null,
        },
      },
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createCategory({
        variables: {
          input: {
            slug: newCategory.slug,
            nameRo: newCategory.nameRo,
            nameEn: newCategory.nameEn,
            descriptionRo: newCategory.descriptionRo || null,
            descriptionEn: newCategory.descriptionEn || null,
            icon: newCategory.icon || null,
            imageUrl: newCategory.imageUrl || null,
            commissionPct: newCategory.commissionPct || null,
            sortOrder: newCategory.sortOrder,
            isActive: newCategory.isActive,
            formFields: newCategory.formFields || null,
          },
        },
      });
      setShowModal(false);
      setNewCategory({ slug: '', nameRo: '', nameEn: '', descriptionRo: '', descriptionEn: '', icon: '', imageUrl: '', commissionPct: 0, sortOrder: 0, isActive: true, formFields: '' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{categories.length} categorii definite</p>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Adauga categorie
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nicio categorie definita.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Slug</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume RO</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nume EN</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Comision (%)</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Ordine</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Servicii</th>
                  <th className="text-center font-medium text-gray-500 px-4 py-3">Activ</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id;
                  return (
                    <React.Fragment key={cat.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{cat.slug}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameRo}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameRo: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{cat.nameRo}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editFields.nameEn}
                            onChange={(e) => setEditFields((f) => ({ ...f, nameEn: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{cat.nameEn}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editFields.commissionPct}
                            onChange={(e) => setEditFields((f) => ({ ...f, commissionPct: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-900">{cat.commissionPct ?? 0}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.sortOrder}
                            onChange={(e) => setEditFields((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-gray-600">{cat.sortOrder}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={cat.services.length > 0 ? 'info' : 'default'}>
                          {cat.services.length}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Toggle checked={cat.isActive} onChange={() => toggleActive(cat)} />
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(cat)} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition cursor-pointer">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(cat)} className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition cursor-pointer">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="bg-blue-50/30">
                        <td colSpan={8} className="px-4 py-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Câmpuri formular (JSON)</label>
                          <textarea
                            value={editFields.formFields}
                            onChange={(e) => setEditFields((f) => ({ ...f, formFields: e.target.value }))}
                            placeholder='[{"key":"areaSqm","type":"number","labelRo":"Suprafata","labelEn":"Area","required":true}]'
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adauga categorie">
        <div className="space-y-4">
          <Input
            label="Slug"
            value={newCategory.slug}
            onChange={(e) => setNewCategory((s) => ({ ...s, slug: e.target.value }))}
            placeholder="ex: curatenie"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nume RO"
              value={newCategory.nameRo}
              onChange={(e) => setNewCategory((s) => ({ ...s, nameRo: e.target.value }))}
            />
            <Input
              label="Nume EN"
              value={newCategory.nameEn}
              onChange={(e) => setNewCategory((s) => ({ ...s, nameEn: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Descriere RO"
              value={newCategory.descriptionRo}
              onChange={(e) => setNewCategory((s) => ({ ...s, descriptionRo: e.target.value }))}
            />
            <Input
              label="Descriere EN"
              value={newCategory.descriptionEn}
              onChange={(e) => setNewCategory((s) => ({ ...s, descriptionEn: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon"
              value={newCategory.icon}
              onChange={(e) => setNewCategory((s) => ({ ...s, icon: e.target.value }))}
              placeholder="ex: sparkles"
            />
            <Input
              label="URL imagine"
              value={newCategory.imageUrl}
              onChange={(e) => setNewCategory((s) => ({ ...s, imageUrl: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Comision (%)"
              type="number"
              step={0.1}
              value={newCategory.commissionPct}
              onChange={(e) => setNewCategory((s) => ({ ...s, commissionPct: Number(e.target.value) }))}
            />
            <Input
              label="Ordine sortare"
              type="number"
              value={newCategory.sortOrder}
              onChange={(e) => setNewCategory((s) => ({ ...s, sortOrder: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Câmpuri formular (JSON)</label>
            <textarea
              value={newCategory.formFields}
              onChange={(e) => setNewCategory((s) => ({ ...s, formFields: e.target.value }))}
              placeholder='[{"key":"areaSqm","type":"number","labelRo":"Suprafata","labelEn":"Area","required":true}]'
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newCategory.isActive}
              onChange={(e) => setNewCategory((s) => ({ ...s, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-700">Activ</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Anuleaza</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newCategory.slug.trim() || !newCategory.nameRo.trim() || !newCategory.nameEn.trim()}
            >
              Creeaza
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Tab: Reduceri abonamente ────────────────────────────────────────────────

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'Bi-saptamanal',
  MONTHLY: 'Lunar',
};

const RECURRENCE_ORDER: RecurringDiscount['recurrenceType'][] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

function RecurringDiscountsTab() {
  const { data, loading } = useQuery<{ recurringDiscounts: RecurringDiscount[] }>(RECURRING_DISCOUNTS);
  const [updateDiscount] = useMutation(UPDATE_RECURRING_DISCOUNT, {
    refetchQueries: [{ query: RECURRING_DISCOUNTS }],
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [savedType, setSavedType] = useState<string | null>(null);

  const discountsMap = new Map<string, RecurringDiscount>();
  (data?.recurringDiscounts ?? []).forEach((d) => discountsMap.set(d.recurrenceType, d));

  const handleSave = async (recurrenceType: string) => {
    const rawValue = editValues[recurrenceType];
    if (rawValue === undefined || rawValue === '') return;
    const pct = parseFloat(rawValue);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    setSavingType(recurrenceType);
    try {
      await updateDiscount({ variables: { recurrenceType, discountPct: pct } });
      setSavedType(recurrenceType);
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[recurrenceType];
        return next;
      });
      setTimeout(() => setSavedType(null), 2000);
    } finally {
      setSavingType(null);
    }
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Reduceri abonamente</h3>
      <p className="text-sm text-gray-500 mb-5">Configureaza reducerile pentru abonamentele recurente</p>

      <div className="divide-y divide-gray-100">
        {RECURRENCE_ORDER.map((type) => {
          const discount = discountsMap.get(type);
          const currentPct = discount?.discountPct ?? 0;
          const editValue = editValues[type];
          const hasEdit = editValue !== undefined && editValue !== '' && parseFloat(editValue) !== currentPct;
          const isSaving = savingType === type;
          const isSaved = savedType === type;

          return (
            <div key={type} className="flex items-center justify-between py-4 gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700">{RECURRENCE_LABELS[type]}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reducere curenta: <span className="font-medium text-gray-600">{currentPct}%</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isSaved && (
                  <Badge variant="success">Salvat</Badge>
                )}
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={editValue ?? currentPct}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [type]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(type);
                    }}
                    className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 text-right pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(type)}
                  loading={isSaving}
                  disabled={!hasEdit || isSaving}
                >
                  <Check className="h-4 w-4" />
                  Salveaza
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Tab: Jurnal Preturi ────────────────────────────────────────────────────

const AUDIT_PAGE_SIZE = 20;

function AuditLogTab() {
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(0);

  const { data, loading } = useQuery<{
    priceAuditLog: { entries: PriceAuditEntry[]; totalCount: number };
  }>(PRICE_AUDIT_LOG, {
    variables: {
      entityType: entityTypeFilter || null,
      limit: AUDIT_PAGE_SIZE,
      offset: page * AUDIT_PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  });

  const entries = data?.priceAuditLog.entries ?? [];
  const totalCount = data?.priceAuditLog.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / AUDIT_PAGE_SIZE);

  const handleFilterChange = (newFilter: string) => {
    setEntityTypeFilter(newFilter);
    setPage(0);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{totalCount} inregistrari</p>
        <div className="w-56">
          <Select
            options={AUDIT_ENTITY_TYPE_OPTIONS}
            value={entityTypeFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          />
        </div>
      </div>

      <Card padding={false}>
        {loading && entries.length === 0 ? (
          <TableSkeleton />
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nicio inregistrare gasita.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Data</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Tip Entitate</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Camp</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Modificare</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Modificat de</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-600 text-xs">
                        {new Date(entry.changedAt).toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">
                        {AUDIT_ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                        {entry.fieldName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded line-through">
                          {entry.oldValue ?? <span className="italic text-gray-400">gol</span>}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {entry.newValue ?? <span className="italic text-gray-400">gol</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {entry.changedByName && (
                          <span className="font-medium text-gray-900">{entry.changedByName}</span>
                        )}
                        {entry.changedByEmail && (
                          <span className="text-gray-400 ml-1">({entry.changedByEmail})</span>
                        )}
                        {!entry.changedByName && !entry.changedByEmail && (
                          <span className="text-gray-300 italic">sistem</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Pagina {page + 1} din {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Inapoi
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Inainte
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Platforma ──────────────────────────────────────────────────────────

function PlatformTab() {
  const { data: modeData, loading: modeLoading, refetch: refetchMode } = useQuery(PLATFORM_MODE);
  const { data: statsData } = useQuery(WAITLIST_STATS);
  const { data: leadsData, loading: leadsLoading } = useQuery<{ waitlistLeads: WaitlistLead[] }>(WAITLIST_LEADS, {
    variables: { limit: 100, offset: 0 },
  });
  const [updateSetting, { loading: saving }] = useMutation(UPDATE_PLATFORM_SETTING, {
    onCompleted: () => refetchMode(),
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const isLive = modeData?.platformMode === 'live';

  async function handleToggle() {
    setShowConfirm(false);
    await updateSetting({
      variables: {
        key: 'platform_mode',
        value: isLive ? 'pre_release' : 'live',
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Modul platformei</h3>
            <p className="text-sm text-gray-500 mt-1">
              {isLive
                ? 'Platforma este LIVE -- clientii pot face rezervari normative.'
                : 'Platforma este in PRE-LANSARE -- se colecteaza inscrieri in lista de asteptare.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isLive ? 'LIVE' : 'PRE-LANSARE'}
            </span>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={saving || modeLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer ${
                isLive ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isLive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clienti inscrisi', value: statsData?.waitlistStats.clientCount ?? 0, color: 'blue' },
          { label: 'Firme inscrise', value: statsData?.waitlistStats.companyCount ?? 0, color: 'emerald' },
          { label: 'Total leads', value: statsData?.waitlistStats.totalCount ?? 0, color: 'purple' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <div className={`text-3xl font-bold text-${color}-600`}>{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Lista de asteptare</h3>
        </div>
        {leadsLoading ? (
          <div className="p-8 text-center text-gray-500">Se incarca...</div>
        ) : !leadsData?.waitlistLeads?.length ? (
          <div className="p-8 text-center text-gray-500">Nu exista inscrieri inca.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tip', 'Nume', 'Email', 'Telefon', 'Oras/Firma', 'Data'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leadsData.waitlistLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lead.leadType === 'CLIENT'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {lead.leadType === 'CLIENT' ? 'Client' : 'Firma'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.phone ?? '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.companyName ?? lead.city ?? '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for platform mode toggle */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmare schimbare mod">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {isLive
              ? 'Esti sigur ca vrei sa treci platforma in modul PRE-LANSARE? Utilizatorii nu vor mai putea face rezervari.'
              : 'Esti sigur ca vrei sa treci platforma in modul LIVE? Utilizatorii vor putea face rezervari.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Anuleaza</Button>
            <Button
              variant={isLive ? 'danger' : 'primary'}
              onClick={handleToggle}
              loading={saving}
            >
              {isLive ? 'Treci la Pre-Lansare' : 'Treci la Live'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Setari Platforma</h1>
        <p className="text-gray-500 mt-1">Configuratii generale, servicii, extra-uri si orase.</p>
      </div>

      {/* Tab Selector */}
      <div className="mb-6 max-w-xs">
        <Select
          options={tabs.map((tab) => ({ value: tab.key, label: tab.label }))}
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'extras' && <ExtrasTab />}
      {activeTab === 'cities' && <CitiesTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'discounts' && <RecurringDiscountsTab />}
      {activeTab === 'audit' && <AuditLogTab />}
      {activeTab === 'platform' && <PlatformTab />}
    </div>
  );
}
