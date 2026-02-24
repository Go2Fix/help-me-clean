import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import RefundsPage from '@/pages/admin/RefundsPage';
import { ALL_REFUND_REQUESTS } from '@/graphql/operations';

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
    useLazyQuery: vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleRefund = {
  id: 'ref_1',
  amount: 15000,
  reason: 'Curatenie nesatisfacatoare',
  status: 'REQUESTED',
  processedAt: null,
  createdAt: '2025-01-20T10:00:00Z',
  booking: {
    id: 'b1',
    referenceCode: 'G2F-200',
    serviceName: 'Curatenie generala',
  },
  requestedBy: {
    id: 'u1',
    fullName: 'Maria Ionescu',
    email: 'maria@test.com',
  },
  approvedBy: null,
};

function mockQueries(overrides?: { refunds?: unknown[]; loading?: boolean }) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === ALL_REFUND_REQUESTS) {
      return {
        data: overrides?.refunds !== undefined
          ? { allRefundRequests: overrides.refunds }
          : { allRefundRequests: [] },
        loading: overrides?.loading ?? false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false, refetch: vi.fn() } as unknown as ReturnType<typeof useQuery>;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <RefundsPage />
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RefundsPage (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useLazyQuery).mockReturnValue([vi.fn(), { data: null, loading: false, called: false }] as unknown as ReturnType<typeof useLazyQuery>);
  });

  it('shows the direct refund action button', () => {
    mockQueries();
    renderPage();
    expect(screen.getByText('Rambursare directa')).toBeInTheDocument();
  });

  it('renders tab navigation with all status tabs', () => {
    mockQueries();
    renderPage();
    // "Solicitate" appears both as the tab label and as the Card heading text
    const solicitateElements = screen.getAllByText('Solicitate');
    expect(solicitateElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aprobate')).toBeInTheDocument();
    expect(screen.getByText('Procesate')).toBeInTheDocument();
    expect(screen.getByText('Respinse')).toBeInTheDocument();
  });

  it('shows refund requests table with booking reference and user name', () => {
    mockQueries({ refunds: [sampleRefund] });
    renderPage();
    expect(screen.getByText('G2F-200')).toBeInTheDocument();
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('Curatenie nesatisfacatoare')).toBeInTheDocument();
    // 15000 cents = 150.00 lei
    expect(screen.getByText('150.00 lei')).toBeInTheDocument();
  });

  it('shows Aproba and Respinge buttons for REQUESTED status', () => {
    mockQueries({ refunds: [sampleRefund] });
    renderPage();
    expect(screen.getByText('Aproba')).toBeInTheDocument();
    expect(screen.getByText('Respinge')).toBeInTheDocument();
  });

  it('shows empty state when no refund requests exist', () => {
    mockQueries({ refunds: [] });
    renderPage();
    expect(screen.getByText(/nu exista rambursari/i)).toBeInTheDocument();
  });
});
