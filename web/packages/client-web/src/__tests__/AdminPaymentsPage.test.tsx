import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import PaymentsPage from '@/pages/admin/PaymentsPage';
import {
  PLATFORM_REVENUE_REPORT,
  ALL_PAYMENT_TRANSACTIONS,
} from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleReport = {
  totalRevenue: 1000000,
  totalCommission: 150000,
  totalPayouts: 850000,
  pendingPayouts: 200000,
  totalRefunds: 50000,
  netRevenue: 100000,
  bookingCount: 30,
};

const sampleTransaction = {
  id: 'tx_1',
  bookingId: 'b1',
  stripePaymentIntentId: 'pi_123',
  amountTotal: 25000,
  amountCompany: 21250,
  amountPlatformFee: 3750,
  currency: 'ron',
  status: 'SUCCEEDED',
  failureReason: null,
  refundAmount: 0,
  createdAt: '2025-01-15T10:00:00Z',
  booking: {
    id: 'b1',
    referenceCode: 'G2F-100',
    serviceName: 'Curatenie generala',
    company: { id: 'co1', companyName: 'Clean Pro SRL' },
  },
};

function mockQueries(overrides?: {
  report?: unknown;
  transactions?: unknown[];
  reportLoading?: boolean;
  txLoading?: boolean;
}) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === PLATFORM_REVENUE_REPORT) {
      return {
        data: overrides?.report !== undefined
          ? { platformRevenueReport: overrides.report }
          : { platformRevenueReport: sampleReport },
        loading: overrides?.reportLoading ?? false,
      } as unknown as ReturnType<typeof useQuery>;
    }
    if (query === ALL_PAYMENT_TRANSACTIONS) {
      return {
        data: overrides?.transactions !== undefined
          ? { allPaymentTransactions: overrides.transactions }
          : { allPaymentTransactions: [] },
        loading: overrides?.txLoading ?? false,
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false } as unknown as ReturnType<typeof useQuery>;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentsPage />
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsPage (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows page title "Plati si Venituri"', () => {
    mockQueries();
    renderPage();
    expect(screen.getByText('Plati si Venituri')).toBeInTheDocument();
  });

  it('renders revenue summary cards with formatted amounts', () => {
    mockQueries({ report: sampleReport });
    renderPage();
    expect(screen.getByText('Venit total')).toBeInTheDocument();
    // 1000000 cents = 10000.00 lei
    expect(screen.getByText('10000.00 lei')).toBeInTheDocument();
    expect(screen.getByText('Comision platforma')).toBeInTheDocument();
    expect(screen.getByText('1500.00 lei')).toBeInTheDocument();
    // "Rambursari" appears both in the sub-nav tab option and the stat card label
    const rambursariElements = screen.getAllByText('Rambursari');
    expect(rambursariElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('500.00 lei')).toBeInTheDocument();
  });

  it('renders transactions table with booking data', () => {
    mockQueries({ transactions: [sampleTransaction] });
    renderPage();
    expect(screen.getByText('G2F-100')).toBeInTheDocument();
    expect(screen.getByText('Clean Pro SRL')).toBeInTheDocument();
    // 25000 cents = 250.00 lei
    expect(screen.getByText('250.00 lei')).toBeInTheDocument();
    // "Reusita" appears both in the status filter <option> and the badge
    const reusitaElements = screen.getAllByText('Reusita');
    expect(reusitaElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no transactions exist', () => {
    mockQueries({ transactions: [] });
    renderPage();
    expect(screen.getByText('Nu exista tranzactii.')).toBeInTheDocument();
  });

  it('shows loading skeletons when revenue is loading', () => {
    mockQueries({ reportLoading: true, report: undefined });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
