import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '@/pages/worker/ProfilePage';
import { useAuth } from '@/context/AuthContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
const mockMutate = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockMutate, { loading: false }],
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Worker ProfilePage', () => {
  const defaultAuth = {
    user: {
      id: '1',
      email: 'ana.cleaner@test.dev',
      fullName: 'Ana Curatenie',
      role: 'WORKER',
      status: 'ACTIVE',
    },
    loading: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    refetchUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(defaultAuth);
    mockMutate.mockResolvedValue({});
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

  it('shows page title', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows user info from auth context', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          myWorkerProfile: {
            id: '1',
            fullName: 'Ana Curatenie',
            phone: '0722111222',
            email: 'ana.cleaner@test.dev',
            status: 'ACTIVE',
            ratingAvg: 4.5,
            totalJobsCompleted: 10,
            company: { id: 'c1', companyName: 'CleanPro SRL' },
          },
        },
        loading: false,
      })
      .mockReturnValueOnce({
        data: {
          myWorkerStats: {
            totalJobsCompleted: 10,
            thisMonthJobs: 3,
            averageRating: 4.5,
            totalReviews: 8,
            thisMonthEarnings: 1500,
          },
        },
        loading: false,
      });
    renderPage();
    expect(screen.getByText('Ana Curatenie')).toBeInTheDocument();
    expect(screen.getByText('ana.cleaner@test.dev')).toBeInTheDocument();
    expect(screen.getByText('0722111222')).toBeInTheDocument();
  });

  it('shows company badge when profile has company', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          myWorkerProfile: {
            id: '1',
            fullName: 'Ana Curatenie',
            phone: null,
            email: 'ana@test.dev',
            status: 'ACTIVE',
            ratingAvg: 0,
            totalJobsCompleted: 0,
            company: { id: 'c1', companyName: 'CleanPro SRL' },
          },
        },
        loading: false,
      })
      .mockReturnValueOnce({
        data: { myWorkerStats: null },
        loading: false,
      });
    renderPage();
    expect(screen.getByText('CleanPro SRL')).toBeInTheDocument();
  });

  it('shows stats grid with values', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          myWorkerProfile: {
            id: '1',
            fullName: 'Ana Curatenie',
            phone: null,
            email: 'ana@test.dev',
            status: 'ACTIVE',
            ratingAvg: 4.5,
            totalJobsCompleted: 10,
            company: null,
          },
        },
        loading: false,
      })
      .mockReturnValueOnce({
        data: {
          myWorkerStats: {
            totalJobsCompleted: 10,
            thisMonthJobs: 3,
            averageRating: 4.5,
            totalReviews: 8,
            thisMonthEarnings: 1500,
          },
        },
        loading: false,
      });
    renderPage();
    expect(screen.getByText('Total lucrari')).toBeInTheDocument();
    expect(screen.getByText('Luna aceasta')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('shows accept invitation section', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });
    renderPage();
    expect(screen.getByText('Accepta invitatie')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Codul de invitatie')).toBeInTheDocument();
    expect(screen.getByText('Accepta')).toBeInTheDocument();
  });

  it('shows error when submitting empty invite token', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Accepta'));
    expect(screen.getByText('Te rugam sa introduci codul invitatie.')).toBeInTheDocument();
  });

  it('calls acceptInvitation mutation with token', async () => {
    mockMutate.mockResolvedValue({
      data: {
        acceptInvitation: {
          id: '1',
          fullName: 'Ana',
          status: 'ACTIVE',
          company: { id: 'c1', companyName: 'CleanPro SRL' },
        },
      },
    });
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Codul de invitatie'), 'abc123');
    await user.click(screen.getByText('Accepta'));
    expect(mockMutate).toHaveBeenCalledWith({ variables: { token: 'abc123' } });
  });

  it('shows success message after accepting invitation', async () => {
    mockMutate.mockResolvedValue({
      data: {
        acceptInvitation: {
          id: '1',
          fullName: 'Ana',
          status: 'ACTIVE',
          company: { id: 'c1', companyName: 'CleanPro SRL' },
        },
      },
    });
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Codul de invitatie'), 'abc123');
    await user.click(screen.getByText('Accepta'));
    expect(await screen.findByText(/Ai fost adaugat la CleanPro SRL/)).toBeInTheDocument();
  });

  it('shows error message when invitation fails', async () => {
    mockMutate.mockRejectedValue(new Error('Invalid token'));
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Codul de invitatie'), 'bad-token');
    await user.click(screen.getByText('Accepta'));
    expect(
      await screen.findByText('Codul de invitatie nu este valid sau a expirat.'),
    ).toBeInTheDocument();
  });
});
