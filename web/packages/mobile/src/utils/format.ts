// Price: float RON → "123,50 RON"
export function formatPrice(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} RON`;
}

// Date: ISO string → "Luni, 12 Martie"
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Short date: "12 Mar 2026"
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Time: ISO string or "HH:MM" → "09:30"
export function formatTime(input: string): string {
  if (!input) return '';
  if (input.includes('T')) {
    return new Date(input).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return input.slice(0, 5);
}

// Service type labels
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  STANDARD_CLEANING: 'Curățenie standard',
  DEEP_CLEANING: 'Curățenie profundă',
  MOVE_IN_OUT_CLEANING: 'Curățenie mutare',
  POST_CONSTRUCTION: 'Curățenie după construcție',
  OFFICE_CLEANING: 'Curățenie birou',
  WINDOW_CLEANING: 'Curățenie geamuri',
};

export function formatServiceType(type: string): string {
  return SERVICE_TYPE_LABELS[type] ?? type;
}

// Worker status labels
export const WORKER_STATUS_LABELS: Record<string, string> = {
  INVITED: 'Invitat',
  PENDING_REVIEW: 'În aprobare',
  ACTIVE: 'Activ',
  INACTIVE: 'Inactiv',
  SUSPENDED: 'Suspendat',
};

// Duration: 2.5 → "2h 30min"
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// Elapsed time since ISO date string: "1h 23m"
export function formatElapsed(fromDateStr: string): string {
  const ms = Date.now() - new Date(fromDateStr).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}
