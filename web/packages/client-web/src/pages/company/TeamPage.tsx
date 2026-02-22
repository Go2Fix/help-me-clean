import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, ChevronRight, Search, Star, Copy, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MY_CLEANERS_LIST, INVITE_CLEANER } from '@/graphql/operations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Cleaner {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  isCompanyAdmin: boolean;
  user: { id: string; avatarUrl: string | null } | null;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success', INVITED: 'info', PENDING: 'warning', PENDING_REVIEW: 'warning', SUSPENDED: 'danger', INACTIVE: 'default',
};
const statusLabel: Record<string, string> = {
  ACTIVE: 'Activ', INVITED: 'Invitat', PENDING: 'In asteptare', PENDING_REVIEW: 'In asteptare', SUSPENDED: 'Suspendat', INACTIVE: 'Inactiv',
};

const statusFilterOptions = [
  { value: '', label: 'Toate statusurile' },
  { value: 'ACTIVE', label: 'Activ' },
  { value: 'INACTIVE', label: 'Inactiv' },
  { value: 'INVITED', label: 'Invitat' },
  { value: 'SUSPENDED', label: 'Suspendat' },
];

function Avatar({ src, name }: { src?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(' ').map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase() || '?';
  if (src && !imgError) {
    return <img src={src} alt={name} onError={() => setImgError(true)} className="h-10 w-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">{initials}</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Token result modal state
  const [inviteToken, setInviteToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, loading, refetch } = useQuery(MY_CLEANERS_LIST);
  const [inviteCleaner, { loading: inviting }] = useMutation(INVITE_CLEANER);

  const cleaners: Cleaner[] = data?.myCleaners ?? [];

  // Client-side filtering
  const filtered = cleaners.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      if (!c.fullName.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCopyToken = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Te rugam sa completezi toate campurile.');
      return;
    }
    try {
      const { data: res } = await inviteCleaner({
        variables: { input: { email: inviteEmail.trim(), fullName: inviteName.trim() } },
      });
      const token = res?.inviteCleaner?.inviteToken;
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      refetch();
      if (token) {
        setInviteToken(token);
        setShowToken(true);
      }
    } catch (error: unknown) {
      const gqlErr = (error as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors?.[0];
      setInviteError(gqlErr?.message || 'Invitatia nu a putut fi trimisa. Te rugam sa incerci din nou.');
    }
  };

  return (
    <div className="max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Echipa mea</h1>
          <p className="text-gray-500 mt-1">Gestioneaza angajatii firmei tale.</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4" />
          Invita lucrator
        </Button>
      </div>

      {/* Status filter */}
      <div className="mb-6">
        <div className="w-full sm:w-64">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filtreaza dupa status"
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cauta dupa nume sau email..."
          className="pl-9"
        />
      </div>

      {/* Table Card */}
      <Card padding={false}>
        {loading ? (
          <LoadingSpinner text="Se incarca echipa..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Niciun lucrator</h3>
            <p className="text-gray-500 mb-4">Nu ai adaugat inca niciun lucrator in echipa ta.</p>
            <Button onClick={() => setShowInvite(true)}>
              <UserPlus className="h-4 w-4" /> Invita lucrator
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Lucrator</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Telefon</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Rating</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Joburi</th>
                  <th className="px-2 md:px-6 py-3 w-8 md:w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((cleaner) => (
                  <tr
                    key={cleaner.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/firma/echipa/${cleaner.id}`)}
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={cleaner.user?.avatarUrl} name={cleaner.fullName} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">{cleaner.fullName}</span>
                            {cleaner.isCompanyAdmin && <Badge variant="info">Admin</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden md:table-cell">
                      {cleaner.email || '--'}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden lg:table-cell">
                      {cleaner.phone || '--'}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <Badge variant={statusBadgeVariant[cleaner.status] || 'default'}>
                        {statusLabel[cleaner.status] || cleaner.status}
                      </Badge>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Star className="h-4 w-4 text-accent" />
                        {cleaner.ratingAvg ? Number(cleaner.ratingAvg).toFixed(1) : '--'}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden sm:table-cell">
                      {cleaner.totalJobsCompleted ?? 0}
                    </td>
                    <td className="px-2 md:px-6 py-3 md:py-4">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invita lucrator">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Nume complet"
            placeholder="Ion Popescu"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <Input
            label="Adresa de email"
            type="email"
            placeholder="ion@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteError}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowInvite(false)} className="flex-1">
              Anuleaza
            </Button>
            <Button type="submit" loading={inviting} className="flex-1">
              Trimite invitatie
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Token Result Modal */}
      <Modal open={showToken} onClose={() => setShowToken(false)} title="Invitatie trimisa cu succes!">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Trimite acest cod de invitatie lucratorului. El trebuie sa il introduca in panoul sau
            pentru a se alatura echipei tale.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-800 break-all select-all">
              {inviteToken}
            </div>
            <button
              type="button"
              onClick={() => handleCopyToken(inviteToken)}
              className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
              title="Copiaza codul"
            >
              {copied
                ? <Check className="h-5 w-5 text-secondary" />
                : <Copy className="h-5 w-5 text-gray-500" />}
            </button>
          </div>
          {copied && <p className="text-xs text-secondary">Codul a fost copiat!</p>}
          <Button onClick={() => setShowToken(false)} className="w-full">Am inteles</Button>
        </div>
      </Modal>
    </div>
  );
}
