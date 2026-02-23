import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@go2fix/shared';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export default function Card({
  children,
  className,
  padding = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        padding && 'p-4 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
