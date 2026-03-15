import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { cn } from '@go2fix/shared';

// ─── TooltipProvider (no-op context — keeps API compatible with shadcn shape) ─

const TooltipContext = createContext<boolean>(true);

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipContext.Provider value={true}>{children}</TooltipContext.Provider>
  );
}

// ─── Tooltip root ─────────────────────────────────────────────────────────────

interface TooltipRootProps {
  children: ReactNode;
}

export function Tooltip({ children }: TooltipRootProps) {
  useContext(TooltipContext); // consume so lint doesn't complain
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), 300);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  return (
    <TooltipInternalContext.Provider value={{ open, show, hide }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipInternalContext.Provider>
  );
}

// ─── Internal shared state ────────────────────────────────────────────────────

interface TooltipInternal {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const TooltipInternalContext = createContext<TooltipInternal>({
  open: false,
  show: () => undefined,
  hide: () => undefined,
});

// ─── TooltipTrigger ──────────────────────────────────────────────────────────

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({ children, asChild: _asChild }: TooltipTriggerProps) {
  const { show, hide } = useContext(TooltipInternalContext);
  return (
    <div
      className="contents"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
    </div>
  );
}

// ─── TooltipContent ──────────────────────────────────────────────────────────

interface TooltipContentProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const sideClasses: Record<string, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
};

export function TooltipContent({ children, side = 'top', className }: TooltipContentProps) {
  const { open } = useContext(TooltipInternalContext);
  if (!open) return null;
  return (
    <div
      role="tooltip"
      className={cn(
        'absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg pointer-events-none',
        sideClasses[side],
        className,
      )}
    >
      {children}
    </div>
  );
}
