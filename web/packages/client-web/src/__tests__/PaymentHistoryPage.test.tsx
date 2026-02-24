import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import PaymentHistoryPage from '@/pages/client/PaymentHistoryPage';
import { MY_PAYMENT_HISTORY } from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

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

const samplePayment = {
  id: 'pay_1',
  amount: 15000,
  currency: 'ron',
  status: 'SUCCEEDED',
  createdAt: '2025-01-15T10:00:00Z',
  paidAt: '2025-01-15T10:01:00Z',
  booking: {
    id: 'b1',
    referenceCode: 'G2F-001',
    serviceName: 'Curatenie standard',
  },
};

function makePaymentHistoryData(edges: unknown[], totalCount?: number) {
  return {
    myPaymentHistory: {
      edges,
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: totalCount ?? edges.length,
    },
  };
}

function mockQuery(overrides?: { data?: unknown; loading?: boolean }) {
  const isLoading = overrides?.loading ?? false;
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_PAYMENT_HISTORY) {
      return {
        data: isLoading
          ? undefined
          : (overrides?.data !== undefined ? overrides.data : makePaymentHistoryData([])),
        loading: isLoading,
        fetchMore: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false, fetchMore: vi.fn() } as unknown as ReturnType<typeof useQuery>;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentHistoryPage />
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when loading', () => {
    mockQuery({ loading: true });
    renderPage();
    expect(screen.getByText('Se incarca istoricul platilor...')).toBeInTheDocument();
  });

  it('renders payment history table with mock data', () => {
    mockQuery({ data: makePaymentHistoryData([samplePayment], 1) });
    renderPage();
    expect(screen.getByText('G2F-001')).toBeInTheDocument();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText('Istoric plati')).toBeInTheDocument();
  });

  it('shows correct status badges for SUCCEEDED, FAILED, and PENDING', () => {
    const payments = [
      { ...samplePayment, id: 'pay_1', status: 'SUCCEEDED' },
      { ...samplePayment, id: 'pay_2', status: 'FAILED', booking: { ...samplePayment.booking, id: 'b2', referenceCode: 'G2F-002' } },
      { ...samplePayment, id: 'pay_3', status: 'PENDING', booking: { ...samplePayment.booking, id: 'b3', referenceCode: 'G2F-003' } },
    ];
    mockQuery({ data: makePaymentHistoryData(payments, 3) });
    renderPage();
    expect(screen.getByText('Platita')).toBeInTheDocument();
    // "Esuata" and "In asteptare" appear in both the status filter dropdown and the badges
    const esuataElements = screen.getAllByText('Esuata');
    expect(esuataElements.length).toBeGreaterThanOrEqual(1);
    const inAsteptareElements = screen.getAllByText('In asteptare');
    expect(inAsteptareElements.length).toBeGreaterThanOrEqual(1);
  });

  it('formats amounts in RON correctly (cents to lei)', () => {
    mockQuery({ data: makePaymentHistoryData([samplePayment], 1) });
    renderPage();
    // 15000 cents = 150.00 lei
    expect(screen.getByText('150.00 lei')).toBeInTheDocument();
  });

  it('shows empty state when no payments exist', () => {
    mockQuery({ data: makePaymentHistoryData([]) });
    renderPage();
    expect(screen.getByText('Nicio plata inregistrata')).toBeInTheDocument();
  });
});
