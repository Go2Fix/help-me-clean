import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import PayoutsPage from '@/pages/company/PayoutsPage';
import {
  MY_COMPANY_EARNINGS,
  MY_PAYOUTS,
  MY_CONNECT_STATUS,
} from '@/graphql/operations';

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
    useMutation: vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleEarnings = {
  totalGross: 500000,
  totalCommission: 75000,
  totalNet: 425000,
  bookingCount: 12,
};

const samplePayout = {
  id: 'po_1',
  amount: 200000,
  periodFrom: '2025-01-01',
  periodTo: '2025-01-31',
  bookingCount: 5,
  status: 'PAID',
  paidAt: '2025-02-05',
  createdAt: '2025-02-01',
};

function mockQueries(overrides?: {
  earningsData?: unknown;
  payoutsData?: unknown[];
  connectData?: unknown;
  earningsLoading?: boolean;
  payoutsLoading?: boolean;
  connectLoading?: boolean;
}) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_COMPANY_EARNINGS) {
      return {
        data: overrides?.earningsData !== undefined
          ? { myCompanyEarnings: overrides.earningsData }
          : { myCompanyEarnings: sampleEarnings },
        loading: overrides?.earningsLoading ?? false,
      } as unknown as ReturnType<typeof useQuery>;
    }
    if (query === MY_PAYOUTS) {
      return {
        data: overrides?.payoutsData !== undefined
          ? { myPayouts: overrides.payoutsData }
          : { myPayouts: [] },
        loading: overrides?.payoutsLoading ?? false,
      } as unknown as ReturnType<typeof useQuery>;
    }
    if (query === MY_CONNECT_STATUS) {
      return {
        data: overrides?.connectData !== undefined
          ? { myConnectStatus: overrides.connectData }
          : { myConnectStatus: { onboardingStatus: 'COMPLETE', chargesEnabled: true } },
        loading: overrides?.connectLoading ?? false,
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false } as unknown as ReturnType<typeof useQuery>;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <PayoutsPage />
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PayoutsPage (Company)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('renders Stripe Connect status card', () => {
    mockQueries({ connectData: { onboardingStatus: 'COMPLETE', chargesEnabled: true } });
    renderPage();
    expect(screen.getByText('Stripe Connect')).toBeInTheDocument();
    expect(screen.getByText('Stripe activ')).toBeInTheDocument();
  });

  it('shows earnings KPI cards with formatted values', () => {
    mockQueries({ earningsData: sampleEarnings });
    renderPage();
    expect(screen.getByText('Venit brut')).toBeInTheDocument();
    // 500000 cents = 5000.00 lei
    expect(screen.getByText('5000.00 lei')).toBeInTheDocument();
    expect(screen.getByText('Comision platforma')).toBeInTheDocument();
    expect(screen.getByText('750.00 lei')).toBeInTheDocument();
    expect(screen.getByText('Venit net')).toBeInTheDocument();
    expect(screen.getByText('4250.00 lei')).toBeInTheDocument();
  });

  it('renders payouts table with mock data', () => {
    mockQueries({ payoutsData: [samplePayout] });
    renderPage();
    expect(screen.getByText('Istoricul platilor')).toBeInTheDocument();
    // Amount: 200000 cents = 2000.00 lei
    expect(screen.getByText('2000.00 lei')).toBeInTheDocument();
    expect(screen.getByText('Platit')).toBeInTheDocument();
  });

  it('shows empty state when no payouts exist', () => {
    mockQueries({ payoutsData: [] });
    renderPage();
    expect(screen.getByText('Nicio plata')).toBeInTheDocument();
  });

  it('shows "Conecteaza cu Stripe" button when not connected', () => {
    mockQueries({ connectData: { onboardingStatus: 'NOT_STARTED', chargesEnabled: false } });
    renderPage();
    expect(screen.getByText('Conecteaza cu Stripe')).toBeInTheDocument();
  });
});
