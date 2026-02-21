import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: { onSuccess: (r: { credential: string }) => void; onError: () => void }) => (
    <button
      data-testid="google-login"
      onClick={() => props.onSuccess({ credential: 'mock-google-token' })}
    >
      Sign in with Google
    </button>
  ),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    refetchUser: vi.fn(),
    refreshToken: vi.fn(),
  })),
}));

const mockUseAuth = vi.mocked(useAuth);

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  let mockLoginWithGoogle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginWithGoogle = vi.fn().mockResolvedValue({ role: 'CLIENT' });
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      loginWithGoogle: mockLoginWithGoogle,
      logout: vi.fn(),
      isAuthenticated: false,
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  it('renders the page title "Bine ai revenit!"', () => {
    renderLoginPage();
    expect(screen.getByText('Bine ai revenit!')).toBeInTheDocument();
  });

  it('shows Google OAuth button', () => {
    renderLoginPage();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });

  it('shows correct subtitle for auth options', () => {
    renderLoginPage();
    expect(screen.getByText('Conectează-te cu contul tău Google sau prin email pentru a accesa platforma.')).toBeInTheDocument();
  });

  it('calls loginWithGoogle when Google button is clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.click(screen.getByTestId('google-login'));
    expect(mockLoginWithGoogle).toHaveBeenCalledWith('mock-google-token');
  });

  it('navigates to role home after successful Google login', async () => {
    mockLoginWithGoogle.mockResolvedValue({ role: 'COMPANY_ADMIN' });
    const user = userEvent.setup();
    renderLoginPage();
    await user.click(screen.getByTestId('google-login'));
    expect(mockNavigate).toHaveBeenCalledWith('/firma', { replace: true });
  });

  it('shows error message when Google login fails', async () => {
    mockLoginWithGoogle.mockRejectedValue(new Error('Auth failed'));
    const user = userEvent.setup();
    renderLoginPage();
    await user.click(screen.getByTestId('google-login'));
    expect(
      await screen.findByText(
        'Autentificarea a eșuat. Te rugăm să încerci din nou.',
      ),
    ).toBeInTheDocument();
  });

  it('redirects CLIENT to /cont when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@test.com', fullName: 'Test', role: 'CLIENT', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: mockLoginWithGoogle,
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/autentificare']}>
        <Routes>
          <Route path="/autentificare" element={<LoginPage />} />
          <Route path="/cont" element={<div>CLIENT_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('CLIENT_DASHBOARD')).toBeInTheDocument();
  });

  it('redirects COMPANY_ADMIN to /firma when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '2', email: 'admin@firma.ro', fullName: 'Admin', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: mockLoginWithGoogle,
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/autentificare']}>
        <Routes>
          <Route path="/autentificare" element={<LoginPage />} />
          <Route path="/firma" element={<div>COMPANY_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('COMPANY_DASHBOARD')).toBeInTheDocument();
  });

  it('redirects GLOBAL_ADMIN to /admin when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '3', email: 'admin@go2fix.ro', fullName: 'Global Admin', role: 'GLOBAL_ADMIN', status: 'ACTIVE' },
      loading: false,
      loginWithGoogle: mockLoginWithGoogle,
      logout: vi.fn(),
      isAuthenticated: true,
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/autentificare']}>
        <Routes>
          <Route path="/autentificare" element={<LoginPage />} />
          <Route path="/admin" element={<div>ADMIN_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('ADMIN_DASHBOARD')).toBeInTheDocument();
  });
});
