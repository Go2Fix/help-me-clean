import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Clock, Loader2, Users, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AdminPagination from '@/components/admin/AdminPagination';
import { WAITLIST_STATS, WAITLIST_LEADS } from '@/graphql/operations';
import { formatDateTime } from '@/utils/format';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ─── Types ───────────────────────────────────────────────────────────────────

interface WaitlistLead {
  id: string;
  leadType: 'CLIENT' | 'COMPANY';
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  companyName: string | null;
  message: string | null;
  createdAt: string;
  isConverted: boolean | null;
}

interface WaitlistStats {
  clientCount: number;
  companyCount: number;
  totalCount: number;
}

type LeadTypeFilter = 'ALL' | 'CLIENT' | 'COMPANY';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WaitlistLeadsPage() {
  const [typeFilter, setTypeFilter] = useState<LeadTypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: statsData } = useQuery<{ waitlistStats: WaitlistStats }>(
    WAITLIST_STATS,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data, loading } = useQuery<{ waitlistLeads: WaitlistLead[] }>(
    WAITLIST_LEADS,
    {
      variables: {
        leadType: typeFilter !== 'ALL' ? typeFilter : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      },
      fetchPolicy: 'cache-and-network',
    }
  );

  const stats = statsData?.waitlistStats;
  const leads: WaitlistLead[] = data?.waitlistLeads ?? [];

  const filtered = search.trim()
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.email.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const handleTabChange = (tab: LeadTypeFilter) => {
    setTypeFilter(tab);
    setPage(0);
  };

  const tabs: { key: LeadTypeFilter; label: string }[] = [
    { key: 'ALL', label: 'Toți' },
    { key: 'CLIENT', label: 'Clienți' },
    { key: 'COMPANY', label: 'Companii' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listă de așteptare</h1>
        <p className="text-gray-500 mt-1">
          Persoane care s-au înregistrat înainte de lansare
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalCount ?? '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Clienți</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.clientCount ?? '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Companii</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.companyCount ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              typeFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Caută după nume sau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Table */}
      <Card padding={false}>
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-36 shrink-0">
            Nume
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1 min-w-0">
            Email
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 shrink-0 hidden md:block">
            Telefon
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-24 shrink-0 hidden lg:block">
            Oraș
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-32 shrink-0 hidden lg:block">
            Companie
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 shrink-0">
            Înregistrat
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-32 shrink-0 hidden sm:block text-right">
            Data
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              Nu există înregistrări pe lista de așteptare
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                {/* Name + converted badge */}
                <div className="w-36 shrink-0 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {lead.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={lead.leadType === 'CLIENT' ? 'info' : 'success'}
                        className="text-xs"
                      >
                        {lead.leadType === 'CLIENT' ? 'Client' : 'Companie'}
                      </Badge>
                      {lead.isConverted && (
                        <Badge variant="success" className="text-xs">
                          Utilizator
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <span className="text-sm text-gray-600 flex-1 min-w-0 truncate">
                  {lead.email}
                </span>

                {/* Phone */}
                <span className="text-sm text-gray-500 w-28 shrink-0 hidden md:block truncate">
                  {lead.phone ?? '—'}
                </span>

                {/* City */}
                <span className="text-sm text-gray-500 w-24 shrink-0 hidden lg:block truncate">
                  {lead.city ?? '—'}
                </span>

                {/* Company name */}
                <span className="text-sm text-gray-500 w-32 shrink-0 hidden lg:block truncate">
                  {lead.leadType === 'COMPANY' && lead.companyName
                    ? lead.companyName
                    : '—'}
                </span>

                {/* Lead type badge (already shown in name column — keep a simple type indicator) */}
                <div className="w-20 shrink-0" />

                {/* Date */}
                <span className="text-xs text-gray-400 w-32 shrink-0 hidden sm:block text-right">
                  {formatDateTime(lead.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && leads.length >= PAGE_SIZE && (
        <AdminPagination
          page={page}
          totalCount={leads.length + page * PAGE_SIZE}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun="înregistrări"
        />
      )}
    </div>
  );
}
