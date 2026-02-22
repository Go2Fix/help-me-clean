import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import TeamPage from '@/pages/company/TeamPage';
import { MY_CLEANERS_LIST } from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultCleaner = {
  id: 'cl1',
  fullName: 'Ana Popa',
  email: 'ana@test.com',
  phone: '0711111111',
  status: 'ACTIVE',
  isCompanyAdmin: false,
  user: { id: 'u1', avatarUrl: null },
  ratingAvg: 4.5,
  totalJobsCompleted: 10,
  createdAt: '2025-01-01',
};

const invitedCleaner = {
  ...defaultCleaner,
  id: 'cl2',
  fullName: 'Ion Ionescu',
  email: 'ion@test.com',
  status: 'INVITED',
  ratingAvg: null,
  totalJobsCompleted: 0,
};

const adminCleaner = {
  ...defaultCleaner,
  id: 'cl3',
  fullName: 'Maria Admin',
  isCompanyAdmin: true,
};

function mockQueries(overrides?: { cleaners?: unknown[]; loading?: boolean }) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_CLEANERS_LIST) {
      return {
        data: overrides?.cleaners !== undefined
          ? { myCleaners: overrides.cleaners }
          : { myCleaners: [] },
        loading: overrides?.loading ?? false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false, refetch: vi.fn() } as unknown as ReturnType<typeof useQuery>;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>,
    );

  it('shows page title and subtitle', () => {
    mockQueries();
    renderPage();
    expect(screen.getByText('Echipa mea')).toBeInTheDocument();
    expect(screen.getByText('Gestioneaza angajatii firmei tale.')).toBeInTheDocument();
  });

  it('shows "Invita lucrator" button in header', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    // When cleaners exist, only the header button shows (no empty state)
    expect(screen.getByRole('button', { name: /invita lucrator/i })).toBeInTheDocument();
  });

  it('shows empty state when no cleaners', () => {
    mockQueries();
    renderPage();
    expect(screen.getByText('Niciun lucrator')).toBeInTheDocument();
    expect(screen.getByText(/nu ai adaugat inca niciun lucrator/i)).toBeInTheDocument();
  });

  it('shows invite button in empty state', () => {
    mockQueries();
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /invita lucrator/i });
    expect(buttons.length).toBe(2); // header + empty state
  });

  it('shows loading spinner when loading', () => {
    mockQueries({ loading: true });
    renderPage();
    expect(screen.getByText('Se incarca echipa...')).toBeInTheDocument();
  });

  it('renders cleaner name and status badge in table', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    expect(screen.getByText('Activ')).toBeInTheDocument();
  });

  it('renders cleaner email and phone in table', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.getByText('0711111111')).toBeInTheDocument();
  });

  it('renders rating and job count', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows admin badge for company admin cleaners', () => {
    mockQueries({ cleaners: [adminCleaner] });
    renderPage();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows monogram avatar when no image', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('shows avatar image when user has avatarUrl', () => {
    const withAvatar = { ...defaultCleaner, user: { id: 'u1', avatarUrl: 'https://example.com/photo.jpg' } };
    mockQueries({ cleaners: [withAvatar] });
    renderPage();
    const img = screen.getByAltText('Ana Popa');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows card header with count badge', () => {
    mockQueries({ cleaners: [defaultCleaner, invitedCleaner] });
    renderPage();
    expect(screen.getByText('Lucratori')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('navigates to detail page on row click', async () => {
    const user = userEvent.setup();
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    const row = screen.getByText('Ana Popa').closest('tr');
    expect(row).toBeTruthy();
    await user.click(row!);
    expect(mockNavigate).toHaveBeenCalledWith('/firma/echipa/cl1');
  });

  it('renders status tabs', () => {
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    expect(screen.getByText('Toate')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Invitati')).toBeInTheDocument();
    expect(screen.getByText('Suspendate')).toBeInTheDocument();
  });

  it('filters by tab selection', async () => {
    const user = userEvent.setup();
    mockQueries({ cleaners: [defaultCleaner, invitedCleaner] });
    renderPage();
    // Both visible initially
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    expect(screen.getByText('Ion Ionescu')).toBeInTheDocument();
    // Click "Active" tab
    await user.click(screen.getByText('Active'));
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    expect(screen.queryByText('Ion Ionescu')).not.toBeInTheDocument();
  });

  it('filters by search query', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockQueries({ cleaners: [defaultCleaner, invitedCleaner] });
    renderPage();
    const searchInput = screen.getByPlaceholderText('Cauta dupa nume sau email...');
    await user.type(searchInput, 'ion');
    // Advance past debounce and wait for re-render
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(screen.queryByText('Ana Popa')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Ion Ionescu')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('opens invite modal on button click', async () => {
    const user = userEvent.setup();
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    await user.click(screen.getByRole('button', { name: /invita lucrator/i }));
    expect(screen.getByText('Trimite invitatie')).toBeInTheDocument();
    expect(screen.getByLabelText(/nume complet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adresa de email/i)).toBeInTheDocument();
  });

  it('shows validation error when submitting empty invite form', async () => {
    const user = userEvent.setup();
    mockQueries({ cleaners: [defaultCleaner] });
    renderPage();
    await user.click(screen.getByRole('button', { name: /invita lucrator/i }));
    await user.click(screen.getByText('Trimite invitatie'));
    expect(screen.getByText('Te rugam sa completezi toate campurile.')).toBeInTheDocument();
  });

  it('shows different status badge variants', () => {
    const cleaners = [
      { ...defaultCleaner, id: '1', status: 'ACTIVE' },
      { ...defaultCleaner, id: '2', status: 'INVITED', fullName: 'B Invitat' },
      { ...defaultCleaner, id: '3', status: 'SUSPENDED', fullName: 'C Suspendat' },
    ];
    mockQueries({ cleaners });
    renderPage();
    expect(screen.getByText('Activ')).toBeInTheDocument();
    expect(screen.getByText('Invitat')).toBeInTheDocument();
    expect(screen.getByText('Suspendat')).toBeInTheDocument();
  });

  it('shows -- for missing rating', () => {
    mockQueries({ cleaners: [invitedCleaner] });
    renderPage();
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
