import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import RegisterCompanyPage from '@/pages/RegisterCompanyPage';
import { useAuth } from '@/context/AuthContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual<typeof import('@apollo/client')>('@apollo/client');
  return {
    ...actual,
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterCompanyPage', () => {
  const defaultAuth = {
    user: null,
    loading: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    refreshToken: vi.fn().mockResolvedValue(undefined),
    refetchUser: vi.fn().mockResolvedValue(undefined),
  };

  let mockApplyFn: ReturnType<typeof vi.fn>;
  let mockClaimFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyFn = vi.fn();
    mockClaimFn = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ ...defaultAuth });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useQuery).mockReturnValue({ data: { serviceCategories: [] }, loading: false } as any);

    // The component calls useMutation twice per render: first APPLY_AS_COMPANY, then CLAIM_COMPANY.
    // We use a counter that resets every 2 calls to handle re-renders correctly.
    let callCount = 0;
    vi.mocked(useMutation).mockImplementation(() => {
      const idx = callCount % 2;
      callCount++;
      if (idx === 0) {
        return [mockApplyFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }
      return [mockClaimFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/inregistrare']}>
        <RegisterCompanyPage />
      </MemoryRouter>,
    );

  it('renders form with required fields', () => {
    renderPage();
    expect(screen.getByText('Înregistrează-ți firma')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nume firm/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/RO12345678/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email contact/i)).toBeInTheDocument();
  });

  it('shows validation error when submitting without required fields', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));
    expect(screen.getByText('Te rugăm să completezi câmpurile obligatorii.')).toBeInTheDocument();
  });

  it('submits form successfully and shows success screen', async () => {
    mockApplyFn.mockResolvedValueOnce({
      data: {
        applyAsCompany: {
          company: { id: '1', companyName: 'Test SRL', status: 'PENDING_REVIEW' },
          claimToken: 'abc123',
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Nume firm/i), 'Test SRL');
    await user.type(screen.getByPlaceholderText(/RO12345678/i), 'RO12345678');
    await user.selectOptions(screen.getByRole('combobox'), 'SRL');
    await user.type(screen.getByLabelText(/email contact/i), 'contact@test.ro');
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));

    expect(mockApplyFn).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          companyName: 'Test SRL',
          cui: 'RO12345678',
          contactEmail: 'contact@test.ro',
        }),
      },
    });
    expect(await screen.findByText('Cerere trimisă cu succes!')).toBeInTheDocument();
  });

  it('shows Google Sign-In on success when unauthenticated with claimToken', async () => {
    mockApplyFn.mockResolvedValueOnce({
      data: {
        applyAsCompany: {
          company: { id: '1', companyName: 'Test SRL', status: 'PENDING_REVIEW' },
          claimToken: 'abc123',
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Nume firm/i), 'Test SRL');
    await user.type(screen.getByPlaceholderText(/RO12345678/i), 'RO12345678');
    await user.selectOptions(screen.getByRole('combobox'), 'SRL');
    await user.type(screen.getByLabelText(/email contact/i), 'contact@test.ro');
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));

    expect(await screen.findByTestId('google-login')).toBeInTheDocument();
  });

  it('shows claim URL after unauthenticated submission', async () => {
    mockApplyFn.mockResolvedValueOnce({
      data: {
        applyAsCompany: {
          company: { id: '1', companyName: 'Test SRL', status: 'PENDING_REVIEW' },
          claimToken: 'abc123',
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Nume firm/i), 'Test SRL');
    await user.type(screen.getByPlaceholderText(/RO12345678/i), 'RO12345678');
    await user.selectOptions(screen.getByRole('combobox'), 'SRL');
    await user.type(screen.getByLabelText(/email contact/i), 'contact@test.ro');
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));

    await screen.findByText('Cerere trimisă cu succes!');
    expect(screen.getByText(/salvează acest link/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\/claim-firma\/abc123/)).toBeInTheDocument();
  });

  it('authenticated submission refreshes token and redirects to document upload', async () => {
    const mockRefreshToken = vi.fn().mockResolvedValue(undefined);
    const mockRefetchUser = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      isAuthenticated: true,
      refreshToken: mockRefreshToken,
      refetchUser: mockRefetchUser,
      user: { id: '1', email: 'a@b.com', fullName: 'Admin', role: 'CLIENT', status: 'ACTIVE' },
    });

    mockApplyFn.mockResolvedValueOnce({
      data: {
        applyAsCompany: {
          company: { id: '1', companyName: 'Test SRL', status: 'PENDING_REVIEW' },
          claimToken: null,
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Nume firm/i), 'Test SRL');
    await user.type(screen.getByPlaceholderText(/RO12345678/i), 'RO12345678');
    await user.selectOptions(screen.getByRole('combobox'), 'SRL');
    await user.type(screen.getByLabelText(/email contact/i), 'contact@test.ro');
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));

    // Should refresh JWT and redirect directly — not show a static success screen
    await vi.waitFor(() => {
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockRefetchUser).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/firma/documente-obligatorii');
    });
  });

  it('shows mutation error when apply fails', async () => {
    mockApplyFn.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Nume firm/i), 'Test SRL');
    await user.type(screen.getByPlaceholderText(/RO12345678/i), 'RO12345678');
    await user.selectOptions(screen.getByRole('combobox'), 'SRL');
    await user.type(screen.getByLabelText(/email contact/i), 'contact@test.ro');
    await user.click(screen.getByRole('button', { name: /trimite cererea/i }));

    expect(await screen.findByText('Înregistrarea a eșuat. Te rugăm să încerci din nou.')).toBeInTheDocument();
  });
});
