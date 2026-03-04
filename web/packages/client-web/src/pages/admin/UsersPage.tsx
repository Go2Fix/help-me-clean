import { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Users, Phone } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/utils/format';
import { SEARCH_USERS } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const roleVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  CLIENT: 'default',
  COMPANY_ADMIN: 'info',
  WORKER: 'success',
  GLOBAL_ADMIN: 'warning',
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
  const { t } = useTranslation(['dashboard', 'admin']);

  const roleOptions = [
    { value: '', label: t('admin:users.allRoles') },
    { value: 'CLIENT', label: t('admin:users.roleLabels.CLIENT') },
    { value: 'COMPANY_ADMIN', label: t('admin:users.roleLabels.COMPANY_ADMIN') },
    { value: 'WORKER', label: t('admin:users.roleLabels.WORKER') },
    { value: 'GLOBAL_ADMIN', label: t('admin:users.roleLabels.GLOBAL_ADMIN') },
  ];

  const statusOptions = [
    { value: '', label: t('admin:users.allStatuses') },
    { value: 'ACTIVE', label: t('admin:users.statusLabels.ACTIVE') },
    { value: 'SUSPENDED', label: t('admin:users.statusLabels.SUSPENDED') },
  ];

  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Reset page when filters change
  const handleRoleChange = useCallback((value: string) => {
    setRoleFilter(value);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(0);
  }, []);

  // Reset page when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:users.title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('admin:users.subtitle')}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('admin:users.searchPlaceholder')}
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
              {t('admin:users.emptyTitle')}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {t('admin:users.emptySubtitle')}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: proper table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.user')}
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.email')}
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.phone')}
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.role')}
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.status')}
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      {t('admin:users.columns.registered')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/admin/utilizatori/${user.id}`)}
                      className="border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      {/* Name + Avatar */}
                      <td className="px-6 py-4">
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
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {user.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 truncate block max-w-[240px]">
                          {user.email}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {user.phone || '-'}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <Badge variant={roleVariant[user.role] ?? 'default'}>
                          {t(`admin:users.roleLabels.${user.role}`, { defaultValue: user.role })}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[user.status] ?? 'default'}>
                          {t(`admin:users.statusLabels.${user.status}`, { defaultValue: user.status })}
                        </Badge>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: compact card layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/admin/utilizatori/${user.id}`)}
                  className="px-4 py-4 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  {/* Top row: avatar + name */}
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
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {user.fullName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Bottom row: phone (if present) + role + status badges */}
                  <div className="mt-3 ml-[52px] flex flex-wrap items-center gap-2">
                    {user.phone && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </span>
                    )}
                    <Badge variant={roleVariant[user.role] ?? 'default'}>
                      {t(`admin:users.roleLabels.${user.role}`, { defaultValue: user.role })}
                    </Badge>
                    <Badge variant={statusVariant[user.status] ?? 'default'}>
                      {t(`admin:users.statusLabels.${user.status}`, { defaultValue: user.status })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {!loading && (
        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun={t('admin:users.noun')}
        />
      )}
    </div>
  );
}
