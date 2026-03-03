import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import {
  MY_BOOKINGS,
  MY_SUBSCRIPTIONS,
  MY_INVOICES,
  MY_PAYMENT_METHODS,
  MY_ADDRESSES,
  MY_RECENT_COMPLETED_BOOKINGS,
} from '@/graphql/operations';
import { makeBooking, makeUser } from './mocks/factories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: makeUser(),
    loading: false,
    isAuthenticated: true,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refetchUser: vi.fn(),
    refreshToken: vi.fn(),
  })),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ProfileSetupChecklist may use complex sub-components — stub it out
vi.mock('@/components/ProfileSetupChecklist', () => ({
  default: () => <div data-testid="profile-setup-checklist" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sets up all useQuery mocks with sensible defaults. Override per-query as needed. */
function setupDefaultQueries(overrides: {
  allBookingsData?: Record<string, unknown>;
  confirmedData?: Record<string, unknown>;
  assignedData?: Record<string, unknown>;
  subscriptionsData?: Record<string, unknown>;
  invoicesData?: Record<string, unknown>;
  paymentMethodsData?: Record<string, unknown>;
  addressesData?: Record<string, unknown>;
  recentCompletedData?: Record<string, unknown>;
  loading?: boolean;
} = {}) {
  const loading = overrides.loading ?? false;

  vi.mocked(useQuery).mockImplementation(((query: unknown, options?: { variables?: { status?: string; first?: number } }) => {
    if (query === MY_BOOKINGS) {
      const status = options?.variables?.status;
      if (!status) {
        // allBookings query (no status filter)
        return {
          data: overrides.allBookingsData ?? { myBookings: { totalCount: 5, edges: [] } },
          loading,
        };
      }
      if (status === 'CONFIRMED') {
        return {
          data: overrides.confirmedData ?? { myBookings: { totalCount: 2, edges: [] } },
          loading,
        };
      }
      if (status === 'ASSIGNED') {
        return {
          data: overrides.assignedData ?? { myBookings: { totalCount: 1, edges: [] } },
          loading,
        };
      }
      return { data: { myBookings: { totalCount: 0, edges: [] } }, loading };
    }
    if (query === MY_SUBSCRIPTIONS) {
      return {
        data: overrides.subscriptionsData ?? { mySubscriptions: [] },
        loading,
      };
    }
    if (query === MY_INVOICES) {
      return {
        data: overrides.invoicesData ?? { myInvoices: { edges: [], totalCount: 0 } },
        loading,
      };
    }
    if (query === MY_PAYMENT_METHODS) {
      return {
        data: overrides.paymentMethodsData ?? { myPaymentMethods: [] },
        loading,
      };
    }
    if (query === MY_ADDRESSES) {
      return {
        data: overrides.addressesData ?? { myAddresses: [] },
        loading,
      };
    }
    if (query === MY_RECENT_COMPLETED_BOOKINGS) {
      return {
        data: overrides.recentCompletedData ?? { myBookings: { edges: [] } },
        loading,
      };
    }
    return { data: undefined, loading };
  }) as typeof useQuery);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ClientDashboardPage />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ClientDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crash', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText(/Bun venit/)).toBeInTheDocument();
  });

  it('shows user name in greeting', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText(/Maria Popescu/)).toBeInTheDocument();
  });

  it('shows loading skeletons when data is loading', () => {
    setupDefaultQueries({ loading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows KPI card labels', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText('Total rezervari')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // "Abonamente" appears in both KPI card and section heading
    expect(screen.getAllByText('Abonamente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Facturi neplatite')).toBeInTheDocument();
  });

  it('shows total bookings count in KPI card', () => {
    setupDefaultQueries({
      allBookingsData: { myBookings: { totalCount: 7, edges: [] } },
    });
    renderPage();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows "Urmatoarele comenzi" section heading', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText('Urmatoarele comenzi')).toBeInTheDocument();
  });

  it('shows empty state when no upcoming bookings', () => {
    setupDefaultQueries({
      confirmedData: { myBookings: { totalCount: 0, edges: [] } },
      assignedData: { myBookings: { totalCount: 0, edges: [] } },
    });
    renderPage();
    expect(screen.getByText('Nu ai comenzi viitoare')).toBeInTheDocument();
  });

  it('renders booking in upcoming list when data exists', () => {
    const booking = makeBooking({
      serviceName: 'Curatenie standard',
      status: 'CONFIRMED',
      estimatedTotal: 200,
    });
    setupDefaultQueries({
      confirmedData: { myBookings: { totalCount: 1, edges: [booking] } },
    });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
  });

  it('shows quick actions section', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText('Actiuni rapide')).toBeInTheDocument();
    expect(screen.getByText('Comenzile mele')).toBeInTheDocument();
  });

  it('shows "Rezervare noua" button', () => {
    setupDefaultQueries();
    renderPage();
    expect(screen.getByText('Rezervare noua')).toBeInTheDocument();
  });
});
