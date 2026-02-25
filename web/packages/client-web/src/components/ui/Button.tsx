import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@go2fix/shared';
import { Loader2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// ─── Variants ────────────────────────────────────────────────────────────────

const variantClasses: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-blue-700 focus:ring-primary/30',
  secondary:
    'bg-secondary text-white hover:bg-emerald-600 focus:ring-secondary/30',
  outline:
    'border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary/30',
  danger:
    'bg-danger text-white hover:bg-red-600 focus:ring-danger/30',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300/30',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

// ─── Component ───────────────────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        <span className="inline-flex items-center gap-2 pointer-events-none">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
