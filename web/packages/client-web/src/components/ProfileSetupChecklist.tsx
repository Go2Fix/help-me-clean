import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';

export interface SetupItem {
  key: string;
  label: string;
  description?: string;
  done: boolean;
  to: string;
  icon: React.ElementType;
}

interface ProfileSetupChecklistProps {
  items: SetupItem[];
  title?: string;
  subtitle?: string;
}

export default function ProfileSetupChecklist({
  items,
  title = 'Configurare cont',
  subtitle = 'Completează profilul pentru a începe',
}: ProfileSetupChecklistProps) {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);

  if (doneCount === total) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-blue-600">{doneCount}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
              item.done ? 'opacity-60 cursor-default pointer-events-none' : 'hover:bg-blue-50/50',
            )}
          >
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 group-hover:text-blue-400 shrink-0" />
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <item.icon className={cn('h-4 w-4 shrink-0', item.done ? 'text-gray-400' : 'text-gray-500')} />
              <div className="min-w-0">
                <span className={cn(
                  'text-sm font-medium block',
                  item.done ? 'text-gray-500 line-through' : 'text-gray-700 group-hover:text-gray-900',
                )}>
                  {item.label}
                </span>
                {item.description && !item.done && (
                  <span className="text-xs text-gray-400">{item.description}</span>
                )}
              </div>
            </div>
            {!item.done && (
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </Card>
  );
}
