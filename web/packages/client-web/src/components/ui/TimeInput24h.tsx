import { cn } from '@go2fix/shared';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function TimeInput24h({ value, onChange, disabled, className }: TimeInput24hProps) {
  const [h, m] = (value || '').split(':');
  const hour = h || '';
  const minute = m || '';

  const selectClass = cn(
    'rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 appearance-none',
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    disabled && 'opacity-40 cursor-not-allowed bg-gray-100',
    className,
  );

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute || '00'}`)}
        disabled={disabled}
        className={cn(selectClass, 'flex-1')}
        aria-label="Ora"
      >
        <option value="" disabled>HH</option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>{hh}</option>
        ))}
      </select>
      <span className="text-gray-400 font-medium">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour || '00'}:${e.target.value}`)}
        disabled={disabled}
        className={cn(selectClass, 'flex-1')}
        aria-label="Minute"
      >
        <option value="" disabled>MM</option>
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>{mm}</option>
        ))}
      </select>
    </div>
  );
}
