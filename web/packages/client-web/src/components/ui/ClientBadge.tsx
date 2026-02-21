import { cn } from '@go2fix/shared';

interface BadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: {
    label: 'In asteptare',
    classes: 'bg-amber-100 text-amber-800',
  },
  ASSIGNED: {
    label: 'Alocata',
    classes: 'bg-blue-100 text-blue-800',
  },
  CONFIRMED: {
    label: 'Confirmata',
    classes: 'bg-indigo-100 text-indigo-800',
  },
  IN_PROGRESS: {
    label: 'In desfasurare',
    classes: 'bg-purple-100 text-purple-800',
  },
  COMPLETED: {
    label: 'Finalizata',
    classes: 'bg-green-100 text-green-800',
  },
  CANCELLED: {
    label: 'Anulata',
    classes: 'bg-red-100 text-red-800',
  },
};

export default function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
