import { cn } from '@go2fix/shared';

type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_COMPANY'
  | 'CANCELLED_BY_ADMIN'
  | 'DISPUTED'
  | 'PAST_DUE';

interface StatusBadgeProps {
  status: BookingStatus | string;
  label: string; // pass the already-translated label
}

// Color mapping keyed by status value
const statusClasses: Record<string, string> = {
  PENDING:              'bg-yellow-100 text-yellow-800 border border-yellow-200',
  CONFIRMED:            'bg-blue-100 text-blue-800 border border-blue-200',
  ASSIGNED:             'bg-blue-100 text-blue-800 border border-blue-200',
  IN_PROGRESS:          'bg-amber-100 text-amber-800 border border-amber-200',
  COMPLETED:            'bg-green-100 text-green-800 border border-green-200',
  CANCELLED:            'bg-gray-100 text-gray-600 border border-gray-200',
  CANCELLED_BY_CLIENT:  'bg-gray-100 text-gray-600 border border-gray-200',
  CANCELLED_BY_COMPANY: 'bg-gray-100 text-gray-600 border border-gray-200',
  CANCELLED_BY_ADMIN:   'bg-gray-100 text-gray-600 border border-gray-200',
  DISPUTED:             'bg-red-100 text-red-800 border border-red-200',
  PAST_DUE:             'bg-orange-100 text-orange-800 border border-orange-200',
};

const fallback = 'bg-gray-100 text-gray-600 border border-gray-200';

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const classes = statusClasses[status] ?? fallback;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium',
        classes,
      )}
    >
      {label}
    </span>
  );
}
