import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  Repeat,
  Users,
  TrendingUp,
  CalendarDays,
  User,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { COMPANY_SUBSCRIPTIONS } from '../../graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'CANCELLED' | 'INCOMPLETE';

interface SubscriptionClient {
  id: string;
  fullName: string;
  email: string;
}

interface SubscriptionWorker {
  id: string;
  fullName: string;
}

interface SubscriptionEdge {
  id: string;
  recurrenceType: string;
  serviceType: string;
  serviceName: string;
  status: SubscriptionStatus;
  monthlyAmount: number;
  perSessionDiscounted: number;
  sessionsPerMonth: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  client: SubscriptionClient | null;
  worker: SubscriptionWorker | null;
  totalBookings: number;
  completedBookings: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  PAST_DUE: 'danger',
  CANCELLED: 'default',
  INCOMPLETE: 'default',
};

const statusLabel: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activ',
  PAUSED: 'In pauza',
  PAST_DUE: 'Restant',
  CANCELLED: 'Anulat',
  INCOMPLETE: 'Incomplet',
};

const statusDotColor: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-500',
  PAUSED: 'bg-amber-500',
  PAST_DUE: 'bg-red-500',
  CANCELLED: 'bg-gray-400',
  INCOMPLETE: 'bg-gray-300',
};

const recurrenceLabel: Record<string, string> = {
  WEEKLY: 'Saptamanal',
  BIWEEKLY: 'Bi-saptamanal',
  MONTHLY: 'Lunar',
};

function formatRON(amount: number): string {
  return Number(amount).toFixed(2) + ' lei';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Metric ──────────────────────────────────────────────────────────────────

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-20 hidden sm:block" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompanySubscriptionsPage() {
  const { data, loading } = useQuery(COMPANY_SUBSCRIPTIONS, {
    variables: { limit: 50, offset: 0 },
  });

  const subscriptions: SubscriptionEdge[] = data?.companySubscriptions?.edges ?? [];
  const totalCount: number = data?.companySubscriptions?.totalCount ?? 0;

  // Compute KPI values
  const { activeCount, monthlyRecurring } = useMemo(() => {
    let active = 0;
    let recurring = 0;
    for (const sub of subscriptions) {
      if (sub.status === 'ACTIVE') {
        active++;
        recurring += Number(sub.monthlyAmount) || 0;
      }
    }
    return { activeCount: active, monthlyRecurring: recurring };
  }, [subscriptions]);

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonamente clienti</h1>
        <p className="text-gray-500 mt-1">
          Vizualizeaza abonamentele active ale clientilor firmei tale.
        </p>
      </div>

      {/* Key Metrics */}
      {loading ? (
        <Card className="mb-8">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-3">
                <div className="h-9 w-9 bg-gray-200 rounded-lg shrink-0" />
                <div>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <Metric icon={Users} label="Total abonamente" value={totalCount} />
            <div className="pt-3 md:pt-0 md:pl-6">
              <Metric icon={Repeat} label="Active" value={activeCount} />
            </div>
            <div className="pt-3 md:pt-0 md:pl-6">
              <Metric icon={TrendingUp} label="Venit lunar recurent" value={formatRON(monthlyRecurring)} />
            </div>
          </div>
        </Card>
      )}

      {/* Subscriptions Table */}
      <Card padding={false}>
        {loading ? (
          <TableSkeleton />
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Repeat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Niciun abonament</h3>
            <p className="text-gray-500">
              Nu exista abonamente inregistrate pentru firma ta.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Client
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Serviciu
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Lucrator
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Lunar
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Perioada
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Progres
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {sub.client?.fullName ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {sub.client?.email ?? ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-gray-900 truncate">{sub.serviceName}</p>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            {recurrenceLabel[sub.recurrenceType] ?? sub.recurrenceType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">
                          {sub.worker?.fullName ?? (
                            <span className="text-gray-400">Neasignat</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatRON(sub.monthlyAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 rounded-full shrink-0', statusDotColor[sub.status])} />
                          <Badge variant={statusBadgeVariant[sub.status] ?? 'default'}>
                            {statusLabel[sub.status] ?? sub.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-600 whitespace-nowrap">
                          {formatDate(sub.currentPeriodStart)}
                        </p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          - {formatDate(sub.currentPeriodEnd)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{
                                width: sub.totalBookings > 0
                                  ? `${Math.min(100, (sub.completedBookings / sub.totalBookings) * 100)}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {sub.completedBookings}/{sub.totalBookings}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  {/* Client + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {sub.client?.fullName ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {sub.client?.email ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn('h-2 w-2 rounded-full', statusDotColor[sub.status])} />
                      <Badge variant={statusBadgeVariant[sub.status] ?? 'default'}>
                        {statusLabel[sub.status] ?? sub.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Service + Recurrence */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-700">{sub.serviceName}</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      {recurrenceLabel[sub.recurrenceType] ?? sub.recurrenceType}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">
                        {sub.worker?.fullName ?? (
                          <span className="text-gray-400">Neasignat</span>
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 whitespace-nowrap">
                      {formatRON(sub.monthlyAmount)}/luna
                    </span>
                  </div>

                  {/* Period + Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: sub.totalBookings > 0
                              ? `${Math.min(100, (sub.completedBookings / sub.totalBookings) * 100)}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {sub.completedBookings}/{sub.totalBookings}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Total count footer */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'abonament' : 'abonamente'}
          </span>
        </div>
      )}
    </div>
  );
}
