import { Loader2 } from 'lucide-react';
import { cn } from '@go2fix/shared';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({
  className,
  size = 'md',
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
      />
      {text && (
        <p className="mt-3 text-sm text-gray-500">{text}</p>
      )}
    </div>
  );
}
