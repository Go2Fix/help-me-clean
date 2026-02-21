import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { SEARCH_USERS } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const roleOptions = [
  { value: '', label: 'Toate rolurile' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'COMPANY_ADMIN', label: 'Admin Companie' },
  { value: 'CLEANER', label: 'Curatator' },
  { value: 'GLOBAL_ADMIN', label: 'Admin Global' },
];

const statusOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'ACTIVE', label: 'Activ' },
  { value: 'SUSPENDED', label: 'Suspendat' },
];

const roleLabel: Record<string, string> = {
  CLIENT: 'Client',
  COMPANY_ADMIN: 'Admin Companie',
  CLEANER: 'Curatator',
  GLOBAL_ADMIN: 'Admin Global',
};

const roleVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  CLIENT: 'default',
  COMPANY_ADMIN: 'info',
  CLEANER: 'success',
  GLOBAL_ADMIN: 'warning',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ',
  SUSPENDED: 'Suspendat',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UsersPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Debounce the search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Reset page when filters change
  const handleRoleChange = useCallback((value: string) => {
    setRoleFilter(value);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(0);
  }, []);

  const variables = {
    query: debouncedQuery || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, loading } = useQuery(SEARCH_USERS, { variables });

  const users: UserRow[] = data?.searchUsers?.users ?? [];
  const totalCount: number = data?.searchUsers?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Utilizatori</h1>
        <p className="text-gray-500 mt-1">
          Gestioneaza utilizatorii platformei.
        </p>
      </div>

      {/* Search & Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cauta dupa nume, email sau telefon..."
              className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-48">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-56" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Niciun utilizator gasit
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Incearca sa modifici criteriile de cautare sau filtrele aplicate.
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilizator
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inregistrat
              </span>
            </div>

            {/* Rows */}
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => navigate(`/admin/utilizatori/${user.id}`)}
                className={cn(
                  'grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 md:gap-4 items-center px-6 py-4 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50',
                )}
              >
                {/* Name + Avatar */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {getInitials(user.fullName)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 truncate">
                    {user.fullName}
                  </span>
                </div>

                {/* Email */}
                <span className="text-sm text-gray-500 truncate">
                  {user.email}
                </span>

                {/* Role */}
                <Badge variant={roleVariant[user.role] ?? 'default'}>
                  {roleLabel[user.role] ?? user.role}
                </Badge>

                {/* Status */}
                <Badge variant={statusVariant[user.status] ?? 'default'}>
                  {statusLabel[user.status] ?? user.status}
                </Badge>

                {/* Created */}
                <span className="text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                </span>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'utilizator' : 'utilizatori'} {totalCount === 1 ? 'gasit' : 'gasiti'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-700">
              Pagina {page + 1} din {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Urmator
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
