export interface FormFieldOption {
  value: string;
  labelRo: string;
  labelEn: string;
  icon?: string;
  badge?: string;
}

export interface FormFieldDefinition {
  key: string;
  type: 'stepper' | 'number' | 'text' | 'textarea' | 'select' | 'toggle' | 'file' | 'radio';
  labelRo: string;
  labelEn: string;
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: unknown;
  options?: FormFieldOption[];
  icon?: string;
  surchargeLabel?: string;
  showWhen?: Record<string, string>;
}

export function parseFormFields(json: string | null | undefined): FormFieldDefinition[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as FormFieldDefinition[];
  } catch {
    return [];
  }
}
