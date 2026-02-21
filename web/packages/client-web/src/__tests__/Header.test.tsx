import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    refetchUser: vi.fn(),
  })),
}));

vi.mock('@/context/PlatformContext', () => ({
  usePlatform: vi.fn(() => ({
    platformMode: 'live',
    isPreRelease: false,
    loading: false,
  })),
  PlatformProvider: ({ children }: { children: unknown }) => children,
}));

const mockUseAuth = vi.mocked(useAuth);

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      refetchUser: vi.fn(),
    });
  });

  it('shows logo text "Go2Fix"', () => {
    renderHeader();
    // Logo is split across nested spans for color styling — check the link role
    expect(screen.getByRole('link', { name: /Go2Fix/i })).toBeInTheDocument();
  });

  it('shows "Servicii" link', () => {
    renderHeader();
    const serviciiLinks = screen.getAllByText('Servicii');
    expect(serviciiLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Cum funcționează" link', () => {
    renderHeader();
    const links = screen.getAllByText('Cum funcționează');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Intră în cont" link when not authenticated', () => {
    renderHeader();
    const authLinks = screen.getAllByText('Intră în cont');
    expect(authLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Rezervă acum" button', () => {
    renderHeader();
    const buttons = screen.getAllByRole('button', { name: /Rezervă acum/ });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Pentru Firme" link when not authenticated', () => {
    renderHeader();
    const links = screen.getAllByText('Pentru Firme');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  describe('when authenticated as CLIENT', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'test@test.com',
          fullName: 'Ion Popescu',
          role: 'CLIENT',
          status: 'ACTIVE',
        },
        loading: false,
        login: vi.fn(),
        logout: mockLogout,
        isAuthenticated: true,
        refetchUser: vi.fn(),
      });
    });

    it('shows "Contul meu" link', () => {
      renderHeader();
      const links = screen.getAllByText('Contul meu');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('shows user name', () => {
      renderHeader();
      const names = screen.getAllByText('Ion Popescu');
      expect(names.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Deconectare" button', () => {
      renderHeader();
      const buttons = screen.getAllByText('Deconectare');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show "Intră în cont" link', () => {
      renderHeader();
      expect(screen.queryByText('Intră în cont')).not.toBeInTheDocument();
    });

    it('calls logout and navigates to home when Deconectare is clicked', async () => {
      const user = userEvent.setup();
      renderHeader();
      const buttons = screen.getAllByText('Deconectare');
      await user.click(buttons[0]);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('when authenticated as COMPANY_ADMIN', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '2',
          email: 'admin@firma.ro',
          fullName: 'Admin Firma',
          role: 'COMPANY_ADMIN',
          status: 'ACTIVE',
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
        refetchUser: vi.fn(),
      });
    });

    it('shows "Panoul firmei" link', () => {
      renderHeader();
      const links = screen.getAllByText('Panoul firmei');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show client-specific links', () => {
      renderHeader();
      expect(screen.queryByText('Contul meu')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated as GLOBAL_ADMIN', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '3',
          email: 'admin@go2fix.ro',
          fullName: 'Super Admin',
          role: 'GLOBAL_ADMIN',
          status: 'ACTIVE',
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
        refetchUser: vi.fn(),
      });
    });

    it('shows "Panou admin" link', () => {
      renderHeader();
      const links = screen.getAllByText('Panou admin');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show client-specific links', () => {
      renderHeader();
      expect(screen.queryByText('Contul meu')).not.toBeInTheDocument();
    });
  });

  describe('when not authenticated', () => {
    it('does not show "Contul meu" link', () => {
      renderHeader();
      expect(screen.queryByText('Contul meu')).not.toBeInTheDocument();
    });

    it('does not show "Deconectare" button', () => {
      renderHeader();
      expect(screen.queryByText('Deconectare')).not.toBeInTheDocument();
    });
  });
});
