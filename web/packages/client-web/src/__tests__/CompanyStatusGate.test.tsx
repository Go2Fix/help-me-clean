import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CompanyStatusGate from '@/components/company/CompanyStatusGate';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/CompanyContext', () => ({
  useCompany: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockCompany = (overrides = {}) => ({
  id: '1',
  companyName: 'CleanPro SRL',
  cui: 'RO12345678',
  companyType: 'SRL',
  legalRepresentative: 'Ion Popescu',
  contactEmail: 'ion@cleanpro.ro',
  contactPhone: '+40 712 345 678',
  address: 'Str. Exemplu 1',
  city: 'Bucuresti',
  county: 'Bucuresti',
  status: 'APPROVED',
  ratingAvg: 4.5,
  totalJobsCompleted: 10,
  createdAt: '2024-01-01',
  ...overrides,
});

const renderGate = (initialRoute = '/') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <CompanyStatusGate>
        <div data-testid="dashboard-content">Dashboard content</div>
      </CompanyStatusGate>
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompanyStatusGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });

  it('shows loading spinner when company is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: true,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "no company" overlay when query errors', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: false,
      error: true,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText('Nicio firma inregistrata')).toBeInTheDocument();
    expect(screen.getByText('Inregistreaza firma')).toBeInTheDocument();
  });

  it('navigates to registration on CTA click', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: false,
      error: true,
      refetch: vi.fn(),
    });

    renderGate();
    await user.click(screen.getByText('Inregistreaza firma'));
    expect(mockNavigate).toHaveBeenCalledWith('/inregistrare-firma');
  });

  it('shows pending review overlay', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: mockCompany({ status: 'PENDING_REVIEW' }),
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText('Aplicatia ta este in curs de verificare')).toBeInTheDocument();
    expect(screen.getByText(/1-2 zile lucratoare/)).toBeInTheDocument();
  });

  it('shows rejected overlay with reason', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: mockCompany({ status: 'REJECTED', rejectionReason: 'CUI invalid' }),
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText('Aplicatia firmei a fost respinsa')).toBeInTheDocument();
    expect(screen.getByText('CUI invalid')).toBeInTheDocument();
    expect(screen.getByText('Aplica din nou')).toBeInTheDocument();
  });

  it('shows suspended overlay', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: mockCompany({ status: 'SUSPENDED' }),
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText('Contul firmei a fost suspendat')).toBeInTheDocument();
  });

  it('renders children normally when company is APPROVED', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: mockCompany({ status: 'APPROVED' }),
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    // No overlay text should be present
    expect(screen.queryByText('Nicio firma inregistrata')).not.toBeInTheDocument();
    expect(screen.queryByText('Aplicatia ta este in curs de verificare')).not.toBeInTheDocument();
    expect(screen.queryByText('Aplicatia firmei a fost respinsa')).not.toBeInTheDocument();
    expect(screen.queryByText('Contul firmei a fost suspendat')).not.toBeInTheDocument();
  });

  it('skips overlay on /inregistrare-firma route', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate('/inregistrare-firma');
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.queryByText('Nicio firma inregistrata')).not.toBeInTheDocument();
  });

  it('skips overlay on /claim-firma/:token route', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: null,
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate('/claim-firma/abc-123');
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.queryByText('Nicio firma inregistrata')).not.toBeInTheDocument();
  });

  it('shows contact info on all blocked overlays', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
    });
    vi.mocked(useCompany).mockReturnValue({
      company: mockCompany({ status: 'PENDING_REVIEW' }),
      loading: false,
      error: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText('+40 312 345 678')).toBeInTheDocument();
    expect(screen.getByText('contact@go2fix.ro')).toBeInTheDocument();
  });
});
