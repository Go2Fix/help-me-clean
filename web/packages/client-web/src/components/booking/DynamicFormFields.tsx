import {
  Plus,
  Minus,
  Home,
  Building2,
  Briefcase,
  PawPrint,
  Upload,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import type { FormFieldDefinition, FormFieldOption } from '@/types/formFields';

// Map icon string names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Building2,
  Briefcase,
  PawPrint,
  Upload,
};

interface DynamicFormFieldsProps {
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  pricingModel?: string;
  lang: string;
}

function shouldShow(
  field: FormFieldDefinition,
  context: { pricingModel?: string },
): boolean {
  if (!field.showWhen) return true;
  for (const [key, expected] of Object.entries(field.showWhen)) {
    const actual = (context as Record<string, unknown>)[key];
    if (String(actual).toUpperCase() !== String(expected).toUpperCase()) return false;
  }
  return true;
}

function getLabel(field: FormFieldDefinition, lang: string): string {
  return lang === 'en' ? field.labelEn : field.labelRo;
}

function getOptionLabel(option: FormFieldOption, lang: string): string {
  return lang === 'en' ? option.labelEn : option.labelRo;
}

// ─── Field renderers ─────────────────────────────────────────────────────────

function StepperField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: number;
  onChange: (v: number) => void;
  lang: string;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 99;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {getLabel(field, lang)}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-lg font-bold text-gray-900 w-8 text-center">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function NumberField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {getLabel(field, lang)}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function TextField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {getLabel(field, lang)}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function TextareaField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {getLabel(field, lang)}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  const options = field.options ?? [];
  const cols = options.length <= 3 ? options.length : 3;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {getLabel(field, lang)}
      </label>
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((opt) => {
          const isSelected = value === opt.value;
          const Icon = opt.icon ? ICON_MAP[opt.icon] : null;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-6 w-6',
                    isSelected ? 'text-blue-600' : 'text-gray-400',
                  )}
                />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-blue-600' : 'text-gray-700',
                )}
              >
                {getOptionLabel(opt, lang)}
              </span>
              {opt.badge && (
                <span
                  className={cn(
                    'absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-md',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: boolean;
  onChange: (v: boolean) => void;
  lang: string;
}) {
  const Icon = field.icon ? ICON_MAP[field.icon] : null;
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
        value
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300',
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon className={cn('h-5 w-5', value ? 'text-blue-600' : 'text-gray-400')} />
        )}
        <span className={cn('text-sm font-medium', value ? 'text-blue-600' : 'text-gray-700')}>
          {getLabel(field, lang)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {field.surchargeLabel && (
          <span className="text-xs font-semibold text-amber-600">{field.surchargeLabel}</span>
        )}
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            value ? 'bg-blue-600' : 'bg-gray-200',
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              value ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </div>
      </div>
    </button>
  );
}

function RadioField({
  field,
  value,
  onChange,
  lang,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  const options = field.options ?? [];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {getLabel(field, lang)}
      </label>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isSelected ? 'border-blue-600' : 'border-gray-300',
                )}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
              </div>
              <span className={cn('text-sm font-medium', isSelected ? 'text-blue-600' : 'text-gray-700')}>
                {getOptionLabel(opt, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FileField({
  field,
  lang,
}: {
  field: FormFieldDefinition;
  lang: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {getLabel(field, lang)}
      </label>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">
          {lang === 'en' ? 'Coming soon' : 'În curând'}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DynamicFormFields({
  fields,
  values,
  onChange,
  pricingModel,
  lang,
}: DynamicFormFieldsProps) {
  const context = { pricingModel };

  return (
    <div className="space-y-6">
      {fields.filter((f) => shouldShow(f, context)).map((field) => {
        const val = values[field.key] ?? field.defaultValue ?? '';

        switch (field.type) {
          case 'stepper':
            return (
              <StepperField
                key={field.key}
                field={field}
                value={typeof val === 'number' ? val : Number(val) || field.min || 0}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'number':
            return (
              <NumberField
                key={field.key}
                field={field}
                value={String(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'text':
            return (
              <TextField
                key={field.key}
                field={field}
                value={String(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'textarea':
            return (
              <TextareaField
                key={field.key}
                field={field}
                value={String(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'select':
            return (
              <SelectField
                key={field.key}
                field={field}
                value={String(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'toggle':
            return (
              <ToggleField
                key={field.key}
                field={field}
                value={Boolean(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'radio':
            return (
              <RadioField
                key={field.key}
                field={field}
                value={String(val)}
                onChange={(v) => onChange(field.key, v)}
                lang={lang}
              />
            );
          case 'file':
            return <FileField key={field.key} field={field} lang={lang} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
