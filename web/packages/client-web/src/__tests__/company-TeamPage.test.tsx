import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import TeamPage from '@/pages/company/TeamPage';
import { MY_WORKERS_LIST } from '@/graphql/operations';

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

const defaultWorker = {
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

const invitedWorker = {
  ...defaultWorker,
  id: 'cl2',
  fullName: 'Ion Ionescu',
  email: 'ion@test.com',
  status: 'INVITED',
  ratingAvg: null,
  totalJobsCompleted: 0,
};

const adminWorker = {
  ...defaultWorker,
  id: 'cl3',
  fullName: 'Maria Admin',
  isCompanyAdmin: true,
};

function mockQueries(overrides?: { workers?: unknown[]; loading?: boolean }) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_WORKERS_LIST) {
      return {
        data: overrides?.workers !== undefined
          ? { myWorkers: overrides.workers }
          : { myWorkers: [] },
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
    expect(screen.getByText('Gestionează angajații firmei tale.')).toBeInTheDocument();
  });

  it('shows "Invită lucrător" button in header', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    // When workers exist, only the header button shows (no empty state)
    expect(screen.getByRole('button', { name: /invit. lucr.tor/i })).toBeInTheDocument();
  });

  it('shows empty state when no workers', () => {
    mockQueries();
    renderPage();
    expect(screen.getByText('Niciun lucrător')).toBeInTheDocument();
    expect(screen.getByText(/nu ai adaugat inca niciun lucrator/i)).toBeInTheDocument();
  });

  it('shows invite button in empty state', () => {
    mockQueries();
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /invit. lucr.tor/i });
    expect(buttons.length).toBe(2); // header + empty state
  });

  it('shows loading spinner when loading', () => {
    mockQueries({ loading: true });
    renderPage();
    expect(screen.getByText('Se incarca echipa...')).toBeInTheDocument();
  });

  it('renders worker name and status badge in table', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    // "Activ" appears in both dropdown option and badge
    expect(screen.getAllByText('Activ').length).toBeGreaterThanOrEqual(1);
  });

  it('renders worker email and phone in table', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.getByText('0711111111')).toBeInTheDocument();
  });

  it('renders rating and job count', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows admin badge for company admin workers', () => {
    mockQueries({ workers: [adminWorker] });
    renderPage();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows monogram avatar when no image', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('shows avatar image when user has avatarUrl', () => {
    const withAvatar = { ...defaultWorker, user: { id: 'u1', avatarUrl: 'https://example.com/photo.jpg' } };
    mockQueries({ workers: [withAvatar] });
    renderPage();
    const img = screen.getByAltText('Ana Popa');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('navigates to detail page on row click', async () => {
    const user = userEvent.setup();
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    const row = screen.getByText('Ana Popa').closest('tr');
    expect(row).toBeTruthy();
    await user.click(row!);
    expect(mockNavigate).toHaveBeenCalledWith('/firma/echipa/cl1');
  });

  it('renders status filter dropdown', () => {
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    expect(screen.getByLabelText('Filtrează după status')).toBeInTheDocument();
  });

  it('filters by dropdown selection', () => {
    mockQueries({ workers: [defaultWorker, invitedWorker] });
    renderPage();
    // Both visible initially
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    expect(screen.getByText('Ion Ionescu')).toBeInTheDocument();
    // Select "Activ" from dropdown
    fireEvent.change(screen.getByLabelText('Filtrează după status'), { target: { value: 'ACTIVE' } });
    expect(screen.getByText('Ana Popa')).toBeInTheDocument();
    expect(screen.queryByText('Ion Ionescu')).not.toBeInTheDocument();
  });

  it('filters by search query', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockQueries({ workers: [defaultWorker, invitedWorker] });
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
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    await user.click(screen.getByRole('button', { name: /invit. lucr.tor/i }));
    expect(screen.getByText('Trimite invitatie')).toBeInTheDocument();
    expect(screen.getByLabelText(/nume complet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adresa de email/i)).toBeInTheDocument();
  });

  it('shows validation error when submitting empty invite form', async () => {
    const user = userEvent.setup();
    mockQueries({ workers: [defaultWorker] });
    renderPage();
    await user.click(screen.getByRole('button', { name: /invit. lucr.tor/i }));
    await user.click(screen.getByText('Trimite invitatie'));
    expect(screen.getByText('Te rugam sa completezi toate campurile.')).toBeInTheDocument();
  });

  it('shows different status badge variants', () => {
    const workers = [
      { ...defaultWorker, id: '1', status: 'ACTIVE' },
      { ...defaultWorker, id: '2', status: 'INVITED', fullName: 'B Invitat' },
      { ...defaultWorker, id: '3', status: 'SUSPENDED', fullName: 'C Suspendat' },
    ];
    mockQueries({ workers });
    renderPage();
    // "Activ" and "Invitat" appear in both dropdown options and badges
    expect(screen.getAllByText('Activ').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Invitat').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Suspendat').length).toBeGreaterThanOrEqual(1);
  });

  it('shows -- for missing rating', () => {
    mockQueries({ workers: [invitedWorker] });
    renderPage();
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
