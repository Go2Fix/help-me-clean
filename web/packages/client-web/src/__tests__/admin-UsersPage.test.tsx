import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import UsersPage from '@/pages/admin/UsersPage';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderUsersPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  );
}

const sampleUsers = [
  {
    id: 'u1',
    fullName: 'Maria Ionescu',
    email: 'maria@test.com',
    phone: '0721000001',
    avatarUrl: null,
    role: 'CLIENT',
    status: 'ACTIVE',
    createdAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 'u2',
    fullName: 'Ion Popescu',
    email: 'ion@company.com',
    phone: '0721000002',
    avatarUrl: null,
    role: 'COMPANY_ADMIN',
    status: 'ACTIVE',
    createdAt: '2024-04-15T08:00:00Z',
  },
];

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchUsers: {
          users: sampleUsers,
          totalCount: 2,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
  });

  it('shows "Utilizatori" title', () => {
    renderUsersPage();
    expect(screen.getByText('Utilizatori')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: true,
    } as ReturnType<typeof useQuery>);
    renderUsersPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows user list when data loads', () => {
    renderUsersPage();
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
    expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    expect(screen.getByText('ion@company.com')).toBeInTheDocument();
  });

  it('shows role badges', () => {
    renderUsersPage();
    // Role labels appear both as badges in the user rows and as options in the role filter dropdown
    const clientMatches = screen.getAllByText('Client');
    expect(clientMatches.length).toBeGreaterThanOrEqual(2);
    const adminMatches = screen.getAllByText('Admin Companie');
    expect(adminMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('shows status badges', () => {
    renderUsersPage();
    // "Activ" appears as status badges (2 users) and also as a dropdown option in the status filter
    const activeBadges = screen.getAllByText('Activ');
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no users match', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchUsers: {
          users: [],
          totalCount: 0,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderUsersPage();
    expect(screen.getByText('Niciun utilizator gasit')).toBeInTheDocument();
  });

  it('shows search input with placeholder', () => {
    renderUsersPage();
    expect(screen.getByPlaceholderText('Cauta dupa nume, email sau telefon...')).toBeInTheDocument();
  });

  it('shows pagination when there are results', () => {
    renderUsersPage();
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Urmator')).toBeInTheDocument();
    expect(screen.getByText('Pagina 1 din 1')).toBeInTheDocument();
  });

  it('shows pagination with multiple pages when totalCount > 20', () => {
    const manyUsers = Array.from({ length: 20 }, (_, i) => ({
      ...sampleUsers[0],
      id: `u-${i}`,
      fullName: `User ${i}`,
      email: `user${i}@test.com`,
    }));
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchUsers: {
          users: manyUsers,
          totalCount: 35,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderUsersPage();
    expect(screen.getByText('Pagina 1 din 2')).toBeInTheDocument();
    expect(screen.getByText('35 utilizatori gasiti')).toBeInTheDocument();
  });

  it('shows user initials when no avatar is provided', () => {
    renderUsersPage();
    expect(screen.getByText('MI')).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
  });

  it('shows role filter dropdown', () => {
    renderUsersPage();
    expect(screen.getByText('Toate rolurile')).toBeInTheDocument();
  });

  it('shows status filter dropdown', () => {
    renderUsersPage();
    expect(screen.getByText('Toate statusurile')).toBeInTheDocument();
  });
});
